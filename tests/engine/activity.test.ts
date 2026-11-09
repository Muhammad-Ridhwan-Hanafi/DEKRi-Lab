import { describe, expect, it } from 'vitest';
import { dailyActivity, streak, weeklyAccuracy } from '../../src/store/activity';
import type { LogEntry } from '../../src/store/state';

const today = new Date(2026, 10, 1, 12); // 1 Nov 2026
const at = (daysAgo: number, status: LogEntry['status'] = 'BENAR'): LogEntry => ({
  ts: new Date(2026, 10, 1 - daysAgo, 9).toISOString(),
  kind: 'txn',
  id: '1',
  status,
});

describe('aktivitas dari log', () => {
  it('dailyActivity memberi 14 hari, termasuk hari kosong', () => {
    const r = dailyActivity([at(0), at(0, 'PERIKSA'), at(3)], 14, today);
    expect(r).toHaveLength(14);
    expect(r[13]).toMatchObject({ day: '2026-11-01', attempts: 2, correct: 1 });
    expect(r[10].attempts).toBe(1);
    expect(r[0].attempts).toBe(0);
  });
  it('percobaan di luar jendela dan BELUM DIISI diabaikan', () => {
    const r = dailyActivity([at(30), at(0, 'BELUM DIISI')], 14, today);
    expect(r.reduce((t, d) => t + d.attempts, 0)).toBe(0);
  });
  it('streak berakhir hari ini, atau kemarin bila hari ini belum belajar', () => {
    expect(streak([at(0), at(1), at(2), at(4)], today)).toBe(3);
    expect(streak([at(1), at(2)], today)).toBe(2);
    expect(streak([at(2)], today)).toBe(0);
    expect(streak([], today)).toBe(0);
  });
  it('weeklyAccuracy menghitung per jendela 7 hari', () => {
    const r = weeklyAccuracy([at(0), at(1, 'PERIKSA'), at(8)], 2, today);
    expect(r).toHaveLength(2);
    expect(r[1]).toMatchObject({ attempts: 2, accuracy: 0.5 });
    expect(r[0]).toMatchObject({ attempts: 1, accuracy: 1 });
    expect(weeklyAccuracy([], 1, today)[0].accuracy).toBeNull();
  });
});
