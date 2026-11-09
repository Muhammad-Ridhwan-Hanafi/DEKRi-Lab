import { describe, expect, it } from 'vitest';
import { ACCOUNT_BY_CODE } from '../../src/data';
import { INDUSTRY_PACKS } from '../../src/data/industri';
import { packNet, parsePack } from '../../src/engine/casepack';

describe('paket soal berbagai industri', () => {
  it('tujuh industri dengan lebih dari seratus soal', () => {
    expect(INDUSTRY_PACKS.map((p) => p.id)).toEqual([
      'industri-jasa',
      'industri-dagang',
      'industri-manufaktur',
      'industri-restoran',
      'industri-konstruksi',
      'industri-pendidikan',
      'industri-transportasi',
    ]);
    expect(INDUSTRY_PACKS.reduce((t, p) => t + p.items.length, 0)).toBeGreaterThanOrEqual(100);
  });

  for (const pk of INDUSTRY_PACKS) {
    describe(pk.title, () => {
      const accs = Object.fromEntries((pk.accounts ?? []).map((a) => [a.code, a]));
      it('punya bagan akun sendiri yang tidak bentrok dengan kasus utama', () => {
        expect(pk.accounts!.length).toBeGreaterThan(10);
        for (const a of pk.accounts!) expect(ACCOUNT_BY_CODE[a.code]).toBeUndefined();
      });
      it('setiap akun dipakai dan setiap kunci jurnal seimbang', () => {
        const used = new Set<string>();
        for (const it of pk.items) {
          const d = it.lines.reduce((t, l) => t + l.debit, 0);
          const c = it.lines.reduce((t, l) => t + l.credit, 0);
          expect(d, it.id).toBe(c);
          for (const l of it.lines) used.add(l.code);
        }
        expect([...used].sort()).toEqual(Object.keys(accs).sort());
      });
      it('simulasi buku besar: saldo tidak pernah di sisi yang salah dan neraca saldo seimbang', () => {
        const bal: Record<string, number> = {};
        for (const it of pk.items) {
          for (const [code, n] of Object.entries(packNet(it))) bal[code] = (bal[code] ?? 0) + n;
          for (const [code, b] of Object.entries(bal)) {
            const a = accs[code];
            if (a.normal === 'Debit') expect(b, `${it.id} ${a.name}`).toBeGreaterThanOrEqual(0);
            else expect(b, `${it.id} ${a.name}`).toBeLessThanOrEqual(0);
          }
        }
        expect(Object.values(bal).reduce((t, n) => t + n, 0)).toBe(0);
      });
      it('soal berkode unik dan punya penjelasan', () => {
        expect(new Set(pk.items.map((i) => i.id)).size).toBe(pk.items.length);
        for (const it of pk.items) {
          expect(it.explain, it.id).toBeTruthy();
          expect(it.narrative.length, it.id).toBeGreaterThan(30);
        }
      });
    });
  }
});

describe('paket dengan bagan akun sendiri (validasi)', () => {
  const base = () => ({
    app: 'akuntansi-practice-pack',
    version: 1,
    id: 'p',
    title: 'P',
    accounts: [
      { code: 'ZZ-1', name: 'Kas', type: 'Asset', normal: 'Debit' },
      { code: 'ZZ-2', name: 'Modal', type: 'Equity', normal: 'Credit' },
    ],
    items: [
      {
        id: 'a',
        title: 't',
        narrative: 'n',
        lines: [
          { code: 'ZZ-1', debit: 5, credit: 0 },
          { code: 'ZZ-2', debit: 0, credit: 5 },
        ],
      },
    ],
  });
  const err = (m: unknown) => () => parsePack(JSON.stringify(m));
  it('menerima akun milik paket', () => {
    expect(parsePack(JSON.stringify(base())).accounts).toHaveLength(2);
  });
  it('menolak kode yang bentrok dengan kasus utama, ganda, tipe salah, atau sisi normal salah', () => {
    const a = base();
    a.accounts[0].code = '1-1000';
    expect(err(a)).toThrow(/bentrok/);
    const b = base();
    b.accounts[1].code = 'ZZ-1';
    expect(err(b)).toThrow(/dua kali/);
    const c = base();
    c.accounts[0].type = 'Lain';
    expect(err(c)).toThrow(/type/);
    const d = base();
    (d.accounts[0] as { normal: string }).normal = 'X';
    expect(err(d)).toThrow(/normal/);
  });
  it('menolak kunci yang memakai akun di luar paket dan bagan kasus', () => {
    const a = base();
    a.items[0].lines[0].code = 'ZZ-9';
    expect(err(a)).toThrow(/tidak ada di bagan akun/);
  });
});
