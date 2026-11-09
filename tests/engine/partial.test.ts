import { describe, expect, it } from 'vitest';
import { KEY } from '../../src/data';
import { DEFAULT_TOL, componentScore, gradeJournal } from '../../src/validation/grade';
import { closingVsKey, componentFor, summarizeComponents, toleranceFor, makeCtx, currentSignature } from '../../src/store/derive';
import { emptyState } from '../../src/store/state';
import { keyLedgerInput } from '../helpers';
import { computeReport } from '../../src/engine';

const line = (code: string, debit: number, credit: number) => ({ id: code + debit + credit, code, debit, credit, memo: '' });
const keyLines = (net: Record<string, number>) => Object.entries(net).map(([c, v]) => line(c, Math.max(v, 0), Math.max(-v, 0)));
const net2 = KEY.txnNet['2'];

describe('skor komponen', () => {
  it('jawaban kunci = skor penuh (3 komponen per akun) dan status BENAR', () => {
    const c = componentScore(keyLines(net2), net2)!;
    expect(c.total).toBe(Object.keys(net2).length * 3);
    expect(c.earned).toBe(c.total);
    expect(gradeJournal(keyLines(net2), net2).status).toBe('BENAR');
  });
  it('sisi terbalik: akun dapat, sisi dan nominal tidak; status tetap PERIKSA', () => {
    const [first, ...rest] = Object.keys(net2);
    const flipped = Object.fromEntries(Object.entries(net2).map(([k, v]) => [k, k === first ? -v : v]));
    const c = componentScore(keyLines(flipped), net2)!;
    expect(c.akun).toBe(rest.length + 1);
    expect(c.sisi).toBe(rest.length);
    expect(c.nominal).toBe(rest.length);
    expect(c.earned).toBeLessThan(c.total);
    expect(gradeJournal(keyLines(flipped), net2).status).toBe('PERIKSA');
  });
  it('nominal salah di satu akun: akun dan sisi tetap dihitung', () => {
    const [first] = Object.keys(net2);
    const off = { ...net2, [first]: net2[first] + 5000 };
    const c = componentScore(keyLines(off), net2)!;
    expect(c.akun).toBe(Object.keys(net2).length);
    expect(c.sisi).toBe(Object.keys(net2).length);
    expect(c.nominal).toBe(Object.keys(net2).length - 1);
  });
  it('akun berlebih mengurangi skor, tidak pernah di bawah 0; jurnal kosong null', () => {
    const c = componentScore([...keyLines(net2), line('1-9999', 10, 0)], net2)!;
    expect(c.extra).toBe(1);
    expect(c.earned).toBe(c.total - 1);
    expect(componentScore([line('1-9999', 1, 0)], net2)!.earned).toBe(0);
    expect(componentScore([], net2)).toBeNull();
  });
  it('ringkasan Dashboard hanya menghitung item yang sudah diperiksa dan tidak dibuka kuncinya', () => {
    const s = emptyState();
    s.journal['2'] = keyLines(net2) as never;
    const ctx = makeCtx(s);
    expect(summarizeComponents(s, ctx).items).toBe(0); // belum diperiksa
    s.checked['txn:2'] = currentSignature(s, 'txn', 2, ctx);
    const sum = summarizeComponents(s, makeCtx(s));
    expect(sum.items).toBe(1);
    expect(sum.ratio).toBe(1);
    expect(componentFor(s, 'txn', 2)!.earned).toBe(Object.keys(net2).length * 3);
    s.revealed.push('txn:2');
    expect(summarizeComponents(s, makeCtx(s)).items).toBe(0); // kunci dibuka: tidak dihitung
  });
});

describe('toleransi per soal', () => {
  const [first] = Object.keys(net2);
  const off1 = { ...net2, [first]: net2[first] + 1, [Object.keys(net2)[1]]: net2[Object.keys(net2)[1]] - 1 };
  it('bawaan 1 rupiah (setara workbook); toleransi 0 menolak selisih 1 rupiah', () => {
    expect(toleranceFor('txn', 2)).toBe(DEFAULT_TOL);
    expect(gradeJournal(keyLines(off1), net2).status).toBe('BENAR');
    expect(gradeJournal(keyLines(off1), net2, 0).status).toBe('PERIKSA');
    expect(componentScore(keyLines(off1), net2, 0)!.nominal).toBeLessThan(Object.keys(net2).length);
  });
});

describe('penutupan: sesuai kunci kasus', () => {
  it('isian benar menurut kunci kasus dinilai BENAR walau buku pengguna kosong', () => {
    const rep = computeReport(keyLedgerInput());
    const s = emptyState();
    const ni = rep.cells.S12_B53 as number;
    s.closing['3-3000'] = { debit: ni, credit: 0 };
    expect(closingVsKey(s, '3-3000').status).toBe('BENAR');
    s.closing['3-3000'] = { debit: ni + 5000, credit: 0 };
    expect(closingVsKey(s, '3-3000').status).toBe('PERIKSA');
  });
});
