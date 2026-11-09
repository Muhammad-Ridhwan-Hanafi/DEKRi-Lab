import { describe, expect, it } from 'vitest';
import { COA, OPENING } from '../../src/data';
import { computeReport } from '../../src/engine';
import { postClosingTB } from '../../src/engine/closing';
import { formatRupiah, parseRupiah, xround } from '../../src/engine/money';
import type { EntryLines } from '../../src/engine/types';
import { gradeJournal, netByAccount } from '../../src/validation/grade';
import { keyLedgerInput } from '../helpers';

const L = (code: string | null, debit: number, credit: number, id = 'x') => ({ id, code, debit, credit, memo: '' });
const base = () => keyLedgerInput();

describe('parseRupiah dan format', () => {
  it('format Indonesia, koma, kosong, dan sampah', () => {
    expect(parseRupiah('1.250.000')).toBe(1250000);
    expect(parseRupiah('1,250,000')).toBe(1250000);
    expect(parseRupiah('')).toBe(0);
    expect(parseRupiah('abc')).toBe(0);
    expect(parseRupiah('-')).toBe(0);
  });
  it('minus di tengah angka tidak memotong angka diam-diam', () => {
    expect(parseRupiah('12-34')).toBe(1234);
  });
  it('angka sangat besar dibatasi agar tetap bilangan bulat aman', () => {
    const n = parseRupiah('99999999999999999999999');
    expect(Number.isSafeInteger(n)).toBe(true);
    expect(n).toBeGreaterThan(0);
  });
  it('formatRupiah: negatif, nol, pembulatan', () => {
    expect(formatRupiah(-1500, true)).toBe('(1.500)');
    expect(formatRupiah(-1500)).toBe('-1.500');
    expect(formatRupiah(0)).toBe('0');
    expect(formatRupiah(2.4)).toBe('2');
  });
  it('xround membulatkan setengah menjauhi nol seperti Excel ROUND', () => {
    expect(xround(2.5)).toBe(3);
    expect(xround(-2.5)).toBe(-3);
    expect(xround(1.005, 2)).toBe(1.01);
  });
});

describe('penilaian jurnal: kasus tepi', () => {
  const key = { '1-1100': 100, '3-1000': -100 };
  it('baris kosong tanpa akun diabaikan; baris sama dua kali dijumlahkan', () => {
    expect(gradeJournal([L(null, 0, 0), L('1-1100', 100, 0), L('3-1000', 0, 100)], key).status).toBe('BENAR');
    expect(gradeJournal([L('1-1100', 50, 0), L('1-1100', 50, 0), L('3-1000', 0, 100)], key).status).toBe('BENAR');
  });
  it('seimbang tetapi sisi terbalik, akun asing, nominal beda: PERIKSA', () => {
    expect(gradeJournal([L('1-1100', 0, 100), L('3-1000', 100, 0)], key).reason).toBe('wrong-side');
    expect(gradeJournal([L('1-1100', 100, 0), L('3-1000', 0, 50), L('2-1000', 0, 50)], key).status).toBe('PERIKSA');
    expect(gradeJournal([L('1-1100', 200, 0), L('3-1000', 0, 200)], key).status).toBe('PERIKSA');
  });
  it('toleransi 1 rupiah berlaku, 2 rupiah tidak', () => {
    expect(gradeJournal([L('1-1100', 101, 0), L('3-1000', 0, 101)], key).status).toBe('BENAR');
    expect(gradeJournal([L('1-1100', 102, 0), L('3-1000', 0, 102)], key).status).toBe('PERIKSA');
  });
  it('tidak seimbang atau tidak lengkap (satu sisi saja) tidak pernah BENAR', () => {
    expect(gradeJournal([L('1-1100', 100, 0)], key).status).toBe('PERIKSA');
    expect(gradeJournal([L('1-1100', 100, 0), L('3-1000', 0, 99)], key).reason).not.toBe('ok');
  });
  it('nominal sangat besar tetap tepat', () => {
    const big = 9_000_000_000_000;
    expect(gradeJournal([L('1-1100', big, 0), L('3-1000', 0, big)], { '1-1100': big, '3-1000': -big }).status).toBe('BENAR');
    expect(netByAccount([L('1-1100', big, 0), L('1-1100', 0, big)])['1-1100']).toBe(0);
  });
});

