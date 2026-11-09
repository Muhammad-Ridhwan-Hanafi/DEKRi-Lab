import { LOGO_VIEWBOX, MARK_PATHS, MARK_VIEWBOX, TEXT_PATHS } from './brand-paths';

/*
 * Logo DEKRi Lab. Warna gelap/ungu tua mengikuti tema lewat variabel CSS (--dk-navy, --dk-indigo, --dk-lab di index.css),
 * sehingga varian gelap tidak memakai filter pembalik warna. Nilai cadangan = warna logo asli.
 */
const C = {
  purple: '#5229fc',
  lime: '#c8e968',
  navy: 'var(--dk-navy, #1a0e69)',
  indigo: 'var(--dk-indigo, #2811a0)',
  lab: 'var(--dk-lab, #2e0fce)',
};

function MarkShapes() {
  return (
    <>
      <path d={MARK_PATHS.purple} fill={C.purple} />
      <path d={MARK_PATHS.indigo} fill={C.indigo} />
      <path d={MARK_PATHS.navy} fill={C.navy} />
      <path d={MARK_PATHS.lime} fill={C.lime} />
    </>
  );
}

/** Ikon aplikasi: lambang pada ubin putih bergaris (sama di tema terang dan gelap). */
export function BrandIcon({ className = 'size-9' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" aria-hidden="true" focusable="false">
      <rect x="2" y="2" width="96" height="96" rx="22" fill="#ffffff" stroke="#1a0e69" strokeWidth="4" />
      <svg x="17" y="18" width="66" height="64" viewBox={MARK_VIEWBOX} preserveAspectRatio="xMidYMid meet">
        <path d={MARK_PATHS.purple} fill={C.purple} />
        <path d={MARK_PATHS.indigo} fill="#2811a0" />
        <path d={MARK_PATHS.navy} fill="#1a0e69" />
        <path d={MARK_PATHS.lime} fill={C.lime} />
      </svg>
    </svg>
  );
}

/** Lambang tanpa ubin (dipakai pada splash). Warna mengikuti tema. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox={MARK_VIEWBOX} fill="none" aria-hidden="true" focusable="false">
      <MarkShapes />
    </svg>
  );
}

/** Logo lengkap horizontal: lambang + "DEKRi Lab". Diberi nama aksesibel. */
export function BrandLogo({ className = 'h-10 w-auto' }: { className?: string }) {
  return (
    <svg className={className} viewBox={LOGO_VIEWBOX} fill="none" role="img" aria-label="DEKRi Lab" focusable="false">
      <MarkShapes />
      <path d={TEXT_PATHS.navy} fill={C.navy} />
      <path d={TEXT_PATHS.lime} fill={C.lime} />
      <path d={TEXT_PATHS.lab} fill={C.lab} />
    </svg>
  );
}
