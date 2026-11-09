import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ACCOUNT_BY_CODE, COA } from '../../data';
import type { Account } from '../../engine/types';
import { getRecent, pushRecent } from '../recent';

interface Props {
  value: string | null;
  onChange: (code: string | null) => void;
  label: string;
  /** penanda sel untuk navigasi keyboard di JournalForm */
  cell?: string;
  /** akun tambahan (latihan pajak) yang ikut bisa dicari */
  extra?: readonly Account[];
  /** hanya tawarkan akun dari `extra` (soal industri memakai bagan akunnya sendiri) */
  exclusive?: boolean;
}

/**
 * Peringkat kecocokan (kecil = lebih baik). "utang us" harus menghasilkan Utang Usaha sebelum Piutang Usaha,
 * karena "piutang usaha" hanya memuat "utang us" di tengah kata.
 */
export function matchRank(a: Account, query: string): number {
  const q = query.trim().toLowerCase();
  const name = a.name.toLowerCase();
  const code = a.code.toLowerCase();
  if (code === q) return 0;
  if (code.startsWith(q)) return 1;
  if (name.startsWith(q)) return 2;
  const words = name.split(/[^a-z0-9]+/).filter(Boolean);
  const tokens = q.split(/\s+/).filter(Boolean);
  // setiap kata kueri harus diawali oleh kata nama (urutan bebas): "usaha utang" tetap menemukan Utang Usaha
  if (tokens.length > 0 && tokens.every((t) => words.some((w) => w.startsWith(t)))) return 3;
  if (name.includes(q)) return 4;
  if (code.includes(q)) return 5;
  return -1;
}

/** Pencarian akun menurut kode atau nama dari bagan akun. */
export function AccountPicker({ value, onChange, label, cell, extra = [], exclusive = false }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const acc = value ? (ACCOUNT_BY_CODE[value] ?? extra.find((a) => a.code === value)) : undefined;
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    const all = exclusive ? [...extra] : [...COA, ...extra];
    if (t)
      return all
        .map((a, i) => ({ a, r: matchRank(a, t), i }))
        .filter((x) => x.r >= 0)
        .sort((x, y) => x.r - y.r || x.i - y.i)
        .map((x) => x.a)
        .slice(0, exclusive ? 40 : 14);
    if (exclusive) return all.slice(0, 40);
    const recent = getRecent().flatMap((c) => (ACCOUNT_BY_CODE[c] ? [ACCOUNT_BY_CODE[c]] : []));
    return [...extra, ...recent, ...all.filter((a) => !recent.includes(a) && !extra.includes(a))].slice(0, 14);
  }, [q, open, extra, exclusive]);
  const [active, setActive] = useState(0);
  const listId = useId();
  const listRef = useRef<HTMLUListElement>(null);
  useEffect(() => setActive(0), [q, open]);
  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView?.({ block: 'nearest' });
  }, [active, open]);
  const showingRecent = q.trim() === '' && getRecent().length > 0;
  const pick = (code: string | null) => {
    if (code && !exclusive) pushRecent(code);
    onChange(code);
    setOpen(false);
  };
  return (
    <div className="relative">
      <input
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-autocomplete="list"
        aria-activedescendant={open && list[active] ? `${listId}-${active}` : undefined}
        aria-label={label}
        data-cell={cell}
        className="w-full"
        placeholder="Cari kode atau nama akun"
        value={open ? q : acc ? `${acc.code} · ${acc.name}` : ''}
        onFocus={() => {
          setQ('');
          setOpen(true);
        }}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (!open) {
              setQ('');
              setOpen(true);
              return;
            }
            if (list.length === 0) return;
            setActive((i) => (e.key === 'ArrowDown' ? (i + 1) % list.length : (i - 1 + list.length) % list.length));
          } else if (e.key === 'Enter' && open && list[active]) {
            e.preventDefault();
            pick(list[active].code);
          } else if (e.key === 'Escape' && open) {
            e.stopPropagation();
            setOpen(false);
          }
        }}
      />
      {open && (
        <ul
          id={listId}
          ref={listRef}
          role="listbox"
          aria-label="Daftar akun"
          className="absolute z-30 mt-1 max-h-64 w-80 overflow-auto rounded-md border border-slate-300 bg-white shadow-lg"
        >
          {value && (
            <li className="cursor-pointer px-2 py-1 text-xs text-slate-500 hover:bg-slate-100" onMouseDown={(e) => (e.preventDefault(), pick(null))}>
              Kosongkan akun
            </li>
          )}
          {showingRecent && <li className="px-2 py-0.5 text-xs uppercase tracking-wide text-slate-400">Terakhir dipakai di atas</li>}
          {list.length === 0 && <li className="px-2 py-1 text-sm text-slate-500">Tidak ada akun yang cocok</li>}
          {list.map((a, i) => (
            <li
              key={a.code}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={`cursor-pointer px-2 py-1 text-sm hover:bg-blue-50 ${i === active ? 'bg-blue-100' : ''}`}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => (e.preventDefault(), pick(a.code))}
            >
              <span className="font-mono text-xs text-slate-500">{a.code}</span> {a.name}
              <span className="ml-1 text-xs text-slate-400">({a.normal === 'Debit' ? 'D' : 'K'})</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