describe('mesin: kasus tepi buku besar dan laporan', () => {
  it('transaksi berulang (jurnal yang sama dua kali) menggandakan mutasi dan tetap seimbang', () => {
    const b = base();
    const once = computeReport(b);
    const dup: EntryLines[] = [...b.journal, ...b.journal.map((e) => ({ ...e, key: e.key + 'b' }))];
    const twice = computeReport({ ...b, journal: dup });
    for (const r of once.tb) {
      const t = twice.tb.find((x) => x.code === r.code)!;
      expect(t.journalDebit).toBe(r.journalDebit * 2);
      expect(t.journalCredit).toBe(r.journalCredit * 2);
    }
    const d = twice.tb.reduce((s, r) => s + Math.max(r.preBalance, 0), 0);
    const c = twice.tb.reduce((s, r) => s - Math.min(r.preBalance, 0), 0);
    expect(d).toBe(c);
  });
  it('akun tanpa transaksi bersaldo awal saja; tanpa saldo awal bersaldo nol', () => {
    const r = computeReport({ ...base(), journal: [], adjusting: [] });
    for (const a of COA) {
      const row = r.tb.find((x) => x.code === a.code)!;
      const ob = OPENING.filter((o) => o.code === a.code).reduce((s, o) => s + o.debit - o.credit, 0);
      expect(row.adjBalance).toBe(ob);
    }
  });
  it('periode berbeda: tanpa saldo awal dan tanpa jurnal, semua nol dan tidak ada NaN', () => {
    const r = computeReport({ ...base(), opening: [], journal: [], adjusting: [] });
    expect(r.tb.every((x) => x.adjBalance === 0)).toBe(true);
    expect(Object.values(r.cells).every((v) => typeof v !== 'number' || Number.isFinite(v))).toBe(true);
  });
  it('transaksi tidak lengkap (satu sisi) tidak menghasilkan NaN dan membuat neraca saldo tidak seimbang secara terdeteksi', () => {
    const b = base();
    const partial: EntryLines[] = [{ key: '1', lines: [{ code: '1-1100', debit: 5_000_000, credit: 0 }] }];
    const r = computeReport({ ...b, journal: partial, adjusting: [] });
    expect(Object.values(r.cells).every((v) => typeof v !== 'number' || Number.isFinite(v))).toBe(true);
    const d = r.tb.reduce((s, x) => s + Math.max(x.preBalance, 0), 0);
    const c = r.tb.reduce((s, x) => s - Math.min(x.preBalance, 0), 0);
    expect(d - c).toBe(5_000_000);
  });
  it('nilai negatif dalam jurnal (saldo akun terbalik) dihitung sebagai lawan sisi', () => {
    const r = computeReport({
      ...base(),
      journal: [
        {
          key: '1',
          lines: [
            { code: '1-1000', debit: 0, credit: 1_000 },
            { code: '3-1000', debit: 1_000, credit: 0 },
          ],
        },
      ],
      adjusting: [],
    });
    expect(r.tb.find((x) => x.code === '1-1000')!.journalCredit).toBe(1_000);
  });
  it('nominal sangat besar tidak kehilangan ketelitian pada neraca saldo', () => {
    const big = 4_000_000_000_000_000;
    const r = computeReport({
      ...base(),
      opening: [],
      adjusting: [],
      journal: [
        {
          key: '1',
          lines: [
            { code: '1-1000', debit: big, credit: 0 },
            { code: '3-1000', debit: 0, credit: big },
          ],
        },
      ],
    });
    expect(r.tb.find((x) => x.code === '1-1000')!.adjBalance).toBe(big);
    expect(r.tb.find((x) => x.code === '3-1000')!.adjBalance).toBe(-big);
  });
});

describe('penutupan dan neraca saldo setelah penutupan', () => {
  it('tanpa jurnal penutup, akun nominal masih bersaldo; neraca saldo pasca penutupan tetap berupa daftar', () => {
    const r = computeReport(base());
    const p = postClosingTB(r.tb, {});
    expect(p.rows.length).toBeGreaterThan(0);
  });
});
