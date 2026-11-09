import { describe, expect, it } from 'vitest';
import { SCENARIOS } from '../../src/data';
import { MATERI, babOfScenario, scenariosOfBab } from '../../src/data/materi';

describe('materi BAB', () => {
  it('setiap BAB yang dipakai skenario punya ringkasan', () => {
    const used = new Set(SCENARIOS.map((s) => babOfScenario(s.no)).filter((b): b is number => b !== null));
    for (const b of used)
      expect(
        MATERI.some((m) => m.bab === b),
        `BAB ${b}`,
      ).toBe(true);
  });
  it('setiap ringkasan lengkap dan BAB unik', () => {
    expect(new Set(MATERI.map((m) => m.bab)).size).toBe(MATERI.length);
    for (const m of MATERI) {
      expect(m.ringkas.length).toBeGreaterThan(40);
      expect(m.jurnal.length).toBeGreaterThan(0);
      expect(m.rumus.length).toBeGreaterThan(0);
      expect(m.jebakan.length).toBeGreaterThan(0);
    }
  });
  it('skenario terkait dikelompokkan benar (BAB 9 punya 4, ekstensi kurs tanpa BAB)', () => {
    expect(scenariosOfBab(9)).toHaveLength(4);
    expect(babOfScenario(25)).toBeNull();
    expect(scenariosOfBab(10).length).toBe(2);
  });
});
