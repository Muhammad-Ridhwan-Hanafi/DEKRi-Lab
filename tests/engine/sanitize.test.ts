import { describe, expect, it } from 'vitest';
import { KEY } from '../../src/data';
import { emptyState, makeBackup, migrate, migrateWithReport, parseBackup, MAX_BACKUP_BYTES } from '../../src/store/state';

const good = (i: number) => ({ id: `l${i}`, code: '1-1100', debit: 1000, credit: 0, memo: '' });
const withJournal = (lines: unknown) => ({ ...emptyState(), journal: { '1': lines } });

describe('sanitasi state/cadangan', () => {
  it('state yang valid lolos tanpa ada yang dibuang (round-trip identik)', () => {
    const s = emptyState();
    s.journal['1'] = KEY.readableTxn[0].lines.map((l, i) => ({ id: `k${i}`, code: l.code, debit: l.debit, credit: l.credit, memo: '' }));
    const r = migrateWithReport(JSON.parse(JSON.stringify(s)))!;
    expect(r.dropped).toBe(0);
    expect(r.state).toEqual(s);
  });

  it('membuang baris dengan NaN/Infinity/negatif/raksasa/akun tak dikenal dan melaporkan jumlahnya', () => {
    const raw = JSON.parse(
      JSON.stringify(
        withJournal([
          good(1),
          { ...good(2), debit: -5 },
          { ...good(3), debit: 1e300 },
          { ...good(4), code: '9-9999' },
          { ...good(5), debit: 'seribu' },
          null,
          'x',
        ]),
      ),
    );
    raw.journal['1'][2].debit = 1e300; // JSON tidak bisa membawa NaN/Infinity; 1e300 mewakili nilai tak wajar
    const r = migrateWithReport(raw)!;
    expect(r.state.journal['1']).toHaveLength(1);
    expect(r.dropped).toBe(6);
  });

  it('nominal pecahan dibulatkan dan kode kosong menjadi null', () => {
    const r = migrate(withJournal([{ id: 'a', code: '', debit: 10.6, credit: 0, memo: 5 }]))!;
    expect(r.journal['1'][0]).toMatchObject({ code: null, debit: 11, memo: '' });
  });

  it('kunci berbahaya (__proto__) tidak mencemari prototipe', () => {
    const raw = JSON.parse('{"version":1,"journal":{"__proto__":[{"code":"1-1100","debit":1,"credit":0}],"2":[]}}');
    const r = migrateWithReport(raw)!;
    expect(Object.keys(r.state.journal)).toEqual(['2']);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.getPrototypeOf(r.state.journal)).toBe(Object.prototype);
    expect(r.dropped).toBeGreaterThan(0);
  });

  it('penutupan, analisis, review, dan hitungan dibersihkan', () => {
    const raw = {
      ...emptyState(),
      closing: { '3-3000': { debit: 5, credit: 0 }, '9-0000': { debit: 1, credit: 0 }, '4-1000': { debit: 'x', credit: 0 } },
      analysis: { '1': { decision: 'Perlu jurnal', amount: Infinity, debit: 'a' }, '2': 'rusak' },
      review: { 'txn:1': { box: 99, due: 'kemarin' }, 'txn:2': { box: 2, due: '2026-01-01' } },
      hints: { 'txn:1': 99 },
    };
    const r = migrate(JSON.parse(JSON.stringify(raw)))!;
    expect(Object.keys(r.closing)).toEqual(['3-3000']);
    expect(r.analysis['1']).toEqual({ decision: 'Perlu jurnal', debit: 'a' });
    expect(r.analysis['2']).toBeUndefined();
    expect(Object.keys(r.review)).toEqual(['txn:2']);
    expect(r.hints['txn:1']).toBe(3);
  });

  it('parseBackup menolak berkas terlalu besar dan melaporkan isian yang dibuang', () => {
    expect(() => parseBackup('x'.repeat(MAX_BACKUP_BYTES + 1))).toThrow(/terlalu besar/);
    const b = makeBackup(withJournal([good(1), { ...good(2), code: 'zzz' }]) as never);
    expect(parseBackup(JSON.stringify(b)).dropped).toBe(1);
  });
});
