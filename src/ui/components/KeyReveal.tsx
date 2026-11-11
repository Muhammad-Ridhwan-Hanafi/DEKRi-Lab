import type { ReactNode } from 'react';
import { ConfirmButton } from './ConfirmButton';

interface Props {
  revealed: boolean;
  onReveal: () => void;
  children: ReactNode;
  onAdopt?: () => void;
}

/** Kunci tersembunyi sampai pengguna memilih membukanya; membuka = keluar dari perhitungan akurasi. */
export function KeyReveal({ revealed, onReveal, children, onAdopt }: Props) {
  if (!revealed)
    return (
      <div className="mt-3">
        <ConfirmButton
          label="Lihat kunci dan penjelasan"
          message="Membuka kunci mengeluarkan item ini dari perhitungan akurasi."
          confirmLabel="Ya, buka kunci"
          onConfirm={onReveal}
        />
      </div>
    );
  return (
    <div className="mt-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm">
      <div className="mb-1 font-semibold text-blue-900">Kunci dan penjelasan</div>
      {children}
      <p className="mt-2 text-xs text-slate-600">Merasa kunci atau penjelasan ini keliru? Cara melaporkannya ada di Pengaturan, bagian Tentang.</p>
      {onAdopt && (
        <button className="btn mt-2" onClick={onAdopt}>
          Pakai jawaban kunci sebagai jawaban saya
        </button>
      )}
    </div>
  );
}

export function KeyJournal({ lines }: { lines: Array<{ code: string; name: string; debit: number; credit: number }> }) {
  return (
    <table className="my-1 bg-white">
      <tbody>
        {lines.map((l, i) => (
          <tr key={i}>
            <td className="font-mono text-xs">{l.code}</td>
            <td>{l.name}</td>
            <td className="num">{l.debit ? l.debit.toLocaleString('id-ID') : ''}</td>
            <td className="num">{l.credit ? l.credit.toLocaleString('id-ID') : ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
