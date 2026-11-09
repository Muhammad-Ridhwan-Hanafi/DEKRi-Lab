// Turunan murni dari UserState: masukan engine, status tiap item, dan ringkasan dashboard.
import { ADJUSTMENTS, COA, CORRECTING, KEY, OPENING, SCENARIOS, TRANSACTIONS } from '../data';
import closingData from '../../data/closing-reversing.json';
import { computeReport, type Report } from '../engine';
import type { TBRow } from '../engine/types';
import type { LedgerInput } from '../engine/ledger';
import { gradeClosingRow, expectedClosing, type ClosingInput } from '../engine/closing';
import type { EntryLines, JournalLine } from '../engine/types';
import {
  DEFAULT_TOL,
  componentScore,
  gradeAnalysis,
  gradeErrorType,
  gradeJournal,
  gradeNoJournal,
  gradeScenario,
  type ComponentScore,
  type GradeResult,
  type Status,
} from '../validation/grade';
import { signature, type UserState } from './state';

export type ItemKind = 'ana' | 'txn' | 'adj' | 'clo' | 'rev' | 'cor' | 'err' | 'sc';
export type ShownStatus = Status | 'BELUM DIPERIKSA';

export const CLOSING_ROWS = closingData.closingRows;
export const REVERSING_CASES = closingData.reversingCases;

const cfSub: Record<string, string> = {};
for (const [no, a] of Object.entries(KEY.analysis)) if (a.cashSub) cfSub[no] = a.cashSub;

function entries(map: Record<string, JournalLine[]>): EntryLines[] {
  const out: EntryLines[] = [];
  for (const [key, lines] of Object.entries(map)) {
    const used = lines.filter((l) => l.code && (l.debit !== 0 || l.credit !== 0));
    if (used.length > 0) out.push({ key, lines: used.map((l) => ({ code: l.code as string, debit: l.debit, credit: l.credit })) });
  }
  return out;
}

/** Masukan engine dari jawaban pengguna. */
export function ledgerInputFor(state: UserState): LedgerInput {
  return { coa: COA, opening: OPENING, journal: entries(state.journal), adjusting: entries(state.adjusting), cfSub };
}

/** Hitung seluruh laporan dari jawaban pengguna. */
export function reportFor(state: UserState): Report {
  return computeReport(ledgerInputFor(state));
}

export const journalHasEntries = (state: UserState) => entries(state.journal).length > 0;

export function itemKey(kind: ItemKind, id: string | number): string {
  return `${kind}:${id}`;
}

export interface ItemResult {
  key: string;
  grade: GradeResult;
  status: ShownStatus;
  revealed: boolean;
  checked: boolean;
}

export interface Ctx {
  report: Report;
  netIncome: number;
  hasEntries: boolean;
}

/** Toleransi nominal untuk satu soal; dapat ditentukan di kunci (`tolerance`), bawaan 1 rupiah. */
export const toleranceFor = (kind: ItemKind, id: string | number): number => KEY.tolerance?.[`${kind}:${id}`] ?? DEFAULT_TOL;

