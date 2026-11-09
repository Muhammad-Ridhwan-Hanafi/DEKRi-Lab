import { useMemo, useState } from 'react';
import { generate } from '../../engine/variants';
import { type LearnModule } from '../../learning/modules';
import { moduleStatuses, overallPercent, practiceMap, recommend, type LearnStatus, type ModuleStatus, type QuizResult } from '../../learning/progress';
import { useApp } from '../../store/useApp';
import { Icon } from '../components/Icon';
import { KeyJournal } from '../components/KeyReveal';
import { Meter } from '../components/Progress';
import { useCtx } from '../hooks';
import { navigate } from '../router';
import { BelajarTabs } from './Materi';

const STATUS_ID: Record<LearnStatus, string> = { 'Not Started': 'Belum dimulai', 'In Progress': 'Sedang berjalan', Completed: 'Selesai' };
const STATUS_STYLE: Record<LearnStatus, string> = {
  'Not Started': 'bg-slate-100 text-slate-700',
  'In Progress': 'bg-blue-50 text-blue-800',
  Completed: 'bg-green-50 text-green-800',
};

function Badge({ s }: { s: ModuleStatus }) {
  if (s.locked) return <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-500">Terkunci</span>;
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[s.status]}`}>
      {s.status === 'Completed' && <Icon name="check" size={12} />}
      {STATUS_ID[s.status]}
    </span>
  );
}

export function Belajar({ id }: { id?: string }) {
  const { state, ctx } = useCtx();
  const all = useMemo(() => moduleStatuses(state.learning, practiceMap(state, ctx)), [state, ctx]);
  const next = recommend(all);
  const sel = all.find((s) => s.module.id === id) ?? next ?? all[all.length - 1];
  return (
    <div>
      <BelajarTabs active="jalur" />
      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="space-y-3">
          <div className="card">
            <div className="text-sm text-slate-500">Kemajuan keseluruhan</div>
            <div className="text-3xl font-normal text-slate-800" data-testid="belajar-total">
              {overallPercent(all)}%
            </div>
            <Meter className="mt-2 h-3.5" percent={overallPercent(all)} label={`Kemajuan ${overallPercent(all)} persen`} tone="bg-blue-600" />
            {next ? (
              <button className="btn btn-primary mt-3 w-full" onClick={() => navigate(`belajar/${next.module.id}`)}>
                Lanjut: {next.module.no}. {next.module.title}
              </button>
            ) : (
              <p className="mt-3 text-sm text-emerald-800">Seluruh materi selesai.</p>
            )}
          </div>
          <ul className="card ap-stagger !p-1">
            {all.map((s) => (
              <li key={s.module.id}>
                <button
                  className={`ap-nav relative flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-[background-color,transform] duration-150 hover:bg-slate-100 active:scale-[0.99] ${sel.module.id === s.module.id ? 'bg-blue-50' : ''}`}
                  onClick={() => navigate(`belajar/${s.module.id}`)}
                  aria-current={sel.module.id === s.module.id ? 'page' : undefined}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">
                      {s.module.no}. {s.module.title}
                    </span>
                    <span className="text-xs text-slate-500">{s.percent}%</span>
                  </span>
                  <Badge s={s} />
                </button>
              </li>
            ))}
          </ul>
        </aside>
        <Detail key={sel.module.id} s={sel} />
      </div>
    </div>
  );
}

function Detail({ s }: { s: ModuleStatus }) {
  const m = s.module;
  const { state } = useCtx();
  const history = state.learning.history
    .filter((h) => h.module === m.id)
    .slice(-5)
    .reverse();
  return (
    <section className="card space-y-4" data-testid="belajar-detail">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">
          {m.no}. {m.title}
        </h2>
        <Badge s={s} />
        <span className="ml-auto text-sm text-slate-600">{s.percent}% selesai</span>
      </div>
      {s.locked && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" role="status">
          Materi ini terkunci untuk kuis dan penyelesaian. Selesaikan dulu:{' '}
          {s.missing.map((x, i) => (
            <span key={x.id}>
              {i > 0 && ', '}
              <button className="font-medium text-blue-700 underline" onClick={() => navigate(`belajar/${x.id}`)}>
                {x.no}. {x.title}
              </button>
            </span>
          ))}
          . Anda tetap boleh membaca materinya.
        </div>
      )}
      <div>
        <h3 className="mb-1 font-semibold">Tujuan pembelajaran</h3>
        <ul className="list-disc pl-5 text-sm">
          {m.objectives.map((o) => (
            <li key={o}>{o}</li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="mb-1 font-semibold">Konsep</h3>
        <p className="text-sm">{m.concept}</p>
      </div>
      <div>
        <h3 className="mb-1 font-semibold">Teori dasar</h3>
        <ul className="list-disc pl-5 text-sm">
          {m.theory.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>
      <Contoh m={m} />
      <Praktik s={s} />
      <Kuis s={s} />
      {history.length > 0 && (
        <div>
          <h3 className="mb-1 font-semibold">Riwayat kuis materi ini</h3>
          <ul className="text-sm text-slate-700">
            {history.map((h) => (
              <li key={h.ts}>
                {new Date(h.ts).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}: {h.correct}/{h.total} benar
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Contoh({ m }: { m: LearnModule }) {
  const v = m.example.variant ? generate(m.example.variant.pattern, m.example.variant.seed) : null;
  return (
    <div>
      <h3 className="mb-1 font-semibold">Contoh kasus dan penyelesaian</h3>
      <div className="rounded-md bg-slate-50 p-3 text-sm">
        <p>{v ? v.narrative : m.example.caseText}</p>
        {v && <KeyJournal lines={v.lines} />}
        <p className="mt-1">
          <b>Penyelesaian:</b> {v ? v.explain : m.example.solutionText}
        </p>
      </div>
    </div>
  );
}

function Praktik({ s }: { s: ModuleStatus }) {
  const m = s.module;
  if (!s.practice && !m.practice) return null;
  return (
    <div>
      <h3 className="mb-1 font-semibold">Latihan di aplikasi</h3>
      {s.practice && (
        <>
          <p className="text-sm">
            {Math.min(s.practice.done, s.practice.target)} dari {s.practice.target} {s.practice.label}.
          </p>
          <Meter
            className="my-1 h-3.5 max-w-sm"
            percent={(s.practice.done / s.practice.target) * 100}
            label={`Latihan ${s.practice.done} dari ${s.practice.target}`}
          />
          <p className="text-xs text-slate-500">Hanya jawaban yang diperiksa BENAR tanpa membuka kunci yang dihitung.</p>
        </>
      )}
      {m.practice && (
        <button className="btn mt-1" onClick={() => navigate(m.practice!.href)}>
          {m.practice.label} →
        </button>
      )}
    </div>
  );
}

function Kuis({ s }: { s: ModuleStatus }) {
  const m = s.module;
  const [chosen, setChosen] = useState<number[]>(() => m.quiz.map(() => -1));
  const [result, setResult] = useState<QuizResult | null>(null);
  const submit = () => setResult(useApp.getState().submitQuiz(m.id, chosen));
  return (
    <div>
      <h3 className="mb-1 font-semibold">Evaluasi pemahaman</h3>
      <p className="mb-2 text-xs text-slate-500">
        Lulus bila minimal 2 dari {m.quiz.length} benar. Hasil terbaik Anda:{' '}
        {s.attempts ? `${Math.round(s.quizBest * m.quiz.length)}/${m.quiz.length}` : 'belum ada'}.
      </p>
      <ol className="space-y-3">
        {m.quiz.map((q, i) => (
          <li key={q.q} className="text-sm">
            <p className="mb-1 font-medium">
              {i + 1}. {q.q}
            </p>
            <div role="radiogroup" aria-label={`Soal ${i + 1}`} className="space-y-1">
              {q.options.map((o, k) => {
                const r = result?.items[i];
                const mark = r ? (k === q.answer ? 'text-green-800' : k === r.chosen ? 'text-red-800' : '') : '';
                return (
                  <label key={o} className={`flex items-start gap-2 ${mark}`}>
                    <input
                      type="radio"
                      name={`${m.id}-${i}`}
                      disabled={s.locked || !!result}
                      checked={chosen[i] === k}
                      onChange={() => setChosen(chosen.map((c, j) => (j === i ? k : c)))}
                    />
                    <span>{o}</span>
                  </label>
                );
              })}
            </div>
            {result && (
              <p className={`mt-1 rounded-md px-2 py-1 ${result.items[i].right ? 'bg-green-50 text-green-900' : 'bg-red-50 text-red-900'}`}>
                {result.items[i].right ? 'Benar. ' : 'Belum tepat. '}
                {q.why}
              </p>
            )}
          </li>
        ))}
      </ol>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!result ? (
          <button className="btn btn-primary" disabled={s.locked || chosen.some((c) => c < 0)} onClick={submit}>
            Kirim jawaban
          </button>
        ) : (
          <>
            <span className="text-sm font-medium" data-testid="kuis-hasil">
              {result.correct}/{result.total} benar · {result.passed ? 'Lulus' : 'Belum lulus'}
            </span>
            <button
              className="btn"
              onClick={() => {
                setResult(null);
                setChosen(m.quiz.map(() => -1));
              }}
            >
              Coba lagi
            </button>
          </>
        )}
      </div>
    </div>
  );
}
