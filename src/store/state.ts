import type { JournalLine } from '../engine/types';
import type { ClosingEntry } from '../engine/closing';
import type { AnalysisAnswer } from '../validation/grade';
import type { ReviewEntry } from './review';
import { COA } from '../data';
import { EXT_BY_CODE } from '../data/ext';
import { MAX_RUPIAH } from '../engine/money';

export type ValidationMode = 'check' | 'live';

/** Satu kejadian belajar (append-only). `status` = hasil penilaian saat tombol Periksa ditekan. */
export interface LogEntry {
  ts: string;
  kind: string;
  id: string;
  status: 'BENAR' | 'PERIKSA' | 'BELUM DIISI';
}

/** Ringkasan satu sesi ujian yang sudah selesai. */
export interface ExamRecord {
  id: string;
  startedAt: string;
  finishedAt: string;
  total: number;
  correct: number;
  doubtful: number;
  seconds: number;
  scope: string;
}

/** Kemajuan Jalur Belajar: hasil kuis terbaik per materi dan riwayat percobaan kuis. */
export interface LearningState {
  quiz: Record<string, { best: number; attempts: number; lastAt: string }>;
  history: Array<{ ts: string; module: string; correct: number; total: number }>;
}
export const LEARN_HISTORY_MAX = 200;

export const LOG_MAX = 3000;
export const EXAMS_MAX = 50;

/** Satu-satunya data yang disimpan: jawaban pengguna. Status, buku besar, dan laporan selalu dihitung ulang. */
export interface UserState {
  version: 1;
  analysis: Record<string, AnalysisAnswer>;
  journal: Record<string, JournalLine[]>;
  adjusting: Record<string, JournalLine[]>;
  closing: Record<string, ClosingEntry>;
  reversing: Record<string, JournalLine[]>;
  correcting: Record<string, JournalLine[]>;
  errorType: Record<string, string>;
  scenarios: Record<string, { answer?: string; reasoning?: string }>;
  /** kunci item -> tanda tangan jawaban saat tombol Periksa ditekan */
  checked: Record<string, string>;
  attempts: Record<string, number>;
  revealed: string[];
  /** jadwal ulasan soal yang pernah salah: kunci item -> kotak dan tanggal jatuh tempo */
  review: Record<string, ReviewEntry>;
  settings: { validationMode: ValidationMode; lastExportAt?: string };
  /** tangga petunjuk: kunci item -> tingkat petunjuk tertinggi yang dibuka (1..3) */
  hints: Record<string, number>;
  /** soal yang ditandai untuk dikerjakan ulang */
  flags: string[];
  /** catatan pribadi per soal */
  notes: Record<string, string>;
  /** riwayat percobaan (untuk tren, streak, dan waktu belajar) */
  log: LogEntry[];
  exams: ExamRecord[];
  /** jawaban latihan pajak dan tabel kerja (kunci bebas -> teks/angka sebagai string) */
  pajak: Record<string, string>;
  tables: Record<string, string>;
  learning: LearningState;
  updatedAt: string;
}

