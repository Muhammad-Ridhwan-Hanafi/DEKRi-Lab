// Ruang data per pengguna. Semua data belajar (IndexedDB), preferensi belajar (localStorage), dan cadangan berkas
// diberi akhiran kunci pengguna. Tanpa ruang aktif (belum masuk) kunci dasar dipakai apa adanya, yaitu data
// bawaan versi sebelum ada login (lihat adoptLegacy di persistence.ts).

let scope: string | null = null;

export const getScope = (): string | null => scope;
export const setScope = (key: string | null): void => {
  scope = key;
};

/** Identitas data dari nama: spasi dirapikan dan huruf besar/kecil dianggap sama ("Rina" = "rina"). */
export function userKeyOf(name: string): string {
  return name.replace(/\s+/g, ' ').trim().normalize('NFC').toLowerCase();
}

/** Kunci dasar + ruang pengguna. `s` eksplisit dipakai untuk menyalin data lama ke pengguna tertentu. */
export function scoped(base: string, s: string | null = scope): string {
  return s ? `${base}:u:${encodeURIComponent(s)}` : base;
}

/** Kunci localStorage milik versi lama yang ikut diadopsi pengguna pertama (panduan awal dan akun terakhir). */
export const ONBOARD_KEY = 'akuntansi-practice:onboarded';
export const RECENT_ACCOUNTS_KEY = 'akuntansi-practice:recent-accounts';
