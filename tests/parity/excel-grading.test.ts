import { describe, expect, it } from 'vitest';
import cases from './excel-grading.json';
import { KEY } from '../../src/data';
import { gradeJournal, gradeNoJournal, type GradeResult } from '../../src/validation/grade';
import type { JournalLine } from '../../src/engine/types';

interface Case {
  kind: 'txn' | 'adj';
  id: string;
  mutation: string;
  lines: Array<{ code: string; debit: number; credit: number }>;
  decided: boolean;
  excel: string;
  pass: number;
}

/** Teks status Excel -> kategori yang sama dengan alasan (reason) di penilai aplikasi. */
function excelCategory(text: string): string {
  if (text.startsWith('BELUM DIISI')) return 'empty';
  if (text.startsWith('SALDO TIDAK SEIMBANG')) return 'unbalanced';
  if (text.startsWith('AKUN SALAH')) return 'extra-account';
  if (text.startsWith('BENAR')) return 'ok';
  if (text.startsWith('SISI DEBIT/KREDIT SALAH')) return 'wrong-side';
  if (text.startsWith('AKUN/NOMINAL PERLU DIPERIKSA')) return 'check-amount';
  if (text.startsWith('NOMINAL SALAH')) return 'wrong-amount';
  if (text.startsWith('PERIKSA - transaksi ini tidak memerlukan jurnal')) return 'not-needed';
  throw new Error(`status Excel tidak dikenal: ${text}`);
}

function grade(c: Case): GradeResult {
  const lines: JournalLine[] = c.lines.map((l, i) => ({ id: `t${i}`, code: l.code, debit: l.debit, credit: l.credit, memo: '' }));
  if (c.kind === 'adj') return gradeJournal(lines, KEY.adjNet[c.id]);
  const net = KEY.txnNet[c.id];
  return net ? gradeJournal(lines, net) : gradeNoJournal(lines, c.decided);
}

const all = cases as Case[];

describe('penilaian = Excel pada jawaban salah (hasil hitung ulang LibreOffice)', () => {
  it('mencakup semua jenis status dan kedua jenis item', () => {
    expect(all.length).toBeGreaterThan(2000);
    const cats = new Set(all.map((c) => excelCategory(c.excel)));
    for (const k of ['empty', 'unbalanced', 'extra-account', 'ok', 'wrong-side', 'check-amount', 'wrong-amount', 'not-needed']) expect(cats.has(k)).toBe(true);
  });

  it('status dan alasan sama dengan Excel pada setiap kasus', () => {
    const diffs: string[] = [];
    for (const c of all) {
      const g = grade(c);
      const want = excelCategory(c.excel);
      // Sheet 10 tidak punya cabang "AKUN/NOMINAL PERLU DIPERIKSA": Excel menyebut keduanya "NOMINAL SALAH".
      const sameAdjAmount = c.kind === 'adj' && want === 'wrong-amount' && (g.reason === 'check-amount' || g.reason === 'wrong-amount');
      if (g.reason !== want && !sameAdjAmount) diffs.push(`${c.kind} ${c.id} [${c.mutation}] Excel="${c.excel}" app=${g.reason}`);
      expect(g.status === 'BENAR').toBe(want === 'ok');
    }
    expect(diffs.slice(0, 20)).toEqual([]);
  });

  it('petunjuk (hint) konsisten dengan alasan', () => {
    for (const c of all) {
      const g = grade(c);
      if (g.reason === 'extra-account') expect(g.hint.extra.length).toBeGreaterThan(0);
      if (g.reason === 'wrong-side') expect(g.hint.wrongSide.length).toBeGreaterThan(0);
      if (g.reason === 'ok') expect(g.hint).toEqual({ missing: [], extra: [], wrongSide: [], wrongAmount: [] });
    }
  });
});
