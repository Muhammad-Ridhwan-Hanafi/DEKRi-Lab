import { describe, expect, it } from 'vitest';
import { calculate, formatCalc } from '../../src/engine/calc';

const v = (s: string) => {
  const r = calculate(s);
  if (!r.ok) throw new Error(r.error);
  return r.value;
};
const err = (s: string) => {
  const r = calculate(s);
  return r.ok ? null : r.error;
};

describe('kalkulator', () => {
  it('aritmetika dasar dan prioritas operator', () => {
    expect(v('1+2*3')).toBe(7);
    expect(v('(1+2)*3')).toBe(9);
    expect(v('10-4-3')).toBe(3);
    expect(v('100/4/5')).toBe(5);
    expect(v('-5+8')).toBe(3);
    expect(v('2*-3')).toBe(-6);
    expect(v('--4')).toBe(4);
  });
  it('format angka Indonesia: titik ribuan, koma desimal', () => {
    expect(v('1.250.000+750.000')).toBe(2000000);
    expect(v('1.250.000,5*2')).toBe(2500001);
    expect(v('2,5*4')).toBe(10);
    expect(v('2.5*4')).toBe(10); // titik yang bukan kelompok ribuan dibaca desimal
    expect(v('1.500')).toBe(1500);
  });
  it('persen dan operator alternatif', () => {
    expect(v('200.000.000*2%')).toBe(4000000);
    expect(v('50%')).toBe(0.5);
    expect(v('3x4')).toBe(12);
    expect(v('12:4')).toBe(3);
    expect(v('(36.000.000/12)*5')).toBe(15000000);
  });
  it('contoh akuntansi: penyusutan garis lurus dan diskon', () => {
    expect(v('(120.000.000-12.000.000)/5/12*3')).toBe(5400000);
    expect(v('186.000.000*2%')).toBe(3720000);
  });
  it('galat dikembalikan, tidak dilempar', () => {
    expect(err('1/0')).toMatch(/nol/);
    expect(err('1+')).toMatch(/belum lengkap/);
    expect(err('(1+2')).toMatch(/kurung/i);
    expect(err('1+2)')).toMatch(/kurung|tidak lengkap/i);
    expect(err('abc')).toMatch(/tidak dikenal/);
    expect(err('1..2')).toMatch(/tidak valid/);
    expect(err('')).toBe('Kosong.');
    expect(err('1'.repeat(300))).toMatch(/panjang/);
  });
  it('tidak mengeksekusi kode: karakter selain angka/operator ditolak', () => {
    for (const s of ['alert(1)', 'process.exit()', '1;2', 'constructor', '`1`', '1e3']) expect(calculate(s).ok).toBe(false);
  });
  it('angka sangat besar tidak membuat galat dan hasil selalu berhingga', () => {
    const r = calculate('9'.repeat(150) + '*' + '9'.repeat(30));
    expect(r.ok && Number.isFinite(r.value)).toBe(true);
  });
  it('format hasil', () => {
    expect(formatCalc(1250000)).toBe('1.250.000');
    expect(formatCalc(2.5)).toBe('2,5');
    expect(formatCalc(1 / 3)).toBe('0,3333');
  });
});
