// Penilaian jawaban terhadap kunci. Murni. Membandingkan saldo NETO (debit-kredit) per akun,
// bukan urutan atau jumlah baris. Aturan dan urutan pemeriksaan mengikuti rumus validasi workbook.
import type { AnalysisKey } from '../data/types';
import type { JournalLine } from '../engine/types';
import { xround } from '../engine/excel';

export type Status = 'BELUM DIISI' | 'BENAR' | 'PERIKSA';
export type Reason = 'empty' | 'ok' | 'unbalanced' | 'extra-account' | 'wrong-side' | 'check-amount' | 'wrong-amount' | 'not-needed' | 'needed' | 'incomplete';

export interface Hint {
  /** akun kunci yang belum ada di jawaban */
  missing: string[];
  /** akun di jawaban yang tidak seharusnya terlibat */
  extra: string[];
  /** akun yang sisinya (debit/kredit) berlawanan */
  wrongSide: string[];
  /** akun yang nominalnya belum sesuai (nominal benar TIDAK ditampilkan) */
  wrongAmount: string[];
}

export interface GradeResult {
  status: Status;
  reason: Reason;
  message: string;
  hint: Hint;
}

/** Toleransi bawaan 1 rupiah, sama dengan rumus workbook. Soal bisa menentukan sendiri (mis. 0 untuk soal buatan generator). */
export const DEFAULT_TOL = 1;
const noHint = (): Hint => ({ missing: [], extra: [], wrongSide: [], wrongAmount: [] });
const res = (status: Status, reason: Reason, message: string, hint: Hint = noHint()): GradeResult => ({ status, reason, message, hint });

export function usedLines(lines: readonly JournalLine[]): JournalLine[] {
  return lines.filter((l) => l.code && (l.debit !== 0 || l.credit !== 0 || l.code));
}

/** Neto D-K per akun dari baris jawaban. */
export function netByAccount(lines: readonly JournalLine[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const l of lines) if (l.code) out[l.code] = (out[l.code] ?? 0) + l.debit - l.credit;
  return out;
}

/**
 * Nilai satu jurnal terhadap kunci neto.
 * keyNet kosong = tidak ada jurnal yang diharapkan; panggil gradeNoJournal untuk kasus itu.
 */
export function gradeJournal(lines: readonly JournalLine[], keyNet: Readonly<Record<string, number>>, TOL: number = DEFAULT_TOL): GradeResult {
  const used = lines.filter((l) => l.code);
  if (used.length === 0) return res('BELUM DIISI', 'empty', 'Belum diisi.');

  const sumD = used.reduce((t, l) => t + l.debit, 0);
  const sumC = used.reduce((t, l) => t + l.credit, 0);
  if (xround(sumD - sumC, 0) !== 0) return res('PERIKSA', 'unbalanced', 'Saldo tidak seimbang: total debit tidak sama dengan total kredit.');

  const user = netByAccount(used);
  const keyCodes = Object.keys(keyNet);
  const hint = noHint();
  hint.extra = Object.keys(user).filter((c) => !(c in keyNet));
  hint.missing = keyCodes.filter((c) => !(c in user));
  for (const c of keyCodes) {
    if (!(c in user)) continue;
    const u = user[c];
    const k = keyNet[c];
    if (Math.abs(u - k) <= TOL) continue;
    if (u * k < 0) hint.wrongSide.push(c);
    else hint.wrongAmount.push(c);
  }

  if (hint.extra.length > 0) return res('PERIKSA', 'extra-account', 'Ada akun yang tidak seharusnya terlibat.', hint);
  if (hint.missing.length === 0 && hint.wrongSide.length === 0 && hint.wrongAmount.length === 0) return res('BENAR', 'ok', 'Benar.');
  if (hint.wrongSide.length > 0) return res('PERIKSA', 'wrong-side', 'Ada akun yang sisi debit/kreditnya terbalik.', hint);
  const keyTotalDebit = keyCodes.reduce((t, c) => t + Math.max(keyNet[c], 0), 0);
  if (Math.abs(sumD - keyTotalDebit) <= TOL) return res('PERIKSA', 'check-amount', 'Akun atau nominal perlu diperiksa.', hint);
  return res('PERIKSA', 'wrong-amount', 'Nominal salah; periksa perhitungannya.', hint);
}

export interface ComponentScore {
  /** komponen benar dari seluruh komponen kunci (3 per akun: akun, sisi, nominal), dikurangi 1 per akun berlebih */
  earned: number;
  total: number;
  akun: number;
  sisi: number;
  nominal: number;
  extra: number;
}

/**
 * Skor komponen: metrik TAMBAHAN untuk umpan balik, tidak mengubah status BENAR/PERIKSA.
 * Per akun kunci: akun ada (1), sisinya sama dengan kunci (1), nominal dalam toleransi (1; hanya bila sisi benar).
 * Tiap akun berlebih mengurangi 1 (batas bawah 0). Jurnal kosong = null.
 */
