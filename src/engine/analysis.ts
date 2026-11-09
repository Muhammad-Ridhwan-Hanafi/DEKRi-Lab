import type { Account, TBRow } from './types';

/** Turunan murni dari neraca saldo: kertas kerja 10 kolom, rasio. */

export interface WorksheetRow {
  code: string;
  name: string;
  ns: [number, number]; // neraca saldo (D,K)
  adj: [number, number];
  nssp: [number, number];
  lr: [number, number];
  neraca: [number, number];
}
export interface Worksheet {
  rows: WorksheetRow[];
  totals: Pick<WorksheetRow, 'ns' | 'adj' | 'nssp' | 'lr' | 'neraca'>;
  /** laba (+) atau rugi (-) bersih; menyeimbangkan kolom LR dan Neraca */
  netIncome: number;
  /** total kolom LR dan Neraca setelah baris laba/rugi ditambahkan */
  final: { lr: [number, number]; neraca: [number, number] };
}

const dk = (n: number): [number, number] => (n >= 0 ? [n, 0] : [0, -n]);
const add = (a: [number, number], b: [number, number]): [number, number] => [a[0] + b[0], a[1] + b[1]];

export function worksheet(tb: readonly TBRow[], coa: readonly Account[]): Worksheet {
  const type = new Map(coa.map((a) => [a.code, a.type]));
  const rows: WorksheetRow[] = [];
  let totals = {
    ns: [0, 0] as [number, number],
    adj: [0, 0] as [number, number],
    nssp: [0, 0] as [number, number],
    lr: [0, 0] as [number, number],
    neraca: [0, 0] as [number, number],
  };
  for (const r of tb) {
    if (!r.preBalance && !r.adjDebit && !r.adjCredit && !r.adjBalance) continue;
    const isLR = type.get(r.code) === 'Revenue' || type.get(r.code) === 'Expense';
    const nssp = dk(r.adjBalance);
    const row: WorksheetRow = {
      code: r.code,
      name: r.name,
      ns: dk(r.preBalance),
      adj: [r.adjDebit, r.adjCredit],
      nssp,
      lr: isLR ? nssp : [0, 0],
      neraca: isLR ? [0, 0] : nssp,
    };
    rows.push(row);
    totals = {
      ns: add(totals.ns, row.ns),
      adj: add(totals.adj, row.adj),
      nssp: add(totals.nssp, row.nssp),
      lr: add(totals.lr, row.lr),
      neraca: add(totals.neraca, row.neraca),
    };
  }
  const netIncome = totals.lr[1] - totals.lr[0];
  const final = {
    lr: (netIncome >= 0 ? [totals.lr[0] + netIncome, totals.lr[1]] : [totals.lr[0], totals.lr[1] - netIncome]) as [number, number],
    neraca: (netIncome >= 0 ? [totals.neraca[0], totals.neraca[1] + netIncome] : [totals.neraca[0] - netIncome, totals.neraca[1]]) as [number, number],
  };
  return { rows, totals, netIncome, final };
}

// ---------- rasio ----------
export interface Ratio {
  group: 'Likuiditas' | 'Solvabilitas' | 'Profitabilitas' | 'Aktivitas';
  name: string;
  formula: string;
  /** angka sumber yang dipakai, ditulis lengkap agar hasil bisa ditelusuri */
  source: string;
  value: number | null;
  format: 'x' | '%' | 'hari';
  /** arti angka tanpa label sehat/tidak sehat */
  interpretation: string;
  /** batasan yang perlu diingat saat menafsirkan */
  limitation: string;
}

export interface Basis {
  cash: number;
  receivables: number;
  inventory: number;
  currentAssets: number;
  totalAssets: number;
  currentLiabilities: number;
  totalLiabilities: number;
  equity: number; // termasuk laba tahun berjalan
  netSales: number;
  cogs: number;
  grossProfit: number;
  operatingExpenses: number;
  operatingProfit: number;
  netIncome: number;
  interest: number;
  tax: number;
  openingInventory: number;
  openingReceivables: number;
}

const sumCodes = (tb: readonly TBRow[], f: (r: TBRow) => boolean, pick: (r: TBRow) => number) => tb.filter(f).reduce((t, r) => t + pick(r), 0);

