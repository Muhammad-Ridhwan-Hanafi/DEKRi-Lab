import { useMemo, useState } from 'react';
import { ACCOUNT_BY_CODE, ADJUSTMENTS, COA, TRANSACTIONS } from '../../data';
import { formatRupiah } from '../../engine/money';
import { AccountPicker } from '../components/AccountPicker';
import { useCtx } from '../hooks';
import { acct } from '../format';

interface Move {
  date: string;
  ref: string;
  memo: string;
  debit: number;
  credit: number;
}

export function BukuBesar({ code: initial }: { code?: string }) {
  const { state, ctx } = useCtx();
  const [code, setCode] = useState(initial && ACCOUNT_BY_CODE[initial] ? initial : '1-1100');
  const [onlyActive, setOnlyActive] = useState(true);
  const row = ctx.report.tb.find((r) => r.code === code);

  const moves = useMemo(() => {
    const out: Move[] = [];
    for (const t of TRANSACTIONS)
      for (const l of state.journal[String(t.no)] ?? [])
        if (l.code === code && (l.debit || l.credit)) out.push({ date: t.date, ref: `Txn ${t.no}`, memo: l.memo || t.topic, debit: l.debit, credit: l.credit });
    for (const a of ADJUSTMENTS)
      for (const l of state.adjusting[a.code] ?? [])
        if (l.code === code && (l.debit || l.credit))
          out.push({ date: '2024-12-31', ref: a.code, memo: l.memo || a.category, debit: l.debit, credit: l.credit });
    return out;
  }, [state, code]);

  let running = row?.opening ?? 0;
  return (
    <div className="space-y-4">
      <div className="card">
        <div className="mb-2 max-w-md">
          <AccountPicker label="Pilih akun buku besar" value={code} onChange={(c) => c && setCode(c)} />
        </div>
        {row && (
          <div className="mb-2 text-sm text-slate-600">
            {ACCOUNT_BY_CODE[code]?.name} · saldo normal {row.normal} · saldo awal {formatRupiah(row.opening, true)} · mutasi debit{' '}
            {formatRupiah(row.journalDebit + row.adjDebit)} · mutasi kredit {formatRupiah(row.journalCredit + row.adjCredit)} ·{' '}
            <b>saldo akhir {formatRupiah(row.adjBalance, true)}</b> (D−K)
          </div>
        )}
        <table>
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Sumber</th>
              <th>Keterangan</th>
              <th className="num">Debit</th>
              <th className="num">Kredit</th>
              <th className="num">Saldo berjalan (D−K)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5}>Saldo awal 1 Januari 2024</td>
              <td className="num">{acct(running)}</td>
            </tr>
            {moves.map((m, i) => {
              running += m.debit - m.credit;
              return (
                <tr key={i}>
                  <td>{m.date}</td>
                  <td>{m.ref}</td>
                  <td>{m.memo}</td>
                  <td className="num">{m.debit ? formatRupiah(m.debit) : ''}</td>
                  <td className="num">{m.credit ? formatRupiah(m.credit) : ''}</td>
                  <td className="num">{acct(running)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card overflow-x-auto">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">Ringkasan saldo semua akun</h2>
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" checked={onlyActive} onChange={(e) => setOnlyActive(e.target.checked)} /> Hanya akun bersaldo atau bergerak
          </label>
        </div>
        <table>
          <thead>
            <tr>
              <th>Kode</th>
              <th>Nama akun</th>
              <th className="num">Saldo awal</th>
              <th className="num">Mutasi debit</th>
              <th className="num">Mutasi kredit</th>
              <th className="num">Saldo akhir (D−K)</th>
            </tr>
          </thead>
          <tbody>
            {ctx.report.tb
              .filter((r) => !onlyActive || r.opening || r.journalDebit || r.journalCredit || r.adjDebit || r.adjCredit)
              .map((r) => (
                <tr key={r.code} className="cursor-pointer hover:bg-slate-50" onClick={() => setCode(r.code)}>
                  <td className="font-mono text-xs">{r.code}</td>
                  <td>{r.name}</td>
                  <td className="num">{acct(r.opening)}</td>
                  <td className="num">{acct(r.journalDebit + r.adjDebit)}</td>
                  <td className="num">{acct(r.journalCredit + r.adjCredit)}</td>
                  <td className="num">{acct(r.adjBalance)}</td>
                </tr>
              ))}
          </tbody>
        </table>
        <p className="mt-1 text-xs text-slate-500">{COA.length} akun dalam bagan akun.</p>
      </div>
    </div>
  );
}
