import { describe, expect, it } from 'vitest';
import { COA } from '../../src/data';
import { basis, cashFlowAnalysis, commonSizeBalance, commonSizeIncome, dupont, ratios, worksheet } from '../../src/engine/analysis';
import { computeReport } from '../../src/engine';
import { keyLedgerInput } from '../helpers';

const report = computeReport(keyLedgerInput());
const netIncome = report.cells.S12_B53 as number;

describe('kertas kerja 10 kolom', () => {
  const w = worksheet(report.tb, COA);
  it('tiap pasang kolom seimbang', () => {
    for (const k of ['ns', 'adj', 'nssp'] as const) expect(w.totals[k][0]).toBe(w.totals[k][1]);
    expect(w.final.lr[0]).toBe(w.final.lr[1]);
    expect(w.final.neraca[0]).toBe(w.final.neraca[1]);
  });
  it('laba bersih sama dengan laporan laba rugi', () => {
    expect(w.netIncome).toBe(netIncome);
  });
  it('akun Pendapatan/Beban hanya di kolom LR, lainnya hanya di Neraca', () => {
    for (const r of w.rows) {
      const isLR = r.code[0] >= '4';
      expect(isLR ? r.neraca : r.lr).toEqual([0, 0]);
    }
  });
  it('tanpa jurnal sama sekali: kertas kerja berisi saldo awal saja dan tetap seimbang', () => {
    const e = computeReport({ ...keyLedgerInput(), journal: [], adjusting: [] });
    const we = worksheet(e.tb, COA);
    expect(we.netIncome).toBe(0);
    expect(we.totals.nssp[0]).toBe(we.totals.nssp[1]);
  });
});

describe('rasio dan analisis', () => {
  const b = basis(report.tb, COA);
  it('persamaan akuntansi: aset = liabilitas + ekuitas (termasuk laba berjalan)', () => {
    expect(b.totalAssets).toBe(b.totalLiabilities + b.equity);
  });
  it('laba bersih dan aset sama dengan laporan', () => {
    expect(b.netIncome).toBe(netIncome);
    expect(b.totalAssets).toBe(report.cells.S14_B31 as number);
  });
  it('semua rasio terhitung untuk kasus ini dan masuk akal', () => {
    const r = ratios(b);
    expect(r.every((x) => x.value !== null && Number.isFinite(x.value))).toBe(true);
    expect(r.find((x) => x.name === 'Rasio lancar')!.value).toBeCloseTo(b.currentAssets / b.currentLiabilities, 10);
  });
  it('tanpa data, rasio bernilai null (bukan NaN atau Infinity)', () => {
    const e = basis(computeReport({ ...keyLedgerInput(), opening: [], journal: [], adjusting: [] }).tb, COA);
    for (const x of ratios(e)) expect(x.value).toBeNull();
  });
});

describe('analisis lanjutan', () => {
  const b = basis(report.tb, COA);
  it('rasio: 16 rasio lengkap dengan rumus, sumber, interpretasi, keterbatasan', () => {
    const r = ratios(b);
    expect(r).toHaveLength(16);
    for (const x of r) for (const k of ['formula', 'source', 'interpretation', 'limitation'] as const) expect(x[k].length).toBeGreaterThan(5);
    for (const n of ['Margin laba usaha', 'Perputaran total aset', 'Perputaran piutang', 'Perputaran persediaan', 'Cakupan bunga'])
      expect(r.find((x) => x.name === n)).toBeTruthy();
    expect(r.map((x) => x.interpretation + x.limitation).join(' ')).not.toMatch(/tidak sehat|\bsehat\b|bagus|buruk/i);
  });
  it('DuPont: hasil kali tiga komponen = ROE langsung', () => {
    const d = dupont(b)!;
    expect(Math.abs(d.check)).toBeLessThan(1e-9);
    expect(d.roe).toBeCloseTo(b.netIncome / b.equity, 10);
  });
  it('DuPont null bila tanpa data', () => {
    expect(dupont(basis(computeReport({ ...keyLedgerInput(), opening: [], journal: [], adjusting: [] }).tb, COA))).toBeNull();
  });
  it('common size laba rugi: jumlah akun = laba bersih', () => {
    const rows = commonSizeIncome(report.tb, COA, b.netSales);
    expect(rows.reduce((t, r) => t + r.amount, 0)).toBe(netIncome);
  });
  it('common size neraca: sisi aset dan pendanaan sama-sama 100% dari total aset', () => {
    const { assets, funding } = commonSizeBalance(report.tb, COA, b.totalAssets, b.netIncome);
    expect(assets.reduce((t, r) => t + r.amount, 0)).toBe(b.totalAssets);
    expect(funding.reduce((t, r) => t + r.amount, 0)).toBe(b.totalAssets);
    expect(funding.reduce((t, r) => t + (r.pct ?? 0), 0)).toBeCloseTo(1, 9);
  });
  it('arus kas: kas akhir cocok dengan neraca dan porsi berjumlah 1', () => {
    const c = cashFlowAnalysis(report.cells, netIncome);
    expect(c.gap).toBe(0);
    expect(c.operating + c.investing + c.financing).toBe(c.net);
    expect(c.opening + c.net).toBe(c.closing);
    expect((c.shares.operating ?? 0) + (c.shares.investing ?? 0) + (c.shares.financing ?? 0)).toBeCloseTo(1, 9);
  });
});
