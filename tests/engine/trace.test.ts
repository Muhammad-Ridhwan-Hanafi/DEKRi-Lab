import { describe, expect, it } from 'vitest';
import { ACCOUNT_BY_CODE } from '../../src/data';
import { buildTraceIndex } from '../../src/engine/trace';
import { keyLedgerInput } from '../helpers';

const input = keyLedgerInput();
const t0 = performance.now();
const index = buildTraceIndex(input);
const ms = performance.now() - t0;

describe('penelusuran angka laporan ke jurnal', () => {
  it('cukup cepat untuk dipakai saat klik', () => {
    expect(index.runs).toBeGreaterThan(100);
    expect(ms).toBeLessThan(8000);
  });

  it('laba bersih dibentuk oleh baris akun laba rugi saja, dengan arah yang benar', () => {
    const lines = index.byCell.get('S12_B53')!;
    expect(lines.length).toBeGreaterThan(20);
    expect(lines.some((l) => l.source === 'txn')).toBe(true);
    expect(lines.some((l) => l.source === 'adj')).toBe(true);
    expect(lines.some((l) => l.source === 'opening')).toBe(false);
    for (const l of lines) {
      expect(['Revenue', 'Expense']).toContain(ACCOUNT_BY_CODE[l.code].type);
      expect(l.effect > 0).toBe(l.side === 'K'); // kredit menaikkan laba, debit menurunkan
    }
  });

  it('total aset memuat saldo awal dan hanya akun aset yang bersisi debit menaikkannya', () => {
    const lines = index.byCell.get('S14_B31')!;
    expect(lines.some((l) => l.source === 'opening')).toBe(true);
    expect(lines.length).toBeGreaterThan(20);
    for (const l of lines) expect(ACCOUNT_BY_CODE[l.code].type).toBe('Asset');
  });

  it('arus kas operasi ditelusuri ke transaksi bukan ke saldo awal', () => {
    const lines = index.byCell.get('S15_B28')!;
    expect(lines.length).toBeGreaterThan(5);
  });

  it('tanpa jawaban, hanya saldo awal yang dapat ditelusuri', () => {
    const empty = buildTraceIndex({ ...input, journal: [], adjusting: [] });
    for (const lines of empty.byCell.values()) for (const l of lines) expect(l.source).toBe('opening');
  });
});
