import { useEffect, useState } from 'react';
import { create } from 'zustand';
import corrData from '../../../data/correcting-cases.json';
import { ADJUSTMENTS, KEY, SCENARIOS, TRANSACTIONS } from '../../data';
import type { JournalLine } from '../../engine/types';
import {
  emptyAnswers,
  examKey,
  gradeExam,
  normalizeAnswers,
  pickExam,
  scopeFilter,
  SCOPES,
  type ExamAnswers,
  type ExamItem,
  type ExamKind,
  type ExamScore,
  type Scope,
} from '../../store/exam';
import { clearExamSession, loadExamSession, saveExamSession } from '../../store/persistence';
import { useApp } from '../../store/useApp';
import { JournalForm } from '../components/JournalForm';
import { KeyJournal } from '../components/KeyReveal';
import { StepExplain } from '../components/StudyAids';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmButton } from '../components/ConfirmButton';
import { navigate } from '../router';
import { pct } from '../format';

interface Session {
  phase: 'setup' | 'run' | 'done';
  items: ExamItem[];
  answers: ExamAnswers;
  index: number;
  startedAt: number;
  finishedAt: number;
  /** batas waktu dalam detik; 0 = tanpa batas */
  limitSec: number;
  scope: string;
  score: ExamScore | null;
  start: (count: number, kinds: ExamKind[], opts: { scope: Scope; minutes: number }) => void;
  restore: (v: unknown) => void;
  patch: (f: (a: ExamAnswers) => ExamAnswers) => void;
  go: (i: number) => void;
  finish: () => void;
  reset: () => void;
}

/** Sesi ujian hidup di memori dan disalin ke IndexedDB selama berjalan, sehingga selamat dari muat ulang. Waktu terus berjalan walau halaman ditutup. */
const useExam = create<Session>((set, get) => ({
  phase: 'setup',
  items: [],
  answers: emptyAnswers(),
  index: 0,
  startedAt: 0,
  finishedAt: 0,
  limitSec: 0,
  scope: 'semua',
  score: null,
  start: (count, kinds, opts) => {
    const items = pickExam(count, kinds, Date.now() & 0x7fffffff, scopeFilter(opts.scope, useApp.getState().state));
    if (items.length === 0) return;
    set({ phase: 'run', items, answers: emptyAnswers(), index: 0, startedAt: Date.now(), limitSec: opts.minutes * 60, scope: opts.scope, score: null });
  },
  restore: (v) => {
    const r = v as Partial<Session> | null;
    if (!r || r.phase !== 'run' || !Array.isArray(r.items) || !r.items.length || typeof r.startedAt !== 'number') return;
    set({
      phase: 'run',
      items: r.items as ExamItem[],
      answers: normalizeAnswers(r.answers),
      index: Math.min(Number(r.index) || 0, r.items.length - 1),
      startedAt: r.startedAt,
      limitSec: Number(r.limitSec) || 0,
      scope: typeof r.scope === 'string' ? r.scope : 'semua',
    });
  },
  patch: (f) => set((s) => ({ answers: f(s.answers) })),
  go: (i) => set({ index: i }),
  finish: () => {
    if (get().phase !== 'run') return;
    const { items, answers, startedAt, scope } = get();
    const score = gradeExam(items, answers);
    const finishedAt = Date.now();
    set({ phase: 'done', finishedAt, score });
    void clearExamSession();
    useApp.getState().addExam({
      id: String(finishedAt),
      startedAt: new Date(startedAt).toISOString(),
      finishedAt: new Date(finishedAt).toISOString(),
      total: score.total,
      correct: score.correct,
      doubtful: items.filter((it) => answers.doubt[examKey(it)]).length,
      seconds: Math.round((finishedAt - startedAt) / 1000),
      scope,
    });
  },
  reset: () => {
    void clearExamSession();
    set({ phase: 'setup', items: [], answers: emptyAnswers(), score: null });
  },
}));

