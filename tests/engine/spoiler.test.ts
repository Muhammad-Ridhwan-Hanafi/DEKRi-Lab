import { describe, expect, it } from 'vitest';
import raw from '../../data/transactions.json';
import { TRANSACTIONS } from '../../src/data';
import { buildIndex } from '../../src/ui/search';

describe('tidak ada penanda jawaban pada data yang tampil', () => {
  it('transaksi pengecoh memakai label netral (sumber memuat "Distractor: ...")', () => {
    const marked = raw.filter((t) => t.isDistractor);
    expect(marked).toHaveLength(11);
    expect(marked.some((t) => /distractor/i.test(t.topic))).toBe(true); // alasan netralisasi ini ada
    for (const t of TRANSACTIONS)
      expect(t.topic, `topik transaksi ${t.no}`).not.toMatch(/distractor|tidak perlu jurnal|tidak diakui|belum dinilai|belum berlaku|belum dibayar/i);
  });

  it('judul dan teks pencarian tidak memuat penanda', () => {
    for (const e of buildIndex().filter((x) => x.kind === 'Transaksi')) expect(e.hay).not.toMatch(/distractor/i);
  });
});
