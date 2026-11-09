import { useMemo, useRef, useState } from 'react';
import { buildIndex, search } from '../search';
import { navigate } from '../router';
import { useDialog } from './useDialog';

export function SearchDialog({ onClose }: { onClose: () => void }) {
  const index = useMemo(buildIndex, []);
  const [q, setQ] = useState('');
  const [cur, setCur] = useState(0);
  const results = useMemo(() => search(index, q), [index, q]);
  const input = useRef<HTMLInputElement>(null);
  const dialog = useDialog<HTMLDivElement>(input);
  const go = (i: number) => {
    const r = results[i];
    if (!r) return;
    navigate(r.href);
    onClose();
  };
  return (
    <div className="no-print fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[10vh]" onMouseDown={onClose} role="presentation">
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Pencarian"
        className="w-full max-w-2xl rounded-lg border border-slate-300 bg-white shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <input
          ref={input}
          aria-label="Cari"
          className="w-full rounded-b-none border-0 border-b border-slate-200 px-3 py-2.5 text-base focus:ring-0"
          placeholder="Cari transaksi, akun, penyesuaian, skenario, kebijakan, SAK…"
          value={q}
          onChange={(e) => (setQ(e.target.value), setCur(0))}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose();
            else if (e.key === 'ArrowDown') (e.preventDefault(), setCur((c) => Math.min(c + 1, results.length - 1)));
            else if (e.key === 'ArrowUp') (e.preventDefault(), setCur((c) => Math.max(c - 1, 0)));
            else if (e.key === 'Enter') (e.preventDefault(), go(cur));
          }}
        />
        <ul className="max-h-[60vh] overflow-auto" role="listbox">
          {q.trim() !== '' && results.length === 0 && <li className="px-3 py-2 text-sm text-slate-500">Tidak ada hasil.</li>}
          {results.map((r, i) => (
            <li
              key={`${r.href}:${r.title}`}
              role="option"
              aria-selected={i === cur}
              className={`cursor-pointer px-3 py-1.5 text-sm ${i === cur ? 'bg-blue-50' : ''}`}
              onMouseEnter={() => setCur(i)}
              onClick={() => go(i)}
            >
              <span className="mr-2 rounded-sm bg-slate-100 px-1.5 py-0.5 text-xs uppercase tracking-wide text-slate-600">{r.kind}</span>
              <b>{r.title}</b>
              <div className="truncate text-xs text-slate-500">{r.sub}</div>
            </li>
          ))}
        </ul>
        <div className="border-t border-slate-200 px-3 py-1 text-xs text-slate-500">↑↓ pilih · Enter buka · Esc tutup</div>
      </div>
    </div>
  );
}
