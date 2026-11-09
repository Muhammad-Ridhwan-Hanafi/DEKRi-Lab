import { create } from 'zustand';
import type { ClosingEntry } from '../engine/closing';
import type { JournalLine } from '../engine/types';
import type { AnalysisAnswer } from '../validation/grade';
import { adoptLegacy, clearState, loadHistory, loadState, saveHistory, requestPersistence, saveState } from './persistence';
import { getScope, setScope } from './scope';
import { gradeQuiz, moduleStatuses, practiceMap, type QuizResult } from '../learning/progress';
import { MODULE_BY_ID } from '../learning/modules';
import { currentSignature, itemKey, makeCtx, resultFor, type ItemKind } from './derive';
import { isReviewKind, nextReview, todayStr } from './review';
import {
  emptyState,
  makeBackup,
  LOG_MAX,
  EXAMS_MAX,
  LEARN_HISTORY_MAX,
  type BackupFile,
  type ExamRecord,
  type LogEntry,
  type UserState,
  type ValidationMode,
} from './state';

export type LineKind = 'journal' | 'adjusting' | 'reversing' | 'correcting';
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/** Bagian jawaban yang bisa diurungkan; status periksa, kunci terbuka, dan pengaturan tidak ikut. */
const CONTENT_KEYS = ['analysis', 'journal', 'adjusting', 'closing', 'reversing', 'correcting', 'errorType', 'scenarios'] as const;
type Content = Pick<UserState, (typeof CONTENT_KEYS)[number]>;
const pickContent = (s: UserState): Content => Object.fromEntries(CONTENT_KEYS.map((k) => [k, s[k]])) as unknown as Content;
const MAX_HISTORY = 100;
const COALESCE_MS = 1000;

interface AppStore {
  state: UserState;
  past: Content[];
  future: Content[];
  hydrated: boolean;
  saveStatus: SaveStatus;
  /** tab/jendela lain menyimpan data; penyimpanan di sini dijeda sampai pengguna memilih */
  externalChange: boolean;
  /** buang perubahan di sini dan muat data terbaru dari penyimpanan */
  adoptExternal: () => Promise<void>;
  /** tetap pakai data di tab ini (menimpa penyimpanan) */
  keepLocal: () => void;
  hydrate: () => Promise<void>;
  /**
   * Pindah ruang data ke pengguna `key` (null = keluar). Menyimpan perubahan pengguna sebelumnya lebih dulu,
   * mengosongkan state di memori, lalu memuat data pengguna baru. Data pengguna lain tidak pernah tercampur.
   */
  switchUser: (key: string | null) => Promise<void>;
  setLines: (kind: LineKind, id: string, lines: JournalLine[]) => void;
  setAnalysis: (no: string, patch: Partial<AnalysisAnswer>) => void;
  setClosing: (code: string, entry: ClosingEntry) => void;
  setErrorType: (no: string, value: string) => void;
  setScenario: (no: string, patch: { answer?: string; reasoning?: string }) => void;
  check: (kind: ItemKind, id: string | number) => void;
  checkMany: (kind: ItemKind, ids: Array<string | number>) => void;
  reveal: (kind: ItemKind, id: string | number) => void;
  setMode: (mode: ValidationMode) => void;
  exportBackup: () => BackupFile;
  replaceState: (s: UserState) => void;
  /** buka tingkat petunjuk berikutnya (maks 3) */
  openHint: (kind: ItemKind, id: string | number) => void;
  toggleFlag: (kind: ItemKind, id: string | number) => void;
  setNote: (kind: ItemKind, id: string | number, text: string) => void;
  addExam: (e: ExamRecord) => void;
  /** Nilai kuis materi. Null bila materi terkunci (prasyarat belum selesai) atau tidak dikenal; tidak mencatat apa pun. */
  submitQuiz: (moduleId: string, chosen: number[]) => QuizResult | null;
  setPajak: (key: string, value: string) => void;
  /** catat satu percobaan di luar soal utama (varian, pajak, paket soal) */
  logAttempt: (kind: string, id: string, status: LogEntry['status']) => void;
  setTable: (key: string, value: string) => void;
  reset: () => Promise<void>;
  undo: () => void;
  redo: () => void;
  /** kosongkan jawaban satu soal agar bisa dikerjakan ulang dari awal (dapat diurungkan) */
  startReview: (kind: ItemKind, id: string) => void;
}