/** Simpan sesi berjalan 400 ms setelah perubahan terakhir. */
let saveTimer: ReturnType<typeof setTimeout> | undefined;
useExam.subscribe((s) => {
  clearTimeout(saveTimer);
  if (s.phase !== 'run') return;
  saveTimer = setTimeout(() => {
    const { items, answers, index, startedAt, limitSec, scope } = useExam.getState();
    void saveExamSession({ phase: 'run', items, answers, index, startedAt, limitSec, scope });
  }, 400);
});

const fmtTime = (sec: number) => `${Math.floor(Math.max(0, sec) / 60)}:${String(Math.max(0, sec) % 60).padStart(2, '0')}`;

const dateId = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
// Selektor zustand harus mengembalikan referensi yang sama bila tidak ada data; array baru tiap panggilan memicu putaran render tak berujung.
const NO_LINES: JournalLine[] = [];
const KIND_LABEL: Record<ExamKind, string> = {
  txn: 'Jurnal transaksi',
  adj: 'Jurnal penyesuaian',
  sc: 'Soal skenario',
  cor: 'Jurnal koreksi',
  err: 'Deteksi kesalahan',
};
const errTypes = corrData.errorTypeOptions as string[];
const corrText = (no: string) => (corrData.correcting as Array<{ no: number; event: string }>).find((c) => String(c.no) === no)?.event ?? '';
const detText = (no: string) => (corrData.detect as Array<{ no: number; event: string }>).find((c) => String(c.no) === no)?.event ?? '';

export function Ujian() {
  const phase = useExam((s) => s.phase);
  useEffect(() => {
    if (useExam.getState().phase !== 'setup') return;
    let live = true;
    void loadExamSession().then((v) => live && useExam.getState().phase === 'setup' && useExam.getState().restore(v));
    return () => {
      live = false;
    };
  }, []);
  if (phase === 'setup') return <Setup />;
  if (phase === 'run') return <Run />;
  return <Done />;
}

