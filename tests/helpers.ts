import { ADJUSTMENTS, COA, KEY, OPENING } from '../src/data';
import type { EntryLines } from '../src/engine/types';
import type { LedgerInput } from '../src/engine/ledger';

/** Masukan engine dari jurnal KUNCI (baris terbaca bagian J dan K). */
export function keyLedgerInput(): LedgerInput {
  const journal: EntryLines[] = KEY.readableTxn
    .filter((t) => t.lines.length > 0)
    .map((t) => ({ key: String(t.no), lines: t.lines.map((l) => ({ code: l.code, debit: l.debit, credit: l.credit })) }));
  const adjusting: EntryLines[] = KEY.readableAdj.map((a) => ({
    key: a.code,
    lines: a.lines.map((l) => ({ code: l.code, debit: l.debit, credit: l.credit })),
  }));
  const cfSub: Record<string, string> = {};
  for (const [no, a] of Object.entries(KEY.analysis)) if (a.cashSub) cfSub[no] = a.cashSub;
  void ADJUSTMENTS;
  return { coa: COA, opening: OPENING, journal, adjusting, cfSub };
}
