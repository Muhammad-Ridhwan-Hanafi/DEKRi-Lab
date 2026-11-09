import { describe, expect, it } from 'vitest';
import { KEY } from '../../src/data';
import { computeReport } from '../../src/engine';
import { KEY_STATEMENT_CELLS } from '../../src/engine/key-map';
import { keyLedgerInput } from '../helpers';

const report = computeReport(keyLedgerInput());

describe('kesetaraan dengan kunci workbook (bagian L dan M)', () => {
  it('neraca saldo sebelum dan sesudah penyesuaian sama untuk seluruh 84 akun', () => {
    expect(report.tb).toHaveLength(84);
    for (const r of report.tb) {
      const e = KEY.expectedTB[r.code];
      expect(e, r.code).toBeDefined();
      expect(r.preBalance, `pre ${r.code}`).toBe(e.pre);
      expect(r.adjBalance, `adj ${r.code}`).toBe(e.adj);
    }
  });

  it('14 angka laporan keuangan sama dengan bagian M', () => {
    expect(KEY.expectedStatements).toHaveLength(KEY_STATEMENT_CELLS.length);
    for (const exp of KEY.expectedStatements) {
      const map = KEY_STATEMENT_CELLS.find((m) => m.item === exp.item);
      expect(map, exp.item).toBeDefined();
      expect(report.cells[map!.cell], exp.item).toBe(exp.value);
    }
  });
});
