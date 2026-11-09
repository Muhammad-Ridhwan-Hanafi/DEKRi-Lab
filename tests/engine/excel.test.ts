import { describe, expect, it } from 'vitest';
import { div, iferror, sumifs, xround } from '../../src/engine/excel';
import { formatRupiah, parseRupiah } from '../../src/engine/money';

describe('xround meniru Excel ROUND', () => {
  it('setengah menjauhi nol, termasuk negatif', () => {
    expect(xround(2.5)).toBe(3);
    expect(xround(-2.5)).toBe(-3);
    expect(xround(0.5)).toBe(1);
    expect(xround(-0.5)).toBe(-1);
    expect(xround(1.4999)).toBe(1);
    expect(xround(-1.4999)).toBe(-1);
  });
  it('Math.round berbeda untuk -2,5 (alasan fungsi ini ada)', () => {
    expect(Math.round(-2.5)).toBe(-2);
    expect(xround(-2.5)).not.toBe(Math.round(-2.5));
  });
  it('digit desimal dan kasus pecahan biner', () => {
    expect(xround(1.005, 2)).toBe(1.01);
    expect(xround(2.675, 2)).toBe(2.68);
    expect(xround(1234.5678, 2)).toBe(1234.57);
  });
  it('tidak menghasilkan -0', () => {
    expect(Object.is(xround(-0.2), 0)).toBe(true);
  });
});

describe('fungsi Excel lain', () => {
  it('div dan iferror', () => {
    expect(
      iferror(
        () => div(1, 0),
        () => 7,
      ),
    ).toBe(7);
    expect(
      iferror(
        () => div(6, 3),
        () => 7,
      ),
    ).toBe(2);
  });
  it('sumifs: kriteria sama, wildcard, operator', () => {
    const t = [
      { A: 'x', K: 'Investasi: perolehan', V: 10 },
      { A: 'X', K: 'Operasi', V: 5 },
      { A: 'y', K: 'Investasi: hasil', V: 2 },
    ];
    expect(sumifs(t, 'V', [['A', 'x']])).toBe(15); // tidak peka huruf besar-kecil
    expect(sumifs(t, 'V', [['K', 'Investasi*']])).toBe(12);
    expect(sumifs(t, 'V', [['V', '>4']])).toBe(15);
  });
});

describe('format rupiah', () => {
  it('format dan baca isian', () => {
    expect(formatRupiah(1234567)).toBe('1.234.567');
    expect(formatRupiah(-1500, true)).toBe('(1.500)');
    expect(parseRupiah('1.250.000')).toBe(1250000);
    expect(parseRupiah('')).toBe(0);
    expect(parseRupiah('abc')).toBe(0);
  });
});
