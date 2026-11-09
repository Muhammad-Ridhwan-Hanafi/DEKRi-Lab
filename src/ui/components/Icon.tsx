/** Ikon garis sederhana (24 px) yang digambar sendiri, tanpa pustaka dan tanpa jaringan. */
const PATHS = {
  dashboard: 'M4 4h6v7H4z M14 4h6v4h-6z M14 12h6v8h-6z M4 15h6v5H4z',
  kasus: 'M7 3h8l4 4v14H7z M15 3v4h4 M10 12h6 M10 16h6',
  transaksi: 'M7 7h12 M16 4l3 3-3 3 M17 17H5 M8 14l-3 3 3 3',
  jurnal: 'M5 4h12a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2z M5 18a2 2 0 0 1 2-2h12 M9 8h6',
  'buku-besar': 'M4 5h16v14H4z M4 10h16 M10 5v14',
  'neraca-saldo': 'M12 4v16 M7 20h10 M4 7h16 M6 7l-3 6h6z M18 7l-3 6h6z',
  penyesuaian: 'M5 7h14 M5 12h14 M5 17h14 M9 5v4 M15 10v4 M8 15v4',
  laporan: 'M5 20V10 M12 20V4 M19 20v-7 M3 20h18',
  penutup: 'M6 11h12v9H6z M8 11V8a4 4 0 0 1 8 0v3',
  koreksi: 'M4 20l1-4 11-11 3 3L8 19z M14 7l3 3',
  skenario: 'M12 3a6 6 0 0 0-4 10.5V16h8v-2.5A6 6 0 0 0 12 3z M9 19h6 M10 21h4',
  ujian: 'M9 4h6v3H9z M7 5H5v16h14V5h-2 M9 14l2 2 4-4',
  pengaturan: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M12 3v3 M12 18v3 M3 12h3 M18 12h3 M5.6 5.6l2.1 2.1 M16.3 16.3l2.1 2.1 M5.6 18.4l2.1-2.1 M16.3 7.7l2.1-2.1',
  belajar: 'M3 9l9-5 9 5-9 5z M7 11.5V16c0 1.5 2.2 3 5 3s5-1.5 5-3v-4.5 M21 9v6',
  analisis: 'M4 19V5 M4 19h16 M8 15l3-4 3 2 5-7',
  'buku-pembantu': 'M6 3h11a2 2 0 0 1 2 2v16H8a2 2 0 0 1-2-2z M6 17h13 M10 8h5 M10 12h5',
  materi: 'M4 5h7a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H4z M20 5h-7a3 3 0 0 0-3 3',
  pajak: 'M6 4h12v16l-3-2-3 2-3-2-3 2z M9 9h6 M9 13h4',
  varian: 'M4 7h12 M13 4l3 3-3 3 M20 17H8 M11 14l-3 3 3 3',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M20 20l-4-4',
  kalkulator:
    'M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z M8 7h8 M8.5 12h.01 M12 12h.01 M15.5 12h.01 M8.5 16h.01 M12 16h.01 M15.5 16h.01',
  undo: 'M9 14L4 9l5-5 M4 9h10a6 6 0 0 1 0 12h-3',
  redo: 'M15 14l5-5-5-5 M20 9H10a6 6 0 0 0 0 12h3',
  check: 'M5 13l4 4L19 7',
  alert: 'M12 4l9 16H3z M12 10v4 M12 17h.01',
  arrow: 'M5 12h14 M13 6l6 6-6 6',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, className = '' }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