const touch = (s: UserState): UserState => ({ ...s, updatedAt: new Date().toISOString() });

export const useApp = create<AppStore>((set, get) => {
  const update = (f: (s: UserState) => UserState) => set((st) => ({ state: touch(f(st.state)) }));
  let lastKey = '';
  let lastAt = 0;
  /** Ubah jawaban + catat riwayat. Ketikan beruntun pada soal yang sama dalam 1 detik digabung jadi satu langkah. */
  const edit = (key: string, f: (s: UserState) => UserState, forceNew = false) =>
    set((st) => {
      const now = Date.now();
      const merge = !forceNew && key === lastKey && now - lastAt < COALESCE_MS;
      lastKey = key;
      lastAt = now;
      return { state: touch(f(st.state)), past: merge ? st.past : [...st.past, pickContent(st.state)].slice(-MAX_HISTORY), future: [] };
    });
  const clearHistory = { past: [] as Content[], future: [] as Content[] };
  return {
    state: emptyState(),
    ...clearHistory,
    hydrated: false,
    saveStatus: 'idle',
    externalChange: false,
    adoptExternal: async () => get().hydrate(),
    keepLocal: () => set((st) => ({ externalChange: false, state: { ...st.state } })),

    hydrate: async () => {
      const gen = ++hydrateGen;
      const loaded = await loadState();
      const h = loaded ? await loadHistory() : null;
      if (gen !== hydrateGen) return; // pengguna berganti selagi memuat: hasil ini milik ruang data lain
      lastKey = '';
      // riwayat hanya dipulihkan bila bentuknya benar-benar berupa isi jawaban
      const ok = (x: unknown): x is Content => typeof x === 'object' && x !== null && CONTENT_KEYS.every((k) => k in (x as object));
      set({
        state: loaded ?? emptyState(),
        hydrated: true,
        externalChange: false,
        saveStatus: loaded ? 'saved' : 'idle',
        past: h ? h.past.filter(ok) : [],
        future: h ? h.future.filter(ok) : [],
      });
      void requestPersistence();
    },

    switchUser: async (key) => {
      // Token diambil saat dipanggil (sebelum await apa pun): pemanggilan terbaru selalu yang menang,
      // seberapa pun lambat atau cepat penyimpanan pemanggilan sebelumnya selesai.
      const gen = ++hydrateGen;
      if (get().hydrated) {
        await flushSave().catch(() => undefined); // simpan dulu ke ruang data pengguna lama
        for (const h of [...beforeSwitch]) await h().catch(() => undefined);
        if (gen !== hydrateGen) return; // sudah ada permintaan ganti yang lebih baru; biarkan dia yang melanjutkan
      }
      lastKey = '';
      set({ hydrated: false, state: emptyState(), ...clearHistory, saveStatus: 'idle', externalChange: false });
      setScope(key);
      if (!key) return;
      await adoptLegacy(key);
      if (gen !== hydrateGen) return;
      await get().hydrate();
    },

    // menambah/menghapus/menyalin baris (jumlah baris berubah) selalu menjadi langkah tersendiri
    setLines: (kind, id, lines) =>
      edit(`${kind}:${id}`, (s) => ({ ...s, [kind]: { ...s[kind], [id]: lines } }), (get().state[kind][id]?.length ?? 0) !== lines.length),
    setAnalysis: (no, patch) => edit(`analysis:${no}`, (s) => ({ ...s, analysis: { ...s.analysis, [no]: { ...s.analysis[no], ...patch } } })),
    setClosing: (code, entry) => edit(`closing:${code}`, (s) => ({ ...s, closing: { ...s.closing, [code]: entry } })),
    setErrorType: (no, value) => edit(`errorType:${no}`, (s) => ({ ...s, errorType: { ...s.errorType, [no]: value } })),
    setScenario: (no, patch) => edit(`scenario:${no}`, (s) => ({ ...s, scenarios: { ...s.scenarios, [no]: { ...s.scenarios[no], ...patch } } })),

    check: (kind, id) =>
      update((s) => {
        const key = itemKey(kind, id);
        const sig = currentSignature(s, kind, id, makeCtx(s));
        let next: UserState = { ...s, checked: { ...s.checked, [key]: sig }, attempts: { ...s.attempts, [key]: (s.attempts[key] ?? 0) + 1 } };
        const st0 = resultFor(next, kind, id, makeCtx(next)).status;
        next = {
          ...next,
          log: [
            ...s.log,
            { ts: new Date().toISOString(), kind, id: String(id), status: (st0 === 'BENAR' || st0 === 'PERIKSA' ? st0 : 'BELUM DIISI') as LogEntry['status'] },
          ].slice(-LOG_MAX),
        };
        if (!isReviewKind(kind) || s.revealed.includes(key)) return next;
        const status = resultFor(next, kind, id, makeCtx(next)).status;
        if (status !== 'BENAR' && status !== 'PERIKSA') return next;
        const entry = nextReview(s.review[key], status, todayStr());
        if (entry === undefined) return next;
        const review = { ...next.review };
        if (entry === null) delete review[key];
        else review[key] = entry;
        return { ...next, review };
      }),

    checkMany: (kind, ids) =>
      update((s) => {
        const ctx = makeCtx(s);
        const checked = { ...s.checked };
        const attempts = { ...s.attempts };
        for (const id of ids) {
          const key = itemKey(kind, id);
          checked[key] = currentSignature(s, kind, id, ctx);
          attempts[key] = (attempts[key] ?? 0) + 1;
        }
        return { ...s, checked, attempts };
      }),

    reveal: (kind, id) =>
      update((s) => {
        const key = itemKey(kind, id);
        return s.revealed.includes(key) ? s : { ...s, revealed: [...s.revealed, key] };
      }),

    setMode: (mode) => update((s) => ({ ...s, settings: { ...s.settings, validationMode: mode } })),

    exportBackup: () => {
      const b = makeBackup(get().state);
      update((s) => ({ ...s, settings: { ...s.settings, lastExportAt: b.exportedAt } }));
      return b;
    },

    replaceState: (s) => {
      lastKey = '';
      set({ state: touch(s), ...clearHistory });
    },

    undo: () =>
      set((st) => {
        const prev = st.past[st.past.length - 1];
        if (!prev) return st;
        lastKey = '';
        return { state: touch({ ...st.state, ...prev }), past: st.past.slice(0, -1), future: [...st.future, pickContent(st.state)] };
      }),

    redo: () =>
      set((st) => {
        const nxt = st.future[st.future.length - 1];
        if (!nxt) return st;
        lastKey = '';
        return { state: touch({ ...st.state, ...nxt }), future: st.future.slice(0, -1), past: [...st.past, pickContent(st.state)] };
      }),

    startReview: (kind, id) =>
      edit(`review:${kind}:${id}`, (s) => {
        const checked = { ...s.checked };
        delete checked[itemKey(kind, id)];
        if (kind === 'txn')
          return { ...s, checked, journal: { ...s.journal, [id]: [] }, analysis: { ...s.analysis, [id]: { ...s.analysis[id], decision: undefined } } };
        if (kind === 'adj') return { ...s, checked, adjusting: { ...s.adjusting, [id]: [] } };
        if (kind === 'sc') return { ...s, checked, scenarios: { ...s.scenarios, [id]: { reasoning: s.scenarios[id]?.reasoning } } };
        return s;
      }),

    openHint: (kind, id) =>
      update((s) => {
        const key = itemKey(kind, id);
        const cur = s.hints[key] ?? 0;
        return cur >= 3 ? s : { ...s, hints: { ...s.hints, [key]: cur + 1 } };
      }),
    toggleFlag: (kind, id) =>
      update((s) => {
        const key = itemKey(kind, id);
        return { ...s, flags: s.flags.includes(key) ? s.flags.filter((k) => k !== key) : [...s.flags, key] };
      }),
    setNote: (kind, id, text) =>
      update((s) => {
        const key = itemKey(kind, id);
        const notes = { ...s.notes };
        if (text.trim()) notes[key] = text;
        else delete notes[key];
        return { ...s, notes };
      }),
    submitQuiz: (moduleId, chosen) => {
      const m = MODULE_BY_ID[moduleId];
      if (!m) return null;
      const st = get().state;
      const status = moduleStatuses(st.learning, practiceMap(st, makeCtx(st))).find((x) => x.module.id === moduleId);
      if (!status || status.locked) return null;
      const r = gradeQuiz(m.quiz, chosen);
      const ts = new Date().toISOString();
      update((s) => {
        const prev = s.learning.quiz[moduleId];
        const best = Math.max(prev?.best ?? 0, r.correct / r.total);
        return {
          ...s,
          learning: {
            quiz: { ...s.learning.quiz, [moduleId]: { best, attempts: (prev?.attempts ?? 0) + 1, lastAt: ts } },
            history: [...s.learning.history, { ts, module: moduleId, correct: r.correct, total: r.total }].slice(-LEARN_HISTORY_MAX),
          },
        };
      });
      return r;
    },
    addExam: (e) => update((s) => ({ ...s, exams: [...s.exams, e].slice(-EXAMS_MAX) })),
    logAttempt: (kind, id, status) => update((s) => ({ ...s, log: [...s.log, { ts: new Date().toISOString(), kind, id, status }].slice(-LOG_MAX) })),
    setPajak: (key, value) => update((s) => ({ ...s, pajak: { ...s.pajak, [key]: value } })),
    setTable: (key, value) => update((s) => ({ ...s, tables: { ...s.tables, [key]: value } })),

    reset: async () => {
      await clearState();
      lastKey = '';
      set({ state: emptyState(), saveStatus: 'idle', ...clearHistory });
    },
  };
});

