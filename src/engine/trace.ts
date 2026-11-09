import { computeReport } from './index';
import type { LedgerInput } from './ledger';
import type { EntryLines } from './types';

/**
 * Penelusuran angka laporan ke baris jurnal dengan analisis sensitivitas:
 * setiap baris (saldo awal, jurnal transaksi, jurnal penyesuaian) digeser sebesar PERTURB,
 * lalu seluruh laporan dihitung ulang. Sel yang berubah = sel yang dibentuk baris itu.
 * Mesin laporan tidak diubah sama sekali, sehingga penelusuran selalu sejalan dengan angka yang tampil.
 */

const PERTURB = 1_000_000;

export type TraceSource = 'opening' | 'txn' | 'adj';

export interface TraceLine {
  source: TraceSource;
  /** no. transaksi, kode AJ, atau kode akun (saldo awal) */
  key: string;
  code: string;
  side: 'D' | 'K';
  amount: number;
  /** perubahan angka laporan bila baris ini naik Rp1.000.000 (tanda menunjukkan arah pengaruh) */
  effect: number;
}

export interface TraceIndex {
  /** id sel -> baris yang membentuknya */
  byCell: Map<string, TraceLine[]>;
  runs: number;
}

type Candidate = { line: Omit<TraceLine, 'effect'>; input: LedgerInput };

function candidates(input: LedgerInput): Candidate[] {
  const out: Candidate[] = [];
  input.opening.forEach((o, i) => {
    if (!o.debit && !o.credit) return;
    const side = o.debit ? 'D' : 'K';
    const opening = input.opening.map((x, k) =>
      k === i ? { ...x, debit: o.debit ? x.debit + PERTURB : x.debit, credit: o.debit ? x.credit : x.credit + PERTURB } : x,
    );
    out.push({ line: { source: 'opening', key: o.code, code: o.code, side, amount: o.debit || o.credit }, input: { ...input, opening } });
  });
  const entryCands = (kind: 'journal' | 'adjusting', source: TraceSource) => {
    input[kind].forEach((e, ei) => {
      e.lines.forEach((l, li) => {
        if (!l.debit && !l.credit) return;
        const entries: EntryLines[] = input[kind].map((x, k) =>
          k !== ei
            ? x
            : {
                ...x,
                lines: x.lines.map((y, m) =>
                  m !== li ? y : { ...y, debit: l.debit ? y.debit + PERTURB : y.debit, credit: l.debit ? y.credit : y.credit + PERTURB },
                ),
              },
        );
        out.push({ line: { source, key: e.key, code: l.code, side: l.debit ? 'D' : 'K', amount: l.debit || l.credit }, input: { ...input, [kind]: entries } });
      });
    });
  };
  entryCands('journal', 'txn');
  entryCands('adjusting', 'adj');
  return out;
}

/** Hitung indeks penelusuran untuk seluruh sel laporan (satu kali per keadaan jawaban). */
export function buildTraceIndex(input: LedgerInput): TraceIndex {
  const base = computeReport(input).cells as unknown as Record<string, number | string>;
  const byCell = new Map<string, TraceLine[]>();
  const cands = candidates(input);
  for (const c of cands) {
    const cells = computeReport(c.input).cells as unknown as Record<string, number | string>;
    for (const id of Object.keys(base)) {
      const a = base[id];
      const b = cells[id];
      if (typeof a !== 'number' || typeof b !== 'number') continue;
      const effect = b - a;
      if (Math.abs(effect) < 1e-6) continue;
      const list = byCell.get(id) ?? [];
      list.push({ ...c.line, effect });
      byCell.set(id, list);
    }
  }
  return { byCell, runs: cands.length };
}
