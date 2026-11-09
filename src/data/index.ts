import type { Account, OpeningBalance } from '../engine/types';
import coa from '../../data/coa.json';
import opening from '../../data/opening-balances.json';
import transactions from '../../data/transactions.json';
import adjustments from '../../data/adjustments.json';
import scenarios from '../../data/scenarios.json';
import correcting from '../../data/correcting-cases.json';
import caseInfo from '../../data/case.json';
import answerKey from '../../data/answer-key.json';
import type { AnswerKey, CaseInfo, SourceTransaction, Adjustment, Scenario, CorrectingData } from './types';

export const COA = coa as Account[];
export const OPENING = opening as OpeningBalance[];
/**
 * Topik transaksi pengecoh di sumber memuat kunci ("Distractor: tidak perlu jurnal", dst.).
 * Aplikasi menampilkan label netral yang menggambarkan peristiwanya saja, agar tidak membocorkan jawaban.
 */
const NEUTRAL_TOPIC: Record<number, string> = {
  23: 'Penawaran harga dari pemasok',
  50: 'Somasi mantan karyawan',
  63: 'Kenaikan harga pasar saham',
  67: 'Laporan umur piutang',
  82: 'Penandatanganan kontrak instalasi',
  86: 'Indikasi nilai properti investasi',
  128: 'Faktur pembelian masih terbuka',
  134: 'Faktur pembelian dari pemasok',
  144: 'Kontrak pasokan tahunan',
  145: 'Hasil stock opname persediaan',
  146: 'Deposito: bunga semester II',
};
export const TRANSACTIONS: SourceTransaction[] = (transactions as SourceTransaction[]).map((t) =>
  t.isDistractor ? { ...t, topic: NEUTRAL_TOPIC[t.no] ?? 'Peristiwa tanpa kategori' } : t,
);
export const ADJUSTMENTS = adjustments as Adjustment[];
export const SCENARIOS = scenarios as Scenario[];
export const CORRECTING = correcting as CorrectingData;
export const CASE = caseInfo as CaseInfo;
export const KEY = answerKey as unknown as AnswerKey;

export const ACCOUNT_BY_CODE: Record<string, Account> = Object.fromEntries(COA.map((a) => [a.code, a]));
