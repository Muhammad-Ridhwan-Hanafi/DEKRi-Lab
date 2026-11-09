import { useEffect } from 'react';
import { useDialog } from './useDialog';

export const SHORTCUTS: Array<[string, string]> = [
  ['Ctrl+K atau /', 'Buka pencarian'],
  ['Ctrl+Z', 'Urungkan'],
  ['Ctrl+Shift+Z atau Ctrl+Y', 'Ulangi'],
  ['Ctrl+P', 'Cetak halaman (atau Simpan PDF dari tombol di halaman laporan)'],
  ['Alt+C', 'Buka atau tutup kalkulator'],
  ['?', 'Tampilkan daftar pintasan ini'],
  ['Esc', 'Tutup dialog'],
];

export function ShortcutList() {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      {SHORTCUTS.map(([k, d]) => (
        <div key={k} className="contents">
          <dt>
            <kbd className="rounded-sm border border-slate-300 bg-white px-1.5 text-xs">{k}</kbd>
          </dt>
          <dd>{d}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ShortcutDialog({ onClose }: { onClose: () => void }) {
  const dialog = useDialog<HTMLDivElement>();
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="no-print fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[10vh]" onMouseDown={onClose} role="presentation">
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Pintasan keyboard"
        className="w-full max-w-lg rounded-lg border border-slate-300 bg-white p-4 shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 className="mb-2 font-semibold">Pintasan keyboard</h2>
        <ShortcutList />
        <button className="btn mt-3" onClick={onClose}>
          Tutup
        </button>
      </div>
    </div>
  );
}
