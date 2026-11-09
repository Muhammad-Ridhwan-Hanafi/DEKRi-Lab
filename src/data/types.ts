export interface SourceTransaction {
  no: number;
  date: string;
  level: string;
  topic: string;
  narrative: string;
  party: string;
  amountInfo: string;
  isDistractor: boolean;
}
export interface Adjustment {
  code: string;
  level: string;
  category: string;
  facts: string;
}
export interface Scenario {
  no: number;
  topic: string;
  caseAndFacts: string;
  question: string;
  kind: 'numeric' | 'choice';
  options: string[] | null;
  userResponsePrompt: string | null;
}
export interface CorrectingData {
  correcting: Array<{ no: number; event: string }>;
  detect: Array<{ no: number; event: string }>;
  errorTypeOptions: string[];
}
export interface CaseInfo {
  title: string;
  intro: string;
  background: string[][];
  policies: string[][];
  sak: string[][];
}
export type NetMap = Record<string, Record<string, number>>;
export interface AnalysisKey {
  debit: string | null;
  credit: string | null;
  amount: number | null;
  cashClass: string | null;
  needsAdj: string | null;
  affectsProfit: string | null;
  affectsCash: string | null;
  reason: string | null;
  cashSub: string | null;
}
export interface ReadableLine {
  code: string;
  name: string;
  debit: number;
  credit: number;
}
export interface ReadableTxn {
  no: number;
  date: string;
  level: string;
  topic: string;
  lines: ReadableLine[];
  explain: string | null;
}
export interface ReadableAdj {
  code: string;
  category: string;
  lines: ReadableLine[];
  calc: string | null;
  explain: string | null;
}
export interface AnswerKey {
  txnNet: NetMap;
  adjNet: NetMap;
  analysis: Record<string, AnalysisKey>;
  correctingNet: NetMap;
  errorType: Record<string, string>;
  scenario: Record<string, { key: string | number; explanation: string }>;
  reversingNet: NetMap;
  readableTxn: ReadableTxn[];
  readableAdj: ReadableAdj[];
  expectedTB: Record<string, { pre: number; adj: number }>;
  expectedStatements: Array<{ item: string; sheet: string; value: number }>;
  /** toleransi nominal per item (kunci `kind:id`); bila tidak ada, bawaan 1 rupiah */
  tolerance?: Record<string, number>;
}
