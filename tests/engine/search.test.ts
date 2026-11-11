import { describe, expect, it } from 'vitest';
import { KEY } from '../../src/data';
import { buildIndex, search } from '../../src/ui/search';

const index = buildIndex();

describe('pencarian global', () => {
  it('mencakup transaksi, akun, penyesuaian, skenario, kebijakan, dan SAK', () => {
    const kinds = new Set(index.map((e) => e.kind));
    for (const k of ['Transaksi', 'Akun', 'Penyesuaian', 'Skenario', 'Kasus', 'SAK']) expect(kinds.has(k as never)).toBe(true);
    expect(index.filter((e) => e.kind === 'Transaksi')).toHaveLength(147);
    expect(index.filter((e) => e.kind === 'Akun')).toHaveLength(84);
  });

  it('semua kata harus cocok dan judul diprioritaskan', () => {
    const r = search(index, 'bank arunika');
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((e) => e.hay.includes('bank') && e.hay.includes('arunika'))).toBe(true);
    expect(search(index, '1-1100')[0].href).toBe('buku-besar/1-1100');
    expect(search(index, '')).toEqual([]);
    expect(search(index, 'zzzxxqq')).toEqual([]);
  });

  it('tidak membocorkan kunci jawaban', () => {
    const hay = index.map((e) => e.hay).join('\n');
    for (const t of KEY.readableTxn.slice(0, 40)) if (t.explain) expect(hay.includes(t.explain.toLowerCase())).toBe(false);
    for (const a of KEY.readableAdj) if (a.calc && a.calc.length > 40) expect(hay.includes(a.calc.toLowerCase())).toBe(false);
    for (const s of Object.values(KEY.scenario)) if (s.explanation.length > 40) expect(hay.includes(s.explanation.toLowerCase())).toBe(false);
  });
});
