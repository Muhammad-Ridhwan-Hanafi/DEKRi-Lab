import { ACCOUNT_BY_CODE } from '../../data';
import closing from '../../../data/closing-reversing.json';
import { postClosingTB } from '../../engine/closing';
import { formatRupiah } from '../../engine/money';
import { CLOSING_ROWS, REVERSING_CASES, closingKeyFor, closingVsKey, resultFor } from '../../store/derive';
import { useApp } from '../../store/useApp';
import type { JournalLine } from '../../engine/types';
import { ConfirmButton } from '../components/ConfirmButton';
import { JournalForm } from '../components/JournalForm';
import { KeyReveal } from '../components/KeyReveal';
import { MoneyInput } from '../components/MoneyInput';
import { StatusBadge } from '../components/StatusBadge';
import { useCtx } from '../hooks';
import { penutupConsistencyLabel } from '../format';

export function Penutup() {
  const { state, ctx } = useCtx();
  const post = postClosingTB(ctx.report.tb, state.closing);
  const ids = CLOSING_ROWS.map((r) => r.code);
  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="mb-1 font-semibold">Jurnal penutup</h2>
        <p className="mb-2 text-sm text-slate-600">{closing.closingIntro}</p>
        <p className="mb-2 text-sm">
          {ctx.netIncome < 0 ? 'Rugi bersih' : 'Laba bersih'} tahun berjalan menurut jurnal Anda: <b>{formatRupiah(ctx.netIncome, true)}</b>
        </p>
        {ctx.netIncome < 0 && (
          <p className="mb-2 rounded-sm border border-amber-300 bg-amber-50 px-2 py-1 text-sm text-amber-900" role="note">
            Jurnal Anda saat ini menghasilkan <b>rugi</b>. Untuk baris 3-3000, isi kolom <b>Kredit</b> (bukan Debit) sebesar rugi bersih; Saldo Laba didebit.
            Bila hasil ini tidak Anda duga, periksa kembali jurnal umum dan penyesuaian.
          </p>
        )}
        {state.settings.validationMode === 'check' && (
          <button className="btn btn-primary mb-2" onClick={() => useApp.getState().checkMany('clo', ids)}>
            Periksa semua baris penutup
          </button>
        )}
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Akun</th>
                <th>Instruksi</th>
                <th className="num">Debit</th>
                <th className="num">Kredit</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {CLOSING_ROWS.map((row) => {
                const e = state.closing[row.code] ?? { debit: 0, credit: 0 };
                const r0 = resultFor(state, 'clo', row.code, ctx);
                const r = !e.debit && !e.credit && r0.status === 'BELUM DIPERIKSA' ? { ...r0, status: 'BELUM DIISI' as const } : r0;
                const k = closingKeyFor(row.code, ctx);
                return (
                  <tr key={row.code}>
                    <td className="whitespace-nowrap">
                      <span className="font-mono text-xs">{row.code}</span>
                      <br />
                      {ACCOUNT_BY_CODE[row.code]?.name}
                    </td>
                    <td className="max-w-xs text-xs text-slate-600">{row.instruction}</td>
                    <td>
                      <MoneyInput label={`Debit ${row.code}`} value={e.debit} onChange={(n) => useApp.getState().setClosing(row.code, { ...e, debit: n })} />
                    </td>
                    <td>
                      <MoneyInput label={`Kredit ${row.code}`} value={e.credit} onChange={(n) => useApp.getState().setClosing(row.code, { ...e, credit: n })} />
                    </td>
                    <td>
                      <StatusBadge status={r.status} />
                      {r.status !== 'BELUM DIPERIKSA' && r.status !== 'BELUM DIISI' && (
                        <>
                          <div className="text-xs" data-testid={`vs-buku-${row.code}`}>
                            {penutupConsistencyLabel(r.status)}
                          </div>
                          <div className="text-xs" data-testid={`vs-kunci-${row.code}`}>
                            Sesuai kunci kasus: {closingVsKey(state, row.code).status === 'BENAR' ? 'ya' : 'belum'}
                          </div>
                        </>
                      )}
                    </td>
                    <td>
                      {r.revealed ? (
                        <span className="text-xs">
                          Kunci: D {formatRupiah(k.debit)} / K {formatRupiah(k.credit)}
                        </span>
                      ) : (
                        <ConfirmButton
                          label="Kunci"
                          message="Keluar dari akurasi."
                          confirmLabel="Buka"
                          onConfirm={() => useApp.getState().reveal('clo', row.code)}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <h2 className="mb-1 font-semibold">Neraca saldo setelah penutupan</h2>
        <p className="mb-2 text-xs text-slate-500">
          Dihitung dari jurnal penutup Anda. Akun nominal harus bersaldo nol dan Saldo Laba memuat laba bersih dikurangi dividen.
        </p>
        <table>
          <thead>
            <tr>
              <th>Kode</th>
              <th>Nama akun</th>
              <th className="num">Debit</th>
              <th className="num">Kredit</th>
            </tr>
          </thead>
          <tbody>
            {post.rows
              .filter((r) => r.debit || r.credit)
              .map((r) => (
                <tr key={r.code}>
                  <td className="font-mono text-xs">{r.code}</td>
                  <td>{r.name}</td>
                  <td className="num">{r.debit ? formatRupiah(r.debit) : ''}</td>
                  <td className="num">{r.credit ? formatRupiah(r.credit) : ''}</td>
                </tr>
              ))}
            <tr className="font-semibold">
              <td colSpan={2}>TOTAL</td>
              <td className="num">{formatRupiah(post.debit)}</td>
              <td className="num">{formatRupiah(post.credit)}</td>
            </tr>
          </tbody>
        </table>
        <p className={`mt-1 text-sm font-semibold ${post.debit === post.credit ? 'text-emerald-700' : 'text-red-700'}`}>
          {post.debit === post.credit ? 'SEIMBANG' : `TIDAK SEIMBANG (selisih ${formatRupiah(post.debit - post.credit)})`}
        </p>
      </div>

      <div className="card">
        <h2 className="mb-1 font-semibold">Jurnal pembalik 1 Januari 2025</h2>
        <p className="mb-2 text-sm text-slate-600">{closing.reversingIntro}</p>
        {REVERSING_CASES.map((c) => {
          const r = resultFor(state, 'rev', c.no, ctx);
          return (
            <div key={c.no} className="mb-3 border-t pt-2">
              <div className="mb-1 flex items-center justify-between">
                <b>
                  Kasus {c.no}: {c.reversed}
                </b>
                <StatusBadge status={r.status} />
              </div>
              <JournalForm
                idPrefix={`Pembalik ${c.no}`}
                lines={state.reversing[String(c.no)] ?? []}
                minRows={3}
                result={r}
                showCheck={state.settings.validationMode === 'check'}
                onChange={(ls: JournalLine[]) => useApp.getState().setLines('reversing', String(c.no), ls)}
                onCheck={() => useApp.getState().check('rev', c.no)}
              />
              <KeyReveal revealed={r.revealed} onReveal={() => useApp.getState().reveal('rev', c.no)}>
                <p>{c.why}</p>
              </KeyReveal>
            </div>
          );
        })}
      </div>
    </div>
  );
}
