import { describe, expect, it } from 'vitest';
import { ACCOUNT_BY_CODE, KEY } from '../../src/data';
import { explainJournal, explainLine } from '../../src/engine/explain';

const lookup = (c: string) => ACCOUNT_BY_CODE[c];

describe('penjelasan kunci langkah demi langkah', () => {
  it('aset bertambah di debit, modal bertambah di kredit', () => {
    const t = KEY.readableTxn.find((x) => x.no === 1)!;
    const steps = explainJournal(t.lines, lookup, { topic: t.topic, explain: t.explain });
    const items = steps.find((s) => s.title.startsWith('Akun'))!.items!;
    expect(items[0]).toMatch(/^DEBIT Rp400\.000\.000: Bank Arunika \(aset\) bertambah.*dicatat di sisi debit/);
    expect(items[1]).toMatch(/^KREDIT Rp400\.000\.000: Modal Saham \(ekuitas\) bertambah.*dicatat di sisi kredit/);
    expect(steps.some((s) => s.title === 'Periksa keseimbangan' && /sama dengan/.test(s.body ?? ''))).toBe(true);
  });

  it('akun pengurang (kontra) dijelaskan sebagai akun pengurang', () => {
    const contra = Object.values(ACCOUNT_BY_CODE).find((a) => a.type === 'Asset' && a.normal === 'Credit')!;
    const txt = explainLine({ code: contra.code, debit: 0, credit: 1000 }, contra);
    expect(txt).toMatch(/akun pengurang/);
    expect(txt).toMatch(/^KREDIT Rp1\.000: .*bertambah\..*dicatat di sisi kredit/);
  });

  it('semua soal inti menghasilkan penjelasan lengkap tanpa NaN/undefined', () => {
    const all = [...KEY.readableTxn.map((t) => ({ ...t, calc: null as string | null })), ...KEY.readableAdj.map((a) => ({ ...a, topic: a.category }))];
    for (const t of all) {
      const steps = explainJournal(t.lines, lookup, { topic: 'topic' in t ? (t.topic as string) : null, explain: t.explain, calc: t.calc });
      const text = JSON.stringify(steps);
      expect(text).not.toMatch(/NaN|undefined|null/);
      const n = t.lines.filter((l) => l.debit || l.credit).length;
      if (!n) {
        expect(steps.some((s) => s.title === 'Mengapa tidak ada jurnal')).toBe(true);
        continue;
      }
      const items = steps.find((s) => s.title.startsWith('Akun'))!.items!;
      expect(items).toHaveLength(n);
      expect(steps.find((s) => s.title === 'Periksa keseimbangan')!.body).toMatch(/sama dengan/);
    }
  });
});
