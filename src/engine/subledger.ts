import type { JournalLine } from './types';

/** Buku pembantu per pihak dan kartu persediaan; turunan murni dari jurnal pengguna. */
export interface TxnRef {
  no: number;
  date: string;
  party: string;
  topic: string;
}
export interface Movement {
  no: number;
  date: string;
  party: string;
  topic: string;
  debit: number;
  credit: number;
}
export interface PartyTotal {
  party: string;
  debit: number;
  credit: number;
  net: number; // debit - kredit
  count: number;
}

const used = (lines: readonly JournalLine[] | undefined, code: string) =>
  (lines ?? []).filter((l) => l.code === code).reduce((t, l) => [t[0] + l.debit, t[1] + l.credit] as [number, number], [0, 0] as [number, number]);

/** Mutasi akun kontrol per transaksi, urut nomor. Transaksi tanpa mutasi pada akun itu dilewati. */
export function movements(code: string, txns: readonly TxnRef[], journal: Readonly<Record<string, JournalLine[]>>): Movement[] {
  const out: Movement[] = [];
  for (const t of txns) {
    const [debit, credit] = used(journal[String(t.no)], code);
    if (debit || credit) out.push({ no: t.no, date: t.date, party: t.party, topic: t.topic, debit, credit });
  }
  return out;
}

export function byParty(moves: readonly Movement[]): PartyTotal[] {
  const m = new Map<string, PartyTotal>();
  for (const v of moves) {
    const p = m.get(v.party) ?? { party: v.party, debit: 0, credit: 0, net: 0, count: 0 };
    p.debit += v.debit;
    p.credit += v.credit;
    p.net = p.debit - p.credit;
    p.count++;
    m.set(v.party, p);
  }
  return [...m.values()].sort((a, b) => a.party.localeCompare(b.party));
}

export interface Reconciliation {
  opening: number;
  mutation: number;
  expected: number;
  control: number;
  ok: boolean;
}
/** Saldo awal + mutasi semua pihak harus sama dengan saldo akun kontrol di buku besar (sebelum penyesuaian). */
export function reconcile(opening: number, moves: readonly Movement[], controlPre: number): Reconciliation {
  const mutation = moves.reduce((t, v) => t + v.debit - v.credit, 0);
  const expected = opening + mutation;
  return { opening, mutation, expected, control: controlPre, ok: expected === controlPre };
}

// ---------- kartu persediaan ----------
export interface InventoryRow {
  no: number | null;
  date: string;
  note: string;
  inAmount: number;
  outAmount: number;
  balance: number;
}
/**
 * Kartu persediaan dalam nilai rupiah (data kasus tidak memuat kuantitas, jadi tidak ada harga rata-rata per unit).
 * Baris pertama saldo awal, lalu tiap transaksi yang menyentuh akun persediaan.
 */
export function inventoryCard(opening: number, txns: readonly TxnRef[], journal: Readonly<Record<string, JournalLine[]>>, code = '1-1400'): InventoryRow[] {
  const rows: InventoryRow[] = [{ no: null, date: '', note: 'Saldo awal', inAmount: 0, outAmount: 0, balance: opening }];
  let bal = opening;
  for (const m of movements(code, txns, journal)) {
    bal += m.debit - m.credit;
    rows.push({ no: m.no, date: m.date, note: m.topic, inAmount: m.debit, outAmount: m.credit, balance: bal });
  }
  return rows;
}