function Setup() {
  const start = useExam((s) => s.start);
  const exams = useApp((s) => s.state.exams);
  const [count, kinds, setCount, setKinds, scope, setScope, minutes, setMinutes] = useSetupState();
  const state = useApp((s) => s.state);
  const available = kinds.length ? pickExam(999, kinds, 1, scopeFilter(scope, state)).length : 0;
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,36rem)_minmax(0,1fr)]">
      <div className="card space-y-3">
        <h2 className="font-semibold">Mode ujian</h2>
        <p className="text-sm text-slate-600">
          Soal diacak dan dijawab tanpa umpan balik dan tanpa kunci. Nilai dan pembahasan muncul setelah ujian selesai. Ujian tidak mengubah progres belajar.
          Sesi yang sedang berjalan tersimpan, jadi aman bila halaman dimuat ulang (waktu tetap berjalan).
        </p>
        <fieldset className="space-y-1 text-sm">
          <legend className="mb-1 font-medium">Jenis soal</legend>
          {(Object.keys(KIND_LABEL) as ExamKind[]).map((k) => (
            <label key={k} className="flex items-center gap-2">
              <input type="checkbox" checked={kinds.includes(k)} onChange={(e) => setKinds(e.target.checked ? [...kinds, k] : kinds.filter((x) => x !== k))} />{' '}
              {KIND_LABEL[k]}
            </label>
          ))}
        </fieldset>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Cakupan</span>
          <select aria-label="Cakupan ujian" value={scope} onChange={(e) => setScope(e.target.value as Scope)}>
            {SCOPES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <span className="mt-0.5 block text-xs text-slate-500">
            {available} soal tersedia untuk pilihan ini. Tingkat hanya berlaku untuk jurnal transaksi dan penyesuaian.
          </span>
        </label>
        <div className="flex flex-wrap gap-4">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Jumlah soal</span>
            <input
              aria-label="Jumlah soal"
              type="number"
              min={1}
              max={60}
              className="w-24"
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Batas waktu (menit, 0 = tanpa batas)</span>
            <input
              aria-label="Batas waktu menit"
              type="number"
              min={0}
              max={240}
              className="w-24"
              value={minutes}
              onChange={(e) => setMinutes(Math.max(0, Math.min(240, Number(e.target.value) || 0)))}
            />
          </label>
        </div>
        <button className="btn btn-primary" disabled={kinds.length === 0 || available === 0} onClick={() => start(count, kinds, { scope, minutes })}>
          Mulai ujian
        </button>
      </div>
      <div className="card">
        <h2 className="mb-2 font-semibold">Riwayat ujian</h2>
        {exams.length === 0 ? (
          <p className="text-sm text-slate-500">
            Belum ada ujian yang diselesaikan. Atur jumlah soal di atas, lalu tekan Mulai ujian; hasilnya tersimpan di sini.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Cakupan</th>
                <th className="num">Skor</th>
                <th className="num">Ragu</th>
                <th className="num">Waktu</th>
              </tr>
            </thead>
            <tbody>
              {[...exams].reverse().map((e) => (
                <tr key={e.id}>
                  <td>{new Date(e.finishedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                  <td>{SCOPES.find(([v]) => v === e.scope)?.[1] ?? e.scope}</td>
                  <td className="num">
                    {e.correct}/{e.total} ({e.total ? pct(e.correct / e.total) : '—'})
                  </td>
                  <td className="num">{e.doubtful}</td>
                  <td className="num">{fmtTime(e.seconds)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function useSetupState() {
  const [count, setCount] = useState(10);
  const [kinds, setKinds] = useState<ExamKind[]>(['txn', 'adj', 'sc']);
  const [scope, setScope] = useState<Scope>('semua');
  const [minutes, setMinutes] = useState(0);
  return [count, kinds, setCount, setKinds, scope, setScope, minutes, setMinutes] as const;
}

function Timer({ startedAt, limitSec, onExpire }: { startedAt: number; limitSec: number; onExpire: () => void }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const elapsed = Math.floor((now - startedAt) / 1000);
  const left = limitSec - elapsed;
  useEffect(() => {
    if (limitSec > 0 && left <= 0) onExpire();
  }, [limitSec, left, onExpire]);
  if (limitSec === 0) return <span className="text-sm text-slate-600">Waktu: {fmtTime(elapsed)}</span>;
  return (
    <span className={`text-sm font-medium ${left <= 60 ? 'text-red-700' : 'text-slate-700'}`} role="timer" aria-label="Sisa waktu">
      Sisa waktu: {fmtTime(left)}
    </span>
  );
}

function Run() {
  const { items, answers, index, go, finish, reset, startedAt, limitSec, patch } = useExam();
  const item = items[index];
  const answered = (it: ExamItem) =>
    it.kind === 'txn'
      ? (answers.journal[it.id] ?? []).some((l) => l.code || l.debit || l.credit) || answers.noJournal[it.id]
      : it.kind === 'adj'
        ? (answers.adjusting[it.id] ?? []).some((l) => l.code || l.debit || l.credit)
        : it.kind === 'cor'
          ? (answers.correcting[it.id] ?? []).some((l) => l.code || l.debit || l.credit) || !!answers.errorType[it.id]
          : it.kind === 'err'
            ? !!answers.errorType[it.id]
            : !!answers.scenarios[it.id]?.answer;
  const left = items.filter((it) => !answered(it)).length;
  const dk = examKey(item);
  return (
    <div className="space-y-3">
      <div className="card flex flex-wrap items-center gap-2">
        <b>
          Soal {index + 1} dari {items.length}
        </b>
        <span className="text-sm text-slate-600">· belum dijawab: {left}</span>
        <Timer startedAt={startedAt} limitSec={limitSec} onExpire={finish} />
        <span className="ml-auto flex flex-wrap gap-1">
          {items.map((it, i) => (
            <button
              key={i}
              className={`btn px-2 py-0.5 ${i === index ? 'btn-primary' : answered(it) ? '' : 'text-slate-500'}`}
              onClick={() => go(i)}
              aria-label={`Ke soal ${i + 1}${answers.doubt[examKey(it)] ? ' (ragu-ragu)' : ''}`}
            >
              {i + 1}
              {answers.doubt[examKey(it)] ? '?' : ''}
            </button>
          ))}
        </span>
      </div>
      <div className="card">
        {item.kind === 'txn' && <TxnQ key={item.id} id={item.id} />}
        {item.kind === 'adj' && <AdjQ key={item.id} id={item.id} />}
        {item.kind === 'sc' && <ScQ key={item.id} id={item.id} />}
        {item.kind === 'cor' && <CorQ key={item.id} id={item.id} />}
        {item.kind === 'err' && <ErrQ key={item.id} id={item.id} />}
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!answers.doubt[dk]} onChange={(e) => patch((a) => ({ ...a, doubt: { ...a.doubt, [dk]: e.target.checked } }))} />{' '}
          Ragu-ragu (tandai untuk ditinjau lagi)
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn" disabled={index === 0} onClick={() => go(index - 1)}>
            ← Sebelumnya
          </button>
          <button className="btn" disabled={index === items.length - 1} onClick={() => go(index + 1)}>
            Berikutnya →
          </button>
          <span className="ml-auto flex gap-2">
            <ConfirmButton label="Batalkan" message="Jawaban ujian dibuang." confirmLabel="Ya, batalkan" onConfirm={reset} />
            {left === 0 ? (
              <button className="btn btn-primary" onClick={finish}>
                Selesai dan nilai
              </button>
            ) : (
              <ConfirmButton label="Selesai dan nilai" message={`${left} soal belum dijawab.`} confirmLabel="Nilai sekarang" onConfirm={finish} />
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

function CorQ({ id }: { id: string }) {
  const lines = useExam((s) => s.answers.correcting[id] ?? NO_LINES);
  const et = useExam((s) => s.answers.errorType[id] ?? '');
  const patch = useExam((s) => s.patch);
  return (
    <div className="space-y-2">
      <h3 className="font-semibold">Koreksi {id}</h3>
      <p className="text-sm">{corrText(id)}</p>
      <label className="block text-sm">
        <span className="mb-0.5 block text-xs text-slate-500">Jenis kesalahan</span>
        <select
          aria-label={`Jenis kesalahan ujian ${id}`}
          className="w-full sm:w-80"
          value={et}
          onChange={(e) => patch((a) => ({ ...a, errorType: { ...a.errorType, [id]: e.target.value } }))}
        >
          <option value="">— pilih —</option>
          {errTypes.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </label>
      <JournalForm
        idPrefix={`Ujian koreksi ${id}`}
        lines={lines}
        minRows={3}
        showCheck={false}
        exam
        onChange={(ls: JournalLine[]) => patch((a) => ({ ...a, correcting: { ...a.correcting, [id]: ls } }))}
      />
    </div>
  );
}

function ErrQ({ id }: { id: string }) {
  const et = useExam((s) => s.answers.errorType[id] ?? '');
  const patch = useExam((s) => s.patch);
  return (
    <div className="space-y-2">
      <h3 className="font-semibold">Deteksi kesalahan {id}</h3>
      <p className="text-sm">{detText(id)}</p>
      <select
        aria-label={`Jenis kesalahan ujian ${id}`}
        className="w-full sm:w-80"
        value={et}
        onChange={(e) => patch((a) => ({ ...a, errorType: { ...a.errorType, [id]: e.target.value } }))}
      >
        <option value="">— pilih —</option>
        {errTypes.map((t) => (
          <option key={t}>{t}</option>
        ))}
      </select>
    </div>
  );
}

function TxnQ({ id }: { id: string }) {
  const t = TRANSACTIONS.find((x) => String(x.no) === id)!;
  const lines = useExam((s) => s.answers.journal[id] ?? NO_LINES);
  const none = useExam((s) => !!s.answers.noJournal[id]);
  const patch = useExam((s) => s.patch);
  return (
    <div className="space-y-2">
      <h3 className="font-semibold">
        Transaksi {id} · {dateId(t.date)}
      </h3>
      <p className="text-sm">{t.narrative}</p>
      <p className="text-sm text-slate-600">
        {t.party} · {t.amountInfo}
      </p>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={none} onChange={(e) => patch((a) => ({ ...a, noJournal: { ...a.noJournal, [id]: e.target.checked } }))} /> Peristiwa ini
        tidak perlu jurnal
      </label>
      {!none && (
        <JournalForm
          idPrefix={`Ujian ${id}`}
          lines={lines}
          minRows={4}
          showCheck={false}
          exam
          onChange={(ls: JournalLine[]) => patch((a) => ({ ...a, journal: { ...a.journal, [id]: ls } }))}
        />
      )}
    </div>
  );
}

function AdjQ({ id }: { id: string }) {
  const a = ADJUSTMENTS.find((x) => x.code === id)!;
  const lines = useExam((s) => s.answers.adjusting[id] ?? NO_LINES);
  const patch = useExam((s) => s.patch);
  return (
    <div className="space-y-2">
      <h3 className="font-semibold">
        {a.code} · {a.category}
      </h3>
      <p className="rounded-sm bg-slate-50 p-2 text-sm">{a.facts}</p>
      <JournalForm
        idPrefix={`Ujian ${id}`}
        lines={lines}
        minRows={3}
        showCheck={false}
        exam
        onChange={(ls: JournalLine[]) => patch((x) => ({ ...x, adjusting: { ...x.adjusting, [id]: ls } }))}
      />
    </div>
  );
}

function ScQ({ id }: { id: string }) {
  const s = SCENARIOS.find((x) => String(x.no) === id)!;
  const ans = useExam((x) => x.answers.scenarios[id]?.answer ?? '');
  const patch = useExam((x) => x.patch);
  const set = (v: string) => patch((a) => ({ ...a, scenarios: { ...a.scenarios, [id]: { answer: v } } }));
  return (
    <div className="space-y-2">
      <h3 className="font-semibold">
        Skenario {id} · {s.topic}
      </h3>
      <p className="text-sm">{s.caseAndFacts}</p>
      <p className="text-sm font-medium">{s.question}</p>
      {s.kind === 'choice' ? (
        <select aria-label={`Jawaban ujian ${id}`} className="w-full" value={ans} onChange={(e) => set(e.target.value)}>
          <option value="">— pilih —</option>
          {(s.options ?? []).map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      ) : (
        <input
          aria-label={`Jawaban ujian ${id}`}
          className="w-full sm:w-64"
          inputMode="numeric"
          placeholder="Angka (Rp)"
          value={ans}
          onChange={(e) => set(e.target.value.replace(/[^\d-]/g, ''))}
        />
      )}
    </div>
  );
}

function Pembahasan({ item }: { item: ExamItem }) {
  if (item.kind === 'txn') {
    const k = KEY.readableTxn.find((t) => String(t.no) === item.id);
    return k ? (
      <>
        {k.lines.length ? <KeyJournal lines={k.lines} /> : <p>Tidak ada jurnal.</p>}
        {k.lines.length ? <StepExplain lines={k.lines} topic={k.topic} explain={k.explain} /> : <p>{k.explain}</p>}
      </>
    ) : null;
  }
  if (item.kind === 'adj') {
    const k = KEY.readableAdj.find((x) => x.code === item.id);
    return k ? (
      <>
        <KeyJournal lines={k.lines} />
        <StepExplain lines={k.lines} topic={k.category} explain={k.explain} calc={k.calc} />
      </>
    ) : null;
  }
  if (item.kind === 'sc') {
    const k = KEY.scenario[item.id];
    return k ? (
      <p>
        Kunci: <b>{typeof k.key === 'number' ? k.key.toLocaleString('id-ID') : k.key}</b>
      </p>
    ) : null;
  }
  if (item.kind === 'err')
    return (
      <p>
        Jawaban: <b>{KEY.errorType[item.id]}</b>
      </p>
    );
  const net = KEY.correctingNet[item.id];
  return (
    <>
      <p>
        Jenis kesalahan: <b>{KEY.errorType[item.id] ?? '—'}</b>
      </p>
      {net ? (
        <ul className="list-disc pl-5">
          {Object.entries(net).map(([k, v]) => (
            <li key={k}>
              {k}: {v > 0 ? 'debit' : 'kredit'} {Math.abs(v).toLocaleString('id-ID')}
            </li>
          ))}
        </ul>
      ) : (
        <p>Tidak perlu jurnal koreksi.</p>
      )}
    </>
  );
}

function Done() {
  const { score, startedAt, finishedAt, reset, answers } = useExam();
  if (!score) return null;
  const secs = Math.max(1, Math.round((finishedAt - startedAt) / 1000));
  const doubtful = score.results.filter((r) => answers.doubt[examKey(r.item)]);
  const doubtOk = doubtful.filter((r) => r.result.status === 'BENAR').length;
  const wrong = score.results.filter((r) => r.result.status !== 'BENAR').map((r) => r.item);
  const link = (it: ExamItem) =>
    navigate(it.kind === 'txn' ? `transaksi/${it.id}` : it.kind === 'adj' ? `penyesuaian/${it.id}` : it.kind === 'sc' ? 'skenario' : 'koreksi');
  const flagWrong = () => {
    for (const it of wrong)
      if (it.kind === 'txn' || it.kind === 'adj' || it.kind === 'sc')
        if (!useApp.getState().state.flags.includes(examKey(it))) useApp.getState().toggleFlag(it.kind, it.id);
  };
  return (
    <div className="card space-y-3">
      <h2 className="font-semibold">Hasil ujian</h2>
      <p className="text-3xl font-normal text-blue-700">
        {score.correct} / {score.total} <span className="text-lg">({score.total ? pct(score.correct / score.total) : '—'})</span>
      </p>
      <p className="text-sm text-slate-600">
        Waktu pengerjaan {fmtTime(secs)}. {doubtful.length > 0 && `Soal ragu-ragu: ${doubtful.length}, benar ${doubtOk}. `}
        Buka "Pembahasan" pada tiap soal untuk melihat kunci dan penjelasan.
      </p>
      {wrong.some((i) => i.kind !== 'cor' && i.kind !== 'err') && (
        <button className="btn" onClick={flagWrong}>
          Tandai semua soal yang belum benar untuk dikerjakan ulang
        </button>
      )}
      <table>
        <thead>
          <tr>
            <th>Soal</th>
            <th>Hasil</th>
            <th>Keterangan</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {score.results.map(({ item, result }) => (
            <tr key={`${item.kind}-${item.id}`}>
              <td>
                {KIND_LABEL[item.kind]} {item.id}
                {answers.doubt[examKey(item)] && <span className="ml-1 text-xs text-amber-700">(ragu)</span>}
              </td>
              <td>
                <StatusBadge status={result.status} />
              </td>
              <td className="text-sm">
                {result.status === 'BELUM DIISI' ? 'Tidak dijawab.' : result.grade.message}
                <details className="mt-1">
                  <summary className="cursor-pointer select-none text-xs text-blue-700">Pembahasan</summary>
                  <div className="mt-1 rounded-md border border-blue-200 bg-blue-50 p-2">
                    <Pembahasan item={item} />
                  </div>
                </details>
              </td>
              <td>
                <button className="btn" onClick={() => link(item)}>
                  Buka soal
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="btn btn-primary" onClick={reset}>
        Ujian baru
      </button>
    </div>
  );
}
