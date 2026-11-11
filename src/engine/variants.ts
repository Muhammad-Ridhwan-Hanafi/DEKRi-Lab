import { xround } from './excel';

/**
 * Soal varian berbenih. Setiap pola membuat narasi, angka, dan kunci dari fungsi murni (bukan dari workbook),
 * dan benih yang sama selalu menghasilkan soal yang sama. Metode mengikuti kasus: perpetual, pembelian gross.
 */
export type Pattern =
  'beli-kredit' | 'bayar-utang-diskon' | 'jual-kredit' | 'jual-tunai' | 'terima-piutang-diskon' | 'penyusutan' | 'ppn-beli' | 'ppn-jual' | 'pph23-jasa';

export interface KeyLine {
  code: string;
  name: string;
  debit: number;
  credit: number;
}
export interface Variant {
  id: string; // `${pattern}:${seed}`
  pattern: Pattern;
  tax: boolean;
  title: string;
  narrative: string;
  lines: KeyLine[];
  /** saldo neto per akun (debit positif), dasar penilaian */
  net: Record<string, number>;
  explain: string;
}

export const PATTERNS: Array<{ pattern: Pattern; title: string; tax: boolean }> = [
  { pattern: 'beli-kredit', title: 'Pembelian barang dagang secara kredit (syarat diskon)', tax: false },
  { pattern: 'bayar-utang-diskon', title: 'Pelunasan utang dalam periode diskon', tax: false },
  { pattern: 'jual-kredit', title: 'Penjualan kredit dengan HPP', tax: false },
  { pattern: 'jual-tunai', title: 'Penjualan tunai dengan HPP', tax: false },
  { pattern: 'terima-piutang-diskon', title: 'Penerimaan piutang dengan potongan penjualan', tax: false },
  { pattern: 'penyusutan', title: 'Penyusutan garis lurus', tax: false },
  { pattern: 'ppn-beli', title: 'Pembelian kredit dengan PPN masukan', tax: true },
  { pattern: 'ppn-jual', title: 'Penjualan kredit dengan PPN keluaran', tax: true },
  { pattern: 'pph23-jasa', title: 'Beban jasa dengan pemotongan PPh 23', tax: true },
];

