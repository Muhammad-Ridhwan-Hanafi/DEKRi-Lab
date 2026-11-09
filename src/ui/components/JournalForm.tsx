import { useRef } from 'react';
import { ACCOUNT_BY_CODE } from '../../data';
import { EXT_BY_CODE } from '../../data/ext';
import type { Account } from '../../engine/types';
import { formatRupiah } from '../../engine/money';
import type { JournalLine } from '../../engine/types';
import type { ItemResult } from '../../store/derive';
import { AccountPicker } from './AccountPicker';
import { MoneyInput } from './MoneyInput';
import { Icon } from './Icon';
import { StatusBadge } from './StatusBadge';

let seq = 0;
const newId = () => `r${Date.now().toString(36)}${(seq++).toString(36)}`;
const blank = (id: string): JournalLine => ({ id, code: null, debit: 0, credit: 0, memo: '' });
export const blankRows = (n: number) => Array.from({ length: n }, (_, i) => blank(`blank-${i}`));

interface Props {
  lines: JournalLine[];
  onChange: (lines: JournalLine[]) => void;
  minRows?: number;
  result?: ItemResult | null;
  showCheck: boolean;
  onCheck?: () => void;
  /** Ctrl+Enter; bawaannya sama dengan onCheck */
  onSubmit?: () => void;
  idPrefix: string;
  /** Mode ujian: sembunyikan petunjuk yang menyinggung Periksa/status */
  exam?: boolean;
  /** akun tambahan di luar bagan akun kasus (latihan pajak) */
  extra?: readonly Account[];
  /** hanya tawarkan akun dari `extra` */
  exclusive?: boolean;
}

const nameOf = (c: string) => `${c} ${ACCOUNT_BY_CODE[c]?.name ?? EXT_BY_CODE[c]?.name ?? ''}`.trim();

