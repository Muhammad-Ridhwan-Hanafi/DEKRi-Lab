import { useState } from 'react';
import { ADJUSTMENTS, KEY } from '../../data';
import type { JournalLine } from '../../engine/types';
import { makeCtx, resultFor } from '../../store/derive';
import { useApp } from '../../store/useApp';
import { JournalForm } from '../components/JournalForm';
import { KeyJournal, KeyReveal } from '../components/KeyReveal';
import { StatusBadge } from '../components/StatusBadge';
import { Diagnosis, KeyCompare } from '../components/Diagnosis';
import { FlagNote, Hints, WhyCorrect } from '../components/StudyAids';
import { useCtx } from '../hooks';

export function Penyesuaian({ code }: { code?: string }) {
  const { state, ctx } = useCtx();
  const [open, setOpen] = useState<string>(code && ADJUSTMENTS.some((a) => a.code === code) ? code : ADJUSTMENTS[0].code);
  const goNext = (from: string) => {
    const { state: st } = useApp.getState();
    const c = makeCtx(st);
    const i = ADJUSTMENTS.findIndex((a) => a.code === from);
    const target = ADJUSTMENTS.slice(i + 1).find((a) => resultFor(st, 'adj', a.code, c).status !== 'BENAR') ?? ADJUSTMENTS[i + 1];
    if (target) setOpen(target.code);
  };
  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-600">
        Jurnal penyesuaian 31 Desember 2024. Baca fakta, lalu jurnal. Hasilnya otomatis masuk Neraca Saldo setelah penyesuaian dan seluruh laporan.
      </p>
      {ADJUSTMENTS.map((a) => {
        const r = resultFor(state, 'adj', a.code, ctx);
        const key = KEY.readableAdj.find((x) => x.code === a.code)!;
        const isOpen = open === a.code;
        return (
          <div key={a.code} className="card">
            <button className="flex w-full items-center justify-between gap-2 text-left" onClick={() => setOpen(isOpen ? '' : a.code)} aria-expanded={isOpen}>
              <span>
                <b>{a.code}</b> · {a.category} <span className="text-xs text-slate-500">({a.level})</span>
              </span>
              <StatusBadge status={r.status} />
            </button>
            {isOpen && (
              <div className="mt-2">
                <p className="mb-2 rounded-sm bg-slate-50 p-2 text-sm">{a.facts}</p>
                <JournalForm
                  idPrefix={a.code}
                  lines={state.adjusting[a.code] ?? []}
                  minRows={3}
                  result={r}
                  showCheck={state.settings.validationMode === 'check'}
                  onChange={(ls: JournalLine[]) => useApp.getState().setLines('adjusting', a.code, ls)}
                  onCheck={() => useApp.getState().check('adj', a.code)}
                  onSubmit={() => (r.status === 'BENAR' ? goNext(a.code) : useApp.getState().check('adj', a.code))}
                />
                {r.status === 'BENAR' && (
                  <button className="btn btn-primary mt-2" onClick={() => goNext(a.code)}>
                    Penyesuaian berikutnya →
                  </button>
                )}
                {r.status === 'PERIKSA' && !r.revealed && <Diagnosis lines={state.adjusting[a.code] ?? []} keyLines={key.lines} text={a.facts} />}
                {r.status === 'BENAR' && !r.revealed && <WhyCorrect explain={key.explain} calc={key.calc} />}
                {r.status !== 'BENAR' && !r.revealed && <Hints kind="adj" id={a.code} topic={a.category} lines={key.lines} calc={key.calc} />}
                <FlagNote kind="adj" id={a.code} />
                <KeyReveal
                  revealed={r.revealed}
                  onReveal={() => useApp.getState().reveal('adj', a.code)}
                  onAdopt={() =>
                    useApp.getState().setLines(
                      'adjusting',
                      a.code,
                      key.lines.map((l, i) => ({ id: `k${i}`, code: l.code, debit: l.debit, credit: l.credit, memo: '' })),
                    )
                  }
                >
                  <KeyCompare lines={state.adjusting[a.code] ?? []} keyLines={key.lines} />
                  <KeyJournal lines={key.lines} />
                  {key.calc && (
                    <p>
                      <b>Perhitungan:</b> {key.calc}
                    </p>
                  )}
                  {key.explain && <p>{key.explain}</p>}
                </KeyReveal>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
