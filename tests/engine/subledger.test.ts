import { describe, expect, it } from 'vitest';
import { COA, KEY, OPENING, TRANSACTIONS } from '../../src/data';
import { computeReport } from '../../src/engine';
import { byParty, inventoryCard, movements, reconcile } from '../../src/engine/subledger';
import type { JournalLine } from '../../src/engine/types';
import { keyLedgerInput } from '../helpers';

const journal: Record<string, JournalLine[]> = {};
for (const t of KEY.readableTxn) journal[String(t.no)] = t.lines.map((l, i) => ({ id: `k${i}`, code: l.code, debit: l.debit, credit: l.credit, memo: '' }));
const report = computeReport(keyLedgerInput());
const open = (c: string) => OPENING.filter((o) => o.code === c).reduce((t, o) => t + o.debit - o.credit, 0);
const pre = (c: string) => report.tb.find((r) => r.code === c)!.preBalance;
void COA;

describe('buku pembantu', () => {
  it('piutang: saldo awal + mutasi semua pihak = akun kontrol', () => {
    const m = movements('1-1200', TRANSACTIONS, journal);
    expect(m.length).toBeGreaterThan(5);
    const r = reconcile(open('1-1200'), m, pre('1-1200'));
    expect(r.ok).toBe(true);
  });
  it('utang usaha: rekonsiliasi cocok (saldo normal kredit, jadi neto negatif)', () => {
    const m = movements('2-1000', TRANSACTIONS, journal);
    expect(reconcile(open('2-1000'), m, pre('2-1000')).ok).toBe(true);
  });
  it('rekonsiliasi gagal bila akun kontrol tidak cocok', () => {
    expect(reconcile(0, movements('1-1200', TRANSACTIONS, journal), 1).ok).toBe(false);
  });
  it('byParty menjumlah per pihak', () => {
    const m = movements('2-1000', TRANSACTIONS, journal);
    const p = byParty(m);
    expect(p.reduce((t, x) => t + x.net, 0)).toBe(m.reduce((t, x) => t + x.debit - x.credit, 0));
    expect(p.find((x) => x.party === 'PT Komponen Nusantara')).toBeTruthy();
  });
  it('jurnal kosong menghasilkan tanpa mutasi', () => {
    expect(movements('1-1200', TRANSACTIONS, {})).toEqual([]);
  });
});

describe('kartu persediaan', () => {
  it('saldo akhir kartu = saldo akun persediaan sebelum penyesuaian', () => {
    const card = inventoryCard(open('1-1400'), TRANSACTIONS, journal);
    expect(card[0].note).toBe('Saldo awal');
    expect(card[card.length - 1].balance).toBe(pre('1-1400'));
  });
  it('saldo berjalan konsisten baris demi baris', () => {
    const card = inventoryCard(open('1-1400'), TRANSACTIONS, journal);
    for (let i = 1; i < card.length; i++) expect(card[i].balance).toBe(card[i - 1].balance + card[i].inAmount - card[i].outAmount);
  });
});
