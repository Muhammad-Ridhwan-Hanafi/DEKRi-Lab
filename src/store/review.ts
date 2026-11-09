import { itemKey, type ItemKind } from './derive';
import type { UserState } from './state';

/**
 * Pengulangan terjadwal (kotak Leitner sederhana). Hanya soal yang pernah SALAH masuk jadwal:
 * salah -> ulas hari ini; benar -> ulas lagi 1, 3, 7, 14, lalu 30 hari kemudian; benar sesudah itu -> lulus.
 */
export const INTERVAL_DAYS = [0, 1, 3, 7, 14, 30];
export const REVIEW_KINDS = ['txn', 'adj', 'sc'] as const;
export type ReviewKind = (typeof REVIEW_KINDS)[number];
export interface ReviewEntry {
  box: number;
  due: string; // YYYY-MM-DD
}

export const isReviewKind = (k: ItemKind): k is ReviewKind => (REVIEW_KINDS as readonly string[]).includes(k);

const pad = (n: number) => String(n).padStart(2, '0');
export const todayStr = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return todayStr(new Date(y, m - 1, d + n));
}

/** Entri jadwal baru setelah sebuah soal diperiksa. undefined = tidak berubah, null = hapus (lulus). */
export function nextReview(prev: ReviewEntry | undefined, status: 'BENAR' | 'PERIKSA', today: string): ReviewEntry | null | undefined {
  if (status === 'PERIKSA') return { box: 0, due: today };
  if (!prev || prev.due > today) return undefined; // belum jatuh tempo: periksa ulang tidak menaikkan kotak
  if (prev.box >= INTERVAL_DAYS.length - 1) return null;
  const box = prev.box + 1;
  return { box, due: addDays(today, INTERVAL_DAYS[box]) };
}

export interface DueItem extends ReviewEntry {
  kind: ReviewKind;
  id: string;
}

export function dueReviews(state: UserState, today = todayStr()): DueItem[] {
  const out: DueItem[] = [];
  for (const [key, e] of Object.entries(state.review)) {
    const [kind, ...rest] = key.split(':');
    if (!isReviewKind(kind as ItemKind) || e.due > today || state.revealed.includes(key)) continue;
    out.push({ ...e, kind: kind as ReviewKind, id: rest.join(':') });
  }
  return out.sort((a, b) => a.due.localeCompare(b.due) || a.box - b.box || a.id.localeCompare(b.id, undefined, { numeric: true }));
}

export const reviewKey = (kind: ReviewKind, id: string) => itemKey(kind, id);