export function emptyState(): UserState {
  return {
    version: 1,
    analysis: {},
    journal: {},
    adjusting: {},
    closing: {},
    reversing: {},
    correcting: {},
    errorType: {},
    scenarios: {},
    checked: {},
    attempts: {},
    revealed: [],
    review: {},
    settings: { validationMode: 'check' },
    hints: {},
    flags: [],
    notes: {},
    log: [],
    exams: [],
    pajak: {},
    tables: {},
    learning: { quiz: {}, history: [] },
    updatedAt: new Date(0).toISOString(),
  };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function migrateLearning(v: unknown): LearningState {
  const out: LearningState = { quiz: {}, history: [] };
  if (!isObj(v)) return out;
  if (isObj(v.quiz))
    for (const [k, q] of Object.entries(v.quiz))
      if (isObj(q) && typeof q.best === 'number' && q.best >= 0 && q.best <= 1 && typeof q.attempts === 'number' && q.attempts >= 0)
        out.quiz[k] = { best: q.best, attempts: Math.floor(q.attempts), lastAt: typeof q.lastAt === 'string' ? q.lastAt : '' };
  if (Array.isArray(v.history))
    out.history = v.history
      .filter((h) => isObj(h) && typeof h.ts === 'string' && typeof h.module === 'string' && typeof h.correct === 'number' && typeof h.total === 'number')
      .slice(-LEARN_HISTORY_MAX) as LearningState['history'];
  return out;
}

// ---------- sanitasi data mentah ----------
/** Batas wajar: 10 triliun rupiah per sel; jauh di atas kasus mana pun, tetapi menolak 1e300/Infinity/NaN. Sama dengan batas isian (MAX_RUPIAH). */
export const MAX_AMOUNT = MAX_RUPIAH;
export const MAX_BACKUP_BYTES = 25 * 1024 * 1024;
const MAX_KEYS = 5000;
const MAX_LINES = 60;
const MAX_TEXT = 5000;
const BAD_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const KNOWN_CODES = new Set<string>([...COA.map((a) => a.code), ...Object.keys(EXT_BY_CODE)]);

/** Penghitung entri yang dibuang selama satu kali migrasi (dibaca lewat migrateWithReport). */
let droppedCount = 0;
const drop = (n = 1) => {
  droppedCount += n;
};

const amount = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= MAX_AMOUNT ? Math.round(v) : null);
const text = (v: unknown, max = MAX_TEXT): string | null => (typeof v === 'string' ? v.slice(0, max) : null);

/** Iterasi kunci objek dengan membuang kunci berbahaya dan membatasi jumlah. */
function entriesOf(v: unknown): Array<[string, unknown]> {
  if (!isObj(v)) return [];
  const all = Object.entries(v);
  const ok = all.filter(([k]) => !BAD_KEYS.has(k) && k.length <= 100).slice(0, MAX_KEYS);
  if (ok.length !== all.length) drop(all.length - ok.length);
  return ok;
}

function sanitizeLine(raw: unknown, fallbackId: string): JournalLine | null {
  if (!isObj(raw)) return null;
  const debit = amount(raw.debit ?? 0);
  const credit = amount(raw.credit ?? 0);
  if (debit === null || credit === null) return null;
  let code: string | null = null;
  if (raw.code !== null && raw.code !== undefined && raw.code !== '') {
    if (typeof raw.code !== 'string' || !KNOWN_CODES.has(raw.code)) return null;
    code = raw.code;
  }
  return { id: text(raw.id, 100) || fallbackId, code, debit, credit, memo: text(raw.memo, 500) ?? '' };
}

function sanitizeLines(v: unknown): Record<string, JournalLine[]> {
  const out: Record<string, JournalLine[]> = {};
  for (const [k, lines] of entriesOf(v)) {
    if (!Array.isArray(lines)) {
      drop();
      continue;
    }
    const kept: JournalLine[] = [];
    lines.slice(0, MAX_LINES).forEach((l, i) => {
      const x = sanitizeLine(l, `${k}-${i}`);
      if (x) kept.push(x);
      else drop();
    });
    if (lines.length > MAX_LINES) drop(lines.length - MAX_LINES);
    out[k] = kept;
  }
  return out;
}

function sanitizeClosing(v: unknown): Record<string, ClosingEntry> {
  const out: Record<string, ClosingEntry> = {};
  for (const [k, e] of entriesOf(v)) {
    const debit = isObj(e) ? amount(e.debit ?? 0) : null;
    const credit = isObj(e) ? amount(e.credit ?? 0) : null;
    if (debit === null || credit === null || !KNOWN_CODES.has(k)) drop();
    else out[k] = { debit, credit };
  }
  return out;
}

function sanitizeAnalysis(v: unknown): Record<string, AnalysisAnswer> {
  const out: Record<string, AnalysisAnswer> = {};
  const strKeys = ['debit', 'credit', 'cashClass', 'needsAdj', 'affectsProfit', 'affectsCash', 'reason'] as const;
  for (const [k, a] of entriesOf(v)) {
    if (!isObj(a)) {
      drop();
      continue;
    }
    const r: AnalysisAnswer = {};
    if (a.decision === 'Perlu jurnal' || a.decision === 'Tidak perlu jurnal') r.decision = a.decision;
    for (const f of strKeys) {
      const t = text(a[f], 500);
      if (t !== null) r[f] = t;
    }
    const n = amount(a.amount);
    if (n !== null) r.amount = n;
    out[k] = r;
  }
  return out;
}

