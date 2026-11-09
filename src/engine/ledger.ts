import type { Account, EntryLines, OpeningBalance, Row, Tables, TBRow } from './types';

const CASH_ACCOUNTS = new Set(['1-1000', '1-1100', '1-1150']);

export interface LedgerInput {
  coa: readonly Account[];
  opening: readonly OpeningBalance[];
  journal: readonly EntryLines[]; // transaksi
  adjusting: readonly EntryLines[]; // penyesuaian
  /** Sub-kategori arus kas per no. transaksi (dari kunci analisis; kolom K sheet 07). */
  cfSub: Readonly<Record<string, string>>;
}

export interface Ledger {
  tb: TBRow[];
  tables: Tables;
}

/** Bentuk tabel sumber + neraca saldo dari saldo awal dan jurnal. Fungsi murni. */
export function buildLedger(input: LedgerInput): Ledger {
  const { coa, opening, journal, adjusting, cfSub } = input;

  const jrn: Row[] = [];
  for (const e of journal) {
    const sub = cfSub[e.key] ?? '';
    for (const l of e.lines) {
      const cash = CASH_ACCOUNTS.has(l.code) ? l.debit - l.credit : 0;
      jrn.push({ B: e.key, C: l.code, F: l.debit, G: l.credit, K: sub, L: cash });
    }
  }
  const adj: Row[] = [];
  for (const e of adjusting) for (const l of e.lines) adj.push({ A: e.key, E: l.code, G: l.debit, H: l.credit });

  const sumBy = (rows: Row[], codeCol: string, col: string) => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(String(r[codeCol]), (m.get(String(r[codeCol])) ?? 0) + Number(r[col]));
    return m;
  };
  const jd = sumBy(jrn, 'C', 'F');
  const jc = sumBy(jrn, 'C', 'G');
  const ad = sumBy(adj, 'E', 'G');
  const ac = sumBy(adj, 'E', 'H');
  const ob = new Map<string, number>();
  for (const o of opening) ob.set(o.code, (ob.get(o.code) ?? 0) + o.debit - o.credit);

  const tb: TBRow[] = coa.map((a) => {
    const opening = ob.get(a.code) ?? 0;
    const journalDebit = jd.get(a.code) ?? 0;
    const journalCredit = jc.get(a.code) ?? 0;
    const adjDebit = ad.get(a.code) ?? 0;
    const adjCredit = ac.get(a.code) ?? 0;
    const preBalance = opening + journalDebit - journalCredit;
    const adjBalance = preBalance + adjDebit - adjCredit;
    return { code: a.code, name: a.name, normal: a.normal, opening, journalDebit, journalCredit, adjDebit, adjCredit, preBalance, adjBalance };
  });

  const tables: Tables = {
    ATB: tb.map((r) => ({ A: r.code, D: Math.max(r.adjBalance, 0), E: Math.max(-r.adjBalance, 0) })),
    OB: opening.map((o) => ({ A: o.code, C: o.debit, D: o.credit })),
    JRN: jrn,
    ADJ: adj,
    GL: tb.map((r) => ({ L: r.code, P: r.journalDebit + r.adjDebit, Q: r.journalCredit + r.adjCredit })),
  };
  return { tb, tables };
}

export interface TBTotals {
  debit: number;
  credit: number;
}

/** Total kolom debit/kredit neraca saldo (sheet 09 atau 11): saldo positif = debit, negatif = kredit. */
export function tbTotals(tb: readonly TBRow[], stage: 'pre' | 'adjusted'): TBTotals {
  let debit = 0;
  let credit = 0;
  for (const r of tb) {
    const b = stage === 'pre' ? r.preBalance : r.adjBalance;
    if (b > 0) debit += b;
    else credit += -b;
  }
  return { debit, credit };
}