function gradeItem(state: UserState, kind: ItemKind, id: string, ctx: Ctx): { grade: GradeResult; sig: string } {
  switch (kind) {
    case 'ana':
      return { grade: gradeAnalysis(state.analysis[id], KEY.analysis[id]), sig: signature(state.analysis[id]) };
    case 'txn': {
      const lines = state.journal[id] ?? [];
      const net = KEY.txnNet[id];
      const sig = signature(lines) + '#' + (state.analysis[id]?.decision ?? '');
      return {
        grade: net
          ? gradeJournal(lines, net, toleranceFor('txn', id))
          : gradeNoJournal(
              lines.filter((l) => l.code),
              state.analysis[id]?.decision === 'Tidak perlu jurnal',
            ),
        sig,
      };
    }
    case 'adj':
      return { grade: gradeJournal(state.adjusting[id] ?? [], KEY.adjNet[id], toleranceFor('adj', id)), sig: signature(state.adjusting[id] ?? []) };
    case 'rev':
      return { grade: gradeJournal(state.reversing[id] ?? [], KEY.reversingNet[id], toleranceFor('rev', id)), sig: signature(state.reversing[id] ?? []) };
    case 'cor': {
      const lines = state.correcting[id] ?? [];
      const net = KEY.correctingNet[id];
      const sig = signature(lines) + '#' + (state.errorType[id] ?? '');
      if (net) return { grade: gradeJournal(lines, net, toleranceFor('cor', id)), sig };
      if (lines.some((l) => l.code))
        return {
          grade: {
            status: 'PERIKSA',
            reason: 'not-needed',
            message: 'Kasus ini tidak memerlukan jurnal koreksi.',
            hint: { missing: [], extra: [], wrongSide: [], wrongAmount: [] },
          },
          sig,
        };
      const picked = state.errorType[id];
      const blank = { missing: [], extra: [], wrongSide: [], wrongAmount: [] };
      return {
        grade: !picked
          ? { status: 'BELUM DIISI', reason: 'empty', message: 'Identifikasi jenis kesalahan lebih dulu.', hint: blank }
          : picked === KEY.errorType[id]
            ? { status: 'BENAR', reason: 'ok', message: 'Benar: tidak perlu jurnal koreksi (jurnalnya sudah benar).', hint: blank }
            : { status: 'PERIKSA', reason: 'check-amount', message: 'Memang tidak perlu jurnal koreksi, tetapi jenis kesalahannya belum tepat.', hint: blank },
        sig,
      };
    }
    case 'err':
      return { grade: gradeErrorType(state.errorType[id], KEY.errorType[id]), sig: signature(state.errorType[id]) };
    case 'sc': {
      const s = SCENARIOS.find((x) => String(x.no) === id)!;
      const k = KEY.scenario[id];
      const raw = state.scenarios[id]?.answer;
      const ans = s.kind === 'numeric' && raw !== undefined && raw !== '' ? Number(raw) : raw;
      return { grade: gradeScenario(ans, k.key, s.kind), sig: signature(raw) };
    }
    case 'clo':
      return {
        grade: gradeClosingRow(id, state.closing[id], ctx.report.tb, ctx.netIncome, ctx.hasEntries),
        sig: signature(state.closing[id]) + '#' + ctx.netIncome,
      };
  }
}

/** Status yang ditampilkan: mode Periksa menilai hanya jawaban yang sudah diperiksa dan belum berubah. */
export function resultFor(state: UserState, kind: ItemKind, id: string | number, ctx: Ctx): ItemResult {
  const sid = String(id);
  const key = itemKey(kind, sid);
  const { grade, sig } = gradeItem(state, kind, sid, ctx);
  const revealed = state.revealed.includes(key);
  const checked = state.checked[key] === sig;
  const live = state.settings.validationMode === 'live';
  let status: ShownStatus;
  if (grade.status === 'BELUM DIISI') status = 'BELUM DIISI';
  else if (live || checked) status = grade.status;
  else status = 'BELUM DIPERIKSA';
  return { key, grade, status, revealed, checked: live || checked };
}

export function makeCtx(state: UserState): Ctx {
  const report = reportFor(state);
  return { report, netIncome: report.cells.S12_B53 as number, hasEntries: journalHasEntries(state) };
}

export const currentSignature = (state: UserState, kind: ItemKind, id: string | number, ctx: Ctx) => gradeItem(state, kind, String(id), ctx).sig;

export interface Summary {
  total: number;
  worked: number; // sudah diperiksa dan terisi
  correct: number;
  review: number; // perlu diperiksa
  pending: number; // terisi tetapi belum diperiksa
  accuracy: number | null; // BENAR / dikerjakan, tanpa item yang kuncinya dibuka
}

export const SECTION_IDS: Record<ItemKind, string[]> = {
  ana: TRANSACTIONS.map((t) => String(t.no)),
  txn: TRANSACTIONS.map((t) => String(t.no)),
  adj: ADJUSTMENTS.map((a) => a.code),
  clo: CLOSING_ROWS.map((r) => r.code),
  rev: REVERSING_CASES.map((r) => String(r.no)),
  cor: CORRECTING.correcting.map((c) => String(c.no)),
  err: CORRECTING.detect.map((c) => String(c.no)),
  sc: SCENARIOS.map((s) => String(s.no)),
};

