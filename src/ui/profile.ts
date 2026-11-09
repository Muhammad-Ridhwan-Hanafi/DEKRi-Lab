import { useSyncExternalStore } from 'react';

// Profil pengguna lokal: hanya nama, tanpa kata sandi. Ini penanda identitas di perangkat, bukan autentikasi.
// Disimpan di kunci sendiri; tidak menyentuh state belajar, riwayat, ujian, atau cadangan.
const KEY = 'akuntansi-practice:profile:v1';
const RECENT_KEY = 'akuntansi-practice:profile-recent:v1';

export const NAME_MIN = 2;
export const NAME_MAX = 30;
const MAX_RECENT = 6;
const ALLOWED = /^[\p{L}\p{N} .'_-]+$/u;

export type Profile = { name: string; since: string };

/** Rapikan spasi berlebih di awal, akhir, dan tengah nama. */
export function normalizeName(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim();
}

/** Mengembalikan pesan kesalahan dalam bahasa Indonesia, atau null bila nama valid. */
export function validateName(raw: string): string | null {
  const n = normalizeName(raw);
  if (n.length === 0) return 'Isi nama Anda terlebih dahulu.';
  if (n.length < NAME_MIN) return `Nama minimal ${NAME_MIN} karakter.`;
  if (n.length > NAME_MAX) return `Nama maksimal ${NAME_MAX} karakter.`;
  if (!ALLOWED.test(n)) return 'Gunakan huruf, angka, spasi, titik, apostrof, garis bawah, atau tanda hubung.';
  return null;
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // penyimpanan diblokir: profil bertahan selama sesi saja
  }
}

function readProfile(): Profile | null {
  const p = read<Profile>(KEY);
  return p && typeof p.name === 'string' && validateName(p.name) === null ? p : null;
}

let current: Profile | null | undefined; // undefined = belum dibaca
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function snapshot(): Profile | null {
  if (current === undefined) current = readProfile();
  return current;
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Pengguna yang sedang masuk (null bila belum masuk). */
export function useProfile(): Profile | null {
  return useSyncExternalStore(subscribe, snapshot, () => null);
}

export function recentNames(): string[] {
  const r = read<unknown>(RECENT_KEY);
  return Array.isArray(r) ? r.filter((x): x is string => typeof x === 'string' && validateName(x) === null).slice(0, MAX_RECENT) : [];
}

/** Masuk sebagai `raw`. Mengembalikan pesan kesalahan bila nama tidak valid. */
export function login(raw: string): string | null {
  const err = validateName(raw);
  if (err) return err;
  const name = normalizeName(raw);
  const p: Profile = { name, since: new Date().toISOString() };
  write(KEY, p);
  const rest = recentNames().filter((n) => n.toLowerCase() !== name.toLowerCase());
  write(RECENT_KEY, [name, ...rest].slice(0, MAX_RECENT));
  current = p;
  emit();
  return null;
}

/** Keluar: hanya melepas profil aktif. Progres belajar dan daftar nama terakhir tidak dihapus. */
export function logout(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // diabaikan
  }
  current = null;
  emit();
}

/** Inisial untuk avatar (maks. 2 huruf). */
export function initials(name: string): string {
  const parts = normalizeName(name).split(' ');
  const a = parts[0]?.[0] ?? '?';
  const b = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (a + b).toUpperCase();
}
