import { describe, expect, it } from 'vitest';
import { KEY } from '../../src/data';
import { PATTERNS, generate, parseId, type Pattern } from '../../src/engine/variants';
import { gradeJournal } from '../../src/validation/grade';

const asLines = (v: ReturnType<typeof generate>) => v.lines.map((l, i) => ({ id: `k${i}`, code: l.code, debit: l.debit, credit: l.credit, memo: '' }));

describe('soal varian berbenih', () => {
  it('benih sama menghasilkan soal sama; benih berbeda menghasilkan angka berbeda', () => {
    for (const { pattern } of PATTERNS) {
      expect(generate(pattern, 5)).toEqual(generate(pattern, 5));
      const set = new Set(Array.from({ length: 12 }, (_, s) => JSON.stringify(generate(pattern, s).net)));
      expect(set.size).toBeGreaterThan(6);
    }
  });
  it('200 benih x semua pola: jurnal seimbang, bilangan bulat positif, narasi memuat nominal', () => {
    for (const { pattern } of PATTERNS)
      for (let s = 0; s < 200; s++) {
        const v = generate(pattern, s);
        const d = v.lines.reduce((t, l) => t + l.debit, 0);
        const c = v.lines.reduce((t, l) => t + l.credit, 0);
        expect(d).toBe(c);
        for (const l of v.lines) {
          expect(Number.isInteger(l.debit) && Number.isInteger(l.credit)).toBe(true);
          expect(l.debit >= 0 && l.credit >= 0).toBe(true);
          expect(l.debit === 0 || l.credit === 0).toBe(true);
        }
        expect(Object.values(v.net).reduce((t, x) => t + x, 0)).toBe(0);
        expect(v.narrative).toMatch(/Rp[\d.]+/);
      }
  });
  it('kunci sendiri dinilai BENAR; sisi terbalik dan nominal salah dinilai PERIKSA', () => {
    for (const { pattern } of PATTERNS) {
      const v = generate(pattern, 3);
      expect(gradeJournal(asLines(v), v.net).status).toBe('BENAR');
      const flipped = asLines(v).map((l) => ({ ...l, debit: l.credit, credit: l.debit }));
      expect(gradeJournal(flipped, v.net).status).toBe('PERIKSA');
      const off = asLines(v);
      off[0] = { ...off[0], debit: off[0].debit + 1_000_000 * 3, credit: off[0].credit };
      expect(gradeJournal(off, v.net).status).toBe('PERIKSA');
    }
  });
  it('struktur akun pola kasus sama dengan transaksi/penyesuaian asli di kunci workbook', () => {
    const codes = (no: number) =>
      KEY.readableTxn
        .find((t) => t.no === no)!
        .lines.map((l) => l.code)
        .sort();
    const vc = (p: Pattern) =>
      generate(p, 1)
        .lines.map((l) => l.code)
        .sort();
    expect(vc('beli-kredit')).toEqual(codes(3));
    expect(vc('jual-tunai')).toEqual(codes(4));
    expect(vc('bayar-utang-diskon')).toEqual(codes(5));
    expect(vc('jual-kredit')).toEqual(codes(6));
    expect(vc('terima-piutang-diskon')).toEqual(codes(10));
    expect(vc('penyusutan')).toEqual(
      KEY.readableAdj
        .find((a) => a.code === 'AJ06')!
        .lines.map((l) => l.code)
        .sort(),
    );
  });
  it('hitungan diskon dan pajak benar', () => {
    for (let s = 0; s < 50; s++) {
      const p = generate('ppn-beli', s);
      expect(p.net['1-1850']).toBe(Math.round(p.net['1-1400'] * 0.11));
      const j = generate('ppn-jual', s);
      expect(j.net['2-1550']).toBe(-Math.round(-j.net['4-1000'] * 0.11));
      const w = generate('pph23-jasa', s);
      expect(-w.net['2-1560']).toBe(Math.round(w.net['6-2100'] * 0.02));
    }
  });
  it('hanya pola pajak yang bertanda tax', () => {
    expect(
      PATTERNS.filter((p) => p.tax)
        .map((p) => p.pattern)
        .sort(),
    ).toEqual(['pph23-jasa', 'ppn-beli', 'ppn-jual']);
  });
  it('parseId menolak id tidak valid', () => {
    expect(parseId('beli-kredit:7')).toEqual({ pattern: 'beli-kredit', seed: 7 });
    expect(parseId('x:1')).toBeNull();
    expect(parseId('beli-kredit:abc')).toBeNull();
  });
});
