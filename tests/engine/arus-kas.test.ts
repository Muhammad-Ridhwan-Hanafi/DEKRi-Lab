import { describe, expect, it } from 'vitest';
import { KAS_KELOMPOK, KAS_SOAL } from '../../src/data/arus-kas';
import { SCENARIOS } from '../../src/data';

describe('latihan klasifikasi arus kas (7A dan 7B)', () => {
  it('terpisah dari skenario inti dan punya id unik', () => {
    expect(SCENARIOS).toHaveLength(26);
    expect(new Set(KAS_SOAL.map((q) => q.id)).size).toBe(KAS_SOAL.length);
  });
  it('setiap soal punya kunci valid, alasan untuk semua opsi, penjelasan, dan dasar bertanda cek', () => {
    for (const q of KAS_SOAL) {
      expect(q.kunci, q.id).toBeGreaterThanOrEqual(0);
      expect(q.kunci, q.id).toBeLessThan(q.opsi.length);
      for (const o of q.opsi) expect(o.alasan.length, q.id).toBeGreaterThan(10);
      expect(q.opsi[q.kunci].alasan, q.id).toMatch(/^Benar/);
      q.opsi.forEach((o, i) => i !== q.kunci && expect(o.alasan, q.id).toMatch(/^Salah/));
      expect(q.dasar, q.id).toMatch(/PSAK 207/);
      expect(q.dasar, q.id).toMatch(/cek/);
    }
  });
  it('kelompok tidak dicampur: 7B menyebut 1 Januari 2027, 7A tidak memakai aturan 2027', () => {
    for (const q of KAS_SOAL.filter((x) => x.kelompok === '7B')) expect(q.narasi, q.id).toMatch(/1 Januari 2027/);
    for (const q of KAS_SOAL.filter((x) => x.kelompok === '7A')) expect(q.narasi + q.pertanyaan, q.id).not.toMatch(/PSAK 118/);
    expect(KAS_KELOMPOK['7B'].periode).toMatch(/1 Januari 2027/);
    expect(KAS_SOAL.filter((q) => q.kelompok === '7A').length).toBeGreaterThanOrEqual(4);
    expect(KAS_SOAL.filter((q) => q.kelompok === '7B').length).toBeGreaterThanOrEqual(5);
  });
  it('default 2027: bunga dibayar pendanaan, bunga dan dividen diterima investasi, dividen dibayar pendanaan', () => {
    const jawab = (id: string) => {
      const q = KAS_SOAL.find((x) => x.id === id)!;
      return q.opsi[q.kunci].teks;
    };
    expect(jawab('7B-1')).toBe('Pendanaan');
    expect(jawab('7B-2')).toBe('Investasi');
    expect(jawab('7B-3')).toBe('Investasi');
    expect(jawab('7B-4')).toBe('Pendanaan');
  });
});
