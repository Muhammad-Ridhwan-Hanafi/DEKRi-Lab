// Fixture dibuat oleh tools/fill_workbook_with_key.py: workbook diisi jawaban kunci lalu dihitung ulang LibreOffice.
import { describe, expect, it } from 'vitest';
import fixture from './excel-values.json';
import { computeReport } from '../../src/engine';
import { runChecks } from '../../src/engine/checks';
import { expectedClosing, postClosingTB, type ClosingInput } from '../../src/engine/closing';
import closingData from '../../data/closing-reversing.json';
import { keyLedgerInput } from '../helpers';

const report = computeReport(keyLedgerInput());
const netIncome = report.cells.S12_B53 as number;
const closing: ClosingInput = Object.fromEntries(closingData.closingRows.map((r) => [r.code, expectedClosing(r.code, report.tb, netIncome)]));

describe('engine sama dengan Excel (dihitung ulang LibreOffice) sel demi sel', () => {
  it('298 sel laporan 12, 12A, 13, 14, 15, 15A', () => {
    const ids = Object.keys(fixture.cells);
    expect(ids).toHaveLength(298);
    const diffs: string[] = [];
    for (const id of ids) {
      const x = (fixture.cells as Record<string, number | string>)[id];
      const mine = report.cells[id];
      const same = typeof x === 'number' && typeof mine === 'number' ? Math.abs(x - mine) <= 1e-6 * Math.max(1, Math.abs(x)) : x === mine;
      if (!same) diffs.push(`${id}: excel=${String(x)} engine=${String(mine)}`);
    }
    expect(diffs).toEqual([]);
  });

  it('neraca saldo sebelum dan sesudah penyesuaian (sheet 09 dan 11)', () => {
    for (const r of report.tb) {
      expect(r.preBalance, `09 ${r.code}`).toBe((fixture.preTB as Record<string, number>)[r.code]);
      expect(r.adjBalance, `11 ${r.code}`).toBe((fixture.adjTB as Record<string, number>)[r.code]);
    }
  });

  it('neraca saldo setelah penutupan (sheet 17) dengan jurnal penutup yang sama', () => {
    const pc = postClosingTB(report.tb, closing);
    for (const r of pc.rows) expect(r.debit - r.credit, `17 ${r.code}`).toBe((fixture.postClosingTB as Record<string, number>)[r.code]);
  });

  it('14 pemeriksaan sheet 23: status engine = status Excel (semua BENAR)', () => {
    expect(fixture.checks.every((c: string) => c.startsWith('BENAR'))).toBe(true);
    expect(runChecks(report, closing).every((c) => c.ok)).toBe(true);
  });
});