let hydrateGen = 0;
const beforeSwitch = new Set<() => Promise<void>>();
/** Daftarkan pekerjaan yang harus selesai sebelum ruang data berganti (mis. cadangan berkas untuk pengguna lama). */
export const onBeforeSwitchUser = (fn: () => Promise<void>): (() => void) => {
  beforeSwitch.add(fn);
  return () => void beforeSwitch.delete(fn);
};

const TAB_ID = Math.random().toString(36).slice(2);
const CHANNEL = 'akuntansi-practice:sync';
const RETRY_MS = 5000;
let flushHook: (() => Promise<void>) | null = null;

/** Tulis perubahan yang tertunda sekarang juga (dipakai saat jendela disembunyikan/ditutup). Aman dipanggil kapan saja. */
export const flushSave = (): Promise<void> => flushHook?.() ?? Promise.resolve();

/**
 * Simpan otomatis 500 ms setelah perubahan terakhir. Panggil sekali setelah hydrate.
 * - Menyimpan segera saat halaman disembunyikan atau ditutup (pagehide / visibilitychange).
 * - Gagal simpan dicoba ulang tiap 5 detik sampai berhasil.
 * - Bila tab/jendela lain menyimpan data (BroadcastChannel), penyimpanan di sini DIJEDA dan `externalChange` menyala
 *   agar dua tab tidak saling menimpa tanpa sepengetahuan pengguna.
 */
