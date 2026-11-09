import { ADJUSTMENTS, CASE, COA, SCENARIOS, TRANSACTIONS } from '../data';

export type SearchKind = 'Transaksi' | 'Akun' | 'Penyesuaian' | 'Skenario' | 'Kasus' | 'SAK';

export interface SearchEntry {
  kind: SearchKind;
  title: string;
  sub: string;
  href: string;
  /** teks pencarian huruf kecil */
  hay: string;
}

const clip = (s: string, n = 110) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const row = (r: Array<string | null>) => r.filter((c): c is string => !!c).map((c) => c.trim());

/**
 * Indeks pencarian. Sengaja TIDAK memuat kunci jawaban, sehingga pencarian tidak membocorkan jawaban.
 */
export function buildIndex(): SearchEntry[] {
  const out: SearchEntry[] = [];
  const add = (kind: SearchKind, title: string, sub: string, href: string, ...extra: string[]) =>
    out.push({ kind, title, sub: clip(sub), href, hay: `${title} ${sub} ${extra.join(' ')}`.toLowerCase() });

  for (const t of TRANSACTIONS) add('Transaksi', `${t.no}. ${t.topic}`, t.narrative, `transaksi/${t.no}`, t.party, t.amountInfo, t.date, t.level);
  for (const a of COA) add('Akun', `${a.code} ${a.name}`, `${a.type} · saldo normal ${a.normal} · ${a.reportClass}`, `buku-besar/${a.code}`);
  for (const a of ADJUSTMENTS) add('Penyesuaian', `${a.code} ${a.category}`, a.facts, `penyesuaian/${a.code}`, a.level);
  for (const s of SCENARIOS) add('Skenario', `${s.no}. ${s.topic}`, s.question, 'skenario', s.caseAndFacts);
  for (const [rows, tab, kind] of [
    [CASE.background, 'profil', 'Kasus'],
    [CASE.policies, 'kebijakan', 'Kasus'],
    [CASE.sak, 'sak', 'SAK'],
  ] as const) {
    for (const r of rows) {
      const c = row(r);
      if (c.length >= 2) add(kind, c[0], c.slice(1).join(' · '), `kasus/${tab}`);
    }
  }
  return out;
}

/** Semua kata harus cocok; judul dihargai lebih tinggi daripada isi. */
export function search(index: readonly SearchEntry[], query: string, limit = 30): SearchEntry[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];
  const scored: Array<[number, SearchEntry]> = [];
  for (const e of index) {
    if (!terms.every((t) => e.hay.includes(t))) continue;
    const title = e.title.toLowerCase();
    const score = terms.reduce((s, t) => s + (title.startsWith(t) ? 3 : title.includes(t) ? 2 : 0), 0);
    scored.push([score, e]);
  }
  return scored
    .sort((a, b) => b[0] - a[0])
    .slice(0, limit)
    .map(([, e]) => e);
}
