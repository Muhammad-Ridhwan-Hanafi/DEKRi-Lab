import type { Account } from './types';

/** Penjelasan jurnal langkah demi langkah, disusun dari kunci itu sendiri (tanpa menambah klaim akuntansi baru). */
export interface ExplainLine {
  code: string;
  name?: string | null;
  debit: number;
  credit: number;
}
export interface ExplainStep {
  title: string;
  body?: string;
  items?: string[];
}

const TYPE_ID: Record<string, string> = {
  Asset: 'aset',
  Liability: 'liabilitas',
  Equity: 'ekuitas',
  Revenue: 'pendapatan',
  Expense: 'beban',
};
const DEFAULT_NORMAL: Record<string, 'Debit' | 'Credit'> = { Asset: 'Debit', Expense: 'Debit', Liability: 'Credit', Equity: 'Credit', Revenue: 'Credit' };

/** Satu baris pendek per akun: sisi, nama akun, jenis, dan arah perubahannya. */
export function explainLine(l: ExplainLine, acc: Account | undefined): string {
  const name = l.name || acc?.name || l.code;
  const used: 'Debit' | 'Credit' = l.debit ? 'Debit' : 'Credit';
  const sideName = used === 'Debit' ? 'Debit' : 'Kredit';
  if (!acc) return `${sideName} — ${name}`;
  const type = TYPE_ID[acc.type] ?? acc.type.toLowerCase();
  const contra = DEFAULT_NORMAL[acc.type] !== undefined && DEFAULT_NORMAL[acc.type] !== acc.normal;
  const grows = used === acc.normal;
  return `${sideName} — ${name}: ${contra ? `akun pengurang ${type}` : type} ${grows ? 'bertambah' : 'berkurang'}.`;
}

export function explainJournal(
  lines: ExplainLine[],
  lookup: (code: string) => Account | undefined,
  opts: { topic?: string | null; explain?: string | null; calc?: string | null; reason?: string | null } = {},
): ExplainStep[] {
  const used = lines.filter((l) => l.debit || l.credit);
  const steps: ExplainStep[] = [];
  if (!used.length) {
    steps.push({
      title: 'Mengapa tidak dijurnal',
      body: opts.reason ?? opts.explain ?? 'Peristiwa ini belum mengubah aset, liabilitas, atau ekuitas, jadi belum dijurnal.',
    });
    return steps;
  }
  const intro = opts.topic && opts.explain ? `${opts.topic}: ${opts.explain}` : (opts.explain ?? opts.topic);
  if (intro) steps.push({ title: 'Intinya', body: intro });
  if (opts.calc) steps.push({ title: 'Perhitungan', body: opts.calc });
  steps.push({ title: 'Mengapa dicatat begini', items: used.map((l) => explainLine(l, lookup(l.code))) });
  steps.push({
    title: 'Ingat',
    body: 'Aset dan beban bertambah di debit. Liabilitas, ekuitas, dan pendapatan bertambah di kredit. Berkurang berarti sisi sebaliknya.',
  });
  return steps;
}
