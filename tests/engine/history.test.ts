import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KEY } from '../../src/data';
import { INTERVAL_DAYS, addDays, dueReviews, nextReview, todayStr } from '../../src/store/review';
import { emptyState } from '../../src/store/state';
import { startAutosave, useApp } from '../../src/store/useApp';

const lines = (no: number, flip = false) =>
  KEY.readableTxn
    .find((t) => t.no === no)!
    .lines.map((l, i) => ({ id: `k${i}`, code: l.code, debit: flip ? l.credit : l.debit, credit: flip ? l.debit : l.credit, memo: '' }));
const st = () => useApp.getState();

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-29T08:00:00'));
  await st().reset();
});
afterEach(() => vi.useRealTimers());

describe('urungkan / ulangi', () => {
  it('mengurungkan dan mengulangi isian, dan hanya jawaban yang kembali (bukan status periksa)', () => {
    st().setLines('journal', '2', lines(2));
    st().check('txn', 2);
    vi.advanceTimersByTime(2000);
    st().setLines('journal', '2', []); // hapus semua baris
    expect(st().state.journal['2']).toEqual([]);
    st().undo();
    expect(st().state.journal['2']).toHaveLength(lines(2).length);
    expect(st().state.attempts['txn:2']).toBe(1); // percobaan tidak ikut diurungkan
    st().redo();
    expect(st().state.journal['2']).toEqual([]);
  });

  it('ketikan beruntun pada soal yang sama digabung menjadi satu langkah', () => {
    for (let i = 1; i <= 6; i++) {
      vi.advanceTimersByTime(100);
      st().setLines('journal', '5', [{ id: 'a', code: '1-1000', debit: i * 10, credit: 0, memo: '' }]);
    }
    expect(st().past).toHaveLength(1);
    st().undo();
    expect(st().state.journal['5']).toBeUndefined();
  });

  it('soal berbeda atau jeda lama menjadi langkah terpisah; edit baru menghapus riwayat ulangi', () => {
    st().setLines('journal', '1', lines(1));
    st().setLines('journal', '2', lines(2));
    vi.advanceTimersByTime(2000);
    st().setLines('journal', '2', []);
    expect(st().past).toHaveLength(3);
    st().undo();
    expect(st().future).toHaveLength(1);
    st().setLines('journal', '3', lines(3));
    expect(st().future).toHaveLength(0);
  });

  it('reset dan impor mengosongkan riwayat; undo tanpa riwayat tidak berbuat apa-apa', async () => {
    st().undo();
    st().setLines('journal', '1', lines(1));
    expect(st().past).toHaveLength(1);
    st().replaceState(emptyState());
    expect(st().past).toHaveLength(0);
    st().setLines('journal', '1', lines(1));
    await st().reset();
    expect(st().past).toHaveLength(0);
    expect(st().state.journal).toEqual({});
  });

  it('riwayat dibatasi 100 langkah', () => {
    for (let i = 0; i < 130; i++) {
      vi.advanceTimersByTime(2000);
      st().setLines('journal', '1', [{ id: 'a', code: '1-1000', debit: i + 1, credit: 0, memo: '' }]);
    }
    expect(st().past).toHaveLength(100);
  });
});

