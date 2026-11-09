import { useState } from 'react';
import { tbTotals } from '../../engine/ledger';
import { formatRupiah } from '../../engine/money';
import { PrintButton, PrintHeader } from '../components/Print';
import { useCtx } from '../hooks';

export function NeracaSaldo() {
  const { ctx } = useCtx();
  const [stage, setStage] = useState<'pre' | 'adjusted'>('pre');
  const [onlyActive, setOnlyActive] = useState(true);
  const t = tbTotals(ctx.report.tb, stage);
  const rows = ctx.report.tb.filter((r) => !onlyActive || (stage === 'pre' ? r.preBalance : r.adjBalance) !== 0);
  return (
    <div className="card overflow-x-auto">
      <PrintHeader title={`Neraca saldo ${stage === 'pre' ? 'sebelum' : 'setelah'} penyesuaian`} />
      <div className="no-print mb-3 flex flex-wrap items-center gap-2">
        {(['pre', 'adjusted'] as const).map((s) => (
          <button key={s} className={`btn ${stage === s ? 'btn-primary' : ''}`} onClick={() => setStage(s)}>
            {s === 'pre' ? 'Sebelum penyesuaian (09)' : 'Setelah penyesuaian (11)'}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-1 text-sm">
          <input type="checkbox" checked={onlyActive} onChange={(e) => setOnlyActive(e.target.checked)} /> Hanya akun bersaldo
        </label>
        <PrintButton />
      </div>
      <table>
        <thead>
          <tr>
            <th>Kode</th>
            <th>Nama akun</th>
            <th>Saldo normal</th>
            {stage === 'adjusted' && (
              <>
                <th className="num">Penyesuaian (D−K)</th>
              </>
            )}
            <th className="num">Debit (Rp)</th>
            <th className="num">Kredit (Rp)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const b = stage === 'pre' ? r.preBalance : r.adjBalance;
            return (
              <tr key={r.code}>
                <td className="font-mono text-xs">{r.code}</td>
                <td>{r.name}</td>
                <td>{r.normal}</td>
                {stage === 'adjusted' && <td className="num">{r.adjDebit - r.adjCredit ? formatRupiah(r.adjDebit - r.adjCredit, true) : ''}</td>}
                <td className="num">{b > 0 ? formatRupiah(b) : ''}</td>
                <td className="num">{b < 0 ? formatRupiah(-b) : ''}</td>
              </tr>
            );
          })}
          <tr className="font-semibold">
            <td colSpan={stage === 'adjusted' ? 4 : 3}>TOTAL</td>
            <td className="num">{formatRupiah(t.debit)}</td>
            <td className="num">{formatRupiah(t.credit)}</td>
          </tr>
        </tbody>
      </table>
      <p className={`mt-2 text-sm font-semibold ${t.debit === t.credit ? 'text-emerald-700' : 'text-red-700'}`}>
        {t.debit === 0 && t.credit === 0
          ? 'Belum ada saldo.'
          : t.debit === t.credit
            ? 'SEIMBANG'
            : `TIDAK SEIMBANG (selisih ${formatRupiah(t.debit - t.credit)})`}
      </p>
    </div>
  );
}
