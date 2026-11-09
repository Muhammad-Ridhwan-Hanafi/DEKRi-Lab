import { describe, expect, it } from 'vitest';
import { TRANSACTIONS } from '../../src/data';
import { makeCtx, itemKey } from '../../src/store/derive';
import { emptyState, signature } from '../../src/store/state';
import { weaknessReport } from '../../src/store/weakness';
import { KEY } from '../../src/data';

const lines = (no: number, flip = false) =>
  KEY.readableTxn
    .find((t) => t.no === no)!
    .lines.map((l, i) => ({ id: `k${i}`, code: l.code, debit: flip ? l.credit : l.debit, credit: flip ? l.debit : l.credit, memo: '' }));

function checked(state: ReturnType<typeof emptyState>, no: number) {
  const ctx = makeCtx(state);
  const k = itemKey('txn', no);
  state.checked[k] = signature(state.journal[String(no)]) + '#' + (state.analysis[String(no)]?.decision ?? '');
  state.attempts[k] = (state.attempts[k] ?? 0) + 1;
  return ctx;
}

describe('ringkasan kelemahan', () => {
  it('kosong bila belum ada yang diperiksa', () => {
    const s = emptyState();
    const r = weaknessReport(s, makeCtx(s));
    expect(r.topics).toEqual([]);
    expect(r.reasons).toEqual([]);
  });

  it('topik dengan jawaban salah naik ke atas, lengkap dengan alasan dan item berikutnya', () => {
    const s = emptyState();
    const flipNo = 1;
    s.journal[String(flipNo)] = lines(flipNo, true); // sisi terbalik
    s.journal['2'] = lines(2); // benar
    checked(s, flipNo);
    checked(s, 2);
    const ctx = makeCtx(s);
    const r = weaknessReport(s, ctx);
    const topic1 = TRANSACTIONS.find((t) => t.no === flipNo)!.topic;
    expect(r.topics[0]).toMatchObject({ topic: topic1, kind: 'txn', wrong: 1, next: { kind: 'txn', id: '1' } });
    expect(r.reasons[0]).toEqual({ reason: 'wrong-side', count: 1 });
    expect(r.topics.some((t) => t.topic === TRANSACTIONS.find((x) => x.no === 2)!.topic && t.wrong > 0)).toBe(false);
  });

  it('salah dulu baru benar dihitung sebagai percobaan ulang, dan kunci yang dibuka dikecualikan', () => {
    const s = emptyState();
    s.journal['2'] = lines(2);
    s.checked[itemKey('txn', 2)] = signature(s.journal['2']) + '#';
    s.attempts[itemKey('txn', 2)] = 3;
    const r = weaknessReport(s, makeCtx(s));
    expect(r.topics[0]).toMatchObject({ wrong: 0, retries: 2, score: 2 });
    s.revealed.push(itemKey('txn', 2));
    expect(weaknessReport(s, makeCtx(s)).topics).toEqual([]);
  });
});
