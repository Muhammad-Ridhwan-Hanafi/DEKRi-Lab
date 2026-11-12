import { describe, expect, it } from 'vitest';
import { ACCOUNT_BY_CODE, KEY } from '../../src/data';
import { explainJournal, explainLine } from '../../src/engine/explain';

const lookup = (c: string) => ACCOUNT_BY_CODE[c];

describe('penjelasan kunci', () => {
  it('aset bertambah di debit, modal bertambah di kredit; tanpa langkah keseimbangan', () => {
    const t = KEY.readableTxn.find((x) => x.no === 1)!;
    const steps = explainJournal(t.lines, lookup, { topic: t.topic, explain: t.explain });
    expect(steps.map((s) => s.title)).toEqual(['Intinya', 'Mengapa dicatat begini', 'Ingat']);
    const items = steps[1].items!;
    expect(items[0]).toBe('Debit — Bank Arunika: aset bertambah.');
    expect(items[1]).toBe('Kredit — Modal Saham: ekuitas bertambah.');
    expect(JSON.stringify(steps)).not.toMatch(/keseimbangan/i);
  });

  it('akun pengurang dan arah berkurang dijelaskan', () => {
    const contra = Object.values(ACCOUNT_BY_CODE).find((a) => a.type === 'Asset' && a.normal === 'Credit')!;
    expect(explainLine({ code: contra.code, debit: 0, credit: 1000 }, contra)).toMatch(/^Kredit — .*: akun pengurang aset bertambah\.$/);
    const kas = ACCOUNT_BY_CODE['1-1100'];
    expect(explainLine({ code: kas.code, debit: 0, credit: 5 }, kas)).toMatch(/aset berkurang\.$/);
  });

  it('semua soal inti menghasilkan penjelasan tanpa NaN/undefined; tanpa jurnal diberi alasan', () => {
    const all = [...KEY.readableTxn.map((t) => ({ ...t, calc: null as string | null })), ...KEY.readableAdj.map((a) => ({ ...a, topic: a.category }))];
    for (const t of all) {
      const steps = explainJournal(t.lines, lookup, { topic: 'topic' in t ? (t.topic as string) : null, explain: t.explain, calc: t.calc });
      expect(JSON.stringify(steps)).not.toMatch(/NaN|undefined|null/);
      const n = t.lines.filter((l) => l.debit || l.credit).length;
      if (!n) expect(steps[0].title).toBe('Mengapa tidak dijurnal');
      else expect(steps.find((s) => s.title === 'Mengapa dicatat begini')!.items).toHaveLength(n);
    }
  });
});