export function basis(tb: readonly TBRow[], coa: readonly Account[]): Basis {
  const cls = new Map(coa.map((a) => [a.code, a]));
  const bal = (r: TBRow) => r.adjBalance;
  const inClass =
    (...names: string[]) =>
    (r: TBRow) =>
      names.includes(cls.get(r.code)?.reportClass ?? '');
  const code =
    (...cs: string[]) =>
    (r: TBRow) =>
      cs.includes(r.code);
  const currentAssets = sumCodes(tb, inClass('Current Asset', 'Current Asset (Contra)'), bal);
  const nonCurrent = sumCodes(tb, inClass('Non-Current Asset', 'Non-Current Asset (Contra)'), bal);
  const currentLiabilities = -sumCodes(tb, inClass('Current Liability'), bal);
  const totalLiabilities = -sumCodes(tb, inClass('Current Liability', 'Non-Current Liability', 'Non-Current Liability (Contra)'), bal);
  const rev = sumCodes(tb, (r) => cls.get(r.code)?.type === 'Revenue', bal);
  const exp = sumCodes(tb, (r) => cls.get(r.code)?.type === 'Expense', bal);
  const netIncome = -(rev + exp);
  const equityBooks = -sumCodes(tb, (r) => cls.get(r.code)?.type === 'Equity', bal);
  const netSales = -sumCodes(tb, code('4-1000', '4-2000', '4-1100', '4-1200'), bal);
  const cogs = sumCodes(tb, code('5-1000'), bal);
  const operatingExpenses = sumCodes(tb, inClass('Operating Expense'), bal);
  return {
    cash: sumCodes(tb, code('1-1000', '1-1100', '1-1150'), bal),
    receivables: sumCodes(tb, code('1-1200', '1-1210'), bal),
    inventory: sumCodes(tb, code('1-1400'), bal),
    currentAssets,
    totalAssets: currentAssets + nonCurrent,
    currentLiabilities,
    totalLiabilities,
    equity: equityBooks + netIncome,
    netSales,
    cogs,
    grossProfit: netSales - cogs,
    operatingExpenses,
    operatingProfit: netSales - cogs - operatingExpenses,
    netIncome,
    interest: sumCodes(tb, code('7-1000'), bal),
    tax: sumCodes(tb, code('7-1200', '7-1300'), bal),
    openingInventory: sumCodes(tb, code('1-1400'), (r) => r.opening),
    openingReceivables: sumCodes(tb, code('1-1200', '1-1210'), (r) => r.opening),
  };
}

const ratio = (a: number, b: number): number | null => (b === 0 || !Number.isFinite(a / b) ? null : a / b);
const rp = (n: number) => (n < 0 ? `(${Math.abs(Math.round(n)).toLocaleString('id-ID')})` : Math.round(n).toLocaleString('id-ID'));
const fx = (v: number | null) => (v === null ? 'tidak dapat dihitung' : v.toFixed(2).replace('.', ',') + 'x');
const fp = (v: number | null) => (v === null ? 'tidak dapat dihitung' : (v * 100).toFixed(1).replace('.', ',') + '%');

