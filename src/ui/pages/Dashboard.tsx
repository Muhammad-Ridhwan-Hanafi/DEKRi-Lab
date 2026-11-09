import { useMemo } from 'react';
import { moduleStatuses, overallPercent, practiceMap, recommend } from '../../learning/progress';
import { dailyActivity, streak, weeklyAccuracy } from '../../store/activity';
import { ADJUSTMENTS, SCENARIOS, TRANSACTIONS } from '../../data';
import { runChecks } from '../../engine/checks';
import { tbTotals } from '../../engine/ledger';
import { resultFor, summarize, summarizeComponents, type ItemKind } from '../../store/derive';
import { dueReviews } from '../../store/review';
import { useApp } from '../../store/useApp';
import { REASON_TIPS, weaknessReport, type TopicKind } from '../../store/weakness';
import { Icon } from '../components/Icon';
import { Achievement, DoneMark, Meter, Ring, StackedBar, Tag, type TagTone } from '../components/Progress';
import { Onboarding } from '../components/Onboarding';
import { useCtx } from '../hooks';
import { navigate } from '../router';
import { pct } from '../format';
import { useProfile } from '../profile';

const SECTIONS: Array<{ kind: ItemKind; label: string; href: string; cat: string; tone: TagTone }> = [
  { kind: 'ana', label: 'Analisis transaksi', href: 'transaksi', cat: 'Pencatatan', tone: 'lilac' },
  { kind: 'txn', label: 'Jurnal umum (147 transaksi)', href: 'transaksi', cat: 'Pencatatan', tone: 'lilac' },
  { kind: 'adj', label: 'Jurnal penyesuaian', href: 'penyesuaian', cat: 'Penyesuaian', tone: 'lime' },
  { kind: 'clo', label: 'Jurnal penutup', href: 'penutup', cat: 'Penutupan', tone: 'blush' },
  { kind: 'rev', label: 'Jurnal pembalik', href: 'penutup', cat: 'Penutupan', tone: 'blush' },
  { kind: 'cor', label: 'Jurnal koreksi', href: 'koreksi', cat: 'Koreksi', tone: 'aqua' },
  { kind: 'err', label: 'Deteksi kesalahan', href: 'koreksi', cat: 'Koreksi', tone: 'aqua' },
  { kind: 'sc', label: 'Soal skenario', href: 'skenario', cat: 'Evaluasi', tone: 'lime' },
];

