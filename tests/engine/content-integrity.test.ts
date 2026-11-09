import { describe, expect, it } from 'vitest';
import { COA, KEY } from '../../src/data';
import closingData from '../../data/closing-reversing.json';

const codes = new Set(COA.map((a) => a.code));

describe('integritas konten kunci (golden)', () => {
  it('setiap jurnal kunci transaksi dan penyesuaian seimbang dan memakai akun yang ada', () => {
    const groups: Array<[string, Array<{ id: string; lines: Array<{ code: string; debit: number; credit: number }> }>]> = [
      ['txn', KEY.readableTxn.map((t) => ({ id: String(t.no), lines: t.lines }))],
      ['adj', KEY.readableAdj.map((a) => ({ id: a.code, lines: a.lines }))],
    ];
    let n = 0;
    let skipped = 0;
    for (const [kind, items] of groups)
      for (const it of items) {
        if (it.lines.every((l) => !l.code || l.code === '-')) {
          skipped++; // transaksi pengecoh: memang tanpa jurnal
          continue;
        }
        const d = it.lines.reduce((t, l) => t + l.debit, 0);
        const c = it.lines.reduce((t, l) => t + l.credit, 0);
        expect(d, `${kind} ${it.id} seimbang`).toBe(c);
        for (const l of it.lines) {
          expect(codes.has(l.code), `${kind} ${it.id}: akun ${l.code}`).toBe(true);
          expect(l.debit >= 0 && l.credit >= 0 && Number.isFinite(l.debit + l.credit)).toBe(true);
        }
        n++;
      }
    expect(n + skipped).toBeGreaterThanOrEqual(147 + 28);
    expect(skipped).toBeLessThan(20);
  });

  it('seluruh baris penutup merujuk akun yang ada dan tanpa kode ganda', () => {
    const rows = closingData.closingRows.map((r) => r.code);
    expect(new Set(rows).size).toBe(rows.length);
    for (const c of rows) expect(codes.has(c), c).toBe(true);
  });
});