export function ratios(b: Basis): Ratio[] {
  const avg = (x: number, y: number) => (x + y) / 2;
  const avgInv = avg(b.inventory, b.openingInventory);
  const avgRec = avg(b.receivables, b.openingReceivables);
  const turnInv = ratio(b.cogs, avgInv);
  const turnRec = ratio(b.netSales, avgRec);
  const R = (r: Ratio): Ratio => r;
  const lim = {
    snapshot: 'Neraca hanya satu tanggal (31 Desember); saldo tutup tahun bisa tidak mewakili kondisi sepanjang tahun.',
    industry: 'Tidak ada patokan universal: nilai wajar bergantung pada industri, ukuran usaha, dan kebijakan perusahaan.',
  };
  return [
    R({
      group: 'Likuiditas',
      name: 'Rasio lancar',
      formula: 'Aset lancar / Liabilitas jangka pendek',
      source: `Aset lancar ${rp(b.currentAssets)}; liabilitas jangka pendek ${rp(b.currentLiabilities)}`,
      value: ratio(b.currentAssets, b.currentLiabilities),
      format: 'x',
      interpretation: `Setiap Rp1 liabilitas jangka pendek ditutup aset lancar sebesar Rp${fx(ratio(b.currentAssets, b.currentLiabilities)).replace('x', '')}.`,
      limitation: `${lim.snapshot} Persediaan dan piutang dihitung penuh walau belum tentu cepat menjadi kas.`,
    }),
    R({
      group: 'Likuiditas',
      name: 'Rasio cepat',
      formula: '(Aset lancar − Persediaan) / Liabilitas jangka pendek',
      source: `Aset lancar ${rp(b.currentAssets)} − persediaan ${rp(b.inventory)}; liabilitas jangka pendek ${rp(b.currentLiabilities)}`,
      value: ratio(b.currentAssets - b.inventory, b.currentLiabilities),
      format: 'x',
      interpretation: 'Kemampuan menutup liabilitas jangka pendek tanpa mengandalkan penjualan persediaan.',
      limitation: `Beban dibayar di muka ikut terhitung sebagai aset lancar non-persediaan. ${lim.snapshot}`,
    }),
    R({
      group: 'Likuiditas',
      name: 'Rasio kas',
      formula: 'Kas dan bank / Liabilitas jangka pendek',
      source: `Kas, bank, dan deposito ${rp(b.cash)}; liabilitas jangka pendek ${rp(b.currentLiabilities)}`,
      value: ratio(b.cash, b.currentLiabilities),
      format: 'x',
      interpretation: 'Ukuran likuiditas paling ketat: hanya kas dan bank.',
      limitation: `Deposito (1-1150) dihitung sebagai kas. ${lim.snapshot}`,
    }),
    R({
      group: 'Solvabilitas',
      name: 'Utang terhadap aset',
      formula: 'Total liabilitas / Total aset',
      source: `Total liabilitas ${rp(b.totalLiabilities)}; total aset ${rp(b.totalAssets)}`,
      value: ratio(b.totalLiabilities, b.totalAssets),
      format: '%',
      interpretation: `Sekitar ${fp(ratio(b.totalLiabilities, b.totalAssets))} aset dibiayai oleh liabilitas.`,
      limitation: `Aset memakai nilai tercatat (biaya historis), bukan nilai pasar. ${lim.industry}`,
    }),
    R({
      group: 'Solvabilitas',
      name: 'Utang terhadap ekuitas',
      formula: 'Total liabilitas / Ekuitas',
      source: `Total liabilitas ${rp(b.totalLiabilities)}; ekuitas ${rp(b.equity)} (termasuk laba tahun berjalan)`,
      value: ratio(b.totalLiabilities, b.equity),
      format: 'x',
      interpretation: 'Perbandingan pendanaan dari kreditur terhadap pemilik.',
      limitation: `Ekuitas negatif atau sangat kecil membuat rasio sulit ditafsirkan. ${lim.industry}`,
    }),
    R({
      group: 'Solvabilitas',
      name: 'Cakupan bunga',
      formula: '(Laba bersih + Beban pajak + Beban bunga) / Beban bunga',
      source: `Laba bersih ${rp(b.netIncome)} + pajak ${rp(b.tax)} + bunga ${rp(b.interest)}; beban bunga ${rp(b.interest)}`,
      value: ratio(b.netIncome + b.tax + b.interest, b.interest),
      format: 'x',
      interpretation: 'Berapa kali laba sebelum bunga dan pajak mampu membayar beban bunga.',
      limitation: 'Beban bunga hanya akun 7-1000; pendapatan dan beban non-operasi lain ikut memengaruhi pembilang.',
    }),
    R({
      group: 'Profitabilitas',
      name: 'Margin laba kotor',
      formula: 'Laba kotor / Penjualan bersih',
      source: `Laba kotor ${rp(b.grossProfit)}; penjualan bersih ${rp(b.netSales)} (termasuk pendapatan jasa, setelah retur dan potongan)`,
      value: ratio(b.grossProfit, b.netSales),
      format: '%',
      interpretation: `Dari tiap Rp100 penjualan bersih, sekitar Rp${((ratio(b.grossProfit, b.netSales) ?? 0) * 100).toFixed(1).replace('.', ',')} tersisa setelah harga pokok.`,
      limitation: 'Pendapatan jasa ikut di penyebut sementara HPP hanya untuk barang; kebijakan harga dan bauran produk memengaruhi angka.',
    }),
    R({
      group: 'Profitabilitas',
      name: 'Margin laba usaha',
      formula: '(Laba kotor − Beban operasi) / Penjualan bersih',
      source: `Laba kotor ${rp(b.grossProfit)} − beban operasi ${rp(b.operatingExpenses)} = ${rp(b.operatingProfit)}; penjualan bersih ${rp(b.netSales)}`,
      value: ratio(b.operatingProfit, b.netSales),
      format: '%',
      interpretation: 'Laba dari kegiatan utama sebelum pendapatan/beban lain, bunga, dan pajak.',
      limitation: 'Beban operasi mengikuti kelompok akun "Operating Expense" pada bagan akun kasus.',
    }),
    R({
      group: 'Profitabilitas',
      name: 'Margin laba bersih',
      formula: 'Laba bersih / Penjualan bersih',
      source: `Laba bersih ${rp(b.netIncome)}; penjualan bersih ${rp(b.netSales)}`,
      value: ratio(b.netIncome, b.netSales),
      format: '%',
      interpretation: 'Porsi penjualan bersih yang menjadi laba setelah seluruh beban dan pajak.',
      limitation: lim.industry,
    }),
    R({
      group: 'Profitabilitas',
      name: 'ROA',
      formula: 'Laba bersih / Total aset akhir',
      source: `Laba bersih ${rp(b.netIncome)}; total aset akhir ${rp(b.totalAssets)}`,
      value: ratio(b.netIncome, b.totalAssets),
      format: '%',
      interpretation: 'Laba yang dihasilkan tiap rupiah aset.',
      limitation: 'Memakai total aset akhir, bukan rata-rata, supaya konsisten dengan DuPont.',
    }),
    R({
      group: 'Profitabilitas',
      name: 'ROE',
      formula: 'Laba bersih / Ekuitas akhir',
      source: `Laba bersih ${rp(b.netIncome)}; ekuitas akhir ${rp(b.equity)}`,
      value: ratio(b.netIncome, b.equity),
      format: '%',
      interpretation: 'Laba yang dihasilkan tiap rupiah ekuitas pemilik.',
      limitation: 'Memakai ekuitas akhir, bukan rata-rata. Utang yang tinggi dapat menaikkan ROE sekaligus risiko.',
    }),
    R({
      group: 'Aktivitas',
      name: 'Perputaran total aset',
      formula: 'Penjualan bersih / Total aset akhir',
      source: `Penjualan bersih ${rp(b.netSales)}; total aset akhir ${rp(b.totalAssets)}`,
      value: ratio(b.netSales, b.totalAssets),
      format: 'x',
      interpretation: 'Penjualan bersih yang dihasilkan tiap rupiah aset.',
      limitation: 'Memakai total aset akhir; aset yang baru dibeli akhir tahun menurunkan angka tanpa memengaruhi penjualan.',
    }),
    R({
      group: 'Aktivitas',
      name: 'Perputaran piutang',
      formula: 'Penjualan bersih / Rata-rata piutang usaha neto',
      source: `Penjualan bersih ${rp(b.netSales)}; rata-rata piutang neto (${rp(b.openingReceivables)} dan ${rp(b.receivables)}) = ${rp(avgRec)}`,
      value: turnRec,
      format: 'x',
      interpretation: `Piutang rata-rata berputar ${fx(turnRec)} selama setahun.`,
      limitation: 'Penjualan tunai dan jasa ikut di pembilang karena data tidak memisahkan penjualan kredit; angka cenderung terlalu tinggi.',
    }),
    R({
      group: 'Aktivitas',
      name: 'Perputaran persediaan',
      formula: 'HPP / Rata-rata persediaan',
      source: `HPP ${rp(b.cogs)}; rata-rata persediaan (${rp(b.openingInventory)} dan ${rp(b.inventory)}) = ${rp(avgInv)}`,
      value: turnInv,
      format: 'x',
      interpretation: `Persediaan rata-rata terjual dan diganti ${fx(turnInv)} selama setahun.`,
      limitation: 'Rata-rata hanya dari dua titik (awal dan akhir tahun); pola musiman tidak terlihat.',
    }),
    R({
      group: 'Aktivitas',
      name: 'Umur persediaan',
      formula: '365 / Perputaran persediaan',
      source: `Perputaran persediaan ${fx(turnInv)}`,
      value: turnInv ? 365 / turnInv : null,
      format: 'hari',
      interpretation: 'Perkiraan lama rata-rata barang berada di gudang sebelum terjual.',
      limitation: 'Turunan dari perputaran persediaan sehingga mewarisi batasannya.',
    }),
    R({
      group: 'Aktivitas',
      name: 'Umur piutang',
      formula: '365 / Perputaran piutang',
      source: `Perputaran piutang ${fx(turnRec)}`,
      value: turnRec ? 365 / turnRec : null,
      format: 'hari',
      interpretation: 'Perkiraan lama rata-rata piutang tertagih.',
      limitation: 'Turunan dari perputaran piutang sehingga mewarisi batasannya, termasuk penjualan tunai di pembilang.',
    }),
  ];
}

