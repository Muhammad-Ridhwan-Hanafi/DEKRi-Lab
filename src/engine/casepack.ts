import { ACCOUNT_BY_CODE } from '../data';
import { EXT_BY_CODE } from '../data/ext';
import type { Account } from './types';

/** Paket soal tambahan yang dimuat dari file JSON tanpa membangun ulang aplikasi. */
export const PACK_APP = 'akuntansi-practice-pack';
export interface PackItem {
  id: string;
  title: string;
  narrative: string;
  lines: Array<{ code: string; debit: number; credit: number }>;
  explain?: string;
}
export interface Pack {
  id: string;
  title: string;
  /** keterangan singkat paket (opsional) */
  description?: string;
  /** bagan akun milik paket (opsional). Bila ada, soal memakai akun ini saja dan bukan bagan akun kasus utama. */
  accounts?: Account[];
  items: PackItem[];
}

const ACCOUNT_TYPES = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const known = (c: string) => !!(ACCOUNT_BY_CODE[c] ?? EXT_BY_CODE[c]);

function parseAccounts(v: unknown): Account[] | undefined {
  if (v === undefined) return undefined;
  if (!Array.isArray(v) || v.length === 0 || v.length > 120) throw new Error('"accounts" harus berisi 1-120 akun.');
  const seen = new Set<string>();
  return v.map((a, i): Account => {
    const at = `Akun ke-${i + 1}`;
    if (!isObj(a)) throw new Error(`${at}: bentuk tidak valid.`);
    if (typeof a.code !== 'string' || !/^[A-Za-z0-9-]{3,12}$/.test(a.code)) throw new Error(`${at}: "code" tidak valid (3-12 huruf, angka, atau strip).`);
    if (ACCOUNT_BY_CODE[a.code]) throw new Error(`${at}: kode ${a.code} bentrok dengan bagan akun kasus utama.`);
    if (seen.has(a.code)) throw new Error(`${at}: kode ${a.code} dipakai dua kali.`);
    seen.add(a.code);
    if (typeof a.name !== 'string' || !a.name.trim() || a.name.length > 80) throw new Error(`${at}: "name" wajib diisi (maks 80 karakter).`);
    if (typeof a.type !== 'string' || !ACCOUNT_TYPES.includes(a.type)) throw new Error(`${at}: "type" harus salah satu dari ${ACCOUNT_TYPES.join(', ')}.`);
    if (a.normal !== 'Debit' && a.normal !== 'Credit') throw new Error(`${at}: "normal" harus Debit atau Credit.`);
    return { code: a.code, name: a.name.trim(), type: a.type, normal: a.normal, reportClass: typeof a.reportClass === 'string' ? a.reportClass : a.type };
  });
}

/** Validasi ketat; melempar Error berpesan jelas yang menyebut soal bermasalah. */
export function parsePack(text: string): Pack {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('File bukan JSON yang valid.');
  }
  if (!isObj(raw) || raw.app !== PACK_APP) throw new Error('File ini bukan paket soal aplikasi latihan akuntansi.');
  if (raw.version !== 1) throw new Error('Versi paket soal tidak didukung.');
  const id = typeof raw.id === 'string' && /^[a-z0-9-]{1,40}$/.test(raw.id) ? raw.id : null;
  if (!id) throw new Error('Paket harus punya "id" (huruf kecil, angka, strip; maks 40 karakter).');
  if (typeof raw.title !== 'string' || !raw.title.trim()) throw new Error('Paket harus punya "title".');
  if (!Array.isArray(raw.items) || raw.items.length === 0) throw new Error('Paket tidak berisi soal.');
  if (raw.items.length > 200) throw new Error('Satu paket dibatasi 200 soal.');
  const accounts = parseAccounts(raw.accounts);
  const own = new Set((accounts ?? []).map((a) => a.code));
  const knownHere = (c: string) => own.has(c) || known(c);
  const seen = new Set<string>();
  const items = raw.items.map((it, n): PackItem => {
    const at = `Soal ke-${n + 1}`;
    if (!isObj(it)) throw new Error(`${at}: bentuk tidak valid.`);
    if (typeof it.id !== 'string' || !/^[A-Za-z0-9_-]{1,30}$/.test(it.id)) throw new Error(`${at}: "id" tidak valid.`);
    if (seen.has(it.id)) throw new Error(`${at}: id "${it.id}" dipakai dua kali.`);
    seen.add(it.id);
    if (typeof it.title !== 'string' || typeof it.narrative !== 'string' || !it.title || !it.narrative)
      throw new Error(`${at}: "title" dan "narrative" wajib diisi.`);
    if (!Array.isArray(it.lines) || it.lines.length < 2) throw new Error(`${at}: kunci jurnal minimal dua baris.`);
    const lines = it.lines.map((l, i) => {
      if (!isObj(l) || typeof l.code !== 'string' || typeof l.debit !== 'number' || typeof l.credit !== 'number')
        throw new Error(`${at}, baris ${i + 1}: harus berisi code, debit, credit.`);
      if (!knownHere(l.code)) throw new Error(`${at}, baris ${i + 1}: kode akun ${l.code} tidak ada di bagan akun.`);
      if (!Number.isInteger(l.debit) || !Number.isInteger(l.credit) || l.debit < 0 || l.credit < 0 || (l.debit > 0 && l.credit > 0))
        throw new Error(`${at}, baris ${i + 1}: nominal harus bilangan bulat tidak negatif, hanya salah satu sisi.`);
      return { code: l.code, debit: l.debit, credit: l.credit };
    });
    const d = lines.reduce((t, l) => t + l.debit, 0);
    const c = lines.reduce((t, l) => t + l.credit, 0);
    if (d !== c || d === 0) throw new Error(`${at}: kunci jurnal tidak seimbang (debit ${d}, kredit ${c}).`);
    return { id: it.id, title: it.title, narrative: it.narrative, lines, explain: typeof it.explain === 'string' ? it.explain : undefined };
  });
  return { id, title: raw.title, description: typeof raw.description === 'string' ? raw.description.slice(0, 500) : undefined, accounts, items };
}

export const packNet = (it: PackItem): Record<string, number> => {
  const net: Record<string, number> = {};
  for (const l of it.lines) net[l.code] = (net[l.code] ?? 0) + l.debit - l.credit;
  return net;
};

export const EXAMPLE_PACK = {
  app: PACK_APP,
  version: 1,
  id: 'contoh',
  title: 'Contoh paket soal',
  items: [
    {
      id: 'c1',
      title: 'Setoran modal tambahan',
      narrative: 'Pemegang saham menyetor tambahan modal Rp100.000.000 ke Bank Arunika.',
      lines: [
        { code: '1-1100', debit: 100000000, credit: 0 },
        { code: '3-1000', debit: 0, credit: 100000000 },
      ],
      explain: 'Kas bertambah (debit), Modal Saham bertambah (kredit).',
    },
  ],
};
