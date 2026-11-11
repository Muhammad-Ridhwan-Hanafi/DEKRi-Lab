import { useMemo, useState } from 'react';
import { KEY, TRANSACTIONS } from '../../data';
import type { AnalysisKey } from '../../data/types';
import options from '../../../data/analysis-options.json';
import { makeCtx, resultFor, type ShownStatus } from '../../store/derive';
import { useApp } from '../../store/useApp';
import type { JournalLine } from '../../engine/types';
import { JournalForm } from '../components/JournalForm';
import { KeyJournal, KeyReveal } from '../components/KeyReveal';
import { StatusBadge } from '../components/StatusBadge';
import { Diagnosis, KeyCompare } from '../components/Diagnosis';
import { FlagNote, Hints, StepExplain, WhyCorrect } from '../components/StudyAids';
import { useCtx } from '../hooks';
import { navigate } from '../router';

const LEVELS = ['Semua', 'Intermediate', 'Advanced', 'Expert'];
const STATUSES = ['Semua', 'Ditandai', 'BELUM DIISI', 'BELUM DIPERIKSA', 'PERIKSA', 'BENAR'] as const;
const dateId = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

export function Transaksi({ no }: { no?: string }) {
  const { state, ctx } = useCtx();
  const [level, setLevel] = useState('Semua');
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('Semua');
  const [q, setQ] = useState('');

  const list = useMemo(
    () =>
      TRANSACTIONS.filter((t) => {
        if (level !== 'Semua' && t.level !== level) return false;
        if (q && !`${t.no} ${t.topic} ${t.party}`.toLowerCase().includes(q.toLowerCase())) return false;
        if (status === 'Ditandai') return state.flags.includes(`txn:${t.no}`);
        if (status !== 'Semua' && resultFor(state, 'txn', t.no, ctx).status !== status) return false;
        return true;
      }),
    [level, status, q, state, ctx],
  );

  const tx = no ? TRANSACTIONS.find((t) => String(t.no) === no) : undefined;
  return (
    <div className="grid gap-4 lg:grid-cols-[272px_minmax(0,1fr)] 2xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="card h-fit lg:sticky lg:top-4">
        <div className="mb-2 grid grid-cols-2 gap-2">
          <select aria-label="Filter tingkat" value={level} onChange={(e) => setLevel(e.target.value)}>
            {LEVELS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
          <select aria-label="Filter status" value={status} onChange={(e) => setStatus(e.target.value as (typeof STATUSES)[number])}>
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <input aria-label="Cari transaksi" className="mb-2 w-full" placeholder="Cari topik atau pihak" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="mb-1 text-xs text-slate-500">
          {list.length} dari {TRANSACTIONS.length} transaksi
        </div>
        <ul className="max-h-[60vh] overflow-auto">
          {list.map((t) => {
            const r = resultFor(state, 'txn', t.no, ctx);
            return (
              <li key={t.no}>
                <button
                  className={`flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-slate-100 ${String(t.no) === no ? 'bg-blue-50' : ''}`}
                  onClick={() => navigate(`transaksi/${t.no}`)}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block">
                      <b>{t.no}.</b> {t.topic}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-600">
                      <span>
                        {dateId(t.date)} · {t.level}
                      </span>
                      <StatusBadge status={r.status as ShownStatus} />
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <section>
        {!tx ? (
          <div className="card text-sm text-slate-600">Pilih transaksi dari daftar untuk membaca narasi, menganalisis, dan menjurnal.</div>
        ) : (
          <div className="card">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-2xl">
                Transaksi {tx.no}: {tx.topic}
              </h2>
              <div className="flex gap-1">
                <button className="btn" disabled={tx.no <= 1} onClick={() => navigate(`transaksi/${tx.no - 1}`)}>
                  ← Sebelumnya
                </button>
                <button className="btn" disabled={tx.no >= TRANSACTIONS.length} onClick={() => navigate(`transaksi/${tx.no + 1}`)}>
                  Berikutnya →
                </button>
              </div>
            </div>
            <Baca no={tx.no} />
            <h3 className="mb-1 mt-4 text-lg font-extrabold">Jurnal</h3>
            <Jurnal no={String(tx.no)} />
            <details className="mt-4 rounded-md border border-slate-200 p-2" key={`ana-${tx.no}`}>
              <summary className="cursor-pointer select-none text-sm font-semibold">
                Analisis (opsional) <AnalisisStatus no={String(tx.no)} />
              </summary>
              <div className="mt-2">
                <Analisis no={String(tx.no)} />
              </div>
            </details>
          </div>
        )}
      </section>
    </div>
  );
}

function AnalisisStatus({ no }: { no: string }) {
  const { state, ctx } = useCtx();
  return <StatusBadge status={resultFor(state, 'ana', no, ctx).status} />;
}

function Baca({ no }: { no: number }) {
  const t = TRANSACTIONS.find((x) => x.no === no)!;
  return (
    <>
      <dl className="space-y-2 text-sm">
        <div>
          <dt className="text-xs text-slate-500">Tanggal · Tingkat</dt>
          <dd>
            {dateId(t.date)} · {t.level}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Narasi kejadian</dt>
          <dd>{t.narrative}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Pihak terkait</dt>
          <dd>{t.party}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Informasi nominal dan syarat</dt>
          <dd>{t.amountInfo}</dd>
        </div>
      </dl>
      <div className="mt-2 rounded-sm bg-slate-50 p-2 text-xs text-slate-600">
        Tidak semua peristiwa memerlukan jurnal. Centang "tidak perlu jurnal" di bagian Jurnal bila memang tidak ada jurnalnya.
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-0.5 block text-xs text-slate-500">{label}</span>
      {children}
    </label>
  );
}

/** Penjelasan singkat untuk pilihan yang sedang dipilih, supaya pilihan itu bisa dipahami, bukan sekadar ditebak. */
function Explain({ text }: { text?: string }) {
  return text ? <span className="mt-1 block text-xs text-slate-600">{text}</span> : null;
}

const CASH_CLASS_INFO: Record<string, string> = {
  Operasi: 'Arus kas operasi: kas dari kegiatan utama usaha, misalnya penjualan, pembelian persediaan, gaji, dan beban operasional.',
  Investasi: 'Arus kas investasi: kas untuk membeli atau menjual aset jangka panjang, misalnya peralatan, kendaraan, dan investasi.',
  Pendanaan: 'Arus kas pendanaan: kas dari pemilik atau kreditur, misalnya setoran modal, pinjaman bank, dan pembayaran dividen.',
  'Non-kas / Reklasifikasi': 'Tidak ada kas yang bergerak: hanya pencatatan antarakun, misalnya penyusutan, amortisasi, atau pemindahan saldo.',
  'Tidak ada transaksi': 'Peristiwa ini bukan transaksi akuntansi, jadi tidak masuk laporan arus kas.',
};

const YES_NO_INFO: Record<'needsAdj' | 'affectsProfit' | 'affectsCash', Record<string, string>> = {
  needsAdj: {
    Ya: 'Ya: ada bagian yang baru diakui seiring waktu (mis. beban dibayar di muka, pendapatan diterima di muka, penyusutan), sehingga perlu jurnal penyesuaian pada akhir tahun.',
    Tidak: 'Tidak: transaksi sudah dicatat penuh pada periode ini, jadi tidak ada penyesuaian akhir tahun.',
  },
  affectsProfit: {
    Ya: 'Ya: transaksi ini menambah pendapatan atau beban, sehingga mengubah laba rugi periode ini.',
    Tidak: 'Tidak: hanya menukar atau mengubah aset, kewajiban, atau ekuitas tanpa pendapatan atau beban, jadi laba tidak berubah.',
  },
  affectsCash: {
    Ya: 'Ya: ada kas atau bank yang masuk atau keluar pada transaksi ini.',
    Tidak: 'Tidak: tidak ada kas atau bank yang bergerak (mis. transaksi kredit, atau jurnal non-kas).',
  },
};

/** Poin-poin penjelasan setelah analisis benar: alasan tiap jawaban kunci, lalu alasan akuntansi dari kunci. */
function analysisWhy(key: AnalysisKey): string[] {
  if (key.debit === '-' || key.debit === null) return [`Peristiwa ini tidak perlu jurnal.${key.reason ? ' ' + key.reason : ''}`];
  const pts = [
    key.cashClass ? `Arus kas — ${key.cashClass}: ${CASH_CLASS_INFO[key.cashClass]?.replace(/^[^:]*:\s*/, '') ?? ''}` : '',
    key.needsAdj ? `Penyesuaian akhir tahun — ${YES_NO_INFO.needsAdj[key.needsAdj] ?? key.needsAdj}` : '',
    key.affectsProfit ? `Laba — ${YES_NO_INFO.affectsProfit[key.affectsProfit] ?? key.affectsProfit}` : '',
    key.affectsCash ? `Kas — ${YES_NO_INFO.affectsCash[key.affectsCash] ?? key.affectsCash}` : '',
  ];
  return pts.filter(Boolean);
}

function Analisis({ no }: { no: string }) {
  const { state, ctx } = useCtx();
  const a = state.analysis[no] ?? {};
  const set = useApp.getState().setAnalysis;
  const r = resultFor(state, 'ana', no, ctx);
  const key = KEY.analysis[no];
  const yn = (k: 'needsAdj' | 'affectsProfit' | 'affectsCash', label: string) => (
    <Field label={label}>
      <select className="w-full" value={a[k] ?? ''} onChange={(e) => set(no, { [k]: e.target.value })}>
        <option value="">— pilih —</option>
        {options.yesNo.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
      <Explain text={YES_NO_INFO[k][a[k] ?? '']} />
    </Field>
  );
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Klasifikasi arus kas">
          <select className="w-full" value={a.cashClass ?? ''} onChange={(e) => set(no, { cashClass: e.target.value })}>
            <option value="">— pilih —</option>
            {options.cashClass.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
          <Explain text={CASH_CLASS_INFO[a.cashClass ?? '']} />
        </Field>
        {yn('needsAdj', 'Perlu penyesuaian akhir tahun?')}
        {yn('affectsProfit', 'Memengaruhi laba?')}
        {yn('affectsCash', 'Memengaruhi kas?')}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {state.settings.validationMode === 'check' && (
          <button className="btn btn-primary" onClick={() => useApp.getState().check('ana', no)}>
            Periksa
          </button>
        )}
        <StatusBadge status={r.status} />
        {r.status !== 'BELUM DIPERIKSA' && r.status !== 'BELUM DIISI' && <span className="text-sm">{r.grade.message}</span>}
      </div>
      {r.status === 'BENAR' && !r.revealed && <WhyCorrect points={analysisWhy(key)} />}
      <KeyReveal revealed={r.revealed} onReveal={() => useApp.getState().reveal('ana', no)}>
        {key.debit === '-' ? (
          <p>Tidak ada jurnal untuk peristiwa ini. {key.reason}</p>
        ) : (
          <ul className="list-disc pl-5">
            <li>Klasifikasi arus kas: {key.cashClass}</li>
            <li>
              Perlu penyesuaian: {key.needsAdj} · Memengaruhi laba: {key.affectsProfit} · Memengaruhi kas: {key.affectsCash}
            </li>
          </ul>
        )}
      </KeyReveal>
    </div>
  );
}

function Jurnal({ no }: { no: string }) {
  const { state, ctx } = useCtx();
  const r = resultFor(state, 'txn', no, ctx);
  const lines = state.journal[no] ?? [];
  const key = KEY.readableTxn.find((t) => String(t.no) === no)!;
  const none = state.analysis[no]?.decision === 'Tidak perlu jurnal';
  const n = Number(no);
  const goNext = () => {
    const { state: s } = useApp.getState();
    const c = makeCtx(s);
    const target = TRANSACTIONS.find((t) => t.no > n && resultFor(s, 'txn', t.no, c).status !== 'BENAR') ?? TRANSACTIONS.find((t) => t.no === n + 1);
    if (target) navigate(`transaksi/${target.no}`);
  };
  const check = () => useApp.getState().check('txn', no);
  return (
    <div>
      <label className="mb-2 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={none}
          onChange={(e) => useApp.getState().setAnalysis(no, { decision: e.target.checked ? 'Tidak perlu jurnal' : 'Perlu jurnal' })}
        />
        Peristiwa ini tidak perlu jurnal
      </label>
      <JournalForm
        idPrefix={`Jurnal ${no}`}
        lines={lines}
        minRows={4}
        result={r}
        showCheck={state.settings.validationMode === 'check'}
        onChange={(ls: JournalLine[]) => useApp.getState().setLines('journal', no, ls)}
        onCheck={check}
        onSubmit={() => (r.status === 'BENAR' ? goNext() : check())}
      />
      {r.status === 'BENAR' && (
        <div className="mt-2">
          <button className="btn btn-primary" onClick={goNext}>
            Soal berikutnya →
          </button>
        </div>
      )}
      {r.status === 'PERIKSA' && !r.revealed && key.lines.length > 0 && !none && (
        <Diagnosis
          lines={lines}
          keyLines={key.lines}
          text={`${TRANSACTIONS.find((t) => String(t.no) === no)?.narrative ?? ''} ${TRANSACTIONS.find((t) => String(t.no) === no)?.amountInfo ?? ''}`}
        />
      )}
      {r.status === 'BENAR' && !r.revealed && <WhyCorrect explain={key.explain} lines={key.lines} topic={key.topic} />}
      {r.status !== 'BENAR' && !r.revealed && <Hints kind="txn" id={no} topic={key.topic} lines={key.lines} />}
      <FlagNote kind="txn" id={no} />
      <KeyReveal
        revealed={r.revealed}
        onReveal={() => useApp.getState().reveal('txn', no)}
        onAdopt={
          key.lines.length > 0
            ? () => (
                useApp.getState().setAnalysis(no, { decision: 'Perlu jurnal' }),
                useApp.getState().setLines(
                  'journal',
                  no,
                  key.lines.map((l, i) => ({ id: `k${i}`, code: l.code, debit: l.debit, credit: l.credit, memo: '' })),
                )
              )
            : undefined
        }
      >
        {key.lines.length === 0 ? (
          <p>Tidak ada jurnal untuk peristiwa ini.</p>
        ) : (
          <>
            <KeyCompare lines={lines} keyLines={key.lines} />
            <KeyJournal lines={key.lines} />
          </>
        )}
        <StepExplain lines={key.lines} topic={key.topic} explain={key.explain} reason={KEY.analysis[no]?.reason} />
      </KeyReveal>
    </div>
  );
}
