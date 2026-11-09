import { useState } from 'react';
import corrData from '../../../data/correcting-cases.json';
import { KEY } from '../../data';
import type { JournalLine } from '../../engine/types';
import { resultFor } from '../../store/derive';
import { useApp } from '../../store/useApp';
import { JournalForm } from '../components/JournalForm';
import { KeyReveal } from '../components/KeyReveal';
import { StatusBadge } from '../components/StatusBadge';
import { useCtx } from '../hooks';

const cases = corrData.correcting as Array<{ no: number; event: string }>;
const detect = corrData.detect as Array<{ no: number; event: string }>;
const types = corrData.errorTypeOptions as string[];

export function Koreksi() {
  const { state, ctx } = useCtx();
  const [tab, setTab] = useState<'cor' | 'err'>('cor');
  return (
    <div className="space-y-3">
      <div className="flex gap-1">
        <button className={`btn ${tab === 'cor' ? 'btn-primary' : ''}`} onClick={() => setTab('cor')}>
          Jurnal koreksi ({cases.length})
        </button>
        <button className={`btn ${tab === 'err' ? 'btn-primary' : ''}`} onClick={() => setTab('err')}>
          Deteksi kesalahan ({detect.length})
        </button>
      </div>
      {tab === 'cor' &&
        cases.map((c) => {
          const id = String(c.no);
          const r = resultFor(state, 'cor', id, ctx);
          return (
            <div key={id} className="card">
              <div className="mb-1 flex items-center justify-between">
                <b>Kasus {c.no}</b>
                <StatusBadge status={r.status} />
              </div>
              <p className="mb-2 text-sm">{c.event}</p>
              <label className="mb-2 block text-sm">
                <span className="mb-0.5 block text-xs text-slate-500">Jenis kesalahan</span>
                <select className="w-full sm:w-80" value={state.errorType[id] ?? ''} onChange={(e) => useApp.getState().setErrorType(id, e.target.value)}>
                  <option value="">— pilih —</option>
                  {types.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <JournalForm
                idPrefix={`Koreksi ${id}`}
                lines={state.correcting[id] ?? []}
                minRows={3}
                result={r}
                showCheck={state.settings.validationMode === 'check'}
                onChange={(ls: JournalLine[]) => useApp.getState().setLines('correcting', id, ls)}
                onCheck={() => useApp.getState().check('cor', id)}
              />
              <KeyReveal revealed={r.revealed} onReveal={() => useApp.getState().reveal('cor', id)}>
                <p>
                  Jenis kesalahan: <b>{KEY.errorType[id] ?? '—'}</b>
                </p>
                {KEY.correctingNet[id] ? (
                  <ul className="list-disc pl-5">
                    {Object.entries(KEY.correctingNet[id]).map(([k, v]) => (
                      <li key={k}>
                        {k}: {v > 0 ? 'debit' : 'kredit'} {Math.abs(v).toLocaleString('id-ID')}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>Tidak perlu jurnal koreksi.</p>
                )}
              </KeyReveal>
            </div>
          );
        })}
      {tab === 'err' &&
        detect.map((c) => {
          const id = String(c.no);
          const r = resultFor(state, 'err', id, ctx);
          return (
            <div key={id} className="card">
              <div className="mb-1 flex items-center justify-between">
                <b>Kasus {c.no}</b>
                <StatusBadge status={r.status} />
              </div>
              <p className="mb-2 text-sm">{c.event}</p>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label={`Jenis kesalahan ${id}`}
                  className="w-full sm:w-80"
                  value={state.errorType[id] ?? ''}
                  onChange={(e) => useApp.getState().setErrorType(id, e.target.value)}
                >
                  <option value="">— pilih —</option>
                  {types.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
                {state.settings.validationMode === 'check' && (
                  <button className="btn btn-primary" onClick={() => useApp.getState().check('err', id)}>
                    Periksa
                  </button>
                )}
              </div>
              <KeyReveal revealed={r.revealed} onReveal={() => useApp.getState().reveal('err', id)}>
                <p>
                  Jawaban: <b>{KEY.errorType[id]}</b>
                </p>
              </KeyReveal>
            </div>
          );
        })}
    </div>
  );
}
