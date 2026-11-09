import { useState } from 'react';
import { OPENING, TRANSACTIONS } from '../../data';
import { byParty, inventoryCard, movements, reconcile } from '../../engine/subledger';
import { acct } from '../format';
import { EmptyState } from '../components/EmptyState';
import { useCtx } from '../hooks';
import { navigate } from '../router';

const TABS = [
  ['1-1200', 'Piutang usaha per pelanggan'],
  ['2-1000', 'Utang usaha per pemasok'],
  ['1-1400', 'Kartu persediaan'],
] as const;
const opening = (c: string) => OPENING.filter((o) => o.code === c).reduce((t, o) => t + o.debit - o.credit, 0);
const dateId = (d: string) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '');

export function BukuPembantu() {
  const { state, ctx } = useCtx();
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('1-1200');
  const pre = ctx.report.tb.find((r) => r.code === tab)?.preBalance ?? 0;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1">
        {TABS.map(([k, l]) => (
          <button key={k} className={`btn ${tab === k ? 'btn-primary' : ''}`} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
      </div>
      {!ctx.hasEntries && (
        <EmptyState icon="buku-pembantu" title="Buku pembantu belum punya data" actionLabel="Isi jurnal di Transaksi" onAction={() => navigate('transaksi')}>
          Belum ada jurnal transaksi. Buku pembantu disusun dari jurnal yang Anda isi.
        </EmptyState>
      )}
      {tab === '1-1400' ? <Kartu /> : <Pihak code={tab} pre={pre} journal={state.journal} />}
    </div>
  );
}

function Pihak({ code, pre, journal }: { code: '1-1200' | '2-1000' | string; pre: number; journal: Parameters<typeof movements>[2] }) {
  const moves = movements(code, TRANSACTIONS, journal);
  const parties = byParty(moves);
  const rec = reconcile(opening(code), moves, pre);
  const credit = code === '2-1000';
  const sign = credit ? -1 : 1;
  return (
    <div className="space-y-3">
      <div className="card overflow-x-auto">
        <h2 className="mb-2 font-semibold">Mutasi per {credit ? 'pemasok' : 'pelanggan'} (dari jurnal)</h2>
        <table>
          <thead>
            <tr>
              <th>Pihak</th>
              <th className="num">Transaksi</th>
              <th className="num">Debit</th>
              <th className="num">Kredit</th>
              <th className="num">Mutasi neto ({credit ? 'kredit' : 'debit'})</th>
            </tr>
          </thead>
          <tbody>
            {parties.map((p) => (
              <tr key={p.party}>
                <td>{p.party}</td>
                <td className="num">{p.count}</td>
                <td className="num">{acct(p.debit)}</td>
                <td className="num">{acct(p.credit)}</td>
                <td className="num">{acct(sign * p.net)}</td>
              </tr>
            ))}
            {parties.length === 0 && (
              <tr>
                <td colSpan={5} className="text-slate-500">
                  Belum ada mutasi.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className={`card text-sm ${rec.ok ? '' : 'border-red-300'}`} data-testid="rekonsiliasi">
        <h2 className="mb-1 font-semibold">Rekonsiliasi dengan akun kontrol</h2>
        <p>
          Saldo awal {acct(sign * rec.opening)} + mutasi {acct(sign * rec.mutation)} = <b>{acct(sign * rec.expected)}</b>. Saldo akun kontrol di buku besar
          sebelum penyesuaian: <b>{acct(sign * rec.control)}</b>. {rec.ok ? 'Cocok.' : 'TIDAK cocok.'}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Data kasus tidak memuat rincian saldo awal per pihak, sehingga saldo awal ditampilkan sebagai satu angka. Nama pihak diambil dari data transaksi,
          bukan dari jurnal Anda.
        </p>
      </div>
      <div className="card overflow-x-auto">
        <h2 className="mb-2 font-semibold">Rincian transaksi</h2>
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>Tanggal</th>
              <th>Pihak</th>
              <th>Uraian</th>
              <th className="num">Debit</th>
              <th className="num">Kredit</th>
            </tr>
          </thead>
          <tbody>
            {moves.map((m) => (
              <tr key={m.no}>
                <td>
                  <button className="text-blue-700 underline" onClick={() => navigate(`transaksi/${m.no}`)}>
                    {m.no}
                  </button>
                </td>
                <td>{dateId(m.date)}</td>
                <td>{m.party}</td>
                <td>{m.topic}</td>
                <td className="num">{acct(m.debit)}</td>
                <td className="num">{acct(m.credit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Kartu() {
  const { state } = useCtx();
  const rows = inventoryCard(opening('1-1400'), TRANSACTIONS, state.journal);
  return (
    <div className="card overflow-x-auto">
      <h2 className="mb-2 font-semibold">Kartu persediaan (nilai rupiah, metode perpetual)</h2>
      <table>
        <thead>
          <tr>
            <th>No</th>
            <th>Tanggal</th>
            <th>Keterangan</th>
            <th className="num">Masuk</th>
            <th className="num">Keluar</th>
            <th className="num">Saldo</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>{r.no ?? ''}</td>
              <td>{dateId(r.date)}</td>
              <td>{r.note}</td>
              <td className="num">{acct(r.inAmount)}</td>
              <td className="num">{acct(r.outAmount)}</td>
              <td className="num font-medium">{acct(r.balance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-slate-500">
        Data kasus hanya memuat nilai rupiah, tanpa kuantitas, sehingga kartu ini tidak menampilkan harga rata-rata tertimbang per unit. Saldo akhir sama dengan
        akun Persediaan sebelum jurnal penyesuaian.
      </p>
    </div>
  );
}
