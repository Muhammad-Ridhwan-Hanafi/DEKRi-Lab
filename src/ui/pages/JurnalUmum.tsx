import { ACCOUNT_BY_CODE, TRANSACTIONS } from '../../data';
import { formatRupiah } from '../../engine/money';
import { resultFor } from '../../store/derive';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { useCtx } from '../hooks';
import { navigate } from '../router';

export function JurnalUmum() {
  const { state, ctx } = useCtx();
  let totalD = 0;
  let totalC = 0;
  const blocks = TRANSACTIONS.map((t) => ({ t, lines: (state.journal[String(t.no)] ?? []).filter((l) => l.code && (l.debit || l.credit)) })).filter(
    (b) => b.lines.length > 0,
  );
  for (const b of blocks) for (const l of b.lines) ((totalD += l.debit), (totalC += l.credit));
  const diff = totalD - totalC;
  return (
    <div className="space-y-3">
      {blocks.length === 0 && (
        <EmptyState icon="jurnal" title="Jurnal umum masih kosong" actionLabel="Mulai dari Transaksi 1" onAction={() => navigate('transaksi/1')}>
          Belum ada jurnal. Isi jurnal pada halaman Transaksi; semuanya terkumpul di sini.
        </EmptyState>
      )}
      <div className={`card text-sm ${blocks.length === 0 ? 'hidden' : diff === 0 ? 'border-emerald-300' : 'border-red-300'}`}>
        {blocks.length === 0 ? null : (
          <>
            Total debit <b>{formatRupiah(totalD)}</b> · total kredit <b>{formatRupiah(totalC)}</b> ·{' '}
            <b className={diff === 0 ? 'text-emerald-700' : 'text-red-700'}>
              {diff === 0 ? 'TOTAL SEIMBANG' : `TIDAK SEIMBANG (selisih ${formatRupiah(diff)})`}
            </b>
          </>
        )}
      </div>
      {blocks.length > 0 && (
        <div className="card overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>No.</th>
                <th>Kode</th>
                <th>Nama akun</th>
                <th>Keterangan</th>
                <th className="num">Debit (Rp)</th>
                <th className="num">Kredit (Rp)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {blocks.flatMap(({ t, lines }) =>
                lines.map((l, i) => (
                  <tr key={`${t.no}-${l.id}`}>
                    <td>{i === 0 ? t.date : ''}</td>
                    <td>
                      {i === 0 ? (
                        <button className="text-blue-700 underline" onClick={() => navigate(`transaksi/${t.no}`)}>
                          {t.no}
                        </button>
                      ) : (
                        ''
                      )}
                    </td>
                    <td className="font-mono text-xs">{l.code}</td>
                    <td>{ACCOUNT_BY_CODE[l.code as string]?.name}</td>
                    <td className="text-xs text-slate-600">{l.memo}</td>
                    <td className="num">{l.debit ? formatRupiah(l.debit) : ''}</td>
                    <td className="num">{l.credit ? formatRupiah(l.credit) : ''}</td>
                    <td>{i === 0 ? <StatusBadge status={resultFor(state, 'txn', t.no, ctx).status} /> : null}</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