export function startAutosave(delayMs = 500): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let dirty = false;
  let last = useApp.getState().state;
  let lastPast = useApp.getState().past;
  let lastFuture = useApp.getState().future;
  const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL);

  const write = async (): Promise<void> => {
    clearTimeout(timer);
    timer = undefined;
    if (!dirty || useApp.getState().externalChange) return;
    dirty = false;
    useApp.setState({ saveStatus: 'saving' });
    const { state, past, future } = useApp.getState();
    try {
      await Promise.all([saveState(state), saveHistory({ past, future })]);
      useApp.setState({ saveStatus: 'saved' });
      channel?.postMessage({ from: TAB_ID, scope: getScope() });
    } catch {
      dirty = true;
      useApp.setState({ saveStatus: 'error' });
      timer = setTimeout(() => void write(), RETRY_MS);
    }
  };
  flushHook = write;

  const unsub = useApp.subscribe((s) => {
    if (!s.hydrated) return;
    const histChanged = s.past !== lastPast || s.future !== lastFuture;
    if (s.state === last && !histChanged) return;
    last = s.state;
    lastPast = s.past;
    lastFuture = s.future;
    dirty = true;
    clearTimeout(timer);
    timer = setTimeout(() => void write(), delayMs);
  });

  const onHide = () => {
    if (typeof document === 'undefined' || document.visibilityState === 'hidden') void write();
  };
  const hasDom = typeof window !== 'undefined' && typeof document !== 'undefined';
  if (hasDom) {
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onHide);
  }

  if (channel)
    channel.onmessage = (e: MessageEvent) => {
      // hanya perubahan pada ruang data pengguna yang sama yang dianggap bentrok; pengguna lain di tab lain tidak relevan
      if (e.data?.from !== TAB_ID && (e.data?.scope ?? null) === getScope() && useApp.getState().hydrated) useApp.setState({ externalChange: true });
    };

  return () => {
    clearTimeout(timer);
    unsub();
    if (hasDom) {
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onHide);
    }
    channel?.close();
    if (flushHook === write) flushHook = null;
  };
}