describe('pengulangan terjadwal', () => {
  it('logika kotak: salah -> hari ini; benar -> naik kotak hanya bila jatuh tempo; lulus di kotak terakhir', () => {
    const t = '2026-10-29';
    expect(nextReview(undefined, 'BENAR', t)).toBeUndefined(); // benar sejak awal: tidak perlu diulas
    expect(nextReview(undefined, 'PERIKSA', t)).toEqual({ box: 0, due: t });
    expect(nextReview({ box: 0, due: t }, 'BENAR', t)).toEqual({ box: 1, due: '2026-10-30' });
    expect(nextReview({ box: 1, due: '2026-10-30' }, 'BENAR', t)).toBeUndefined(); // belum jatuh tempo
    expect(nextReview({ box: 3, due: '2026-10-29' }, 'PERIKSA', t)).toEqual({ box: 0, due: t }); // salah lagi: mulai dari awal
    expect(nextReview({ box: INTERVAL_DAYS.length - 1, due: t }, 'BENAR', t)).toBeNull();
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(todayStr(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('alur penuh lewat store: salah, benar, tunggu, ulas, lulus', () => {
    st().setLines('journal', '2', lines(2, true)); // salah (sisi terbalik)
    st().check('txn', 2);
    expect(st().state.review['txn:2']).toEqual({ box: 0, due: '2026-10-29' });
    expect(dueReviews(st().state).map((d) => d.id)).toEqual(['2']);

    st().setLines('journal', '2', lines(2));
    st().check('txn', 2);
    expect(st().state.review['txn:2']).toEqual({ box: 1, due: '2026-10-30' });
    expect(dueReviews(st().state)).toEqual([]);

    st().check('txn', 2); // periksa ulang hari yang sama tidak menaikkan kotak
    expect(st().state.review['txn:2']?.box).toBe(1);

    for (let round = 0; round < 5; round++) {
      const due = st().state.review['txn:2']!.due;
      expect(dueReviews(st().state, '1999-01-01')).toEqual([]); // belum jatuh tempo sebelum tanggalnya
      vi.setSystemTime(new Date(`${due}T08:00:00`));
      expect(dueReviews(st().state).map((d) => d.id)).toEqual(['2']);
      st().startReview('txn', '2');
      expect(st().state.journal['2']).toEqual([]);
      st().setLines('journal', '2', lines(2));
      st().check('txn', 2);
    }
    expect(st().state.review['txn:2']).toBeUndefined(); // lulus
  });

  it('soal benar sejak awal tidak masuk jadwal; kunci yang dibuka dikecualikan', () => {
    st().setLines('journal', '3', lines(3));
    st().check('txn', 3);
    expect(st().state.review).toEqual({});
    st().setLines('journal', '4', lines(4, true));
    st().check('txn', 4);
    st().reveal('txn', 4);
    expect(dueReviews(st().state)).toEqual([]);
  });

  it('startReview dapat diurungkan', () => {
    st().setLines('journal', '2', lines(2));
    vi.advanceTimersByTime(2000);
    st().startReview('txn', '2');
    st().undo();
    expect(st().state.journal['2']).toHaveLength(lines(2).length);
  });
});

describe('riwayat Urungkan bertahan setelah muat ulang', () => {
  it('menyimpan riwayat dan memulihkannya saat hydrate', async () => {
    vi.useRealTimers();
    await st().reset();
    await st().hydrate();
    const stop = startAutosave(20);
    st().setLines('journal', '2', lines(2));
    await new Promise((r) => setTimeout(r, 150));
    st().setLines('journal', '3', lines(3));
    await new Promise((r) => setTimeout(r, 150));
    stop();
    // simulasi muat ulang: kosongkan memori lalu hydrate dari IndexedDB
    useApp.setState({ state: emptyState(), past: [], future: [], hydrated: false });
    await st().hydrate();
    expect(Object.keys(st().state.journal).sort()).toEqual(['2', '3']);
    expect(st().past.length).toBeGreaterThanOrEqual(2);
    st().undo();
    expect(Object.keys(st().state.journal)).toEqual(['2']);
  });
});

describe('autosave: flush, coba ulang, dan penjaga multi-tab', () => {
  it('flushSave menulis perubahan tertunda tanpa menunggu debounce', async () => {
    const { flushSave } = await import('../../src/store/useApp');
    const { loadState } = await import('../../src/store/persistence');
    await st().hydrate();
    const stop = startAutosave(60_000);
    st().setLines('journal', '2', lines(2));
    await flushSave();
    expect((await loadState())?.journal['2']).toHaveLength(lines(2).length);
    stop();
  });

  it('saat tab lain menyimpan, penyimpanan dijeda sampai pengguna memilih', async () => {
    await st().hydrate();
    const stop = startAutosave(10);
    useApp.setState({ externalChange: true });
    st().setLines('journal', '3', lines(3));
    await new Promise((r) => setTimeout(r, 60));
    const { loadState } = await import('../../src/store/persistence');
    expect((await loadState())?.journal['3']).toBeUndefined(); // belum tertulis
    st().keepLocal();
    await new Promise((r) => setTimeout(r, 80));
    expect((await loadState())?.journal['3']).toBeDefined();
    expect(st().externalChange).toBe(false);
    stop();
  });
});
