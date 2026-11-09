import { tbTotals } from '../engine/ledger';
import { summarize, type Ctx } from '../store/derive';
import type { LearningState, UserState } from '../store/state';
import { MODULES, MODULE_BY_ID, type LearnModule, type Question } from './modules';

/** Lulus kuis bila minimal 2 dari 3 jawaban benar. */
export const PASS_RATIO = 2 / 3;
export type LearnStatus = 'Not Started' | 'In Progress' | 'Completed';

export interface PracticeProgress {
  done: number;
  target: number;
  label: string;
}

/** Syarat latihan per materi, dihitung dari jawaban nyata pengguna (item yang kuncinya dibuka tidak dihitung). */
export function practiceMap(state: UserState, ctx: Ctx): Record<string, PracticeProgress | undefined> {
  const c = (k: 'ana' | 'txn' | 'adj' | 'clo') => summarize(state, k, ctx).correct;
  const filled = Object.values(state.journal).filter((ls) => ls.some((l) => l.code && (l.debit || l.credit))).length;
  const adjFilled = Object.values(state.adjusting).filter((ls) => ls.some((l) => l.code && (l.debit || l.credit))).length;
  const pre = tbTotals(ctx.report.tb, 'pre');
  const adj = tbTotals(ctx.report.tb, 'adjusted');
  const balanced = (t: { debit: number; credit: number }) => t.debit === t.credit && t.debit > 0;
  return {
    analisis: { done: c('ana'), target: 10, label: 'analisis transaksi BENAR' },
    jurnal: { done: c('txn'), target: 20, label: 'jurnal transaksi BENAR' },
    'buku-besar': { done: filled, target: 20, label: 'transaksi sudah dijurnal (buku besar terisi)' },
    'neraca-saldo': { done: balanced(pre) ? Math.min(filled, 30) : 0, target: 30, label: 'transaksi dijurnal dengan neraca saldo seimbang' },
    penyesuaian: { done: c('adj'), target: 10, label: 'jurnal penyesuaian BENAR' },
    'ns-penyesuaian': {
      done: balanced(adj) ? Math.min(adjFilled, 10) : 0,
      target: 10,
      label: 'penyesuaian dijurnal dengan neraca saldo setelah penyesuaian seimbang',
    },
    laporan: { done: balanced(adj) && ctx.netIncome !== 0 ? 1 : 0, target: 1, label: 'laporan tersusun dari jawaban Anda (seimbang dan ada laba/rugi)' },
    penutup: { done: c('clo'), target: 10, label: 'baris jurnal penutup BENAR' },
    'pasca-penutup': { done: c('clo'), target: 20, label: 'baris jurnal penutup BENAR' },
  };
}

export interface ModuleStatus {
  module: LearnModule;
  status: LearnStatus;
  locked: boolean;
  missing: LearnModule[];
  percent: number;
  quizBest: number;
  attempts: number;
  passed: boolean;
  practice?: PracticeProgress;
  practiceDone: boolean;
}

/** Seluruh status materi. Murni: hanya bergantung pada data belajar dan kemajuan latihan. */
export function moduleStatuses(learning: LearningState, practice: Record<string, PracticeProgress | undefined>): ModuleStatus[] {
  const out: ModuleStatus[] = [];
  const completed = new Set<string>();
  for (const m of MODULES) {
    const q = learning.quiz[m.id];
    const best = q?.best ?? 0;
    const passed = best >= PASS_RATIO - 1e-9;
    const p = practice[m.id];
    const practiceDone = !p || p.done >= p.target;
    const done = passed && practiceDone;
    const missing = m.prereq.filter((id) => !completed.has(id)).map((id) => MODULE_BY_ID[id]);
    const parts = p ? 2 : 1;
    const quizPart = passed ? 1 : best;
    const practicePart = p ? Math.min(1, p.done / p.target) : 0;
    const started = (q?.attempts ?? 0) > 0 || (p?.done ?? 0) > 0;
    if (done) completed.add(m.id);
    out.push({
      module: m,
      status: done ? 'Completed' : started ? 'In Progress' : 'Not Started',
      locked: missing.length > 0,
      missing,
      percent: Math.round(((quizPart + practicePart) / parts) * 100),
      quizBest: best,
      attempts: q?.attempts ?? 0,
      passed,
      practice: p,
      practiceDone,
    });
  }
  return out;
}

export const overallPercent = (s: readonly ModuleStatus[]) => Math.round(s.reduce((t, x) => t + x.percent, 0) / s.length);

/** Materi berikutnya yang disarankan: yang pertama belum selesai dan prasyaratnya sudah terpenuhi. */
export const recommend = (s: readonly ModuleStatus[]): ModuleStatus | null => s.find((x) => x.status !== 'Completed' && !x.locked) ?? null;

export interface QuizResult {
  correct: number;
  total: number;
  passed: boolean;
  /** per soal: indeks jawaban pengguna (-1 bila kosong) dan benar/salahnya */
  items: Array<{ chosen: number; right: boolean }>;
}

export function gradeQuiz(quiz: readonly Question[], chosen: readonly number[]): QuizResult {
  const items = quiz.map((q, i) => {
    const c = Number.isInteger(chosen[i]) && chosen[i] >= 0 && chosen[i] < q.options.length ? chosen[i] : -1;
    return { chosen: c, right: c === q.answer };
  });
  const correct = items.filter((x) => x.right).length;
  return { correct, total: quiz.length, passed: correct / quiz.length >= PASS_RATIO - 1e-9, items };
}
