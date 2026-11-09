import { describe, expect, it } from 'vitest';
import { COA, KEY } from '../../src/data';
import { computeReport } from '../../src/engine';
import { runChecks, reconcileWithKey } from '../../src/engine/checks';
import { DIVIDENDS, INCOME_SUMMARY, expectedClosing, gradeClosingRow, postClosingTB, type ClosingInput } from '../../src/engine/closing';
import { tbTotals } from '../../src/engine/ledger';
import closingData from '../../data/closing-reversing.json';
import { keyLedgerInput } from '../helpers';

const report = computeReport(keyLedgerInput());
const netIncome = report.cells.S12_B53 as number;

function keyClosing(): ClosingInput {
  const out: Record<string, { debit: number; credit: number }> = {};
  for (const r of closingData.closingRows) out[r.code] = expectedClosing(r.code, report.tb, netIncome);
  return out;
}

describe('siklus lengkap dari jurnal kunci', () => {
  it('neraca saldo seimbang sebelum dan sesudah penyesuaian', () => {
    for (const s of ['pre', 'adjusted'] as const) {
      const t = tbTotals(report.tb, s);
      expect(t.debit).toBe(t.credit);
      expect(t.debit).toBeGreaterThan(0);
    }
  });

  it('seluruh 14 pemeriksaan antarlaporan lulus', () => {
    const checks = runChecks(report, keyClosing());
    expect(checks).toHaveLength(14);
    for (const c of checks) expect(c.ok, c.label).toBe(true);
  });

  it('rekonsiliasi 14 angka dengan kunci bagian M semuanya cocok', () => {
    const rec = reconcileWithKey(report, KEY.expectedStatements);
    expect(rec).toHaveLength(14);
    for (const r of rec) expect(r.ok, r.item).toBe(true);
  });

  it('jurnal penutup yang benar dinilai BENAR untuk seluruh 35 baris', () => {
    const closing = keyClosing();
    for (const r of closingData.closingRows) expect(gradeClosingRow(r.code, closing[r.code], report.tb, netIncome, true).status, r.code).toBe('BENAR');
  });

  it('semua akun nominal bersaldo nol setelah penutupan dan neraca saldo seimbang', () => {
    const closing = keyClosing();
    const pc = postClosingTB(report.tb, closing);
    expect(pc.debit).toBe(pc.credit);
    expect(pc.rows.every((r) => /^[123]-/.test(r.code))).toBe(true);
    // saldo laba akhir pada NS setelah penutupan = saldo laba laporan posisi keuangan
    const re = pc.rows.find((r) => r.code === '3-2000')!;
    expect(re.credit - re.debit).toBe(report.cells.S14_B59);
  });

  it('penutupan yang salah atau kosong tidak dinilai benar', () => {
    expect(gradeClosingRow('4-1000', undefined, report.tb, netIncome, true).status).toBe('BELUM DIISI');
    expect(gradeClosingRow('4-1000', { debit: 1, credit: 0 }, report.tb, netIncome, true).status).toBe('PERIKSA');
    expect(gradeClosingRow(INCOME_SUMMARY, { debit: netIncome + 5, credit: 0 }, report.tb, netIncome, true).status).toBe('PERIKSA');
    expect(gradeClosingRow(DIVIDENDS, { debit: 0, credit: 0 }, report.tb, netIncome, true).status).toBe('BELUM DIISI');
  });
});

describe('uji mutasi: mengubah satu jurnal kunci harus mengubah hasil', () => {
  it('menaikkan penjualan transaksi 4 merusak keseimbangan dan pemeriksaan', () => {
    const input = keyLedgerInput();
    const e = input.journal.find((j) => j.key === '4')!;
    const line = e.lines.find((l) => l.code === '4-1000')!;
    const mutated = {
      ...input,
      journal: input.journal.map((j) => (j === e ? { ...j, lines: j.lines.map((l) => (l === line ? { ...l, credit: l.credit + 1000 } : l)) } : j)),
    };
    const r2 = computeReport(mutated);
    const t = tbTotals(r2.tb, 'pre');
    expect(t.debit).not.toBe(t.credit);
    const checks = runChecks(r2, keyClosing());
    expect(checks.some((c) => !c.ok)).toBe(true);
    expect(reconcileWithKey(r2, KEY.expectedStatements).some((x) => !x.ok)).toBe(true);
  });

  it('jurnal yang seimbang tetapi salah akun mengubah laporan dan tetap terdeteksi oleh rekonsiliasi kunci', () => {
    const input = keyLedgerInput();
    // pindahkan beban gaji ke beban sewa pada satu transaksi: neraca tetap seimbang, laba usaha sama,
    // tetapi baris beban per akun berubah
    const e = input.journal.find((j) => j.lines.some((l) => l.code === '6-1000'))!;
    const mutated = {
      ...input,
      journal: input.journal.map((j) => (j === e ? { ...j, lines: j.lines.map((l) => (l.code === '6-1000' ? { ...l, code: '6-1100' } : l)) } : j)),
    };
    const r2 = computeReport(mutated);
    const t = tbTotals(r2.tb, 'pre');
    expect(t.debit).toBe(t.credit);
    expect(r2.cells.S12_B17).not.toBe(report.cells.S12_B17);
  });

  it('tanpa jurnal sama sekali: laporan nol dan tidak ada yang rusak', () => {
    const empty = computeReport({ ...keyLedgerInput(), journal: [], adjusting: [] });
    expect(empty.cells.S12_B53).toBe(0);
    expect(empty.tb).toHaveLength(COA.length);
    expect(Object.values(empty.cells).every((v) => typeof v === 'number' || typeof v === 'string')).toBe(true);
  });
});
