import { describe, expect, it } from 'vitest';
import { KEY, TRANSACTIONS } from '../../src/data';
import { gradeAnalysis, gradeErrorType, gradeJournal, gradeNoJournal, gradeScenario } from '../../src/validation/grade';
import type { JournalLine } from '../../src/engine/types';

let id = 0;
const L = (code: string | null, debit = 0, credit = 0): JournalLine => ({ id: String(++id), code, debit, credit, memo: '' });
const fromKey = (lines: Array<{ code: string; debit: number; credit: number }>) => lines.map((l) => L(l.code, l.debit, l.credit));

describe('gradeJournal (transaksi 4: penjualan tunai + HPP)', () => {
  const keyNet = KEY.txnNet['4'];
  const good = [L('1-1100', 95000000, 0), L('4-1000', 0, 95000000), L('5-1000', 57000000, 0), L('1-1400', 0, 57000000)];

  it('jurnal benar = BENAR', () => expect(gradeJournal(good, keyNet).status).toBe('BENAR'));
  it('baris dipecah ke beberapa baris tetap BENAR (neto sama)', () => {
    const split = [L('1-1100', 50000000, 0), L('1-1100', 45000000, 0), ...good.slice(1)];
    expect(gradeJournal(split, keyNet).status).toBe('BENAR');
  });
  it('urutan baris tidak berpengaruh', () => expect(gradeJournal([...good].reverse(), keyNet).status).toBe('BENAR'));
  it('selisih Rp1 masih dianggap benar (toleransi workbook)', () => {
    const near = [L('1-1100', 95000001, 0), ...good.slice(1)];
    // tidak seimbang -> PERIKSA; seimbangkan di sisi kredit
    const bal = [L('1-1100', 95000001, 0), L('4-1000', 0, 95000001), ...good.slice(2)];
    expect(gradeJournal(near, keyNet).reason).toBe('unbalanced');
    expect(gradeJournal(bal, keyNet).status).toBe('BENAR');
  });
  it('kosong = BELUM DIISI', () => expect(gradeJournal([], keyNet).status).toBe('BELUM DIISI'));
  it('baris tanpa akun diabaikan', () => expect(gradeJournal([L(null, 5, 0)], keyNet).status).toBe('BELUM DIISI'));
  it('tidak seimbang = PERIKSA', () => {
    const r = gradeJournal([L('1-1100', 95000000, 0), L('4-1000', 0, 90000000)], keyNet);
    expect(r.status).toBe('PERIKSA');
    expect(r.reason).toBe('unbalanced');
  });
  it('akun berlebih dilaporkan tanpa membuka nominal kunci', () => {
    const r = gradeJournal([...good.slice(0, 2), L('6-1000', 57000000, 0), L('1-1400', 0, 57000000)], keyNet);
    expect(r.reason).toBe('extra-account');
    expect(r.hint.extra).toEqual(['6-1000']);
    expect(r.hint.missing).toEqual(['5-1000']);
    expect(JSON.stringify(r)).not.toContain('57000000');
  });
  it('sisi terbalik terdeteksi', () => {
    const r = gradeJournal([L('1-1100', 0, 95000000), L('4-1000', 95000000, 0), L('5-1000', 57000000, 0), L('1-1400', 0, 57000000)], keyNet);
    expect(r.reason).toBe('wrong-side');
    expect(r.hint.wrongSide.sort()).toEqual(['1-1100', '4-1000']);
  });
  it('nominal salah terdeteksi per akun', () => {
    const r = gradeJournal([L('1-1100', 90000000, 0), L('4-1000', 0, 90000000), ...good.slice(2)], keyNet);
    expect(r.status).toBe('PERIKSA');
    expect(r.hint.wrongAmount.sort()).toEqual(['1-1100', '4-1000']);
  });
  it('akun kurang (jurnal HPP terlewat)', () => {
    const r = gradeJournal(good.slice(0, 2), keyNet);
    expect(r.status).toBe('PERIKSA');
    expect(r.hint.missing.sort()).toEqual(['1-1400', '5-1000']);
  });
});

