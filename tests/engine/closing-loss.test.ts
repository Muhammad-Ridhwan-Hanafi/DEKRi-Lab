import { describe, expect, it } from 'vitest';
import { computeReport } from '../../src/engine';
import { DIVIDENDS, INCOME_SUMMARY, expectedClosing, gradeClosingRow, postClosingTB, type ClosingInput } from '../../src/engine/closing';
import closingData from '../../data/closing-reversing.json';
import { keyLedgerInput } from '../helpers';

// Buku rugi: hapus seluruh transaksi yang menyentuh pendapatan penjualan (tetap seimbang), beban tetap berjalan.
const input = keyLedgerInput();
const lossInput = { ...input, journal: input.journal.filter((j) => !j.lines.some((l) => l.code === '4-1000')) };
const report = computeReport(lossInput);
const netIncome = report.cells.S12_B53 as number;

const keyClosing = (): ClosingInput => Object.fromEntries(closingData.closingRows.map((r) => [r.code, expectedClosing(r.code, report.tb, netIncome)]));

describe('penutupan sadar tanda (rugi bersih)', () => {
  it('skenario uji memang rugi', () => {
    expect(netIncome).toBeLessThan(0);
  });

  it('Ikhtisar Laba Rugi dikredit sebesar rugi, bukan didebit', () => {
    expect(expectedClosing(INCOME_SUMMARY, report.tb, netIncome)).toEqual({ debit: 0, credit: -netIncome });
  });

  it('jawaban kredit dinilai BENAR; jawaban debit (arah laba) dinilai PERIKSA dengan petunjuk rugi', () => {
    expect(gradeClosingRow(INCOME_SUMMARY, { debit: 0, credit: -netIncome }, report.tb, netIncome, true).status).toBe('BENAR');
    const wrong = gradeClosingRow(INCOME_SUMMARY, { debit: -netIncome, credit: 0 }, report.tb, netIncome, true);
    expect(wrong.status).toBe('PERIKSA');
    expect(wrong.message).toMatch(/rugi/i);
    expect(gradeClosingRow(INCOME_SUMMARY, undefined, report.tb, netIncome, true).status).toBe('BELUM DIISI');
  });

  it('neraca saldo setelah penutupan seimbang dan Saldo Laba cocok dengan laporan posisi keuangan', () => {
    const pc = postClosingTB(report.tb, keyClosing());
    expect(pc.debit).toBe(pc.credit);
    const re = pc.rows.find((r) => r.code === '3-2000')!;
    expect(re.credit - re.debit).toBe(report.cells.S14_B59);
  });

  it('semua baris penutup yang benar dinilai BENAR', () => {
    const closing = keyClosing();
    for (const r of closingData.closingRows) expect(gradeClosingRow(r.code, closing[r.code], report.tb, netIncome, true).status, r.code).toBe('BENAR');
    expect(DIVIDENDS).toBe('3-9000');
  });
});
