export type AccountCode = string;
export type Rupiah = number;

export interface Account {
  code: AccountCode;
  name: string;
  type: string;
  normal: 'Debit' | 'Credit';
  reportClass: string;
}

export interface OpeningBalance {
  code: AccountCode;
  debit: Rupiah;
  credit: Rupiah;
  note?: string | null;
}

export interface JournalLine {
  id: string;
  code: AccountCode | null;
  debit: Rupiah;
  credit: Rupiah;
  memo: string;
}

/** Baris tabel mirip kolom sheet Excel (kunci huruf kolom). */
export type Row = Record<string, string | number>;
export type Table = readonly Row[];

/**
 * Tabel sumber untuk rumus laporan; kunci kolom mengikuti sheet Excel asal:
 * ATB (11): A kode, D debit, E kredit · OB (03): A kode, C debit, D kredit ·
 * JRN (07): C kode, F debit, G kredit, K sub-kategori arus kas, L arus kas baris ·
 * ADJ (10): A kode AJ, E kode akun, G debit, H kredit · GL (08): L kode, P mutasi debit, Q mutasi kredit.
 */
export interface Tables {
  ATB: Table;
  OB: Table;
  JRN: Table;
  ADJ: Table;
  GL: Table;
}

/** Entri jurnal siap hitung: transaksi (txn) atau penyesuaian (aj). */
export interface EntryLines {
  key: string; // no transaksi atau kode AJ
  lines: Array<{ code: AccountCode; debit: Rupiah; credit: Rupiah }>;
}

export interface TBRow {
  code: AccountCode;
  name: string;
  normal: 'Debit' | 'Credit';
  opening: Rupiah; // D-K
  journalDebit: Rupiah;
  journalCredit: Rupiah;
  adjDebit: Rupiah;
  adjCredit: Rupiah;
  preBalance: Rupiah; // D-K sebelum penyesuaian
  adjBalance: Rupiah; // D-K setelah penyesuaian
}
