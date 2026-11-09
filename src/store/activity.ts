import type { LogEntry } from './state';

/** Turunan murni dari log percobaan: aktivitas harian, streak, tren akurasi. Tanggal memakai zona waktu lokal. */
export const dayKey = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayOf = (ts: string) => dayKey(new Date(ts));
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export interface DayStat {
  day: string;
  attempts: number;
  correct: number;
}

/** `days` hari terakhir (termasuk hari ini), urut lama -> baru. Percobaan kosong tetap muncul dengan 0. */
export function dailyActivity(log: readonly LogEntry[], days: number, today = new Date()): DayStat[] {
  const out = new Map<string, DayStat>();
  for (let i = days - 1; i >= 0; i--) {
    const k = dayKey(addDays(today, -i));
    out.set(k, { day: k, attempts: 0, correct: 0 });
  }
  for (const e of log) {
    if (e.status === 'BELUM DIISI') continue;
    const s = out.get(dayOf(e.ts));
    if (!s) continue;
    s.attempts++;
    if (e.status === 'BENAR') s.correct++;
  }
  return [...out.values()];
}

/** Berapa hari berturut-turut (berakhir hari ini, atau kemarin bila hari ini belum belajar) ada percobaan. */
export function streak(log: readonly LogEntry[], today = new Date()): number {
  const days = new Set(log.filter((e) => e.status !== 'BELUM DIISI').map((e) => dayOf(e.ts)));
  let d = today;
  if (!days.has(dayKey(d))) d = addDays(d, -1);
  let n = 0;
  while (days.has(dayKey(d))) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

/** Akurasi percobaan per minggu (7 hari bergulir) untuk `weeks` minggu terakhir; null bila tidak ada percobaan. */
export function weeklyAccuracy(
  log: readonly LogEntry[],
  weeks: number,
  today = new Date(),
): Array<{ label: string; attempts: number; accuracy: number | null }> {
  const res: Array<{ label: string; attempts: number; accuracy: number | null }> = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const from = dayKey(addDays(today, -(w * 7 + 6)));
    const to = dayKey(addDays(today, -w * 7));
    const rows = log.filter((e) => e.status !== 'BELUM DIISI' && dayOf(e.ts) >= from && dayOf(e.ts) <= to);
    const ok = rows.filter((e) => e.status === 'BENAR').length;
    res.push({ label: to.slice(5), attempts: rows.length, accuracy: rows.length ? ok / rows.length : null });
  }
  return res;
}
