import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { calculate, formatCalc } from '../../engine/calc';
import { MAX_RUPIAH } from '../../engine/money';
import { insertIntoLastField } from '../lastField';

interface Entry {
  expr: string;
  result: number;
}
// Riwayat dipertahankan selama aplikasi terbuka (tidak disimpan ke data latihan).
let history: Entry[] = [];

const KEYS: string[][] = [
  ['C', '(', ')', '⌫'],
  ['7', '8', '9', '÷'],
  ['4', '5', '6', '×'],
  ['1', '2', '3', '-'],
  ['0', '000', ',', '+'],
  ['%', '=', '', ''],
];

/** Tampilkan operator sebagai × dan ÷ (bukan * dan /), juga saat diketik dari keyboard. */
const toDisplay = (s: string) => s.replace(/\*/g, '×').replace(/\//g, '÷');

/** Beri titik ribuan pada tiap angka bulat; bagian desimal (setelah koma) tidak disentuh. */
export function groupExpr(s: string): string {
  return s.replace(/(\d[\d.]*)(,\d*)?/g, (_m, int: string, dec?: string) => {
    const digits = int.replace(/\./g, '');
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (dec ?? '');
  });
}
/** Posisi kursor setelah pemformatan: hitung karakter selain titik di kiri kursor lama. */
function caretAfter(formatted: string, solid: number): number {
  let n = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (n === solid) return i;
    if (formatted[i] !== '.') n++;
  }
  return formatted.length;
}

const POS_KEY = 'akuntansi-practice:calc-pos';
type Pos = { x: number; y: number };
let savedPos: Pos | null = null;
try {
  const v = JSON.parse(localStorage.getItem(POS_KEY) ?? 'null');
  if (v && Number.isFinite(v.x) && Number.isFinite(v.y)) savedPos = { x: v.x, y: v.y };
} catch {
  /* tanpa penyimpanan: posisi bawaan */
}

