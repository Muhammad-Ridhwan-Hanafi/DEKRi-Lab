import { useState } from 'react';
import { KEY, SCENARIOS } from '../../data';
import { KAS_KELOMPOK, KAS_SOAL, type KasKelompok, type KasSoal } from '../../data/arus-kas';
import { resultFor } from '../../store/derive';
import { useApp } from '../../store/useApp';
import { KeyReveal } from '../components/KeyReveal';
import { StatusBadge } from '../components/StatusBadge';
import { useCtx } from '../hooks';

export function Skenario() {
  const { state, ctx } = useCtx();
  return (
    <div className="space-y-3">
      {SCENARIOS.map((s) => {
        const id = String(s.no);
        const r = resultFor(state, 'sc', id, ctx);
        const a = state.scenarios[id] ?? {};
        const set = useApp.getState().setScenario;
        const k = KEY.scenario[id];
        return (
          <div key={id} className="card">
            <div className="mb-1 flex items-center justify-between">
              <b>
                {s.no}. {s.topic}
              </b>
              <StatusBadge status={r.status} />
            </div>
            <CaseText text={s.caseAndFacts} />
            <p className="my-2 text-sm font-medium">{s.question}</p>
            {s.kind === 'choice' ? (
              <select aria-label={`Jawaban skenario ${id}`} className="w-full" value={a.answer ?? ''} onChange={(e) => set(id, { answer: e.target.value })}>
                <option value="">— pilih —</option>
                {(s.options ?? []).map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            ) : (
              <input
                aria-label={`Jawaban skenario ${id}`}
                className="w-full sm:w-64"
                inputMode="numeric"
                placeholder="Angka (Rp)"
                value={a.answer ?? ''}
                onChange={(e) => set(id, { answer: e.target.value.replace(/[^\d-]/g, '') })}
              />
            )}
            <textarea
              aria-label={`Penalaran ${id}`}
              className="mt-2 w-full"
              rows={2}
              placeholder={s.userResponsePrompt ?? 'Penalaran Anda (tidak dinilai)'}
              value={a.reasoning ?? ''}
              onChange={(e) => set(id, { reasoning: e.target.value })}
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {state.settings.validationMode === 'check' && (
                <button className="btn btn-primary" onClick={() => useApp.getState().check('sc', id)}>
                  Periksa
                </button>
              )}
              {r.status !== 'BELUM DIPERIKSA' && r.status !== 'BELUM DIISI' && <span className="text-sm">{r.grade.message}</span>}
            </div>
            <KeyReveal revealed={r.revealed} onReveal={() => useApp.getState().reveal('sc', id)}>
              <p>
                Kunci: <b>{typeof k.key === 'number' ? k.key.toLocaleString('id-ID') : k.key}</b>
              </p>
              <p>{k.explanation}</p>
            </KeyReveal>
          </div>
        );
      })}
      <LatihanArusKas />
    </div>
  );
}

/** Latihan tambahan klasifikasi arus kas. Jawaban tersimpan di state.pajak (kunci v:kas:*), tidak masuk akurasi Dashboard maupun ujian. */
function LatihanArusKas() {
  return (
    <section className="space-y-3" aria-labelledby="kas-judul">
      <div className="card">
        <h2 id="kas-judul" className="text-lg font-semibold">
          Latihan tambahan: klasifikasi arus kas (PSAK 207)
        </h2>
        <p className="text-sm text-slate-600">
          Soal pilihan di luar 26 skenario inti: tidak dihitung dalam akurasi Dashboard dan tidak masuk pool ujian. Dua kelompok dipisah menurut periode
          berlaku; jangan mencampur aturan sebelum dan sesudah 1 Januari 2027. Nomor paragraf bertanda "cek" belum dicocokkan dengan naskah final di SAK Online.
        </p>
      </div>
      {(['7A', '7B'] as KasKelompok[]).map((g) => {
        const info = KAS_KELOMPOK[g];
        return (
          <div key={g} className="space-y-3" role="group" aria-label={info.judul}>
            <div className="card !bg-[var(--tag-lilac-bg)]">
              <h3 className="font-semibold">{info.judul}</h3>
              <dl className="mt-1 space-y-0.5 text-sm">
                <div>
                  <dt className="inline font-medium">Standar: </dt>
                  <dd className="inline">{info.standar}</dd>
                </div>
                <div>
                  <dt className="inline font-medium">Periode: </dt>
                  <dd className="inline">{info.periode}</dd>
                </div>
                <div>
                  <dt className="inline font-medium">Asumsi: </dt>
                  <dd className="inline">{info.asumsi}</dd>
                </div>
              </dl>
            </div>
            {KAS_SOAL.filter((q) => q.kelompok === g).map((q) => (
              <KasKartu key={q.id} q={q} />
            ))}
          </div>
        );
      })}
    </section>
  );
}

function KasKartu({ q }: { q: KasSoal }) {
  const { state } = useCtx();
  const key = `v:kas:${q.id}`;
  const chosen = state.pajak[key] === undefined ? null : Number(state.pajak[key]);
  const [checked, setChecked] = useState<number | null>(null);
  const done = checked !== null && checked === chosen;
  const right = done && chosen === q.kunci;
  return (
    <div className="card" data-testid={`kas-${q.id}`}>
      <div className="mb-1 flex items-center justify-between">
        <b>
          {q.id}. {q.judul}
        </b>
        {done && <StatusBadge status={right ? 'BENAR' : 'PERIKSA'} />}
      </div>
      <p className="text-sm">{q.narasi}</p>
      <p className="my-2 text-sm font-medium">{q.pertanyaan}</p>
      <select
        aria-label={`Jawaban ${q.id}`}
        className="w-full sm:w-72"
        value={chosen === null || Number.isNaN(chosen) ? '' : String(chosen)}
        onChange={(e) => {
          useApp.getState().setPajak(key, e.target.value);
          setChecked(null);
        }}
      >
        <option value="">— pilih —</option>
        {q.opsi.map((o, i) => (
          <option key={o.teks} value={i}>
            {o.teks}
          </option>
        ))}
      </select>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          className="btn btn-primary"
          disabled={chosen === null || Number.isNaN(chosen)}
          onClick={() => {
            setChecked(chosen);
            useApp.getState().logAttempt('kas', q.id, chosen === q.kunci ? 'BENAR' : 'PERIKSA');
          }}
        >
          Periksa
        </button>
        {done && <span className="text-sm">{right ? 'Benar.' : 'Belum tepat.'}</span>}
      </div>
      {done && chosen !== null && (
        <div role="status" className="mt-2 space-y-1 rounded-md border-2 border-slate-900 p-2 text-sm">
          <p>
            <b>Pilihan Anda ({q.opsi[chosen].teks}):</b> {q.opsi[chosen].alasan}
          </p>
          {!right && (
            <p>
              <b>Jawaban yang benar ({q.opsi[q.kunci].teks}):</b> {q.opsi[q.kunci].alasan}
            </p>
          )}
          <p>{q.penjelasan}</p>
          <p className="text-xs text-slate-600">Dasar: {q.dasar}</p>
        </div>
      )}
    </div>
  );
}

/** Pisahkan "CASE: … FACTS: …" menjadi dua paragraf berlabel agar mudah dibaca. */
function CaseText({ text }: { text: string }) {
  const m = /^\s*CASE:\s*([\s\S]*?)\s*FACTS:\s*([\s\S]*)$/.exec(text);
  if (!m) return <p className="text-sm">{text}</p>;
  return (
    <div className="space-y-1 text-sm">
      <p>
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Kasus</span>
        <br />
        {m[1]}
      </p>
      <p>
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fakta</span>
        <br />
        {m[2]}
      </p>
    </div>
  );
}
