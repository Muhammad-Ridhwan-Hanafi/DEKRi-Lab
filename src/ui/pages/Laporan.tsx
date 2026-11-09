import { useEffect, useMemo, useState } from 'react';
import { ACCOUNT_BY_CODE } from '../../data';
import { buildTraceIndex, type TraceLine } from '../../engine/trace';
import { ledgerInputFor } from '../../store/derive';
import { navigate } from '../router';
import { STATEMENT_LAYOUT } from '../../engine/statements.generated';
import { formatRupiah } from '../../engine/money';
import { downloadText, pct } from '../format';
import { PrintHeader } from '../components/Print';
import { useCtx } from '../hooks';

const TABS: Array<[string, string]> = [
  ['S12', 'Laba rugi'],
  ['S13', 'Ekuitas'],
  ['S14', 'Posisi keuangan'],
  ['S15', 'Arus kas'],
];

/** Teks laporan berasal dari workbook; buang awalan nomor sheet dan rujukan ke sheet yang tidak ada di aplikasi. */
const tidy = (t: string) =>
  t
    .replace(/^\d+[A-Z]? - /, '')
    .replace(/ \(lihat sheet \d+\)/g, '')
    .replace(/; perubahan pada PSAK 118 dijelaskan di sheet \d+/g, '');

