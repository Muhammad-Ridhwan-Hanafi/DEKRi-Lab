import { formatRupiah } from '../engine/money';

/** Format angka laporan: ribuan ala Indonesia, negatif dalam kurung, nol sebagai strip. */
export function acct(n: number): string {
  if (Math.abs(n) < 0.5) return '-';
  return formatRupiah(n, true);
}

export const pct = (n: number) => `${(n * 100).toFixed(1).replace('.', ',')}%`;

/** Label konsistensi baris penutup terhadap buku pengguna; tidak pernah menampilkan pesan grade mentah. */
export function penutupConsistencyLabel(status: string): string {
  switch (status) {
    case 'BENAR':
      return 'Konsisten dengan buku Anda: ya';
    case 'PERIKSA':
      return 'Belum konsisten dengan buku Anda';
    case 'BELUM DIISI':
      return 'Belum diisi';
    default:
      return 'Belum diperiksa';
  }
}

export function downloadText(filename: string, text: string, mime = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadBytes(filename: string, data: Uint8Array, mime: string) {
  const url = URL.createObjectURL(new Blob([data as BlobPart], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