// ---------- DuPont ----------
export interface DuPont {
  margin: number;
  turnover: number;
  multiplier: number;
  roe: number;
  /** selisih ROE langsung dengan hasil kali tiga komponen (harus ~0) */
  check: number;
}

/** DuPont tiga komponen dengan saldo akhir; null bila ada penyebut nol. */
export function dupont(b: Basis): DuPont | null {
  const margin = ratio(b.netIncome, b.netSales);
  const turnover = ratio(b.netSales, b.totalAssets);
  const multiplier = ratio(b.totalAssets, b.equity);
  const roe = ratio(b.netIncome, b.equity);
  if (margin === null || turnover === null || multiplier === null || roe === null) return null;
  return { margin, turnover, multiplier, roe, check: roe - margin * turnover * multiplier };
}

// ---------- common size per akun ----------
export interface CommonRow {
  code: string;
  name: string;
  amount: number;
  pct: number | null;
}

/** Common size laba rugi per akun: persen terhadap penjualan bersih. Jumlah disajikan positif bila bertambah laba. */
export function commonSizeIncome(tb: readonly TBRow[], coa: readonly Account[], netSales: number): CommonRow[] {
  const type = new Map(coa.map((a) => [a.code, a.type]));
  return tb
    .filter((r) => (type.get(r.code) === 'Revenue' || type.get(r.code) === 'Expense') && r.adjBalance !== 0)
    .map((r) => ({ code: r.code, name: r.name, amount: -r.adjBalance, pct: ratio(-r.adjBalance, netSales) }));
}