export function mulberry32(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NAMES: Record<string, string> = {
  '1-1100': 'Bank Arunika',
  '1-1400': 'Persediaan Barang Dagang',
  '1-1800': 'Pajak Dibayar di Muka (PPh 25)',
  '2-1000': 'Utang Usaha',
  '2-1500': 'Utang Pajak Penghasilan',
  '2-1550': 'Utang PPN (PPN Keluaran)',
  '1-1850': 'PPN Masukan',
  '4-1000': 'Penjualan',
  '4-1200': 'Potongan Penjualan',
  '5-1000': 'Harga Pokok Penjualan',
  '6-1400': 'Beban Penyusutan Bangunan',
  '1-2210': 'Akumulasi Penyusutan Bangunan',
  '6-2100': 'Beban Pemeliharaan & Perbaikan',
  '2-1560': 'Utang PPh 23',
};
NAMES['1-1200'] = 'Piutang Usaha';

const rp = (n: number) => 'Rp' + n.toLocaleString('id-ID');
const pick = <T>(r: () => number, xs: readonly T[]) => xs[Math.floor(r() * xs.length)];
/** kelipatan `step` dalam [lo, hi] */
const amt = (r: () => number, lo: number, hi: number, step: number) => lo + Math.floor(r() * ((hi - lo) / step + 1)) * step;

function mk(pattern: Pattern, seed: number, title: string, tax: boolean, narrative: string, raw: Array<[string, number, number]>, explain: string): Variant {
  const lines = raw.filter(([, d, c]) => d || c).map(([code, debit, credit]) => ({ code, name: NAMES[code] ?? code, debit, credit }));
  const net: Record<string, number> = {};
  for (const l of lines) net[l.code] = (net[l.code] ?? 0) + l.debit - l.credit;
  return { id: `${pattern}:${seed}`, pattern, tax, title, narrative, lines, net, explain };
}

const SUPPLIERS = ['PT Komponen Nusantara', 'CV Kabel Sentosa', 'PT Elektro Prima Utama', 'UD Sumber Daya Listrik'];
const CUSTOMERS = ['PT Bangun Cipta Elektrik', 'Toko Elektronik Makmur Jaya', 'PT Retail Elektronik Sentosa', 'Toko Ritel Lestari'];
const BANKS = ['Bank Arunika'];

export function generate(pattern: Pattern, seed: number): Variant {
  const r = mulberry32(seed * 7919 + PATTERNS.findIndex((p) => p.pattern === pattern) * 104729 + 13);
  const meta = PATTERNS.find((p) => p.pattern === pattern)!;
  const disc = pick(r, [1, 2, 3]);
  switch (pattern) {
    case 'beli-kredit': {
      const v = amt(r, 40_000_000, 400_000_000, 1_000_000);
      return mk(
        pattern,
        seed,
        meta.title,
        false,
        `Perusahaan membeli barang dagang dari ${pick(r, SUPPLIERS)} secara kredit. Harga faktur ${rp(v)}, syarat ${disc}/10, n/30. Perusahaan memakai metode perpetual dan mencatat pembelian sebesar harga faktur (gross).`,
        [
          ['1-1400', v, 0],
          ['2-1000', 0, v],
        ],
        'Perpetual gross: Persediaan bertambah sebesar faktur dan utang diakui sebesar faktur. Diskon baru dicatat saat pelunasan.',
      );
    }
    case 'bayar-utang-diskon': {
      const v = amt(r, 40_000_000, 400_000_000, 1_000_000);
      const d = xround((v * disc) / 100, 0);
      return mk(
        pattern,
        seed,
        meta.title,
        false,
        `Perusahaan melunasi utang usaha faktur ${rp(v)} kepada ${pick(r, SUPPLIERS)} via ${BANKS[0]}. Syarat ${disc}/10, n/30, dan pembayaran dilakukan dalam periode diskon. Metode perpetual, pembelian dicatat gross.`,
        [
          ['2-1000', v, 0],
          ['1-1100', 0, v - d],
          ['1-1400', 0, d],
        ],
        `Diskon ${disc}% x ${rp(v)} = ${rp(d)} mengurangi Persediaan; kas keluar ${rp(v - d)}.`,
      );
    }
    case 'jual-kredit': {
      const v = amt(r, 50_000_000, 500_000_000, 1_000_000);
      const cost = xround((v * amt(r, 55, 75, 5)) / 100, 0);
      return mk(
        pattern,
        seed,
        meta.title,
        false,
        `Perusahaan menjual barang secara kredit kepada ${pick(r, CUSTOMERS)} dengan harga faktur ${rp(v)}, syarat ${disc}/10, n/30. Menurut kartu persediaan, harga pokok barang yang dijual ${rp(cost)}. Metode perpetual.`,
        [
          ['1-1200', v, 0],
          ['4-1000', 0, v],
          ['5-1000', cost, 0],
          ['1-1400', 0, cost],
        ],
        'Dua pasang jurnal: pendapatan dan piutang sebesar faktur, serta HPP dan persediaan sebesar biaya.',
      );
    }
    case 'jual-tunai': {
      const v = amt(r, 30_000_000, 300_000_000, 1_000_000);
      const cost = xround((v * amt(r, 55, 75, 5)) / 100, 0);
      return mk(
        pattern,
        seed,
        meta.title,
        false,
        `Perusahaan menjual barang secara tunai ${rp(v)} (diterima di ${BANKS[0]}) kepada ${pick(r, CUSTOMERS)}. Biaya persediaan yang dijual ${rp(cost)}. Metode perpetual.`,
        [
          ['1-1100', v, 0],
          ['4-1000', 0, v],
          ['5-1000', cost, 0],
          ['1-1400', 0, cost],
        ],
        'Pengakuan pendapatan tunai dan pengakuan HPP (perpetual).',
      );
    }
    case 'terima-piutang-diskon': {
      const v = amt(r, 50_000_000, 500_000_000, 1_000_000);
      const d = xround((v * disc) / 100, 0);
      return mk(
        pattern,
        seed,
        meta.title,
        false,
        `${pick(r, CUSTOMERS)} melunasi piutang faktur ${rp(v)} via ${BANKS[0]} dalam periode diskon ${disc}/10, n/30. Perusahaan mencatat potongan penjualan sebagai kontra pendapatan.`,
        [
          ['1-1100', v - d, 0],
          ['4-1200', d, 0],
          ['1-1200', 0, v],
        ],
        `Potongan ${disc}% x ${rp(v)} = ${rp(d)} dicatat di Potongan Penjualan; kas diterima ${rp(v - d)}.`,
      );
    }
    case 'penyusutan': {
      const cost = amt(r, 300_000_000, 2_000_000_000, 50_000_000);
      const life = pick(r, [5, 8, 10, 20, 25]);
      const resid = xround((cost * pick(r, [0, 5, 10])) / 100, 0);
      const dep = xround((cost - resid) / life, 0);
      return mk(
        pattern,
        seed,
        meta.title,
        false,
        `Bangunan diperoleh dengan harga ${rp(cost)}, nilai residu ${rp(resid)}, umur manfaat ${life} tahun, metode garis lurus. Hitung dan jurnal penyusutan untuk satu tahun penuh (31 Desember).`,
        [
          ['6-1400', dep, 0],
          ['1-2210', 0, dep],
        ],
        `(${rp(cost)} − ${rp(resid)}) / ${life} = ${rp(dep)} per tahun.`,
      );
    }
    case 'ppn-beli': {
      const dpp = amt(r, 20_000_000, 300_000_000, 1_000_000);
      const ppn = xround(dpp * 0.11, 0);
      return mk(
        pattern,
        seed,
        meta.title,
        true,
        `Perusahaan membeli barang dagang secara kredit dari ${pick(r, SUPPLIERS)} (PKP) dengan dasar pengenaan pajak ${rp(dpp)}. PPN 11% dapat dikreditkan dan faktur pajak sah. Perpetual.`,
        [
          ['1-1400', dpp, 0],
          ['1-1850', ppn, 0],
          ['2-1000', 0, dpp + ppn],
        ],
        `PPN masukan = 11% x ${rp(dpp)} = ${rp(ppn)} dicatat sebagai aset (dapat dikreditkan); utang usaha sebesar total faktur ${rp(dpp + ppn)}.`,
      );
    }
    case 'ppn-jual': {
      const dpp = amt(r, 30_000_000, 400_000_000, 1_000_000);
      const ppn = xround(dpp * 0.11, 0);
      const cost = xround((dpp * 65) / 100, 0);
      return mk(
        pattern,
        seed,
        meta.title,
        true,
        `Perusahaan menjual barang secara kredit kepada ${pick(r, CUSTOMERS)} dengan dasar pengenaan pajak ${rp(dpp)}. PPN keluaran 11% ditagihkan pada faktur. HPP ${rp(cost)}. Perpetual.`,
        [
          ['1-1200', dpp + ppn, 0],
          ['4-1000', 0, dpp],
          ['2-1550', 0, ppn],
          ['5-1000', cost, 0],
          ['1-1400', 0, cost],
        ],
        `PPN keluaran = 11% x ${rp(dpp)} = ${rp(ppn)} adalah utang kepada negara, bukan pendapatan. Piutang sebesar total faktur ${rp(dpp + ppn)}.`,
      );
    }
    case 'pph23-jasa': {
      const fee = amt(r, 10_000_000, 120_000_000, 1_000_000);
      const w = xround(fee * 0.02, 0);
      return mk(
        pattern,
        seed,
        meta.title,
        true,
        `Perusahaan memakai jasa kontraktor untuk perbaikan peralatan senilai ${rp(fee)} (tanpa PPN) dan membayarnya via ${BANKS[0]}. Atas jasa ini perusahaan wajib memotong PPh 23 sebesar 2%, yang belum disetor ke kas negara.`,
        [
          ['6-2100', fee, 0],
          ['1-1100', 0, fee - w],
          ['2-1560', 0, w],
        ],
        `PPh 23 = 2% x ${rp(fee)} = ${rp(w)} ditahan sebagai utang pajak; kas keluar ${rp(fee - w)}.`,
      );
    }
  }
}

export const isPattern = (p: string): p is Pattern => PATTERNS.some((x) => x.pattern === p);
export function parseId(id: string): { pattern: Pattern; seed: number } | null {
  const [p, s] = id.split(':');
  const seed = Number(s);
  return isPattern(p) && Number.isInteger(seed) ? { pattern: p, seed } : null;
}
