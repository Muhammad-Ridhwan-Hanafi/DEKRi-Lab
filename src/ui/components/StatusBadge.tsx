import type { ShownStatus } from '../../store/derive';

// Status dibedakan oleh teks dan titik, bukan hanya warna. Hijau = benar, amber = perlu perhatian, biru = menunggu, abu = kosong.
const STYLE: Record<ShownStatus, string> = {
  BENAR: 'bg-emerald-50 text-emerald-800 [--dot:var(--color-emerald-600)]',
  PERIKSA: 'bg-amber-100 text-amber-900 [--dot:var(--color-amber-600)]',
  'BELUM DIISI': 'bg-slate-100 text-slate-600 [--dot:var(--color-slate-400)]',
  'BELUM DIPERIKSA': 'bg-blue-50 text-blue-800 [--dot:var(--color-blue-600)]',
};

export function StatusBadge({ status }: { status: ShownStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLE[status]}`}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-[var(--dot)]" />
      {status}
    </span>
  );
}