function sanitizeStrMap(v: unknown, max = 500): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, t] of entriesOf(v)) {
    const x = text(t, max);
    if (x === null) drop();
    else out[k] = x;
  }
  return out;
}

function sanitizeScenarios(v: unknown): Record<string, { answer?: string; reasoning?: string }> {
  const out: Record<string, { answer?: string; reasoning?: string }> = {};
  for (const [k, s] of entriesOf(v)) {
    if (!isObj(s)) {
      drop();
      continue;
    }
    const r: { answer?: string; reasoning?: string } = {};
    const a = text(s.answer, 500);
    const g = text(s.reasoning);
    if (a !== null) r.answer = a;
    if (g !== null) r.reasoning = g;
    out[k] = r;
  }
  return out;
}

function sanitizeCounts(v: unknown, max: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, n] of entriesOf(v)) {
    if (typeof n === 'number' && Number.isFinite(n) && n >= 0) out[k] = Math.min(Math.floor(n), max);
    else drop();
  }
  return out;
}

function sanitizeReview(v: unknown): Record<string, ReviewEntry> {
  const out: Record<string, ReviewEntry> = {};
  for (const [k, e] of entriesOf(v)) {
    if (
      isObj(e) &&
      typeof e.box === 'number' &&
      Number.isInteger(e.box) &&
      e.box >= 0 &&
      e.box <= 5 &&
      typeof e.due === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(e.due)
    )
      out[k] = { box: e.box, due: e.due };
    else drop();
  }
  return out;
}

/** Pulihkan dari data mentah (IndexedDB atau file cadangan). Mengembalikan null bila bentuknya tidak dikenal. */
export function migrate(raw: unknown): UserState | null {
  return migrateWithReport(raw)?.state ?? null;
}

/** Seperti migrate, tetapi juga melaporkan jumlah isian tidak valid yang dibuang saat pembersihan. */
export function migrateWithReport(raw: unknown): { state: UserState; dropped: number } | null {
  if (!isObj(raw) || raw.version !== 1) return null;
  droppedCount = 0;
  const state = migrateInner(raw);
  return { state, dropped: droppedCount };
}

function migrateInner(raw: Record<string, unknown>): UserState {
  const base = emptyState();
  return {
    version: 1,
    analysis: sanitizeAnalysis(raw.analysis),
    journal: sanitizeLines(raw.journal),
    adjusting: sanitizeLines(raw.adjusting),
    closing: sanitizeClosing(raw.closing),
    reversing: sanitizeLines(raw.reversing),
    correcting: sanitizeLines(raw.correcting),
    errorType: sanitizeStrMap(raw.errorType),
    scenarios: sanitizeScenarios(raw.scenarios),
    checked: sanitizeStrMap(raw.checked, 20000),
    attempts: sanitizeCounts(raw.attempts, 100000),
    review: sanitizeReview(raw.review),
    revealed: Array.isArray(raw.revealed) ? (raw.revealed.filter((x) => typeof x === 'string').slice(0, MAX_KEYS) as string[]) : [],
    settings: isObj(raw.settings)
      ? {
          validationMode: raw.settings.validationMode === 'live' ? 'live' : 'check',
          lastExportAt: typeof raw.settings.lastExportAt === 'string' ? raw.settings.lastExportAt : undefined,
        }
      : base.settings,
    hints: sanitizeCounts(raw.hints, 3),
    flags: Array.isArray(raw.flags) ? (raw.flags.filter((x) => typeof x === 'string').slice(0, MAX_KEYS) as string[]) : [],
    notes: sanitizeStrMap(raw.notes),
    log: Array.isArray(raw.log)
      ? (
          raw.log.filter(
            (e) =>
              isObj(e) &&
              typeof e.ts === 'string' &&
              typeof e.kind === 'string' &&
              typeof e.id === 'string' &&
              (e.status === 'BENAR' || e.status === 'PERIKSA' || e.status === 'BELUM DIISI'),
          ) as unknown as LogEntry[]
        ).slice(-LOG_MAX)
      : [],
    exams: Array.isArray(raw.exams)
      ? (raw.exams.filter((e) => isObj(e) && typeof e.id === 'string' && typeof e.total === 'number') as unknown as ExamRecord[]).slice(-EXAMS_MAX)
      : [],
    pajak: sanitizeStrMap(raw.pajak),
    tables: sanitizeStrMap(raw.tables),
    learning: migrateLearning(raw.learning),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : base.updatedAt,
  };
}

