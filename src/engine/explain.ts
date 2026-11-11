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

const rp = (n: number) => 'Rp' + n.toLocaleString('id-ID');
const side = (s: 'Debit' | 'Credit') => (s === 'Debit' ? 'debit' : 'kredit');

/** Satu baris penjelasan untuk satu akun di jurnal. */
export function explainLine(l: ExplainLine, acc: Account | undefined): string {
  const name = l.name || acc?.name || l.code;
  const amount = l.debit || l.credit;
  const used: 'Debit' | 'Credit' = l.debit ? 'Debit' : 'Credit';
  const head = `${side(used).toUpperCase()} ${rp(amount)}: ${name}`;
  if (!acc) return `${head}.`;
  const type = TYPE_ID[acc.type] ?? acc.type.toLowerCase();
  const contra = DEFAULT_NORMAL[acc.type] !== undefined && DEFAULT_NORMAL[acc.type] !== acc.normal;
  const grows = used === acc.normal;
  const label = contra ? `akun pengurang ${type}` : type;
  const other: 'Debit' | 'Credit' = acc.normal === 'Debit' ? 'Credit' : 'Debit';
  return (
    `${head} (${label}) ${grows ? 'bertambah' : 'berkurang'}. ` +
    `Akun ini bersaldo normal ${side(acc.normal)}: bertambah di ${side(acc.normal)}, berkurang di ${side(other)}. ` +
    `Karena ${grows ? 'bertambah' : 'berkurang'}, dicatat di sisi ${side(used)}.`
  );
}

export function explainJournal(
  lines: ExplainLine[],
  lookup: (code: string) => Account | undefined,
  opts: { topic?: string | null; explain?: string | null; calc?: string | null; reason?: string | null } = {},
): ExplainStep[] {
  const used = lines.filter((l) => l.debit || l.credit);
  const steps: ExplainStep[] = [];
  if (opts.topic) steps.push({ title: 'Jenis peristiwa', body: opts.topic });
  if (opts.calc) steps.push({ title: 'Perhitungan angka', body: opts.calc });
  if (opts.explain) steps.push({ title: 'Prinsip akuntansi yang dipakai', body: opts.explain });
  if (!used.length) {
    steps.push({
      title: 'Mengapa tidak ada jurnal',
      body: 'Jurnal hanya dibuat untuk peristiwa yang sudah mengubah aset, liabilitas, atau ekuitas dan nilainya dapat diukur. Peristiwa ini belum memenuhi syarat itu.',
      items: opts.reason ? [opts.reason] : undefined,
    });
    steps.push({
      title: 'Pegangan untuk mengingat',
      items: [
        'Janji, pesanan, atau rencana yang belum menimbulkan hak atau kewajiban belum dijurnal.',
        'Tetap catat peristiwanya sebagai informasi, dan jurnal baru dibuat ketika kondisinya berubah.',
      ],
    });
    return steps;
  }
  if (used.length) {
    steps.push({
      title: 'Akun yang terpengaruh dan sisinya',
      body: 'Untuk setiap akun, tanyakan dua hal: akun ini bertambah atau berkurang, lalu di sisi mana akun jenis itu bertambah.',
      items: used.map((l) => explainLine(l, lookup(l.code))),
    });
    const d = used.reduce((s, l) => s + l.debit, 0);
    const c = used.reduce((s, l) => s + l.credit, 0);
    steps.push({
      title: 'Periksa keseimbangan',
      body:
        d === c ? `Total debit ${rp(d)} sama dengan total kredit ${rp(c)}. Jurnal yang benar selalu seimbang.` : `Total debit ${rp(d)}, total kredit ${rp(c)}.`,
    });
  }
  steps.push({
    title: 'Pegangan untuk mengingat',
    items: [
      'Aset dan beban: bertambah di debit, berkurang di kredit.',
      'Liabilitas, ekuitas, dan pendapatan: bertambah di kredit, berkurang di debit.',
      'Akun pengurang (misalnya akumulasi penyusutan) bersisi kebalikan dari akun induknya.',
    ],
  });
  return steps;
}
