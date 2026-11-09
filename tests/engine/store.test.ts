import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { KEY } from '../../src/data';
import { makeCtx, resultFor, summarize } from '../../src/store/derive';
import { loadState, saveState, clearState } from '../../src/store/persistence';
import { emptyState, makeBackup, migrate, parseBackup, signature, type UserState } from '../../src/store/state';
import { startAutosave, useApp } from '../../src/store/useApp';
import type { JournalLine } from '../../src/engine/types';

let n = 0;
const line = (code: string, debit = 0, credit = 0): JournalLine => ({ id: `t${++n}`, code, debit, credit, memo: '' });
const keyLines = (no: number) => KEY.readableTxn.find((t) => t.no === no)!.lines.map((l) => line(l.code, l.debit, l.credit));

beforeEach(async () => {
  await clearState();
  useApp.setState({ state: emptyState(), hydrated: true, saveStatus: 'idle' });
});

describe('status turunan dan mode Periksa', () => {
  it('jawaban benar belum diperiksa -> BELUM DIPERIKSA; setelah Periksa -> BENAR dan percobaan tercatat', () => {
    useApp.getState().setLines('journal', '4', keyLines(4));
    let s = useApp.getState().state;
    expect(resultFor(s, 'txn', 4, makeCtx(s)).status).toBe('BELUM DIPERIKSA');
    useApp.getState().check('txn', 4);
    s = useApp.getState().state;
    expect(resultFor(s, 'txn', 4, makeCtx(s)).status).toBe('BENAR');
    expect(s.attempts['txn:4']).toBe(1);
  });

  it('mengubah jawaban setelah Periksa membatalkan status (tidak ada status basi)', () => {
    useApp.getState().setLines('journal', '4', keyLines(4));
    useApp.getState().check('txn', 4);
    const changed = keyLines(4);
    changed[0] = { ...changed[0], debit: changed[0].debit + 1000 };
    useApp.getState().setLines('journal', '4', changed);
    const s = useApp.getState().state;
    expect(resultFor(s, 'txn', 4, makeCtx(s)).status).toBe('BELUM DIPERIKSA');
    useApp.getState().check('txn', 4);
    const s2 = useApp.getState().state;
    expect(resultFor(s2, 'txn', 4, makeCtx(s2)).status).toBe('PERIKSA');
    expect(s2.attempts['txn:4']).toBe(2);
  });

  it('mode Langsung menilai tanpa tombol dan tanpa menambah percobaan', () => {
    useApp.getState().setMode('live');
    useApp.getState().setLines('journal', '4', keyLines(4));
    const s = useApp.getState().state;
    expect(resultFor(s, 'txn', 4, makeCtx(s)).status).toBe('BENAR');
    expect(s.attempts['txn:4']).toBeUndefined();
  });

  it('transaksi pengecoh: keputusan "Tidak perlu jurnal" lalu Periksa -> BENAR', () => {
    const no = Object.keys(KEY.analysis).find((k) => KEY.analysis[k].debit === '-')!;
    useApp.getState().setAnalysis(no, { decision: 'Tidak perlu jurnal' });
    useApp.getState().check('txn', no);
    const s = useApp.getState().state;
    expect(resultFor(s, 'txn', no, makeCtx(s)).status).toBe('BENAR');
  });

  it('akurasi mengeluarkan item yang kuncinya dibuka', () => {
    useApp.getState().setLines('journal', '4', keyLines(4));
    useApp.getState().setLines('journal', '1', [line('1-1100', 1, 0), line('3-1000', 0, 1)]);
    useApp.getState().check('txn', 4);
    useApp.getState().check('txn', 1);
    let s = useApp.getState().state;
    let sum = summarize(s, 'txn', makeCtx(s));
    expect(sum).toMatchObject({ worked: 2, correct: 1, review: 1, accuracy: 0.5 });
    useApp.getState().reveal('txn', 1);
    s = useApp.getState().state;
    sum = summarize(s, 'txn', makeCtx(s));
    expect(sum).toMatchObject({ worked: 1, correct: 1, accuracy: 1 });
  });

  it('laporan berubah mengikuti jurnal pengguna (tidak diperbaiki otomatis)', () => {
    useApp.getState().setLines('journal', '1', [line('1-1100', 100, 0), line('3-1000', 0, 40)]);
    const s = useApp.getState().state;
    const t = makeCtx(s).report.tb;
    const bank = t.find((r) => r.code === '1-1100')!;
    expect(bank.journalDebit).toBe(100); // jurnal tidak seimbang tetap tercermin apa adanya
  });
});

describe('penyimpanan dan cadangan', () => {
  it('simpan dan muat ulang dari IndexedDB mempertahankan progres', async () => {
    useApp.getState().setLines('journal', '4', keyLines(4));
    useApp.getState().check('txn', 4);
    await saveState(useApp.getState().state);
    const loaded = await loadState();
    expect(loaded).not.toBeNull();
    expect(resultFor(loaded as UserState, 'txn', 4, makeCtx(loaded as UserState)).status).toBe('BENAR');
  });

  it('simpan otomatis berjalan setelah jeda', async () => {
    const stop = startAutosave(20);
    useApp.getState().setLines('journal', '4', keyLines(4));
    await new Promise((r) => setTimeout(r, 120));
    stop();
    expect(useApp.getState().saveStatus).toBe('saved');
    const loaded = await loadState();
    expect(signature(loaded!.journal['4'])).toBe(signature(keyLines(4)));
  });

  it('ekspor -> impor pulang-pergi menghasilkan keadaan yang sama', () => {
    useApp.getState().setLines('journal', '4', keyLines(4));
    useApp.getState().check('txn', 4);
    useApp.getState().setScenario('1', { answer: '619000000', reasoning: 'catatan' });
    useApp.getState().reveal('txn', 4);
    const orig = useApp.getState().state;
    const parsed = parseBackup(JSON.stringify(makeBackup(orig)));
    expect(parsed.journals).toBe(1);
    expect(parsed.state.journal).toEqual(orig.journal);
    expect(parsed.state.checked).toEqual(orig.checked);
    expect(parsed.state.revealed).toEqual(orig.revealed);
    expect(parsed.state.scenarios).toEqual(orig.scenarios);
    useApp.getState().replaceState(parsed.state);
    const s = useApp.getState().state;
    expect(resultFor(s, 'txn', 4, makeCtx(s)).status).toBe('BENAR');
  });

  it('impor menolak file yang salah dengan pesan jelas', () => {
    expect(() => parseBackup('bukan json')).toThrow(/JSON/);
    expect(() => parseBackup('{"app":"lain"}')).toThrow(/bukan cadangan/);
    expect(() => parseBackup('{"app":"akuntansi-practice","version":2}')).toThrow(/Versi/);
    expect(migrate({ version: 1, journal: 5 })!.journal).toEqual({});
    expect(migrate(null)).toBeNull();
  });

  it('reset menghapus progres dan penyimpanan', async () => {
    useApp.getState().setLines('journal', '4', keyLines(4));
    await saveState(useApp.getState().state);
    await useApp.getState().reset();
    expect(useApp.getState().state.journal).toEqual({});
    expect(await loadState()).toBeNull();
  });
});