export function Calculator({ onClose }: { onClose: () => void }) {
  const [expr, setExpr] = useState('');
  const [hist, setHist] = useState<Entry[]>(history);
  const [note, setNote] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const caret = useRef<number | null>(null);
  const [pos, setPos] = useState<Pos | null>(savedPos);
  useEffect(() => input.current?.focus(), []);
  // setelah teks diformat ulang, kembalikan kursor ke tempat yang sama (di antara angka yang sama)
  useLayoutEffect(() => {
    if (caret.current !== null && input.current) input.current.setSelectionRange(caret.current, caret.current);
    caret.current = null;
  }, [expr]);
  const clamp = (p: Pos): Pos => {
    const w = box.current?.offsetWidth ?? 320;
    const h = box.current?.offsetHeight ?? 400;
    return { x: Math.max(0, Math.min(p.x, window.innerWidth - w)), y: Math.max(0, Math.min(p.y, window.innerHeight - Math.min(h, 80))) };
  };
  const move = (p: Pos, save = false) => {
    const c = clamp(p);
    setPos(c);
    if (save) {
      savedPos = c;
      try {
        localStorage.setItem(POS_KEY, JSON.stringify(c));
      } catch {
        /* abaikan */
      }
    }
  };
  const startDrag = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button') || !box.current) return;
    const r = box.current.getBoundingClientRect();
    const dx = e.clientX - r.left;
    const dy = e.clientY - r.top;
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture?.(e.pointerId);
    let last: Pos = { x: r.left, y: r.top };
    const onMove = (ev: PointerEvent) => {
      last = { x: ev.clientX - dx, y: ev.clientY - dy };
      move(last);
    };
    const onUp = () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      move(last, true);
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
  };
  const nudge = (e: React.KeyboardEvent) => {
    const d: Record<string, Pos> = { ArrowLeft: { x: -16, y: 0 }, ArrowRight: { x: 16, y: 0 }, ArrowUp: { x: 0, y: -16 }, ArrowDown: { x: 0, y: 16 } };
    const step = d[e.key];
    if (!step || !box.current) return;
    e.preventDefault();
    const r = box.current.getBoundingClientRect();
    move({ x: (pos?.x ?? r.left) + step.x, y: (pos?.y ?? r.top) + step.y }, true);
  };
  const onType = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = toDisplay(e.target.value);
    const at = e.target.selectionStart ?? raw.length;
    const solid = raw.slice(0, at).replace(/\./g, '').length;
    const formatted = groupExpr(raw);
    caret.current = caretAfter(formatted, solid);
    setExpr(formatted);
  };
  // Backspace/Delete tepat di sebelah titik ribuan akan langsung dibentuk ulang, jadi hapus angka di sebelah titik itu.
  const onDel = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const el = e.currentTarget;
    if ((e.key !== 'Backspace' && e.key !== 'Delete') || el.selectionStart !== el.selectionEnd) return;
    const at = el.selectionStart ?? 0;
    const back = e.key === 'Backspace';
    if (el.value[back ? at - 1 : at] !== '.') return;
    e.preventDefault();
    const cut = back ? at - 2 : at + 1;
    if (cut < 0 || cut >= el.value.length) return;
    const raw = el.value.slice(0, cut) + el.value.slice(cut + 1);
    const solid = raw.slice(0, back ? cut : at).replace(/\./g, '').length;
    const formatted = groupExpr(raw);
    caret.current = caretAfter(formatted, solid);
    setExpr(formatted);
  };

  const r = expr.trim() === '' ? null : calculate(expr);
  const commit = (): Entry | null => {
    const res = calculate(expr);
    if (!res.ok) {
      setNote(res.error);
      return null;
    }
    const e = { expr: expr.trim(), result: res.value };
    history = [e, ...history].slice(0, 10);
    setHist(history);
    setNote('');
    return e;
  };
  const press = (k: string) => {
    setNote('');
    if (k === 'C') setExpr('');
    else if (k === '⌫') setExpr((s) => groupExpr(s.slice(0, -1)));
    else if (k === '=') {
      const e = commit();
      if (e) setExpr(groupExpr(String(Math.round(e.result * 1e4) / 1e4).replace('.', ',')));
    } else setExpr((s) => groupExpr(s + k));
    input.current?.focus();
  };
  const current = r && r.ok ? r.value : null;
  const copy = async () => {
    if (current === null) return;
    try {
      await navigator.clipboard.writeText(String(Math.round(current * 1e4) / 1e4).replace('.', ','));
      setNote('Hasil disalin.');
    } catch {
      setNote('Tidak bisa menyalin otomatis; blok dan salin hasil secara manual.');
    }
  };
  const insert = () => {
    if (current === null) return;
    const n = Math.round(current);
    if (n < 0 || n > MAX_RUPIAH) return setNote('Hanya hasil 0 sampai batas nominal yang bisa dimasukkan ke kolom.');
    setNote(
      insertIntoLastField(n)
        ? `Dimasukkan ke kolom nominal: ${formatCalc(n)} (dibulatkan ke rupiah).`
        : 'Klik dulu kolom nominal di halaman, lalu tekan tombol ini.',
    );
  };

  return (
    <div
      role="dialog"
      aria-label="Kalkulator"
      data-calculator
      ref={box}
      style={pos ? { left: pos.x, top: pos.y } : undefined}
      className={`no-print fixed z-40 w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl ${pos ? '' : 'bottom-4 right-4'}`}
      onKeyDown={(e) => {
        if (e.altKey) nudge(e);
        if (e.key === 'Escape') {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div
        className="mb-2 flex cursor-move touch-none select-none items-center justify-between"
        onPointerDown={startDrag}
        title="Tarik untuk menggeser (atau Alt + tombol panah)"
      >
        <h2 className="text-sm font-semibold">Kalkulator</h2>
        <div className="flex gap-1">
          <button className="btn px-2 py-0.5 text-xs" onClick={onClose} aria-label="Tutup kalkulator">
            Tutup
          </button>
        </div>
      </div>
      <input
        ref={input}
        aria-label="Ekspresi"
        className="w-full font-mono"
        value={expr}
        placeholder="mis. (120.000.000-12.000.000)÷5"
        spellCheck={false}
        autoComplete="off"
        onChange={onType}
        onKeyDown={(e) => {
          onDel(e);
          if (e.key === 'Enter') {
            e.preventDefault();
            press('=');
          }
        }}
      />
      <div className="mt-1 min-h-[2.5rem]" aria-live="polite" data-testid="calc-result">
        {r === null ? (
          <span className="text-xs text-slate-500">Ketik angka; titik ribuan terisi otomatis (1.250.000). Koma = desimal, % didukung.</span>
        ) : r.ok ? (
          <span className="text-2xl font-semibold tabular-nums">= {formatCalc(r.value)}</span>
        ) : (
          <span className="text-xs text-red-700">{r.error}</span>
        )}
      </div>
      <div className="grid grid-cols-4 gap-1" role="group" aria-label="Tombol angka">
        {KEYS.flat().map((k, i) =>
          k === '' ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              className="btn justify-center px-0 py-1.5"
              onClick={() => press(k)}
              aria-label={k === '×' ? 'kali' : k === '÷' ? 'bagi' : k === '000' ? 'tiga nol' : k}
            >
              {k}
            </button>
          ),
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        <button className="btn text-xs" disabled={current === null} onClick={() => void copy()}>
          Salin hasil
        </button>
        <button className="btn text-xs" disabled={current === null} onClick={insert}>
          Masukkan ke kolom nominal
        </button>
      </div>
      <p role="status" className="mt-1 min-h-[1rem] text-xs text-slate-600">
        {note}
      </p>
      {hist.length > 0 && (
        <div className="mt-1 border-t border-slate-200 pt-1">
          <div className="text-xs font-medium text-slate-500">Riwayat</div>
          <ul className="max-h-24 overflow-y-auto text-xs">
            {hist.map((h, i) => (
              <li key={i}>
                <button className="w-full truncate text-left hover:underline" onClick={() => setExpr(groupExpr(toDisplay(h.expr)))} title={h.expr}>
                  {h.expr} = <b>{formatCalc(h.result)}</b>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