describe('seluruh jurnal kunci dinilai BENAR (kunci konsisten dengan penilai)', () => {
  it('147 transaksi: pengecoh via keputusan, sisanya via jurnal terbaca', () => {
    let nonDistractors = 0;
    for (const t of KEY.readableTxn) {
      const keyNet = KEY.txnNet[String(t.no)];
      if (!keyNet) {
        expect(gradeNoJournal([], true).status).toBe('BENAR');
        expect(gradeNoJournal(fromKey(t.lines), false).status).toBe('PERIKSA');
        continue;
      }
      nonDistractors++;
      expect(gradeJournal(fromKey(t.lines), keyNet).status, `txn ${t.no}`).toBe('BENAR');
    }
    expect(nonDistractors).toBe(136);
  });
  it('28 penyesuaian', () => {
    for (const a of KEY.readableAdj) expect(gradeJournal(fromKey(a.lines), KEY.adjNet[a.code]).status, a.code).toBe('BENAR');
  });
  it('pengecoh pada transaksi sumber = pengecoh pada kunci analisis', () => {
    for (const t of TRANSACTIONS) expect(KEY.analysis[String(t.no)].debit === '-', `txn ${t.no}`).toBe(t.isDistractor);
  });
});

describe('analisis, jenis kesalahan, skenario', () => {
  const k = KEY.analysis['4'];
  const full = {
    decision: 'Perlu jurnal' as const,
    cashClass: k.cashClass!,
    needsAdj: k.needsAdj!,
    affectsProfit: k.affectsProfit!,
    affectsCash: k.affectsCash!,
  };
  it('analisis lengkap benar', () => expect(gradeAnalysis(full, k).status).toBe('BENAR'));
  it('urutan kesalahan pertama dilaporkan', () => {
    expect(gradeAnalysis({ ...full, needsAdj: full.needsAdj === 'Ya' ? 'Tidak' : 'Ya' }, k).message).toMatch(/penyesuaian/);
    expect(gradeAnalysis({ decision: 'Perlu jurnal' }, k).reason).toBe('incomplete');
    expect(gradeAnalysis(undefined, k).status).toBe('BELUM DIISI');
    expect(gradeAnalysis({ decision: 'Tidak perlu jurnal' }, k).reason).toBe('needed');
  });
  it('klasifikasi arus kas tidak dinilai: salah atau kosong tetap BENAR, dampak kas tetap dinilai', () => {
    expect(gradeAnalysis({ ...full, cashClass: 'Pendanaan' }, k).status).toBe('BENAR');
    expect(gradeAnalysis({ ...full, cashClass: undefined }, k).status).toBe('BENAR');
    expect(gradeAnalysis({ ...full, affectsCash: full.affectsCash === 'Ya' ? 'Tidak' : 'Ya' }, k).message).toMatch(/Dampak kas/);
  });
  it('jenis kesalahan', () => {
    expect(gradeErrorType(undefined, KEY.errorType['1']).status).toBe('BELUM DIISI');
    expect(gradeErrorType(KEY.errorType['1'], KEY.errorType['1']).status).toBe('BENAR');
    expect(gradeErrorType('Salah nominal', KEY.errorType['1']).status).toBe('PERIKSA');
  });
  it('skenario angka memakai toleransi Rp1.000; pilihan harus cocok persis', () => {
    expect(gradeScenario(619000500, 619000000, 'numeric').status).toBe('BENAR');
    expect(gradeScenario(616000000, 619000000, 'numeric').status).toBe('PERIKSA');
    expect(gradeScenario('A dan C', 'A dan C', 'choice').status).toBe('BENAR');
    expect(gradeScenario('Hanya A', 'A dan C', 'choice').status).toBe('PERIKSA');
    expect(gradeScenario(undefined, 1, 'numeric').status).toBe('BELUM DIISI');
  });
});

describe('arus kas tidak bergantung pada isian pengguna', () => {
  it('masukan engine membawa cfSub dari kunci, apa pun isian analisis pengguna', async () => {
    const { ledgerInputFor } = await import('../../src/store/derive');
    const { emptyState } = await import('../../src/store/state');
    const a = ledgerInputFor(emptyState());
    const s = emptyState();
    s.analysis = { '4': { decision: 'Perlu jurnal', cashClass: 'Pendanaan' } };
    const b = ledgerInputFor(s);
    expect(b.cfSub).toEqual(a.cfSub);
    expect(Object.keys(a.cfSub ?? {}).length).toBeGreaterThan(0);
  });
});