export function Dashboard() {
  const { state, ctx } = useCtx();
  const rows = SECTIONS.map((s) => ({ ...s, sum: summarize(state, s.kind, ctx) }));
  const worked = rows.reduce((t, r) => t + r.sum.worked, 0);
  const correct = rows.reduce((t, r) => t + r.sum.correct, 0);

  const pre = tbTotals(ctx.report.tb, 'pre');
  const adj = tbTotals(ctx.report.tb, 'adjusted');
  const checks = runChecks(ctx.report, state.closing);
  const checksOk = checks.filter((c) => c.ok).length;
  const empty = !ctx.hasEntries;
  const stage = (ok: boolean) => (empty ? '— belum ada jurnal' : ok ? 'Seimbang' : 'TIDAK seimbang');

  const due = dueReviews(state);
  const titleOf = (kind: string, id: string) =>
    kind === 'txn'
      ? `Transaksi ${id}: ${TRANSACTIONS.find((t) => String(t.no) === id)?.topic ?? ''}`
      : kind === 'adj'
        ? `${id}: ${ADJUSTMENTS.find((a) => a.code === id)?.category ?? ''}`
        : `Skenario ${id}: ${SCENARIOS.find((x) => String(x.no) === id)?.topic ?? ''}`;
  const startReview = (kind: 'txn' | 'adj' | 'sc', id: string) => {
    useApp.getState().startReview(kind, id);
    navigate(kind === 'txn' ? `transaksi/${id}` : kind === 'adj' ? `penyesuaian/${id}` : 'skenario');
  };
  const weak = weaknessReport(state, ctx);
  const go = (k: TopicKind, id: string) => navigate(k === 'txn' ? `transaksi/${id}` : k === 'adj' ? `penyesuaian/${id}` : 'skenario');
  const KIND_LABEL: Record<TopicKind, string> = { txn: 'transaksi', adj: 'penyesuaian', sc: 'skenario' };

  const next =
    TRANSACTIONS.find((t) => resultFor(state, 'txn', t.no, ctx).status === 'BELUM DIISI' && !state.analysis[String(t.no)]?.decision) ??
    TRANSACTIONS.find((t) => resultFor(state, 'txn', t.no, ctx).status === 'PERIKSA');

  const accPct = worked > 0 ? correct / worked : 0;
  const comp = summarizeComponents(state, ctx);
  const totalItems = rows.reduce((t, r) => t + r.sum.total, 0);
  const attempts14 = useMemo(() => dailyActivity(state.log, 14).reduce((t, d) => t + d.attempts, 0), [state.log]);
  const stageStatus = (r: (typeof rows)[number]) =>
    r.sum.total > 0 && r.sum.correct === r.sum.total
      ? 'Selesai'
      : r.sum.worked + r.sum.pending === 0
        ? 'Belum dimulai'
        : `${r.sum.worked} dari ${r.sum.total} diperiksa`;
  const user = useProfile();
  const run = useMemo(() => streak(state.log), [state.log]);
  const hour = new Date().getHours();
  const greeting = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 18 ? 'Selamat sore' : 'Selamat malam';
  const all = useMemo(() => moduleStatuses(state.learning, practiceMap(state, ctx)), [state, ctx]);
  const modulesDone = all.filter((m) => m.status === 'Completed').length;
  const doneStages = rows.filter((r) => r.sum.total > 0 && r.sum.correct === r.sum.total);
  // Pencapaian hanya muncul bila syaratnya terpenuhi menurut state/log nyata.
  const achievements: Array<{ id: string; tone: TagTone; title: string; detail: string }> = [];
  if (correct >= 1) achievements.push({ id: 'first', tone: 'lilac', title: 'Jawaban benar pertama', detail: `${correct} soal benar sejauh ini` });
  if (correct >= 25) achievements.push({ id: '25', tone: 'lime', title: '25 jawaban benar', detail: `${correct} soal benar sejauh ini` });
  if (doneStages.length > 0) achievements.push({ id: 'stage', tone: 'aqua', title: 'Satu tahap tuntas', detail: doneStages.map((r) => r.label).join(', ') });
  if (modulesDone > 0)
    achievements.push({ id: 'modul', tone: 'blush', title: 'Materi pertama selesai', detail: `${modulesDone} dari ${all.length} materi selesai` });
  if (run >= 3) achievements.push({ id: 'streak', tone: 'lime', title: `Berlatih ${run} hari berturut-turut`, detail: 'Dihitung dari log percobaan' });
  const nextTopic = next ? TRANSACTIONS.find((t) => t.no === next.no)?.topic : undefined;

  return (
    <div className="ap-stagger space-y-5">
      <Onboarding />

      <section
        className="relative overflow-hidden rounded-[28px] border-2 border-slate-900 bg-[var(--tag-lilac-bg)] p-6 shadow-[6px_6px_0_var(--neo-shadow)]"
        aria-labelledby="dash-hero"
      >
        {/* bentuk dekoratif statis (tidak bergerak, tidak dibaca pembaca layar) */}
        <span aria-hidden="true" className="absolute -right-8 -top-10 size-40 rounded-full border-2 border-slate-900 bg-[var(--tag-lime-bg)]" />
        <div className="relative flex flex-wrap items-center gap-6">
          <div className="min-w-0 flex-1 basis-80">
            <div className="eyebrow">
              {greeting}
              {user ? `, ${user.name}` : ''}
            </div>
            <h2 id="dash-hero" className="mt-1 text-4xl font-extrabold leading-tight tracking-tight text-slate-900">
              Lanjutkan pembelajaran Anda
            </h2>
            {next ? (
              <p className="mt-2 text-sm text-slate-700">
                Langkah berikutnya: <b className="font-medium">Transaksi {next.no}</b>
                {nextTopic ? ` — ${nextTopic}` : ''}. Isi jurnalnya, lalu tekan Periksa untuk melihat letak salahnya.
              </p>
            ) : (
              <p className="mt-2 text-sm text-slate-700">Semua transaksi sudah dikerjakan. Perbaiki yang masih salah atau lanjut ke tahap penyesuaian.</p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {next ? (
                <button className="btn btn-primary h-10 px-5" onClick={() => navigate(`transaksi/${next.no}`)}>
                  Lanjutkan: transaksi {next.no} <Icon name="arrow" size={16} />
                </button>
              ) : (
                <button className="btn btn-primary h-10 px-5" onClick={() => navigate('penyesuaian')}>
                  Lanjut ke penyesuaian <Icon name="arrow" size={16} />
                </button>
              )}
              {due.length > 0 && (
                <button className="btn h-10 bg-white/70" onClick={() => startReview(due[0].kind, due[0].id)}>
                  Ulas {due.length} soal dulu
                </button>
              )}
            </div>
          </div>
          <div className="relative flex items-center gap-4 rounded-2xl border-2 border-slate-900 bg-white p-4 shadow-[3px_3px_0_var(--neo-shadow)]">
            <Ring value={accPct} label={`Akurasi ${worked > 0 ? pct(accPct) : 'belum ada'}`} size={88} />
            <div>
              <div className="text-xs text-slate-500">Akurasi keseluruhan</div>
              <div className="text-4xl font-extrabold tracking-tight tabular-nums text-slate-900">{worked > 0 ? pct(accPct) : '—'}</div>
            </div>
          </div>
        </div>
        <div className="relative mt-4 space-y-0.5 text-xs text-slate-600">
          <div>
            {correct} benar dari {worked} item yang sudah diperiksa (item yang kuncinya dibuka tidak dihitung)
          </div>
          <div data-testid="skor-komponen">
            Skor komponen jurnal: {comp.ratio === null ? '—' : pct(comp.ratio)} ({comp.earned} dari {comp.total} komponen akun, sisi, dan nominal pada{' '}
            {comp.items} jurnal). Ini umpan balik tambahan dan tidak mengubah akurasi.
          </div>
        </div>
      </section>

      <dl className="card grid divide-y-2 divide-slate-900 overflow-hidden !p-0 sm:grid-cols-3 sm:divide-x-2 sm:divide-y-0" data-testid="dash-kpi">
        <Stat tone="lilac" label="Latihan benar" value={`${correct}`} sub={`dari ${totalItems} soal`} />
        <Stat
          tone={due.length > 0 ? 'blush' : 'lime'}
          label="Perlu diulas"
          value={`${due.length}`}
          sub={due.length > 0 ? 'siap dikerjakan ulang' : 'tidak ada yang tertunda'}
          warn={due.length > 0}
        />
        <Stat tone="aqua" label="Aktivitas" value={`${attempts14}`} sub="soal dikerjakan (14 hari)" />
      </dl>

      <div data-testid="dash-siklus">
        <h2 className="mb-3">Progres siklus akuntansi</h2>
        <ul className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
          {rows.map((r) => {
            const empty = r.sum.total - r.sum.worked - r.sum.pending;
            const done = r.sum.total > 0 && r.sum.correct === r.sum.total;
            return (
              <li key={r.kind}>
                <button
                  className="ap-lift block h-full w-full rounded-[20px] bg-white p-4 text-left"
                  onClick={() => navigate(r.href)}
                  aria-label={`${r.label}: ${stageStatus(r)}`}
                >
                  <span className="mb-2 flex items-center justify-between gap-2">
                    <Tag tone={r.tone}>{r.cat}</Tag>
                    {done && <DoneMark />}
                  </span>
                  <span className="block text-sm font-medium text-slate-900">{r.label}</span>
                  <span className={`mb-2 mt-0.5 block text-xs ${done ? 'text-emerald-700' : 'text-slate-500'}`}>{stageStatus(r)}</span>
                  <StackedBar
                    total={r.sum.total}
                    parts={[
                      [r.sum.correct, 'bg-emerald-600', 'benar'],
                      [r.sum.review, 'bg-amber-500', 'perlu diperiksa'],
                      [r.sum.pending, 'bg-blue-500', 'menunggu periksa'],
                      [empty, 'bg-slate-200', 'kosong'],
                    ]}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Jalur />
        <section className="card" aria-labelledby="dash-capai" data-testid="dash-capai">
          <h2 id="dash-capai" className="mb-3">
            Pencapaian
          </h2>
          {achievements.length === 0 ? (
            <p className="text-sm text-slate-600">
              Belum ada pencapaian. Pencapaian muncul di sini setelah Anda benar-benar menyelesaikan sesuatu, misalnya satu jurnal yang diperiksa BENAR.
            </p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {achievements.map((a) => (
                <Achievement key={a.id} tone={a.tone} title={a.title} detail={a.detail} />
              ))}
            </ul>
          )}
        </section>
      </div>

      <details className="card !p-0" data-testid="dash-detail">
        <summary className="cursor-pointer px-5 py-4 text-base font-medium text-slate-800">Detail progres per latihan</summary>
        <div className="overflow-x-auto">
          <h2 className="sr-only">Progres per latihan</h2>
          <table>
            <thead>
              <tr>
                <th className="pl-5">Latihan</th>
                <th className="w-48">Progres</th>
                <th className="num">Total</th>
                <th className="num">Diperiksa</th>
                <th className="num">Benar</th>
                <th className="num">Perlu diperiksa</th>
                <th className="num" title="Sudah diisi tetapi belum ditekan Periksa">
                  Menunggu Periksa
                </th>
                <th className="num" title="Belum diisi sama sekali">
                  Kosong
                </th>
                <th className="num pr-5">Akurasi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const empty = r.sum.total - r.sum.worked - r.sum.pending;
                return (
                  <tr key={r.kind} className="cursor-pointer" onClick={() => navigate(r.href)}>
                    <td className="pl-5 font-medium text-blue-700">{r.label}</td>
                    <td className="align-middle">
                      <StackedBar
                        total={r.sum.total}
                        parts={[
                          [r.sum.correct, 'bg-emerald-600', 'benar'],
                          [r.sum.review, 'bg-amber-500', 'perlu diperiksa'],
                          [r.sum.pending, 'bg-blue-500', 'menunggu periksa'],
                          [empty, 'bg-slate-200', 'kosong'],
                        ]}
                      />
                    </td>
                    <td className="num">{r.sum.total}</td>
                    <td className="num">{r.sum.worked}</td>
                    <td className="num">{r.sum.correct}</td>
                    <td className="num">{r.sum.review}</td>
                    <td className="num">{r.sum.pending}</td>
                    <td className="num">{empty}</td>
                    <td className="num pr-5">{r.sum.accuracy === null ? '—' : pct(r.sum.accuracy)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="card">
          <h2 className="mb-2">Ulasan hari ini {due.length > 0 && <span className="text-sm font-normal text-slate-500">({due.length})</span>}</h2>
          {due.length === 0 ? (
            <p className="text-sm text-slate-600">
              Tidak ada yang perlu diulas. Soal yang pernah salah dijadwalkan kembali otomatis (1, 3, 7, 14, lalu 30 hari setelah Anda menjawab benar).
            </p>
          ) : (
            <>
              <p className="mb-2 text-xs text-slate-500">
                Mengerjakan ulang menghapus jawaban lama soal itu agar benar-benar diuji lagi (bisa diurungkan dengan Ctrl+Z).
              </p>
              <ul className="divide-y divide-slate-200 text-sm">
                {due.slice(0, 8).map((d) => (
                  <li key={`${d.kind}:${d.id}`} className="flex items-center justify-between gap-2 py-2">
                    <span>
                      {titleOf(d.kind, d.id)} <span className="text-xs text-slate-500">· tahap {d.box + 1}</span>
                    </span>
                    <button className="btn" onClick={() => startReview(d.kind, d.id)}>
                      Kerjakan ulang
                    </button>
                  </li>
                ))}
              </ul>
              {due.length > 8 && <p className="mt-1 text-xs text-slate-500">dan {due.length - 8} lainnya.</p>}
            </>
          )}
        </div>

        <div className="card">
          <h2 className="mb-2">Titik lemah</h2>
          {weak.topics.length === 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-slate-600">Belum ada topik yang sering salah. Bagian ini terisi setelah Anda menekan Periksa pada beberapa soal.</p>
              <button className="btn" onClick={() => navigate('transaksi')}>
                Buka Transaksi
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="mb-1 text-xs font-medium text-slate-500">Topik yang perlu dilatih ulang</div>
                <ul className="divide-y divide-slate-200 text-sm">
                  {weak.topics.slice(0, 6).map((t) => (
                    <li key={`${t.kind}:${t.topic}`} className="flex items-center justify-between gap-2 py-2">
                      <span>
                        <b className="font-medium">{t.topic}</b> <span className="text-xs text-slate-500">({KIND_LABEL[t.kind]})</span>
                        <br />
                        <span className="text-xs text-slate-600">
                          {t.wrong} dari {t.worked} masih salah{t.retries > 0 ? ` · ${t.retries} percobaan ulang` : ''}
                        </span>
                      </span>
                      {t.next && (
                        <button className="btn" onClick={() => go(t.next!.kind, t.next!.id)}>
                          Latih ulang
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="mb-1 text-xs font-medium text-slate-500">Jenis kesalahan yang paling sering</div>
                <ul className="divide-y divide-slate-200 text-sm">
                  {weak.reasons.map((r) => {
                    const tip = REASON_TIPS[r.reason];
                    return (
                      <li key={r.reason} className="py-2">
                        <b className="font-medium">{tip?.label ?? r.reason}</b> · {r.count} item
                        {tip && <div className="text-xs text-slate-600">{tip.tip}</div>}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      <Aktivitas />

      <div className="card">
        <h2 className="mb-2">Status tahapan siklus akuntansi</h2>
        <ul className="divide-y divide-slate-200 text-sm">
          <Stage label="Neraca saldo sebelum penyesuaian (09)" value={stage(pre.debit === pre.credit)} />
          <Stage label="Neraca saldo setelah penyesuaian (11)" value={stage(adj.debit === adj.credit)} />
          <Stage label="Persamaan akuntansi (14)" value={empty ? '— belum ada jurnal' : String(ctx.report.cells.S14_B66)} />
          <Stage
            label="Pemeriksaan antar-laporan (23)"
            value={`${checksOk} dari ${checks.length} konsisten`}
            note={empty ? ' (semua nol karena jurnal masih kosong)' : undefined}
          />
        </ul>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, warn, tone }: { label: string; value: string; sub: string; warn?: boolean; tone: TagTone }) {
  return (
    <div className={`px-5 py-4 tag-${tone}`}>
      <dt className="eyebrow !text-inherit">{label}</dt>
      <dd className={`mt-1 text-4xl font-extrabold tracking-tight tabular-nums ${warn ? 'text-amber-900' : 'text-slate-900'}`}>{value}</dd>
      <dd className="text-xs font-medium text-slate-700">{sub}</dd>
    </div>
  );
}

function Stage({ label, value, note }: { label: string; value: string; note?: string }) {
  const bad = /TIDAK|selisih/i.test(value);
  const good = /^Seimbang$/.test(value);
  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <span className="text-slate-600">{label}:</span>
      <b className={`flex items-center gap-1 font-medium ${bad ? 'text-red-700' : 'text-slate-800'}`}>
        {good && <Icon name="check" size={16} className="text-emerald-600" />}
        {bad && <Icon name="alert" size={16} />}
        {value}
        {note && <span className="font-normal text-slate-500">{note}</span>}
      </b>
    </li>
  );
}

/** Aktivitas 14 hari terakhir, streak, dan tren akurasi mingguan; semuanya dihitung dari log percobaan. */
function Aktivitas() {
  const log = useApp((s) => s.state.log);
  const days = useMemo(() => dailyActivity(log, 14), [log]);
  const weeks = useMemo(() => weeklyAccuracy(log, 4), [log]);
  const run = useMemo(() => streak(log), [log]);
  const max = Math.max(1, ...days.map((d) => d.attempts));
  const total = days.reduce((t, d) => t + d.attempts, 0);
  return (
    <div className="card" data-testid="aktivitas">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2>Aktivitas 14 hari</h2>
        <span className="text-sm text-slate-600">
          {total} percobaan · streak {run} hari
        </span>
      </div>
      {log.length === 0 ? (
        <p className="text-sm text-slate-500">Belum ada percobaan tercatat. Tekan Periksa pada sebuah soal dan grafik akan muncul di sini.</p>
      ) : (
        <>
          <div className="flex h-20 items-end gap-1" role="img" aria-label={`Percobaan per hari: ${days.map((d) => d.attempts).join(', ')}`}>
            {days.map((d) => (
              <div key={d.day} className="flex h-full flex-1 flex-col justify-end" title={`${d.day}: ${d.correct}/${d.attempts} benar`}>
                <div className="rounded-t-sm bg-blue-200" style={{ height: `${((d.attempts - d.correct) / max) * 100}%` }} />
                <div className={`bg-emerald-600 ${d.attempts - d.correct === 0 ? 'rounded-t-sm' : ''}`} style={{ height: `${(d.correct / max) * 100}%` }} />
                {d.attempts === 0 && <div className="h-px bg-slate-300" />}
              </div>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-xs text-slate-500">
            <span>{days[0].day.slice(5)}</span>
            <span>
              <span className="mr-1 inline-block size-2 rounded-sm bg-emerald-600" />
              benar <span className="ml-2 mr-1 inline-block size-2 rounded-sm bg-blue-200" />
              perlu diperiksa
            </span>
            <span>{days[13].day.slice(5)}</span>
          </div>
          <div className="mt-3 text-sm">
            <span className="text-slate-500">Akurasi mingguan: </span>
            {weeks.map((w, i) => (
              <span key={i} className="mr-3 whitespace-nowrap">
                {w.label}: <b>{w.accuracy === null ? '—' : pct(w.accuracy)}</b>
                <span className="text-xs text-slate-500"> ({w.attempts})</span>
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** Ringkasan Jalur Belajar dari kemajuan nyata (kuis dan latihan). */
function Jalur() {
  const { state, ctx } = useCtx();
  const all = useMemo(() => moduleStatuses(state.learning, practiceMap(state, ctx)), [state, ctx]);
  const next = recommend(all);
  const done = all.filter((s) => s.status === 'Completed').length;
  const percent = overallPercent(all);
  return (
    <div className="card space-y-3" data-testid="dash-jalur">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2>Jalur Belajar</h2>
        <div className="text-sm text-slate-600">
          {done} dari {all.length} materi selesai · {percent}%
        </div>
      </div>
      <Meter percent={percent} label={`Kemajuan jalur belajar ${percent} persen`} />
      {next ? (
        <button className="btn btn-primary" onClick={() => navigate(`belajar/${next.module.id}`)}>
          Materi berikutnya: {next.module.no}. {next.module.title} <Icon name="arrow" size={16} />
        </button>
      ) : (
        <span className="text-sm text-emerald-800">Seluruh materi selesai.</span>
      )}
    </div>
  );
}
