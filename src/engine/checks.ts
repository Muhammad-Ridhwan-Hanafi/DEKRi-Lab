// Pemeriksaan konsistensi antar-laporan (sheet 23). Murni.
import { KEY_STATEMENT_CELLS } from './key-map';
import { postClosingTB, type ClosingInput } from './closing';
import { tbTotals } from './ledger';
import { xround } from './excel';
import type { Report } from './index';

export interface Check {
  label: string;
  a: number;
  b: number;
  ok: boolean;
}

const n = (v: unknown) => (typeof v === 'number' ? v : 0);

export function runChecks(report: Report, closing: ClosingInput): Check[] {
  const c = report.cells;
  const pre = tbTotals(report.tb, 'pre');
  const adj = tbTotals(report.tb, 'adjusted');
  const pc = postClosingTB(report.tb, closing);
  const glDebit = report.tables.GL.reduce((t, r) => t + n(r.P), 0);
  const glCredit = report.tables.GL.reduce((t, r) => t + n(r.Q), 0);
  const jrnD = report.tables.JRN.reduce((t, r) => t + n(r.F), 0) + report.tables.ADJ.reduce((t, r) => t + n(r.G), 0);
  const jrnC = report.tables.JRN.reduce((t, r) => t + n(r.G), 0) + report.tables.ADJ.reduce((t, r) => t + n(r.H), 0);
  const glNet = report.tb.reduce((t, r) => t + r.adjBalance, 0);
  const glPositive = report.tb.reduce((t, r) => t + Math.max(r.adjBalance, 0), 0);

  const rows: Array<[string, number, number]> = [
    ['Neraca Saldo (09): total debit = total kredit', pre.debit, pre.credit],
    ['Neraca Saldo Disesuaikan (11): total debit = total kredit', adj.debit, adj.credit],
    ['Laba bersih (12) = laba bersih pada Laporan Arus Kas (15)', n(c.S12_B53), n(c.S15_B6)],
    ['Saldo laba akhir (13) = saldo laba pada Laporan Posisi Keuangan (14)', n(c.S13_D9), n(c.S14_B59)],
    ['Total aset (14) = total liabilitas + ekuitas (14)', n(c.S14_B31), n(c.S14_B62)],
    ['Total aset awal (14) = total liabilitas + ekuitas awal (14)', n(c.S14_C31), n(c.S14_C62)],
    ['Kas akhir hasil rekonsiliasi arus kas (15) = kas pada neraca saldo disesuaikan', n(c.S15_B47), n(c.S15_B57)],
    ['Arus kas operasi tidak langsung (15) = arus kas operasi dari jurnal (15)', n(c.S15_B28), n(c.S15_B60)],
    ['Neraca Saldo Setelah Penutupan (17): total debit = total kredit', pc.debit, pc.credit],
    ['Total ekuitas akhir (13) = total ekuitas pada Laporan Posisi Keuangan (14)', n(c.S13_E9), n(c.S14_B60)],
    ['Buku Besar (08): total mutasi debit = jurnal umum + jurnal penyesuaian', glDebit, jrnD],
    ['Buku Besar (08): total mutasi kredit = jurnal umum + jurnal penyesuaian', glCredit, jrnC],
    ['Buku Besar (08): jumlah saldo akhir seluruh akun (D-K) = 0', glNet, 0],
    ['Neraca Saldo Disesuaikan (11) = saldo akhir Buku Besar (08): total debit', adj.debit, glPositive],
  ];
  return rows.map(([label, a, b]) => ({ label, a, b, ok: xround(a - b, 0) === 0 }));
}

export interface Reconciliation {
  item: string;
  /** id sel laporan (mis. S12_B53) agar selisih bisa ditelusuri */
  cell: string;
  user: number;
  key: number;
  ok: boolean;
}

/** Rekonsiliasi 14 angka laporan Anda dengan kunci (bagian M). */
export function reconcileWithKey(report: Report, expected: ReadonlyArray<{ item: string; value: number }>): Reconciliation[] {
  return KEY_STATEMENT_CELLS.map(({ item, cell }) => {
    const key = expected.find((e) => e.item === item)?.value ?? 0;
    const user = n(report.cells[cell]);
    return { item, cell, user, key, ok: Math.abs(user - key) <= 1 };
  });
}