/** Tanda tangan isi jawaban; dipakai untuk tahu apakah jawaban berubah sejak diperiksa. */
export function signature(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .filter((l: JournalLine) => l && l.code)
      .map((l: JournalLine) => `${l.code}:${l.debit}:${l.credit}`)
      .join('|');
  }
  return JSON.stringify(value ?? null);
}

// ---------- cadangan ----------
export const BACKUP_APP = 'akuntansi-practice';

export interface BackupFile {
  app: typeof BACKUP_APP;
  version: 1;
  exportedAt: string;
  state: UserState;
}

export function makeBackup(state: UserState, now = new Date()): BackupFile {
  return { app: BACKUP_APP, version: 1, exportedAt: now.toISOString(), state: { ...state, settings: { ...state.settings, lastExportAt: now.toISOString() } } };
}

export interface BackupSummary {
  exportedAt: string;
  /** isian tidak valid (nominal rusak, kode akun tak dikenal, dst.) yang dibuang saat pembersihan */
  dropped: number;
  journals: number;
  adjustments: number;
  scenarios: number;
  state: UserState;
}

/** Baca teks file cadangan; lempar Error berpesan jelas bila tidak valid. */
export function parseBackup(text: string): BackupSummary {
  if (text.length > MAX_BACKUP_BYTES) throw new Error('File terlalu besar untuk berkas cadangan (maks. 25 MB).');
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('File bukan JSON yang valid.');
  }
  if (!isObj(raw) || raw.app !== BACKUP_APP) throw new Error('File ini bukan cadangan aplikasi latihan akuntansi.');
  if (raw.version !== 1) throw new Error('Versi cadangan tidak didukung.');
  const mig = migrateWithReport(raw.state);
  if (!mig) throw new Error('Isi cadangan tidak dikenali.');
  const { state, dropped } = mig;
  const filled = (m: Record<string, JournalLine[]>) => Object.values(m).filter((ls) => ls.some((l) => l.code)).length;
  return {
    exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : '',
    dropped,
    journals: filled(state.journal),
    adjustments: filled(state.adjusting),
    scenarios: Object.keys(state.scenarios).length,
    state,
  };
}

/** Ada isian pengguna? Dipakai agar keadaan kosong tidak menimpa cadangan yang baik. */
export function hasProgress(s: UserState): boolean {
  // jawaban jurnal dihitung bila ada baris berakun; kunci kosong (mis. setelah "kerjakan ulang") bukan progres
  const lineMaps = [s.journal, s.adjusting, s.reversing, s.correcting];
  const hasLines = lineMaps.some((m) => Object.values(m).some((ls) => ls.some((l) => l.code && (l.debit !== 0 || l.credit !== 0))));
  const hasClosing = Object.values(s.closing).some((c) => c.debit !== 0 || c.credit !== 0);
  const hasAnalysis = Object.values(s.analysis).some((a) => Object.keys(a).length > 0);
  const hasScenario = Object.values(s.scenarios).some((x) => !!x.answer || !!x.reasoning);
  return (
    hasLines ||
    hasClosing ||
    hasAnalysis ||
    hasScenario ||
    Object.keys(s.errorType).length > 0 ||
    s.revealed.length > 0 ||
    s.flags.length > 0 ||
    s.exams.length > 0 ||
    Object.keys(s.notes).length > 0 ||
    Object.keys(s.pajak).length > 0 ||
    Object.keys(s.hints).length > 0 ||
    Object.keys(s.review).length > 0 ||
    Object.values(s.learning.quiz).some((q) => q.attempts > 0) ||
    // tables hanya menyimpan penunjuk soal varian terakhir (bukan jawaban); "Periksa" pada soal kosong juga bukan progres
    s.log.some((e) => e.status !== 'BELUM DIISI')
  );
}
