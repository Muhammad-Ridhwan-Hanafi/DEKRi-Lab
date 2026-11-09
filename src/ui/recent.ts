/** Akun yang baru dipakai (kemudahan per pengguna di perangkat ini, bukan bagian progres; boleh hilang). */
import { RECENT_ACCOUNTS_KEY, scoped } from '../store/scope';
const MAX = 8;

export function getRecent(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(scoped(RECENT_ACCOUNTS_KEY)) ?? '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function pushRecent(code: string): void {
  try {
    localStorage.setItem(scoped(RECENT_ACCOUNTS_KEY), JSON.stringify([code, ...getRecent().filter((c) => c !== code)].slice(0, MAX)));
  } catch {
    /* penyimpanan tidak tersedia: abaikan */
  }
}
