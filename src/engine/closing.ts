import type { TBRow } from './types';
import { xround } from './excel';
import type { GradeResult } from '../validation/grade';

export interface ClosingEntry {
  debit: number;
  credit: number;
}
export type ClosingInput = Readonly<Record<string, ClosingEntry>>;

export const INCOME_SUMMARY = '3-3000';
export const DIVIDENDS = '3-9000';

const balOf = (tb: readonly TBRow[], code: string) => tb.find((r) => r.code === code)?.adjBalance ?? 0;

/**
 * Isian benar satu baris penutup (sheet 16): akun nominal ditutup ke sisi lawannya.
 * Ikhtisar Laba Rugi menutup ke Saldo Laba sadar tanda: laba -> debit Ikhtisar; rugi -> kredit Ikhtisar.
 */
export function expectedClosing(code: string, tb: readonly TBRow[], netIncome: number): ClosingEntry {
  const bal = balOf(tb, code);
  if (code === INCOME_SUMMARY) return netIncome >= 0 ? { debit: netIncome, credit: 0 } : { debit: 0, credit: -netIncome };
  if (code === DIVIDENDS) return { debit: 0, credit: bal };
  return { debit: Math.max(-bal, 0), credit: Math.max(bal, 0) };
}

/**
 * Nilai satu baris jurnal penutup. journalHasEntries = jurnal umum sudah berisi (rumus: 07!F3 <> 0);
 * akun bersaldo nol dianggap benar setelah jurnal diisi.
 */
export function gradeClosingRow(
  code: string,
  entry: ClosingEntry | undefined,
  tb: readonly TBRow[],
  netIncome: number,
  journalHasEntries: boolean,
): GradeResult {
  const e = entry ?? { debit: 0, credit: 0 };
  const bal = balOf(tb, code);
  const empty = e.debit === 0 && e.credit === 0;
  const ok: GradeResult = { status: 'BENAR', reason: 'ok', message: 'Benar.', hint: { missing: [], extra: [], wrongSide: [], wrongAmount: [] } };
  const bad = (m: string): GradeResult => ({
    status: 'PERIKSA',
    reason: 'wrong-amount',
    message: m,
    hint: { missing: [], extra: [], wrongSide: [], wrongAmount: [] },
  });
  const blank: GradeResult = {
    status: 'BELUM DIISI',
    reason: 'empty',
    message: 'Belum diisi.',
    hint: { missing: [], extra: [], wrongSide: [], wrongAmount: [] },
  };

  if (code === INCOME_SUMMARY) {
    if (empty) return blank;
    const exp = expectedClosing(code, tb, netIncome);
    if (xround(e.debit - exp.debit, 0) === 0 && xround(e.credit - exp.credit, 0) === 0) return ok;
    if (netIncome < 0 && e.debit !== 0 && e.credit === 0)
      return bad('Laporan Laba Rugi Anda menunjukkan rugi: Ikhtisar Laba Rugi dikredit (Saldo Laba didebit).');
    if (netIncome >= 0 && e.credit !== 0 && e.debit === 0)
      return bad('Laporan Laba Rugi Anda menunjukkan laba: Ikhtisar Laba Rugi didebit (Saldo Laba dikredit).');
    return bad('Selisih dengan laba/rugi bersih pada Laporan Laba Rugi.');
  }
  if (code === DIVIDENDS) {
    if (empty && (xround(bal, 0) !== 0 || !journalHasEntries)) return blank;
    return xround(e.credit - bal, 0) === 0 ? ok : bad('Bandingkan dengan saldo pada neraca saldo setelah penyesuaian.');
  }
  if (empty && (xround(bal, 0) !== 0 || !journalHasEntries)) return blank;
  const exp = expectedClosing(code, tb, netIncome);
  return xround(e.debit - exp.debit, 0) === 0 && xround(e.credit - exp.credit, 0) === 0
    ? ok
    : bad('Bandingkan dengan saldo pada neraca saldo setelah penyesuaian.');
}

export interface PostClosingRow {
  code: string;
  name: string;
  debit: number;
  credit: number;
}

/** Neraca saldo setelah penutupan (sheet 17): hanya akun riil; Saldo Laba memuat jurnal penutup Anda. */
export function postClosingTB(tb: readonly TBRow[], closing: ClosingInput): { rows: PostClosingRow[]; debit: number; credit: number } {
  const real = tb.filter((r) => /^[123]-/.test(r.code) && r.code !== INCOME_SUMMARY && r.code !== DIVIDENDS);
  const rows: PostClosingRow[] = real.map((r) => {
    let bal = r.adjBalance;
    // Saldo kredit bernilai negatif. Debit Ikhtisar (laba) menambah saldo kredit Saldo Laba; kredit Ikhtisar (rugi) menguranginya.
    if (r.code === '3-2000')
      bal = r.adjBalance - (closing[INCOME_SUMMARY]?.debit ?? 0) + (closing[INCOME_SUMMARY]?.credit ?? 0) + (closing[DIVIDENDS]?.credit ?? 0);
    return { code: r.code, name: r.name, debit: bal > 0 ? bal : 0, credit: bal < 0 ? -bal : 0 };
  });
  return { rows, debit: rows.reduce((t, r) => t + r.debit, 0), credit: rows.reduce((t, r) => t + r.credit, 0) };
}
