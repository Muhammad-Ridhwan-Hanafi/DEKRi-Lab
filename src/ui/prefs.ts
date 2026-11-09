/** Preferensi tampilan per perangkat (bukan bagian data latihan). Penyimpanan boleh gagal: nilai bawaan dipakai. */
import { ONBOARD_KEY, scoped } from '../store/scope';

const SCALE_KEY = 'akuntansi-practice:scale';
export const SCALES = [90, 100, 110, 125, 150] as const;
export type Scale = (typeof SCALES)[number];

export function getScale(): Scale {
  try {
    const v = Number(localStorage.getItem(SCALE_KEY));
    return (SCALES as readonly number[]).includes(v) ? (v as Scale) : 100;
  } catch {
    return 100;
  }
}
export function applyScale(s: Scale = getScale()): void {
  document.documentElement.style.fontSize = `${(16 * s) / 100}px`;
}
export function setScale(s: Scale): void {
  try {
    localStorage.setItem(SCALE_KEY, String(s));
  } catch {
    /* hanya berlaku untuk sesi ini */
  }
  applyScale(s);
}
export function seenOnboarding(): boolean {
  try {
    return localStorage.getItem(scoped(ONBOARD_KEY)) === '1';
  } catch {
    return true; // tanpa penyimpanan, jangan menampilkan panduan berulang kali
  }
}
export function markOnboarded(): void {
  try {
    localStorage.setItem(scoped(ONBOARD_KEY), '1');
  } catch {
    /* abaikan */
  }
}