export function summarize(state: UserState, kind: ItemKind, ctx: Ctx): Summary {
  const ids = SECTION_IDS[kind];
  let worked = 0;
  let correct = 0;
  let pending = 0;
  for (const id of ids) {
    const r = resultFor(state, kind, id, ctx);
    // baris penutup bersaldo nol yang belum disentuh dinilai BENAR oleh rumus workbook; jangan dihitung sebagai "belum diperiksa"
    const untouched = kind === 'clo' && !state.closing[id]?.debit && !state.closing[id]?.credit;
    if (r.status === 'BELUM DIPERIKSA' && !untouched) pending++;
    if (r.status === 'BELUM DIISI' || r.status === 'BELUM DIPERIKSA' || r.revealed) continue;
    worked++;
    if (r.status === 'BENAR') correct++;
  }
  return { total: ids.length, worked, correct, review: worked - correct, pending, accuracy: worked > 0 ? correct / worked : null };
}

/** Isian kunci untuk satu baris penutup (dipakai tombol "pakai kunci" setelah kunci dibuka). */
export const closingKeyFor = (code: string, ctx: Ctx) => expectedClosing(code, ctx.report.tb, ctx.netIncome);
export type { ClosingInput };

const JOURNAL_KEYS: Partial<Record<ItemKind, (s: UserState, id: string) => { lines: JournalLine[]; net: Record<string, number> | undefined }>> = {
  txn: (s, id) => ({ lines: s.journal[id] ?? [], net: KEY.txnNet[id] }),
  adj: (s, id) => ({ lines: s.adjusting[id] ?? [], net: KEY.adjNet[id] }),
  rev: (s, id) => ({ lines: s.reversing[id] ?? [], net: KEY.reversingNet[id] }),
  cor: (s, id) => ({ lines: s.correcting[id] ?? [], net: KEY.correctingNet[id] }),
};

/** Skor komponen satu item jurnal; null bila bukan item jurnal, kunci kosong, atau jawaban kosong. */
export function componentFor(state: UserState, kind: ItemKind, id: string | number): ComponentScore | null {
  const f = JOURNAL_KEYS[kind];
  if (!f) return null;
  const { lines, net } = f(state, String(id));
  return net && Object.keys(net).length > 0 ? componentScore(lines, net, toleranceFor(kind, id)) : null;
}

export interface ComponentSummary {
  earned: number;
  total: number;
  items: number;
  ratio: number | null;
}

/** Ringkasan skor komponen untuk item jurnal yang sudah diperiksa dan kuncinya tidak dibuka (aturan sama dengan akurasi). */
export function summarizeComponents(state: UserState, ctx: Ctx): ComponentSummary {
  let earned = 0;
  let total = 0;
  let items = 0;
  for (const kind of ['txn', 'adj', 'rev', 'cor'] as const)
    for (const id of SECTION_IDS[kind]) {
      const r = resultFor(state, kind, id, ctx);
      if (r.revealed || r.status === 'BELUM DIISI' || r.status === 'BELUM DIPERIKSA') continue;
      const c = componentFor(state, kind, id);
      if (!c) continue;
      earned += c.earned;
      total += c.total;
      items++;
    }
  return { earned, total, items, ratio: total > 0 ? earned / total : null };
}

let keyBasis: { tb: TBRow[]; netIncome: number } | null = null;
/** TB setelah penyesuaian dari kunci kasus (bukan buku pengguna), untuk menilai penutupan "sesuai kunci". Dihitung sekali (KEY statis). */
function keyClosingBasis(): { tb: TBRow[]; netIncome: number } {
  if (!keyBasis) {
    const tb: TBRow[] = COA.map((a) => {
      const e = KEY.expectedTB[a.code];
      return {
        code: a.code,
        name: a.name,
        normal: a.normal,
        opening: 0,
        journalDebit: 0,
        journalCredit: 0,
        adjDebit: 0,
        adjCredit: 0,
        preBalance: e?.pre ?? 0,
        adjBalance: e?.adj ?? 0,
      };
    });
    const type = new Map(COA.map((a) => [a.code, a.type]));
    const netIncome = -tb.filter((r) => type.get(r.code) === 'Revenue' || type.get(r.code) === 'Expense').reduce((t, r) => t + r.adjBalance, 0);
    keyBasis = { tb, netIncome };
  }
  return keyBasis;
}

/** Penilaian baris penutup terhadap kunci kasus, terpisah dari "konsisten dengan buku Anda" (resultFor). */
export function closingVsKey(state: UserState, code: string): GradeResult {
  const { tb, netIncome } = keyClosingBasis();
  return gradeClosingRow(code, state.closing[code], tb, netIncome, true);
}
