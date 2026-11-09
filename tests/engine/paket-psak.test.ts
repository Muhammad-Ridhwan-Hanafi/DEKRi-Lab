import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { packNet, parsePack } from '../../src/engine/casepack';

const load = (f: string) => parsePack(readFileSync(new URL(`../../data/paket-psak/${f}`, import.meta.url), 'utf8'));
const M = 1_000_000;

describe('paket soal PSAK 216 (dimuat lewat Paket soal JSON)', () => {
  const a = load('psak216-aset-tetap.json');
  const b = load('psak216-lanjutan.json');

  it('lolos validasi parsePack dan setiap soal punya penjelasan serta dasar PSAK', () => {
    for (const it of [...a.items, ...b.items]) {
      expect(it.explain, it.id).toMatch(/Dasar: PSAK/);
      expect(it.explain, it.id).toMatch(/Asumsi/);
    }
  });
  it('paket lanjutan memakai bagan akun sendiri dan semua akunnya dipakai', () => {
    const used = new Set(b.items.flatMap((i) => i.lines.map((l) => l.code)));
    expect([...used].sort()).toEqual(b.accounts!.map((x) => x.code).sort());
  });
  it('pertukaran dengan substansi komersial: aset baru 45 dan keuntungan 10; tanpa substansi: 33 tanpa laba/rugi', () => {
    const n1 = packNet(a.items[0]);
    expect(n1['1-2400']).toBe(-75 * M); // +45 - 120
    expect(n1['4-8500']).toBe(-10 * M);
    const n2 = packNet(a.items[1]);
    expect(n2['1-2400']).toBe(-87 * M); // +33 - 120
    expect(Object.keys(n2).some((c) => c.startsWith('4-') || c.startsWith('7-'))).toBe(false);
  });
  it('penyusutan per komponen = 20 + 20 = 40, bukan 300/10', () => {
    expect(packNet(a.items[2])['6-1600']).toBe(40 * M);
  });
  it('kompensasi asuransi dan kerugian dicatat terpisah (tidak dinetokan)', () => {
    const n = packNet(b.items[0]);
    expect(n['AT-5100']).toBe(50 * M);
    expect(n['AT-4100']).toBe(-45 * M);
    expect(n['AT-1100']).toBe(45 * M);
  });
  it('revaluasi: surplus 150 (tanah) dan 120 (bangunan, bersih bangunan turun 80)', () => {
    expect(packNet(b.items[1])['AT-3100']).toBe(-150 * M);
    const n = packNet(b.items[2]);
    expect(n['AT-3100']).toBe(-120 * M);
    expect(n['AT-1300']).toBe(-80 * M);
    expect(n['AT-1310']).toBe(200 * M);
  });
});
