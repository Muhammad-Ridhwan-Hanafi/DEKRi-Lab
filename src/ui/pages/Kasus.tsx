import { useState } from 'react';
import { CASE, COA, OPENING, ACCOUNT_BY_CODE } from '../../data';
import { formatRupiah } from '../../engine/money';

type Rows = string[][];

function RowsTable({ rows, header }: { rows: Rows; header?: boolean }) {
  const maxCols = Math.max(2, ...rows.map((r) => r.length));
  return (
    <table>
      <tbody>
        {rows.map((r, i) => {
          const cells = r.map((c) => c ?? '');
          const nonEmpty = cells.filter((c) => c !== '');
          const isHead = (header && i === 0) || (nonEmpty.length === 1 && cells[0] !== '' && cells[0] === cells[0].toUpperCase() && cells[0].length > 3);
          if (isHead)
            return (
              <tr key={i}>
                <th colSpan={maxCols}>{nonEmpty[0] ?? ''}</th>
              </tr>
            );
          const kept = cells.map((c, j) => [c, j] as const).filter(([c, j]) => !(c === '' && j > 0));
          return (
            <tr key={i}>
              {kept.map(([c, j], k) => (
                <td key={j} colSpan={k === kept.length - 1 ? Math.max(1, maxCols - kept.length + 1) : undefined} className={j === 0 ? 'w-1/4 font-medium' : ''}>
                  {c}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

const TABS = ['Profil', 'Kebijakan', 'Bagan akun', 'Saldo awal', 'SAK'] as const;

const SLUG: Record<string, (typeof TABS)[number]> = { profil: 'Profil', kebijakan: 'Kebijakan', sak: 'SAK' };

export function Kasus({ tab: slug }: { tab?: string }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>(SLUG[slug ?? ''] ?? 'Profil');
  const od = OPENING.reduce((t, o) => t + o.debit, 0);
  const oc = OPENING.reduce((t, o) => t + o.credit, 0);
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">{CASE.intro}</p>
      <div className="flex flex-wrap gap-1 border-b border-slate-300">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-t-md px-3 py-1.5 text-sm ${tab === t ? 'bg-white font-medium text-blue-700 border border-b-white border-slate-300 -mb-px' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="card overflow-x-auto">
        {tab === 'Profil' && <RowsTable rows={CASE.background} />}
        {tab === 'Kebijakan' && <RowsTable rows={CASE.policies} header />}
        {tab === 'SAK' && <RowsTable rows={CASE.sak} />}
        {tab === 'Bagan akun' && (
          <table>
            <thead>
              <tr>
                <th>Kode</th>
                <th>Nama akun</th>
                <th>Tipe</th>
                <th>Saldo normal</th>
                <th>Klasifikasi laporan</th>
              </tr>
            </thead>
            <tbody>
              {COA.map((a) => (
                <tr key={a.code}>
                  <td className="font-mono text-xs">{a.code}</td>
                  <td>{a.name}</td>
                  <td>{a.type}</td>
                  <td>{a.normal}</td>
                  <td>{a.reportClass}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {tab === 'Saldo awal' && (
          <table>
            <thead>
              <tr>
                <th>Kode</th>
                <th>Nama akun</th>
                <th className="num">Debit (Rp)</th>
                <th className="num">Kredit (Rp)</th>
                <th>Catatan</th>
              </tr>
            </thead>
            <tbody>
              {OPENING.map((o) => (
                <tr key={o.code}>
                  <td className="font-mono text-xs">{o.code}</td>
                  <td>{ACCOUNT_BY_CODE[o.code]?.name}</td>
                  <td className="num">{o.debit ? formatRupiah(o.debit) : ''}</td>
                  <td className="num">{o.credit ? formatRupiah(o.credit) : ''}</td>
                  <td className="text-xs text-slate-600">{o.note}</td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td colSpan={2}>Total</td>
                <td className="num">{formatRupiah(od)}</td>
                <td className="num">{formatRupiah(oc)}</td>
                <td>{od === oc ? 'Seimbang' : 'Tidak seimbang'}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
