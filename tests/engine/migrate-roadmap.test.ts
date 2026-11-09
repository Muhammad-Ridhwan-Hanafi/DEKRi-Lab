import { describe, expect, it } from 'vitest';
import { emptyState, makeBackup, migrate, parseBackup } from '../../src/store/state';

describe('migrasi: cadangan lama tanpa kolom baru', () => {
  it('state lama (tanpa hints/flags/notes/log/exams/pajak/tables) tetap terbaca dan diberi nilai awal', () => {
    const old: Record<string, unknown> = { ...emptyState() };
    for (const k of ['hints', 'flags', 'notes', 'log', 'exams', 'pajak', 'tables']) delete old[k];
    old.journal = { '1': [{ code: '1-1100', debit: 5, credit: 0 }] };
    const s = migrate(old)!;
    expect(s.journal['1']).toHaveLength(1);
    expect(s.hints).toEqual({});
    expect(s.flags).toEqual([]);
    expect(s.log).toEqual([]);
    expect(s.exams).toEqual([]);
    expect(s.pajak).toEqual({});
  });
  it('file cadangan lama lolos parseBackup', () => {
    const b = makeBackup(emptyState());
    const st = b.state as unknown as Record<string, unknown>;
    delete st.log;
    delete st.flags;
    expect(parseBackup(JSON.stringify(b)).state.log).toEqual([]);
  });
  it('data baru yang rusak dibuang, bukan membuat aplikasi gagal', () => {
    const bad = { ...emptyState(), flags: [1, 'txn:1'], log: [{ x: 1 }, { ts: 't', kind: 'txn', id: '1', status: 'BENAR' }], exams: 'x', hints: [] };
    const s = migrate(bad)!;
    expect(s.flags).toEqual(['txn:1']);
    expect(s.log).toHaveLength(1);
    expect(s.exams).toEqual([]);
    expect(s.hints).toEqual({});
  });
  it('round-trip cadangan membawa data baru', () => {
    const s = { ...emptyState(), flags: ['txn:3'], notes: { 'txn:3': 'cek diskon' }, hints: { 'txn:3': 2 } };
    const r = parseBackup(JSON.stringify(makeBackup(s))).state;
    expect(r.flags).toEqual(['txn:3']);
    expect(r.notes['txn:3']).toBe('cek diskon');
    expect(r.hints['txn:3']).toBe(2);
  });
});