export function componentScore(lines: readonly JournalLine[], keyNet: Readonly<Record<string, number>>, tol: number = DEFAULT_TOL): ComponentScore | null {
  const used = lines.filter((l) => l.code);
  if (used.length === 0) return null;
  const user = netByAccount(used);
  let akun = 0;
  let sisi = 0;
  let nominal = 0;
  const codes = Object.keys(keyNet);
  for (const c of codes) {
    if (!(c in user)) continue;
    akun++;
    if (user[c] * keyNet[c] < 0) continue;
    sisi++;
    if (Math.abs(user[c] - keyNet[c]) <= tol) nominal++;
  }
  const extra = Object.keys(user).filter((c) => !(c in keyNet)).length;
  const total = codes.length * 3;
  return { earned: Math.max(0, akun + sisi + nominal - extra), total, akun, sisi, nominal, extra };
}

/** Transaksi pengecoh (kunci tanpa jurnal). */
export function gradeNoJournal(lines: readonly JournalLine[], decidedNoJournal: boolean): GradeResult {
  if (lines.some((l) => l.code)) return res('PERIKSA', 'not-needed', 'Transaksi ini tidak memerlukan jurnal.');
  if (decidedNoJournal) return res('BENAR', 'ok', 'Benar: memang tidak ada jurnal.');
  return res('BELUM DIISI', 'empty', 'Nyatakan "Tidak perlu jurnal" bila memang tidak ada jurnal.');
}

export interface AnalysisAnswer {
  decision?: 'Perlu jurnal' | 'Tidak perlu jurnal';
  debit?: string;
  credit?: string;
  amount?: number;
  cashClass?: string;
  needsAdj?: string;
  affectsProfit?: string;
  affectsCash?: string;
  reason?: string;
}

/** Analisis transaksi (sheet 06). Satu pesan per kesalahan pertama, sesuai urutan rumus workbook. */
export function gradeAnalysis(a: AnalysisAnswer | undefined, key: AnalysisKey): GradeResult {
  if (!a) return res('BELUM DIISI', 'empty', 'Belum diisi.');
  const filled = !!(a.cashClass || a.needsAdj || a.affectsProfit || a.affectsCash);
  // Keputusan jurnal/tanpa jurnal kini diambil dari kotak "Peristiwa ini tidak perlu jurnal" di bagian Jurnal.
  // Bila kotak itu belum disentuh, keputusan dianggap "Perlu jurnal" begitu ada isian lain.
  const decision = a.decision ?? (filled ? 'Perlu jurnal' : undefined);
  if (!decision) return res('BELUM DIISI', 'empty', 'Belum diisi.');
  const isNone = key.debit === '-' || key.debit === null;
  if (isNone) {
    return decision === 'Tidak perlu jurnal'
      ? res('BENAR', 'ok', 'Benar: memang tidak ada jurnal.')
      : res('PERIKSA', 'not-needed', 'Transaksi ini tidak memerlukan jurnal.');
  }
  if (decision === 'Tidak perlu jurnal') return res('PERIKSA', 'needed', 'Transaksi ini memerlukan jurnal.');
  // Akun debit/kredit/nominal utama tidak lagi diisi di Analisis (jurnalnya dinilai di bagian Jurnal), jadi tidak dinilai di sini.
  // Klasifikasi arus kas (cashClass) sengaja TIDAK dinilai: laporan arus kas dibangun dari kunci kasus,
  // jadi isian pengguna tidak menggerakkan laporan apa pun. Isian tetap ada sebagai latihan.
  if (!a.needsAdj || !a.affectsProfit || !a.affectsCash) return res('PERIKSA', 'incomplete', 'Belum lengkap: isi kebutuhan penyesuaian dan dampak laba/kas.');
  if (a.needsAdj !== key.needsAdj) return res('PERIKSA', 'check-amount', 'Kebutuhan penyesuaian salah.');
  if (a.affectsProfit !== key.affectsProfit) return res('PERIKSA', 'check-amount', 'Dampak laba salah.');
  if (a.affectsCash !== key.affectsCash) return res('PERIKSA', 'check-amount', 'Dampak kas salah.');
  return res('BENAR', 'ok', 'Benar.');
}

export function gradeErrorType(choice: string | undefined, key: string): GradeResult {
  if (!choice) return res('BELUM DIISI', 'empty', 'Belum diisi.');
  return choice === key ? res('BENAR', 'ok', 'Benar.') : res('PERIKSA', 'check-amount', 'Bukan itu jenis kesalahannya.');
}

/** Soal skenario: pilihan = cocok persis; angka = selisih mutlak <= Rp1.000 (rumus sheet 21). */
export function gradeScenario(answer: string | number | undefined, key: string | number, kind: 'numeric' | 'choice'): GradeResult {
  if (answer === undefined || answer === '') return res('BELUM DIISI', 'empty', 'Belum diisi.');
  if (kind === 'choice') return String(answer) === String(key) ? res('BENAR', 'ok', 'Benar.') : res('PERIKSA', 'check-amount', 'Periksa kembali pilihan Anda.');
  const n = typeof answer === 'number' ? answer : Number(answer);
  if (!Number.isFinite(n)) return res('PERIKSA', 'incomplete', 'Isi dengan angka.');
  return Math.abs(n - Number(key)) <= 1000 ? res('BENAR', 'ok', 'Benar.') : res('PERIKSA', 'wrong-amount', 'Coba hitung ulang.');
}
