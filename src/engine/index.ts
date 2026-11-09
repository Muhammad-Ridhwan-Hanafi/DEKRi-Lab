import { buildLedger, type Ledger, type LedgerInput } from './ledger';
import { computeStatements, type StatementCells } from './statements.generated';

export { buildLedger, tbTotals } from './ledger';
export { computeStatements, STATEMENT_LAYOUT } from './statements.generated';
export type { StatementCells } from './statements.generated';

export interface Report extends Ledger {
  cells: StatementCells;
}

/** Hitung seluruh laporan dari saldo awal dan jurnal. Tidak ada state tersembunyi. */
export function computeReport(input: LedgerInput): Report {
  const ledger = buildLedger(input);
  return { ...ledger, cells: computeStatements(ledger.tables) };
}
