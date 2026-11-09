import { Fragment, useState } from 'react';
import { COA } from '../../data';
import { basis, cashFlowAnalysis, commonSizeBalance, commonSizeIncome, dupont, ratios, worksheet } from '../../engine/analysis';
import type { CommonRow } from '../../engine/analysis';
import { PrintButton, PrintHeader } from '../components/Print';
import { acct, pct } from '../format';
import { useCtx } from '../hooks';
import { EmptyState } from '../components/EmptyState';
import { navigate } from '../router';

const TABS = [
  ['kertas', 'Kertas kerja 10 kolom'],
  ['dash', 'Dasbor analisis'],
  ['rasio', 'Rasio keuangan'],
  ['cs', 'Common size'],
  ['kas', 'Arus kas'],
  ['dupont', 'DuPont'],
] as const;

export function Analisis() {
  const { ctx } = useCtx();
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('kertas');
  const empty = !ctx.hasEntries;
  return (
    <div className="space-y-3">
      <div className="no-print flex flex-wrap items-center gap-1">
        {TABS.map(([k, l]) => (
          <button key={k} aria-pressed={tab === k} className={`btn ${tab === k ? 'btn-primary' : ''}`} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
        {tab === 'kertas' && (
          <span className="ml-auto">
            <PrintButton />
          </span>
        )}
      </div>
      {empty && (
        <EmptyState icon="analisis" title="Analisis menunggu jurnal Anda" actionLabel="Isi jurnal di Transaksi" onAction={() => navigate('transaksi')}>
          Belum ada jurnal. Angka di halaman ini diturunkan dari jurnal yang Anda isi, jadi masih menunjukkan saldo awal saja.
        </EmptyState>
      )}
      <div key={tab} className="ap-fade space-y-3">
        {tab === 'kertas' && <Kertas />}
        {tab === 'dash' && <Dasbor />}
        {tab === 'rasio' && <Rasio />}
        {tab === 'cs' && <CommonSize />}
        {tab === 'kas' && <ArusKas />}
        {tab === 'dupont' && <DuPontView />}
      </div>
    </div>
  );
}

function Kertas() {
  const { ctx } = useCtx();
  const w = worksheet(ctx.report.tb, COA);
  const cols: Array<[string, 'ns' | 'adj' | 'nssp' | 'lr' | 'neraca']> = [
    ['Neraca saldo', 'ns'],
    ['Penyesuaian', 'adj'],
    ['NS setelah penyesuaian', 'nssp'],
    ['Laba rugi', 'lr'],
    ['Neraca', 'neraca'],
  ];
  const labaRugi = w.netIncome >= 0 ? 'Laba bersih' : 'Rugi bersih';
  return (
    <div className="card overflow-x-auto" tabIndex={0} role="region" aria-label="Kertas kerja 10 kolom (dapat digulir)">
      <PrintHeader title="Kertas kerja 10 kolom" />
      <table className="min-w-[1000px] text-sm">
        <thead>
          <tr>
            <th rowSpan={2}>Kode</th>
            <th rowSpan={2}>Akun</th>
            {cols.map(([l]) => (
              <th key={l} colSpan={2} className="text-center">
                {l}
              </th>
            ))}
          </tr>
          <tr>
            {cols.map(([l]) => (
              <Fragment key={l}>
                <th className="num">D</th>
                <th className="num">K</th>
              </Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {w.rows.map((r) => (
            <tr key={r.code}>
              <td className="font-mono text-xs">{r.code}</td>
              <td>{r.name}</td>
              {cols.map(([, k]) => (
                <Fragment key={k}>
                  <td className="num">{acct(r[k][0])}</td>
                  <td className="num">{acct(r[k][1])}</td>
                </Fragment>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-semibold">
            <td colSpan={2}>Jumlah</td>
            {cols.map(([, k]) => (
              <Fragment key={k}>
                <td className="num">{acct(w.totals[k][0])}</td>
                <td className="num">{acct(w.totals[k][1])}</td>
              </Fragment>
            ))}
          </tr>
          <tr>
            <td colSpan={2}>{labaRugi}</td>
            <td colSpan={6} />
            <td className="num">{w.netIncome >= 0 ? acct(w.netIncome) : '-'}</td>
            <td className="num">{w.netIncome < 0 ? acct(-w.netIncome) : '-'}</td>
            <td className="num">{w.netIncome < 0 ? acct(-w.netIncome) : '-'}</td>
            <td className="num">{w.netIncome >= 0 ? acct(w.netIncome) : '-'}</td>
          </tr>
          <tr className="font-semibold">
            <td colSpan={2}>Jumlah seimbang</td>
            <td colSpan={6} />
            <td className="num">{acct(w.final.lr[0])}</td>
            <td className="num">{acct(w.final.lr[1])}</td>
            <td className="num">{acct(w.final.neraca[0])}</td>
            <td className="num">{acct(w.final.neraca[1])}</td>
          </tr>
        </tfoot>
      </table>
      <p className="mt-2 text-xs text-slate-500">
        Saldo awal sudah ada di kolom Neraca saldo. Akun pendapatan dan beban masuk Laba rugi; sisanya masuk Neraca.
      </p>
    </div>
  );
}

function Rasio() {
  const { ctx } = useCtx();
  const b = basis(ctx.report.tb, COA);
  const rs = ratios(b);
  const fmt = (r: (typeof rs)[number]) =>
    r.value === null ? '—' : r.format === '%' ? pct(r.value) : r.format === 'hari' ? `${r.value.toFixed(0)} hari` : `${r.value.toFixed(2).replace('.', ',')}x`;
  const groups = [...new Set(rs.map((r) => r.group))];
  return (
    <div className="space-y-3">
      {groups.map((g) => (
        <div key={g} className="card overflow-x-auto">
          <h2 className="mb-2 font-semibold">{g}</h2>
          <table>
            <thead>
              <tr>
                <th>Rasio</th>
                <th>Rumus dan sumber data</th>
                <th className="num">Hasil</th>
                <th>Interpretasi</th>
                <th>Keterbatasan</th>
              </tr>
            </thead>
            <tbody>
              {rs
                .filter((r) => r.group === g)
                .map((r) => (
                  <tr key={r.name}>
                    <td>{r.name}</td>
                    <td className="text-xs text-slate-600">
                      {r.formula}
                      <br />
                      <span className="text-slate-500">{r.source}</span>
                    </td>
                    <td className="num font-medium">{fmt(r)}</td>
                    <td className="text-xs text-slate-600">{r.interpretation}</td>
                    <td className="text-xs text-slate-600">{r.limitation}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ))}
      <p className="text-xs text-slate-500">
        Dihitung dari neraca saldo setelah penyesuaian jawaban Anda, memakai saldo akhir, kecuali perputaran piutang dan persediaan yang memakai rata-rata saldo
        awal dan akhir tahun. Ekuitas memasukkan laba tahun berjalan. Angka tidak diberi label sehat atau tidak sehat: nilai wajar bergantung pada industri dan
        pembanding.
      </p>
    </div>
  );
}

const fx = (v: number | null) => (v === null ? '—' : `${v.toFixed(2).replace('.', ',')}x`);

function Bar({ value, max, tone = 'bg-sky-600' }: { value: number; max: number; tone?: string }) {
  const w = max > 0 ? Math.min(100, (Math.abs(value) / max) * 100) : 0;
  return (
    <div className="h-2 w-full min-w-24 rounded-sm bg-slate-100" aria-hidden="true">
      <div className={`h-2 rounded-sm ${value < 0 ? 'bg-rose-500' : tone}`} style={{ width: `${w}%` }} />
    </div>
  );
}

function CsTable({ title, rows, base }: { title: string; rows: CommonRow[]; base: string }) {
  const max = Math.max(0, ...rows.map((r) => Math.abs(r.pct ?? 0)));
  return (
    <div className="card overflow-x-auto">
      <h2 className="mb-2 font-semibold">{title}</h2>
      <table>
        <thead>
          <tr>
            <th>Akun</th>
            <th className="num">Jumlah</th>
            <th className="num">% {base}</th>
            <th>Porsi</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.code + i}>
              <td>
                {r.code} {r.name}
              </td>
              <td className="num">{acct(r.amount)}</td>
              <td className="num">{r.pct === null ? '—' : pct(r.pct)}</td>
              <td>{r.pct !== null && <Bar value={r.pct} max={max} />}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CommonSize() {
  const { ctx } = useCtx();
  const b = basis(ctx.report.tb, COA);
  const inc = commonSizeIncome(ctx.report.tb, COA, b.netSales);
  const bs = commonSizeBalance(ctx.report.tb, COA, b.totalAssets, b.netIncome);
  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-2">
        <CsTable title="Laba rugi: persen terhadap penjualan bersih" rows={inc} base="penjualan" />
        <div className="space-y-3">
          <CsTable title="Aset: persen terhadap total aset" rows={bs.assets} base="aset" />
          <CsTable title="Liabilitas dan ekuitas: persen terhadap total aset" rows={bs.funding} base="aset" />
        </div>
      </div>
    </div>
  );
}

function ArusKas() {
  const { ctx } = useCtx();
  const b = basis(ctx.report.tb, COA);
  const c = cashFlowAnalysis(ctx.report.cells, b.netIncome);
  const max = Math.max(Math.abs(c.operating), Math.abs(c.investing), Math.abs(c.financing));
  const rows: Array<[string, number, number | null]> = [
    ['Operasi', c.operating, c.shares.operating],
    ['Investasi', c.investing, c.shares.investing],
    ['Pendanaan', c.financing, c.shares.financing],
  ];
  return (
    <div className="space-y-3">
      <div className="card overflow-x-auto">
        <h2 className="mb-2 font-semibold">Arus kas per aktivitas</h2>
        <p className="mb-2 text-xs text-slate-500" role="note">
          Nominal diturunkan dari jurnal Anda, tetapi pengelompokan tiap transaksi ke aktivitas operasi/investasi/pendanaan mengikuti kunci kasus, bukan isian
          &quot;klasifikasi kas&quot; pada analisis transaksi Anda. Isian itu hanya latihan dan tidak dinilai.
        </p>
        <table>
          <thead>
            <tr>
              <th>Aktivitas</th>
              <th className="num">Arus kas</th>
              <th className="num">Porsi dari arus bruto</th>
              <th>Kontribusi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([n, v, sh]) => (
              <tr key={n}>
                <td>{n}</td>
                <td className="num">{acct(v)}</td>
                <td className="num">{sh === null ? '—' : pct(sh)}</td>
                <td>
                  <Bar value={v} max={max} />
                </td>
              </tr>
            ))}
            <tr className="font-semibold">
              <td>Kenaikan (penurunan) kas</td>
              <td className="num">{acct(c.net)}</td>
              <td />
              <td />
            </tr>
          </tbody>
        </table>
        <p className="mt-2 text-xs text-slate-500">
          Batang merah berarti arus kas keluar bersih; panjang batang membandingkan besar mutlak antaraktivitas. Porsi dihitung dari jumlah nilai mutlak ketiga
          aktivitas.
        </p>
      </div>
      <div className="card text-sm">
        <h2 className="mb-1 font-semibold">Konsistensi dengan neraca</h2>
        <p>
          Kas awal {acct(c.opening)} + kenaikan {acct(c.net)} = kas akhir {acct(c.closing)}. Kas pada neraca {acct(c.balanceCash)}. Selisih:{' '}
          <strong className={c.gap === 0 ? 'text-emerald-700' : 'text-rose-700'}>{c.gap === 0 ? 'nol (konsisten)' : acct(c.gap)}</strong>.
        </p>
        <p className="mt-1 text-slate-600">
          Arus kas operasi terhadap laba bersih: {fx(c.operatingToIncome)}. Selisihnya mencerminkan beban non-kas dan perubahan modal kerja; angka ini perlu
          dibaca bersama sifat usaha, bukan sebagai nilai baik atau buruk.
        </p>
      </div>
    </div>
  );
}

function DuPontView() {
  const { ctx } = useCtx();
  const b = basis(ctx.report.tb, COA);
  const d = dupont(b);
  if (!d) return <div className="card text-sm text-slate-600">DuPont belum bisa dihitung: penjualan, aset, atau ekuitas masih nol.</div>;
  const box = (t: string, v: string, s: string) => (
    <div className="rounded-sm border border-slate-300 p-3 text-center">
      <div className="text-xs text-slate-500">{t}</div>
      <div className="text-lg font-semibold">{v}</div>
      <div className="text-xs text-slate-500">{s}</div>
    </div>
  );
  return (
    <div className="space-y-3">
      <div className="card">
        <h2 className="mb-2 font-semibold">DuPont tiga komponen</h2>
        <div className="grid items-center gap-2 text-center sm:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]">
          {box('Margin laba bersih', pct(d.margin), 'laba bersih / penjualan bersih')}
          <span aria-hidden="true">×</span>
          {box('Perputaran aset', fx(d.turnover), 'penjualan bersih / total aset')}
          <span aria-hidden="true">×</span>
          {box('Pengganda ekuitas', fx(d.multiplier), 'total aset / ekuitas')}
          <span aria-hidden="true">=</span>
          {box('ROE', pct(d.roe), 'laba bersih / ekuitas')}
        </div>
        <p className="mt-3 text-sm text-slate-600">
          Hasil kali ketiga komponen {pct(d.margin * d.turnover * d.multiplier)} sama dengan ROE langsung (selisih {Math.abs(d.check).toExponential(1)}).
          Penguraian ini menunjukkan ROE berasal dari margin, efisiensi aset, atau penggunaan pendanaan utang; ia tidak menilai mana yang lebih baik. Memakai
          saldo akhir karena hanya ada satu periode.
        </p>
      </div>
    </div>
  );
}

function Dasbor() {
  const { ctx } = useCtx();
  const b = basis(ctx.report.tb, COA);
  const rs = ratios(b);
  const c = cashFlowAnalysis(ctx.report.cells, b.netIncome);
  const d = dupont(b);
  const get = (n: string) => rs.find((r) => r.name === n);
  const f = (n: string) => {
    const r = get(n);
    return !r || r.value === null ? '—' : r.format === '%' ? pct(r.value) : r.format === 'hari' ? `${r.value.toFixed(0)} hari` : fx(r.value);
  };
  const kpi: Array<[string, string]> = [
    ['Penjualan bersih', acct(b.netSales)],
    ['Laba bersih', acct(b.netIncome)],
    ['Total aset', acct(b.totalAssets)],
    ['Rasio lancar', f('Rasio lancar')],
    ['Margin laba bersih', f('Margin laba bersih')],
    ['ROE', d ? pct(d.roe) : '—'],
  ];
  const comps = [
    ['Aset lancar', b.currentAssets],
    ['Aset tidak lancar', b.totalAssets - b.currentAssets],
  ] as const;
  const findings: string[] = [];
  if (b.netSales === 0) findings.push('Belum ada penjualan tercatat, jadi sebagian besar rasio belum bisa dihitung.');
  else {
    findings.push(`Laba bersih ${acct(b.netIncome)} dari penjualan bersih ${acct(b.netSales)}.`);
    const dp = d;
    if (dp)
      findings.push(
        `ROE ${pct(dp.roe)} terurai menjadi margin ${pct(dp.margin)}, perputaran aset ${fx(dp.turnover)}, dan pengganda ekuitas ${fx(dp.multiplier)}.`,
      );
  }
  findings.push(
    `Arus kas operasi ${acct(c.operating)}, investasi ${acct(c.investing)}, pendanaan ${acct(c.financing)}; kas akhir ${c.gap === 0 ? 'sama dengan' : 'TIDAK sama dengan'} kas pada neraca.`,
  );
  const la = get('Rasio lancar');
  if (la && la.value !== null)
    findings.push(`Aset lancar ${acct(b.currentAssets)} berbanding liabilitas jangka pendek ${acct(b.currentLiabilities)} (rasio lancar ${fx(la.value)}).`);
  const maxC = Math.max(Math.abs(c.operating), Math.abs(c.investing), Math.abs(c.financing));
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        {kpi.map(([k, v]) => (
          <div key={k} className="card">
            <div className="text-xs text-slate-500">{k}</div>
            <div className="text-lg font-semibold">{v}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-2 font-semibold">Komposisi aset</h2>
          {comps.map(([n, v]) => (
            <div key={n} className="mb-2 text-sm">
              <div className="flex justify-between">
                <span>{n}</span>
                <span>
                  {acct(v)} ({b.totalAssets ? pct(v / b.totalAssets) : '—'})
                </span>
              </div>
              <Bar value={v} max={b.totalAssets} />
            </div>
          ))}
        </div>
        <div className="card">
          <h2 className="mb-2 font-semibold">Arus kas per aktivitas</h2>
          {(
            [
              ['Operasi', c.operating],
              ['Investasi', c.investing],
              ['Pendanaan', c.financing],
            ] as const
          ).map(([n, v]) => (
            <div key={n} className="mb-2 text-sm">
              <div className="flex justify-between">
                <span>{n}</span>
                <span>{acct(v)}</span>
              </div>
              <Bar value={v} max={maxC} />
            </div>
          ))}
        </div>
      </div>
      <div className="card text-sm">
        <h2 className="mb-1 font-semibold">Temuan utama</h2>
        <ul className="list-disc space-y-1 pl-5">
          {findings.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-slate-500">Semua angka berasal dari jurnal Anda. Tren antarperiode tidak ditampilkan karena hanya ada satu periode.</p>
      </div>
    </div>
  );
}
