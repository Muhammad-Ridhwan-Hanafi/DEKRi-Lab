import { describe, expect, it } from 'vitest';
import { KEY, TRANSACTIONS } from '../../src/data';
import { compareWithKey, diagnose, numbersIn } from '../../src/validation/feedback';

const L = (code: string, debit: number, credit: number) => ({ id: code + debit + credit, code, debit, credit, memo: '' });
const keyOf = (no: number) => {
  const t = KEY.readableTxn.find((x) => x.no === no)!;
  const net: Record<string, number> = {};
  for (const l of t.lines) net[l.code] = (net[l.code] ?? 0) + l.debit - l.credit;
  return net;
};
const kinds = (f: ReturnType<typeof diagnose>) => Object.fromEntries(f.verdicts.map((v) => [v.code, v.kind]));

describe('umpan balik spesifik per jenis kesalahan', () => {
  const key = keyOf(5); // Dr Utang 186jt; Kr Bank 182,28jt; Kr Persediaan 3,72jt
  it('jawaban benar: semua ok, tanpa konsep kesalahan', () => {
    const f = diagnose([L('2-1000', 186_000_000, 0), L('1-1100', 0, 182_280_000), L('1-1400', 0, 3_720_000)], key);
    expect(Object.values(kinds(f)).every((k) => k === 'ok')).toBe(true);
    expect(f.concepts).toEqual([]);
  });
  it('jurnal terbalik: wrong-side untuk semua akun dan penjelasan seluruh jurnal terbalik, menyebut saldo normal', () => {
    const f = diagnose([L('2-1000', 0, 186_000_000), L('1-1100', 182_280_000, 0), L('1-1400', 3_720_000, 0)], key);
    expect(Object.values(kinds(f))).toEqual(['wrong-side', 'wrong-side', 'wrong-side']);
    expect(f.concepts.join(' ')).toMatch(/seluruh jurnal terbalik/);
    expect(f.verdicts[0].note).toMatch(/liabilitas bersaldo normal kredit/);
  });
  it('tidak seimbang: menyebut arah dan besar selisih dari jawaban pengguna sendiri', () => {
    const f = diagnose([L('2-1000', 186_000_000, 0), L('1-1100', 0, 182_280_000)], key);
    expect(f.balance.diff).toBe(3_720_000);
    expect(f.concepts[0]).toMatch(/debit lebih besar Rp3\.720\.000/);
    expect(kinds(f)['1-1400']).toBe('missing');
  });
  it('akun sejenis keliru (Kas bukan Bank): extra + missing dijelaskan sebagai akun kurang spesifik', () => {
    const f = diagnose([L('2-1000', 186_000_000, 0), L('1-1000', 0, 182_280_000), L('1-1400', 0, 3_720_000)], key);
    expect(kinds(f)['1-1000']).toBe('extra');
    expect(kinds(f)['1-1100']).toBe('missing');
    expect(f.concepts.join(' ')).toMatch(/sama-sama akun aset/);
  });
  it('nominal mentah dari soal dipakai tanpa perhitungan dikenali', () => {
    const nums = numbersIn(TRANSACTIONS.find((t) => t.no === 5)!.amountInfo);
    expect(nums).toContain(186_000_000);
    const f = diagnose([L('2-1000', 186_000_000, 0), L('1-1100', 0, 186_000_000)], key, nums);
    expect(f.verdicts.find((v) => v.code === '1-1100')!.note).toMatch(/angka mentah yang tertulis di soal/);
  });
  it('nominal tertukar antar akun dikenali; salah hitung biasa disebut lebih besar/kecil', () => {
    const f = diagnose([L('2-1000', 186_000_000, 0), L('1-1100', 0, 3_720_000), L('1-1400', 0, 182_280_000)], key);
    expect(f.verdicts.find((v) => v.code === '1-1100')!.note).toMatch(/tertukar/);
    const g = diagnose([L('2-1000', 186_000_000, 0), L('1-1100', 0, 180_000_000), L('1-1400', 0, 6_000_000)], key);
    expect(g.verdicts.find((v) => v.code === '1-1100')!.note).toMatch(/lebih kecil/);
    expect(g.concepts.join(' ')).toMatch(/perlu diperbaiki adalah perhitungan nominal/);
  });
  it('aturan khusus kasus: HPP perpetual dan potongan penjualan hanya muncul saat relevan', () => {
    const sale = keyOf(6);
    const f = diagnose([L('1-1200', 180_000_000, 0), L('4-1000', 0, 180_000_000)], sale);
    expect(f.concepts.join(' ')).toMatch(/perpetual/);
    const disc = keyOf(10);
    const g = diagnose([L('1-1100', 180_000_000, 0), L('1-1200', 0, 180_000_000)], disc);
    expect(g.concepts.join(' ')).toMatch(/Potongan penjualan/);
    const h = diagnose([L('2-1000', 186_000_000, 0), L('1-1100', 0, 182_280_000), L('1-1400', 0, 3_720_000)], key);
    expect(h.concepts.join(' ')).not.toMatch(/perpetual|Potongan/);
  });
  it('tidak pernah menyebut nominal jawaban yang benar pada diagnosis', () => {
    const f = diagnose([L('2-1000', 186_000_000, 0), L('1-1100', 0, 180_000_000), L('1-1400', 0, 6_000_000)], key);
    const text = [...f.verdicts.map((v) => v.note), ...f.concepts].join(' ');
    expect(text).not.toContain('182.280.000');
    expect(text).not.toContain('3.720.000');
  });
  it('compareWithKey: sisi dan nominal pengguna vs kunci per akun', () => {
    const rows = compareWithKey([L('2-1000', 0, 186_000_000), L('1-1000', 5, 0)], key);
    const utang = rows.find((r) => r.code === '2-1000')!;
    expect(utang.user).toEqual({ side: 'K', amount: 186_000_000 });
    expect(utang.key).toEqual({ side: 'D', amount: 186_000_000 });
    expect(utang.match).toBe(false);
    expect(rows.find((r) => r.code === '1-1000')!.key).toBeNull();
    expect(rows.find((r) => r.code === '1-1100')!.user).toBeNull();
  });
  it('numbersIn membaca format titik dan polos', () => {
    expect(numbersIn('Rp186.000.000 dan 4200000, diskon 2%, 10 hari')).toEqual([186_000_000, 4_200_000]);
  });
});
