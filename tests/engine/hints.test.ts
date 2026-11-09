import { describe, expect, it } from 'vitest';
import { KEY } from '../../src/data';
import { hintTexts, maskCalc } from '../../src/ui/components/StudyAids';

const digits = (n: number) => n.toLocaleString('id-ID');

describe('tangga petunjuk tidak membocorkan nominal', () => {
  it('maskCalc membuang hasil setelah tanda =', () => {
    expect(maskCalc('(72.000.000 x 12/12) + 36.000.000 = 108.000.000')).toBe('(72.000.000 x 12/12) + 36.000.000 = …');
    expect(maskCalc('1.000.000')).toBe('…');
  });
  it('semua transaksi dan penyesuaian: petunjuk tidak memuat nominal baris jurnal', () => {
    const all = [
      ...KEY.readableTxn.map((t) => ({ lines: t.lines, topic: t.topic, calc: undefined as string | undefined })),
      ...KEY.readableAdj.map((a) => ({ lines: a.lines, topic: a.category, calc: a.calc ?? undefined })),
    ];
    for (const x of all) {
      const text = hintTexts(x.topic, x.lines, x.calc).join(' ');
      for (const l of x.lines) for (const n of [l.debit, l.credit]) if (n >= 1_000_000 && !x.topic.includes(digits(n))) expect(text).not.toContain(digits(n));
    }
  });
  it('tingkat 3 menyebut sisi baris pertama', () => {
    const t = KEY.readableTxn[0];
    expect(hintTexts(t.topic, t.lines)[2]).toMatch(/DEBIT|KREDIT/);
  });
  it('soal tanpa jurnal punya tiga petunjuk', () => {
    expect(hintTexts('X', [])).toHaveLength(3);
  });
});