export function Laporan({ tab: initialTab, cell }: { tab?: string; cell?: string }) {
  const { ctx, state } = useCtx();
  const [tab, setTab] = useState(initialTab && STATEMENT_LAYOUT[initialTab] ? initialTab : 'S12');
  const layout = STATEMENT_LAYOUT[tab];
  const [sel, setSel] = useState<{ id: string; label: string; value: string } | null>(null);
  const [lines, setLines] = useState<TraceLine[] | null>(null);
  const [busy, setBusy] = useState(false);
  // Indeks penelusuran dihitung sekali per keadaan jawaban, hanya saat angka pertama diklik.
  const lazyIndex = useMemo(() => {
    let cache: ReturnType<typeof buildTraceIndex> | undefined;
    return () => (cache ??= buildTraceIndex(ledgerInputFor(state)));
  }, [state]);
  const trace = (id: string, label: string, value: string) => {
    setBusy(true);
    setTimeout(() => {
      setSel({ id, label, value });
      setLines(lazyIndex().byCell.get(id) ?? []);
      setBusy(false);
    }, 0);
  };
  // tautan dari Pemeriksaan: langsung telusuri sel yang dituju
  useEffect(() => {
    if (!cell || !STATEMENT_LAYOUT[tab]) return;
    const row = STATEMENT_LAYOUT[tab].rows.find((r) => r.cells.some((c) => c.id === cell));
    if (row) trace(cell, row.label ?? cell, fmtCell(cell));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const cells = ctx.report.cells as unknown as Record<string, number | string | undefined>;
  const hasData = ctx.hasEntries || Object.keys(state.adjusting).length > 0;
  const fmtCell = (id: string | undefined, f?: string) => {
    if (!id) return '';
    const v = cells[id];
    if (typeof v !== 'number') return v === undefined ? '' : String(v);
    if (f && f.includes('%')) return pct(v);
    return formatRupiah(v, true);
  };
  const csv = () => {
    const lines = ['Uraian;Nilai'];
    for (const r of layout.rows) {
      const label = (r.label ?? '').replace(/"/g, '""');
      for (const c of r.cells) {
        if (c.id) lines.push(`"${label}";${typeof cells[c.id] === 'number' ? cells[c.id] : ''}`);
      }
    }
    downloadText(`${tab}.csv`, lines.join('\n'), 'text/csv');
  };
  return (
    <div className="card">
      <div className="no-print mb-3 flex flex-wrap items-center gap-1">
        {TABS.map(([k, label]) => (
          <button key={k} aria-pressed={tab === k} className={`btn ${tab === k ? 'btn-primary' : ''}`} onClick={() => (setTab(k), setSel(null))}>
            {label}
          </button>
        ))}
        <span className="ml-auto flex gap-1">
          <button className="btn" onClick={csv}>
            Ekspor CSV
          </button>
          <button className="btn" onClick={() => window.print()}>
            Cetak
          </button>
        </span>
      </div>
      <div className="mb-2 rounded-sm border border-amber-300 bg-amber-50 p-2 text-sm">
        {hasData
          ? 'Laporan ini dihitung dari jurnal Anda saat ini; belum final sampai semua jurnal dan penyesuaian benar.'
          : 'Belum final: jurnal belum diisi, sehingga laporan baru mencerminkan saldo awal.'}
      </div>
      <PrintHeader />
      <table key={tab} className="ap-fade">
        <tbody>
          {layout.rows.map((r) => (
            <tr key={r.r} className={r.bold ? 'font-bold [&>td]:bg-[var(--tag-lilac-bg)]' : ''}>
              <td colSpan={r.cells.length === 0 ? 2 : 1}>{tidy(r.label ?? '')}</td>
              {r.cells.map((c) => (
                <td key={c.col} className="num">
                  {c.id && c.text === undefined ? (
                    <button
                      className="num underline decoration-dotted underline-offset-2 hover:text-blue-700"
                      title="Klik untuk menelusuri asal angka"
                      onClick={() => trace(c.id as string, r.label ?? (c.id as string), fmtCell(c.id, c.fmt))}
                    >
                      {fmtCell(c.id, c.fmt) || '0'}
                    </button>
                  ) : (
                    (c.text ?? fmtCell(c.id, c.fmt))
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {busy && <p className="no-print mt-2 text-sm text-slate-500">Menelusuri…</p>}
      {sel && lines && !busy && <TracePanel sel={sel} lines={lines} onClose={() => setSel(null)} />}
    </div>
  );
}

const SOURCE_LABEL = { opening: 'Saldo awal', txn: 'Transaksi', adj: 'Penyesuaian' } as const;

function TracePanel({ sel, lines, onClose }: { sel: { label: string; value: string }; lines: TraceLine[]; onClose: () => void }) {
  const [all, setAll] = useState(false);
  const groups = useMemo(() => {
    const order = { opening: 0, txn: 1, adj: 2 } as const;
    const m = new Map<string, TraceLine[]>();
    for (const l of lines) m.set(`${l.source}:${l.key}`, [...(m.get(`${l.source}:${l.key}`) ?? []), l]);
    return [...m.entries()].sort(([a], [b]) => {
      const [sa, ka] = a.split(':');
      const [sb, kb] = b.split(':');
      return order[sa as keyof typeof order] - order[sb as keyof typeof order] || Number(ka) - Number(kb) || ka.localeCompare(kb);
    });
  }, [lines]);
  const shown = all ? groups : groups.slice(0, 40);
  return (
    <div className="no-print mt-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm" aria-label="Asal angka">
      <div className="mb-1 flex items-start justify-between gap-2">
        <b>
          Asal angka: {sel.label} = {sel.value}
        </b>
        <button className="btn" onClick={onClose}>
          Tutup
        </button>
      </div>
      {groups.length === 0 ? (
        <p>Tidak ada baris jurnal Anda atau saldo awal yang membentuk angka ini (misalnya baris nol, subtotal tetap, atau jurnal belum diisi).</p>
      ) : (
        <>
          <p className="mb-2 text-xs text-slate-600">{groups.length} sumber membentuk angka ini. Tanda ▲ berarti baris itu menaikkan angka, ▼ menurunkannya.</p>
          <ul className="space-y-1">
            {shown.map(([k, ls]) => {
              const { source, key } = ls[0];
              return (
                <li key={k} className="rounded-sm border border-blue-200 bg-white p-1.5">
                  <div className="font-medium">
                    {source === 'opening' ? (
                      'Saldo awal'
                    ) : (
                      <button className="text-blue-700 underline" onClick={() => navigate(`${source === 'txn' ? 'transaksi' : 'penyesuaian'}/${key}`)}>
                        {SOURCE_LABEL[source]} {key}
                      </button>
                    )}
                  </div>
                  {ls.map((l, i) => (
                    <div key={i} className="flex justify-between gap-2 text-xs">
                      <span>
                        <span className="font-mono">{l.code}</span> {ACCOUNT_BY_CODE[l.code]?.name} ({l.side === 'D' ? 'debit' : 'kredit'})
                      </span>
                      <span className="tabular-nums">
                        {l.amount.toLocaleString('id-ID')} {l.effect > 0 ? '▲' : '▼'}
                      </span>
                    </div>
                  ))}
                </li>
              );
            })}
          </ul>
          {groups.length > 40 && (
            <button className="btn mt-2" onClick={() => setAll(!all)}>
              {all ? 'Ringkas' : `Tampilkan semua (${groups.length})`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