/** Common size posisi keuangan per akun: aset terhadap total aset; liabilitas dan ekuitas terhadap total liabilitas dan ekuitas. */
export function commonSizeBalance(
  tb: readonly TBRow[],
  coa: readonly Account[],
  totalAssets: number,
  netIncome: number,
): { assets: CommonRow[]; funding: CommonRow[] } {
  const type = new Map(coa.map((a) => [a.code, a.type]));
  const assets = tb
    .filter((r) => type.get(r.code) === 'Asset' && r.adjBalance !== 0)
    .map((r) => ({ code: r.code, name: r.name, amount: r.adjBalance, pct: ratio(r.adjBalance, totalAssets) }));
  const funding: CommonRow[] = tb
    .filter((r) => (type.get(r.code) === 'Liability' || type.get(r.code) === 'Equity') && r.adjBalance !== 0)
    .map((r) => ({ code: r.code, name: r.name, amount: -r.adjBalance, pct: ratio(-r.adjBalance, totalAssets) }));
  if (netIncome !== 0) funding.push({ code: '—', name: 'Laba tahun berjalan (belum ditutup)', amount: netIncome, pct: ratio(netIncome, totalAssets) });
  return { assets, funding };
}

// ---------- tren antarperiode ----------

// ---------- analisis arus kas ----------
export interface CashFlowAnalysis {
  operating: number;
  investing: number;
  financing: number;
  net: number;
  opening: number;
  closing: number;
  balanceCash: number;
  /** selisih kas akhir arus kas vs kas pada neraca (harus 0) */
  gap: number;
  /** kontribusi tiap aktivitas terhadap total arus kas bruto (nilai mutlak) */
  shares: { operating: number | null; investing: number | null; financing: number | null };
  /** arus kas operasi dibanding laba bersih */
  operatingToIncome: number | null;
}

type Cells = Readonly<Record<string, number | string | undefined>>;
const num = (c: Cells, id: string) => (typeof c[id] === 'number' ? (c[id] as number) : 0);

export function cashFlowAnalysis(cells: Cells, netIncome: number): CashFlowAnalysis {
  const operating = num(cells, 'S15_B28');
  const investing = num(cells, 'S15_B35');
  const financing = num(cells, 'S15_B42');
  const gross = Math.abs(operating) + Math.abs(investing) + Math.abs(financing);
  return {
    operating,
    investing,
    financing,
    net: num(cells, 'S15_B45'),
    opening: num(cells, 'S15_B46'),
    closing: num(cells, 'S15_B47'),
    balanceCash: num(cells, 'S15_B57'),
    gap: num(cells, 'S15_B47') - num(cells, 'S15_B57'),
    shares: { operating: ratio(Math.abs(operating), gross), investing: ratio(Math.abs(investing), gross), financing: ratio(Math.abs(financing), gross) },
    operatingToIncome: ratio(operating, netIncome),
  };
}
