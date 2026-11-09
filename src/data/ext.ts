import type { Account } from '../engine/types';

/** Akun tambahan khusus latihan pajak. Tidak masuk bagan akun kasus, sehingga paritas dengan workbook tidak berubah. */
export const EXT_ACCOUNTS: Account[] = [
  { code: '1-1850', name: 'PPN Masukan', type: 'Asset', normal: 'Debit', reportClass: 'Current Asset' },
  { code: '2-1550', name: 'Utang PPN (PPN Keluaran)', type: 'Liability', normal: 'Credit', reportClass: 'Current Liability' },
  { code: '2-1560', name: 'Utang PPh 23', type: 'Liability', normal: 'Credit', reportClass: 'Current Liability' },
];
/** Kode akun pajak: dipakai untuk menandai soal sebagai latihan pajak. */
export const TAX_BY_CODE: Record<string, Account> = Object.fromEntries(EXT_ACCOUNTS.map((a) => [a.code, a]));
/** Semua akun di luar bagan akun kasus utama (pajak dan akun milik paket industri). Dapat bertambah saat paket dimuat. */
export const EXT_BY_CODE: Record<string, Account> = { ...TAX_BY_CODE };

/** Daftarkan akun milik paket agar namanya dikenali umpan balik dan form jurnal. Kode yang sudah ada tidak ditimpa. */
export function registerAccounts(list: readonly Account[]): void {
  for (const a of list) if (!(a.code in EXT_BY_CODE)) EXT_BY_CODE[a.code] = a;
}
