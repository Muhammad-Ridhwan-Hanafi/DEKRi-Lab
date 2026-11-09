import { Icon } from './Icon';

/** Bar progres bertumpuk dari angka nyata; teks alternatifnya merinci tiap bagian. Tumbuh sekali saat tampil. */
export function StackedBar({ total, parts, className = 'h-3.5' }: { total: number; parts: Array<[number, string, string]>; className?: string }) {
  const desc = parts.map(([n, , l]) => `${n} ${l}`).join(', ');
  return (
    <div className={`flex w-full overflow-hidden rounded-full border-2 border-slate-900 bg-white ${className}`} role="img" aria-label={desc} title={desc}>
      {total > 0 && parts.map(([n, cls, l]) => (n > 0 ? <span key={l} className={`ap-grow ${cls}`} style={{ width: `${(n / total) * 100}%` }} /> : null))}
    </div>
  );
}

/** Bar satu warna (0-100) untuk kemajuan materi/latihan. */
export function Meter({ percent, label, tone = 'bg-blue-600', className = 'h-3.5' }: { percent: number; label: string; tone?: string; className?: string }) {
  const p = Math.max(0, Math.min(100, percent));
  return (
    <div className={`overflow-hidden rounded-full border-2 border-slate-900 bg-white ${className}`} role="img" aria-label={label}>
      <div className={`ap-grow h-full ${tone}`} style={{ width: `${p}%`, transition: 'width var(--ap-dur-slow) var(--ap-ease)' }} />
    </div>
  );
}

/** Cincin progres (hanya tampilan; nilai berasal dari ringkasan yang sama). Menggambar sekali saat tampil. */
export function Ring({ value, label, size = 84, tone = 'stroke-blue-600' }: { value: number; label: string; size?: number; tone?: string }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <svg width={size} height={size} viewBox="0 0 84 84" role="img" aria-label={label} className="shrink-0">
      <circle cx="42" cy="42" r={r} fill="none" strokeWidth="8" className="stroke-slate-200" />
      {v > 0 && (
        <circle
          cx="42"
          cy="42"
          r={r}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          className={`ap-ring ${tone}`}
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - v)}
          style={{ ['--ap-from' as string]: c }}
          transform="rotate(-90 42 42)"
        />
      )}
    </svg>
  );
}

export type TagTone = 'lilac' | 'lime' | 'aqua' | 'blush';

/** Label kategori pastel. Hanya untuk kategori belajar dan pencapaian; bukan status benar/salah. */
export function Tag({ tone, children }: { tone: TagTone; children: React.ReactNode }) {
  return <span className={`tag tag-${tone}`}>{children}</span>;
}

/** Penanda selesai: centang yang tergambar sekali. Teks pendamping tetap wajib agar tidak bergantung pada warna. */
export function DoneMark({ size = 16 }: { size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white"
      style={{ width: size + 6, height: size + 6 }}
      aria-hidden="true"
    >
      <svg
        width={size - 4}
        height={size - 4}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path className="ap-check" d="M5 13l4 4L19 7" />
      </svg>
    </span>
  );
}

/** Pencapaian: hanya dirender oleh pemanggil bila syaratnya benar-benar terpenuhi dari state/log. */
export function Achievement({ tone, title, detail }: { tone: TagTone; title: string; detail: string }) {
  return (
    <li className="ap-pop flex items-center gap-3 rounded-xl border-2 border-slate-900 bg-white p-3 shadow-[2px_2px_0_var(--neo-shadow)]">
      <span className={`tag-${tone} flex size-9 shrink-0 items-center justify-center rounded-full`} aria-hidden="true">
        <Icon name="check" size={18} />
      </span>
      <span className="min-w-0 text-sm">
        <b className="block font-medium text-slate-900">{title}</b>
        <span className="text-xs text-slate-500">{detail}</span>
      </span>
    </li>
  );
}