export function JournalForm({ lines, onChange, minRows = 4, result, showCheck, onCheck, onSubmit, idPrefix, exam, extra, exclusive }: Props) {
  const rows = lines.length > 0 ? lines : blankRows(minRows);
  const set = (i: number, patch: Partial<JournalLine>) => onChange(rows.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  const totalD = rows.reduce((t, r) => t + (r.code ? r.debit : 0), 0);
  const totalC = rows.reduce((t, r) => t + (r.code ? r.credit : 0), 0);
  const diff = totalD - totalC;
  const hint = result?.grade.hint;
  const wrap = useRef<HTMLDivElement>(null);
  const focusCell = (row: number, col: string) => setTimeout(() => wrap.current?.querySelector<HTMLInputElement>(`[data-cell="${row}-${col}"]`)?.focus(), 0);

  /** Enter: akun -> debit -> kredit -> baris berikutnya (baris baru bila terakhir). Ctrl+D: salin baris. */
  const onKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    const cell = (e.target as HTMLElement).getAttribute('data-cell');
    if (!cell) return;
    const [rs, col] = cell.split('-');
    const row = Number(rs);
    if (e.key === 'd' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onChange([...rows.slice(0, row + 1), { ...rows[row], id: newId() }, ...rows.slice(row + 1)]);
      focusCell(row + 1, 'acc');
      return;
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      (onSubmit ?? onCheck)?.();
      return;
    }
    if (e.key !== 'Enter') return;
    if (col === 'acc') {
      if (e.defaultPrevented) focusCell(row, 'debit'); // akun baru saja dipilih
      return;
    }
    e.preventDefault();
    if (col === 'debit') focusCell(row, 'credit');
    else if (row + 1 < rows.length) focusCell(row + 1, 'acc');
    else {
      onChange([...rows, blank(newId())]);
      focusCell(row + 1, 'acc');
    }
  };
  const shown = result && result.status !== 'BELUM DIPERIKSA' && result.status !== 'BELUM DIISI';
  // Hanya baris yang ditambahkan setelah tampil pertama yang dianimasikan (sorot indigo singkat); fokus input tidak disentuh.
  const seen = useRef<Set<string> | null>(null);
  const fresh = useRef<Set<string>>(new Set());
  if (seen.current === null) seen.current = new Set(rows.map((r) => r.id));
  for (const r of rows)
    if (!seen.current.has(r.id)) {
      seen.current.add(r.id);
      fresh.current.add(r.id);
    }

  return (
    <div ref={wrap} onKeyDown={onKeyDown}>
      <div className="overflow-x-auto">
        <table className="min-w-[600px]">
          <thead>
            <tr>
              <th className="w-[30%]">Akun</th>
              <th className="w-36 min-w-32 text-right">Debit (Rp)</th>
              <th className="w-36 min-w-32 text-right">Kredit (Rp)</th>
              <th className="w-16" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className={fresh.current.has(r.id) ? 'ap-row-in' : undefined}>
                <td>
                  <AccountPicker
                    extra={extra}
                    exclusive={exclusive}
                    cell={`${i}-acc`}
                    label={`${idPrefix} akun baris ${i + 1}`}
                    value={r.code}
                    onChange={(code) => set(i, { code })}
                  />
                </td>
                <td>
                  <MoneyInput cell={`${i}-debit`} label={`${idPrefix} debit baris ${i + 1}`} value={r.debit} onChange={(n) => set(i, { debit: n })} />
                </td>
                <td>
                  <MoneyInput cell={`${i}-credit`} label={`${idPrefix} kredit baris ${i + 1}`} value={r.credit} onChange={(n) => set(i, { credit: n })} />
                </td>
                <td className="whitespace-nowrap">
                  <button
                    className="rounded-md px-1.5 py-0.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 active:scale-90"
                    title="Salin baris"
                    aria-label={`Salin baris ${i + 1}`}
                    onClick={() => onChange([...rows.slice(0, i + 1), { ...r, id: newId() }, ...rows.slice(i + 1)])}
                  >
                    ⧉
                  </button>
                  <button
                    className="rounded-md px-1.5 py-0.5 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-700 active:scale-90"
                    title="Hapus baris"
                    aria-label={`Hapus baris ${i + 1}`}
                    onClick={() => onChange(rows.filter((_, k) => k !== i))}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-semibold">
              <td>Total</td>
              <td className="num">{formatRupiah(totalD)}</td>
              <td className="num">{formatRupiah(totalC)}</td>
              <td className={diff === 0 ? 'text-emerald-700' : 'text-red-700'}>
                {totalD === 0 && totalC === 0 ? '' : diff === 0 ? 'Seimbang' : `Selisih ${formatRupiah(diff)}`}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {exam ? (
        <p className="no-print mt-1 text-xs text-slate-500">Pintasan: Enter pindah kolom dan baris, Ctrl+D salin baris, Ctrl+Z urungkan.</p>
      ) : (
        <p className="no-print mt-1 text-xs text-slate-500">
          Pintasan: Enter pindah kolom dan baris (di baris terakhir menambah baris), Ctrl+D salin baris, Ctrl+Z urungkan, Ctrl+Enter Periksa (setelah BENAR:
          soal berikutnya).
        </p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button className="btn" onClick={() => onChange([...rows, blank(newId())])}>
          + Tambah baris
        </button>
        {showCheck && onCheck && (
          <button className="btn btn-primary" onClick={onCheck}>
            Periksa
          </button>
        )}
        {result && <StatusBadge status={result.status} />}
        {result && result.status === 'BELUM DIPERIKSA' && <span className="text-xs text-slate-500">Tekan Periksa untuk menilai jawaban ini.</span>}
        {result && result.revealed && <span className="text-xs text-slate-500">Kunci sudah dibuka: tidak dihitung dalam akurasi.</span>}
      </div>

      {shown && result && (
        <div
          key={result.status}
          role="status"
          className={`mt-2 flex items-start gap-2 rounded-xl border-2 p-3 text-sm ${result.status === 'BENAR' ? 'ap-pop border-emerald-300 bg-emerald-50 text-emerald-950' : 'ap-shake border-amber-300 bg-amber-50 text-amber-950'}`}
        >
          <span
            aria-hidden="true"
            className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${result.status === 'BENAR' ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'}`}
          >
            <Icon name={result.status === 'BENAR' ? 'check' : 'alert'} size={13} />
          </span>
          <div className="min-w-0">
            <div>{result.grade.message}</div>
            {hint && (hint.missing.length > 0 || hint.extra.length > 0 || hint.wrongSide.length > 0 || hint.wrongAmount.length > 0) && (
              <ul className="mt-1 list-disc pl-5 text-xs text-slate-700">
                {hint.missing.length > 0 && <li>Akun yang belum ada: {hint.missing.map(nameOf).join('; ')}</li>}
                {hint.extra.length > 0 && <li>Akun yang tidak seharusnya terlibat: {hint.extra.map(nameOf).join('; ')}</li>}
                {hint.wrongSide.length > 0 && <li>Sisi debit/kredit terbalik: {hint.wrongSide.map(nameOf).join('; ')}</li>}
                {hint.wrongAmount.length > 0 && <li>Nominal belum sesuai: {hint.wrongAmount.map(nameOf).join('; ')}</li>}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
