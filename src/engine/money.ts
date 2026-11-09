export { xround } from './excel';

const idr = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });

/** 1234567 -> "1.234.567"; negatif -> "(1.234.567)" bila accounting=true. */
export function formatRupiah(n: number, accounting = false): string {
  const s = idr.format(Math.abs(Math.round(n)));
  if (n < 0) return accounting ? `(${s})` : `-${s}`;
  return s;
}

/**
 * Batas nominal per sel: 10 triliun rupiah. Jauh di bawah 2^53 sehingga penjumlahan tetap tepat, dan SAMA dengan batas
 * pembersihan data (cadangan/impor) agar angka yang bisa diketik tidak dibuang diam-diam saat dipulihkan.
 */
export const MAX_RUPIAH = 10_000_000_000_000;

/**
 * Baca isian pengguna: "1.250.000", "1250000", "1,250,000" -> 1250000. Kosong/tidak valid -> 0.
 * Hanya tanda minus di depan yang dihormati; angka melebihi MAX_RUPIAH dibatasi, tidak dibiarkan kehilangan ketelitian.
 */
export function parseRupiah(input: string): number {
  const negative = input.trim().startsWith('-');
  const digits = input.replace(/\D/g, '');
  if (digits === '') return 0;
  const n = Math.min(Number.parseInt(digits.slice(0, 16), 10), MAX_RUPIAH);
  if (!Number.isFinite(n)) return 0;
  return negative ? -n : n;
}
