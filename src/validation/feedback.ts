import { ACCOUNT_BY_CODE } from '../data';
import { EXT_BY_CODE } from '../data/ext';
import type { JournalLine } from '../engine/types';
import { netByAccount } from './grade';

/**
 * Diagnosis kesalahan jurnal yang spesifik terhadap jenis kesalahannya. Hanya memakai data yang sudah ada
 * (bagan akun, kunci neto, angka pada soal); tidak menyebut nominal jawaban yang benar.
 */
export type VerdictKind = 'ok' | 'wrong-side' | 'wrong-amount' | 'extra' | 'missing';
export interface LineVerdict {
  code: string;
  name: string;
  kind: VerdictKind;
  userNet: number;
  note: string;
}
export interface Feedback {
  balance: { debit: number; credit: number; diff: number };
  verdicts: LineVerdict[];
  concepts: string[];
}

const TYPE_ID: Record<string, string> = { Asset: 'aset', Liability: 'liabilitas', Equity: 'ekuitas', Revenue: 'pendapatan', Expense: 'beban' };
const acc = (c: string) => ACCOUNT_BY_CODE[c] ?? EXT_BY_CODE[c];
const nameOf = (c: string) => acc(c)?.name ?? c;
const rp = (n: number) => 'Rp' + Math.abs(Math.round(n)).toLocaleString('id-ID');

/** Angka bulat >= 1.000 yang tertulis di teks soal (format 1.234.567 atau 1234567). */
export function numbersIn(text: string): number[] {
  const out = new Set<number>();
  for (const m of text.matchAll(/\d{1,3}(?:\.\d{3})+|\d{4,}/g)) out.add(Number(m[0].replace(/\./g, '')));
  return [...out];
}

const TOL = 1;

