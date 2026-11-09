import corrData from '../../data/correcting-cases.json';
import { ADJUSTMENTS, SCENARIOS, TRANSACTIONS } from '../data';
import type { JournalLine } from '../engine/types';
import type { AnalysisAnswer } from '../validation/grade';
import { makeCtx, resultFor, type ItemResult } from './derive';
import { emptyState, type UserState } from './state';

/** Mode ujian: sekumpulan soal acak dijawab tanpa umpan balik, dinilai sekaligus. Tidak menyentuh progres belajar. */
export type ExamKind = 'txn' | 'adj' | 'sc' | 'cor' | 'err';
export interface ExamItem {
  kind: ExamKind;
  id: string;
}
export interface ExamAnswers {
  journal: Record<string, JournalLine[]>;
  adjusting: Record<string, JournalLine[]>;
  noJournal: Record<string, boolean>;
  scenarios: Record<string, { answer?: string }>;
  correcting: Record<string, JournalLine[]>;
  errorType: Record<string, string>;
  /** soal yang ditandai ragu-ragu: kunci `${kind}:${id}` */
  doubt: Record<string, boolean>;
}

export const emptyAnswers = (): ExamAnswers => ({ journal: {}, adjusting: {}, noJournal: {}, scenarios: {}, correcting: {}, errorType: {}, doubt: {} });

/** Bentuk jawaban dari sesi tersimpan bisa usang; lengkapi kolom yang hilang. */
export const normalizeAnswers = (a: Partial<ExamAnswers> | undefined): ExamAnswers => ({ ...emptyAnswers(), ...(a ?? {}) });

export const examKey = (it: ExamItem) => `${it.kind}:${it.id}`;

export type Scope = 'semua' | 'Intermediate' | 'Advanced' | 'Expert' | 'ditandai' | 'lemah';
export const SCOPES: Array<[Scope, string]> = [
  ['semua', 'Semua soal'],
  ['Intermediate', 'Tingkat Intermediate'],
  ['Advanced', 'Tingkat Advanced'],
  ['Expert', 'Tingkat Expert'],
  ['ditandai', 'Soal yang saya tandai'],
  ['lemah', 'Topik lemah (jadwal ulasan)'],
];

/** Penyaring cakupan ujian. Tingkat hanya berlaku untuk transaksi dan penyesuaian. */
export function scopeFilter(scope: Scope, state: Pick<UserState, 'flags' | 'review'>): (it: ExamItem) => boolean {
  if (scope === 'semua') return () => true;
  if (scope === 'ditandai') return (it) => state.flags.includes(examKey(it));
  if (scope === 'lemah') return (it) => examKey(it) in state.review;
  return (it) =>
    it.kind === 'txn'
      ? TRANSACTIONS.find((t) => String(t.no) === it.id)?.level === scope
      : it.kind === 'adj'
        ? ADJUSTMENTS.find((a) => a.code === it.id)?.level === scope
        : false;
}

function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickExam(count: number, kinds: ExamKind[], seed: number, allow: (it: ExamItem) => boolean = () => true): ExamItem[] {
  let pool: ExamItem[] = [];
  if (kinds.includes('txn')) for (const t of TRANSACTIONS) pool.push({ kind: 'txn', id: String(t.no) });
  if (kinds.includes('adj')) for (const a of ADJUSTMENTS) pool.push({ kind: 'adj', id: a.code });
  if (kinds.includes('sc')) for (const s of SCENARIOS) pool.push({ kind: 'sc', id: String(s.no) });
  if (kinds.includes('cor')) for (const c of corrData.correcting) pool.push({ kind: 'cor', id: String(c.no) });
  if (kinds.includes('err')) for (const c of corrData.detect) pool.push({ kind: 'err', id: String(c.no) });
  pool = pool.filter(allow);
  const rand = mulberry32(seed);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.max(0, Math.min(count, pool.length)));
}

export interface ExamScore {
  results: Array<{ item: ExamItem; result: ItemResult; answered: boolean }>;
  correct: number;
  total: number;
}

export function gradeExam(items: ExamItem[], a: ExamAnswers): ExamScore {
  const s: UserState = emptyState();
  s.settings = { validationMode: 'live' };
  s.journal = a.journal;
  s.adjusting = a.adjusting;
  s.scenarios = a.scenarios;
  s.correcting = a.correcting;
  s.errorType = a.errorType;
  const analysis: Record<string, AnalysisAnswer> = {};
  for (const [no, v] of Object.entries(a.noJournal)) if (v) analysis[no] = { decision: 'Tidak perlu jurnal' };
  s.analysis = analysis;
  const ctx = makeCtx(s);
  const results = items.map((item) => {
    const result = resultFor(s, item.kind, item.id, ctx);
    return { item, result, answered: result.status !== 'BELUM DIISI' };
  });
  return { results, correct: results.filter((r) => r.result.status === 'BENAR').length, total: items.length };
}
