import { describe, expect, it } from 'vitest';
import { EXAMPLE_PACK, packNet, parsePack } from '../../src/engine/casepack';

const ok = () => JSON.parse(JSON.stringify(EXAMPLE_PACK));
const err = (m: unknown) => () => parsePack(JSON.stringify(m));

describe('paket soal JSON', () => {
  it('contoh resmi valid', () => {
    const p = parsePack(JSON.stringify(EXAMPLE_PACK));
    expect(p.items).toHaveLength(1);
    expect(packNet(p.items[0])).toEqual({ '1-1100': 100000000, '3-1000': -100000000 });
  });
  it('menolak yang bukan JSON, bukan paket, atau versi lain', () => {
    expect(() => parsePack('{')).toThrow(/JSON/);
    expect(err({ a: 1 })).toThrow(/bukan paket/);
    expect(err({ ...ok(), version: 2 })).toThrow(/Versi/);
  });
  it('menolak id jelek, kosong, dan terlalu banyak soal', () => {
    expect(err({ ...ok(), id: 'Huruf Besar' })).toThrow(/id/);
    expect(err({ ...ok(), items: [] })).toThrow(/tidak berisi/);
    expect(err({ ...ok(), items: Array.from({ length: 201 }, (_, i) => ({ ...ok().items[0], id: `x${i}` })) })).toThrow(/200/);
  });
  it('menolak jurnal tidak seimbang, akun tidak dikenal, nominal tidak valid, id ganda', () => {
    const m = ok();
    m.items[0].lines[1].credit = 5;
    expect(err(m)).toThrow(/tidak seimbang/);
    const a = ok();
    a.items[0].lines[0].code = '9-9999';
    expect(err(a)).toThrow(/tidak ada di bagan akun/);
    const n = ok();
    n.items[0].lines[0].debit = -1;
    expect(err(n)).toThrow(/bilangan bulat/);
    const both = ok();
    both.items[0].lines[0].credit = 1;
    expect(err(both)).toThrow(/salah satu sisi/);
    const d = ok();
    d.items.push({ ...d.items[0] });
    expect(err(d)).toThrow(/dipakai dua kali/);
  });
  it('akun ekstensi pajak diterima', () => {
    const m = ok();
    m.items[0].lines = [
      { code: '1-1850', debit: 11, credit: 0 },
      { code: '2-1550', debit: 0, credit: 11 },
    ];
    expect(parsePack(JSON.stringify(m)).items[0].lines).toHaveLength(2);
  });
});