export function diagnose(lines: readonly JournalLine[], keyNet: Readonly<Record<string, number>>, textNumbers: readonly number[] = []): Feedback {
  const used = lines.filter((l) => l.code);
  const debit = used.reduce((t, l) => t + l.debit, 0);
  const credit = used.reduce((t, l) => t + l.credit, 0);
  const user = netByAccount(used);
  const keyAbs = Object.values(keyNet).map((v) => Math.abs(v));
  const verdicts: LineVerdict[] = [];

  for (const code of Object.keys(user)) {
    const u = user[code];
    const k = keyNet[code];
    const a = acc(code);
    if (k === undefined) {
      verdicts.push({ code, name: nameOf(code), kind: 'extra', userNet: u, note: `${nameOf(code)} tidak terlibat pada kejadian ini.` });
      continue;
    }
    if (Math.abs(u - k) <= TOL) {
      verdicts.push({ code, name: nameOf(code), kind: 'ok', userNet: u, note: 'Akun, sisi, dan nominal sudah tepat.' });
      continue;
    }
    if (u * k < 0) {
      const type = TYPE_ID[a?.type ?? ''] ?? 'akun';
      verdicts.push({
        code,
        name: nameOf(code),
        kind: 'wrong-side',
        userNet: u,
        note: `${nameOf(code)} adalah akun ${type} bersaldo normal ${a?.normal === 'Credit' ? 'kredit' : 'debit'}. Pada kejadian ini akun itu perlu ${k > 0 ? 'didebit' : 'dikredit'}, sedangkan Anda ${u > 0 ? 'mendebitnya' : 'mengkreditnya'}.`,
      });
      continue;
    }
    const au = Math.abs(u);
    let note: string;
    if (textNumbers.includes(au))
      note = `Nominal ${nameOf(code)} sama dengan angka mentah yang tertulis di soal. Kunci memerlukan perhitungan dari angka itu (misalnya persentase, diskon, atau prorata).`;
    else if (keyAbs.some((x) => Math.abs(x - au) <= TOL) && Math.abs(Math.abs(k) - au) > TOL)
      note = `Nominal ${nameOf(code)} sama dengan nominal akun lain pada jurnal. Periksa apakah angkanya tertukar antar akun.`;
    else note = `Nominal ${nameOf(code)} ${au > Math.abs(k) ? 'lebih besar' : 'lebih kecil'} dari seharusnya; periksa langkah perhitungannya.`;
    verdicts.push({ code, name: nameOf(code), kind: 'wrong-amount', userNet: u, note });
  }
  for (const code of Object.keys(keyNet)) {
    if (code in user) continue;
    const a = acc(code);
    verdicts.push({
      code,
      name: nameOf(code),
      kind: 'missing',
      userNet: 0,
      note: `${nameOf(code)} (${TYPE_ID[a?.type ?? ''] ?? 'akun'}) belum ada; kejadian ini mengubah akun tersebut.`,
    });
  }

  const concepts: string[] = [];
  const diff = debit - credit;
  if (Math.abs(diff) > TOL)
    concepts.push(
      `Prinsip dasar: total debit harus sama dengan total kredit. Saat ini ${diff > 0 ? 'debit' : 'kredit'} lebih besar ${rp(diff)}; selisih sebesar itu sering menunjuk baris yang terlewat atau salah ketik.`,
    );
  const wrongSide = verdicts.filter((v) => v.kind === 'wrong-side');
  if (wrongSide.length > 0 && wrongSide.length === verdicts.filter((v) => v.kind !== 'missing').length)
    concepts.push(
      'Semua akun Anda berlawanan sisi dengan seharusnya: kemungkinan seluruh jurnal terbalik. Tanyakan dulu apakah tiap akun bertambah atau berkurang, baru tentukan debit atau kredit.',
    );
  else if (wrongSide.length > 0)
    concepts.push(
      'Aturan saldo normal: aset dan beban bertambah di debit; liabilitas, ekuitas, dan pendapatan bertambah di kredit. Akun kontra berlawanan dengan induknya.',
    );
  const missing = verdicts.filter((v) => v.kind === 'missing');
  const extra = verdicts.filter((v) => v.kind === 'extra');
  for (const e of extra) {
    const pair = missing.find((m) => acc(m.code)?.type === acc(e.code)?.type);
    if (pair)
      concepts.push(
        `${e.name} dan ${pair.name} sama-sama akun ${TYPE_ID[acc(e.code)?.type ?? ''] ?? 'sejenis'}: kemungkinan Anda memilih akun yang kurang spesifik. Pilih akun yang paling sesuai dengan kejadian (jenis aset, pihak, atau rekening bank yang dipakai).`,
      );
  }
  if (missing.some((m) => m.code === '5-1000'))
    concepts.push('Metode perpetual: setiap penjualan memerlukan jurnal kedua untuk harga pokok (debit HPP, kredit Persediaan) di samping jurnal pendapatan.');
  if (missing.some((m) => m.code === '4-1200'))
    concepts.push('Potongan penjualan dicatat di akun kontra pendapatan tersendiri, tidak langsung mengurangi akun Penjualan.');
  const amountsOnly =
    verdicts.length > 0 && verdicts.every((v) => v.kind === 'ok' || v.kind === 'wrong-amount') && verdicts.some((v) => v.kind === 'wrong-amount');
  if (amountsOnly) concepts.push('Akun dan sisi sudah tepat; yang perlu diperbaiki adalah perhitungan nominal.');
  return { balance: { debit, credit, diff }, verdicts, concepts };
}

export interface CompareRow {
  code: string;
  name: string;
  user: { side: 'D' | 'K'; amount: number } | null;
  key: { side: 'D' | 'K'; amount: number } | null;
  match: boolean;
}

/** Perbandingan jawaban pengguna dengan kunci per akun (dipakai setelah kunci dibuka). */
export function compareWithKey(lines: readonly JournalLine[], keyNet: Readonly<Record<string, number>>): CompareRow[] {
  const user = netByAccount(lines.filter((l) => l.code));
  const side = (n: number): 'D' | 'K' => (n >= 0 ? 'D' : 'K');
  const codes = [...new Set([...Object.keys(keyNet), ...Object.keys(user)])];
  return codes.map((code) => {
    const u = user[code];
    const k = keyNet[code];
    return {
      code,
      name: nameOf(code),
      user: u === undefined ? null : { side: side(u), amount: Math.abs(u) },
      key: k === undefined ? null : { side: side(k), amount: Math.abs(k) },
      match: u !== undefined && k !== undefined && Math.abs(u - k) <= TOL,
    };
  });
}
