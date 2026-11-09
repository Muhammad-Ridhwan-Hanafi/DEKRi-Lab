import { describe, expect, it } from 'vitest';
import { KEY } from '../../src/data';
import { emptyAnswers, gradeExam, pickExam } from '../../src/store/exam';

const lines = (no: number) =>
  KEY.readableTxn
    .find((t) => t.no === no)!
    .lines.filter((l) => l.code && l.code !== '-')
    .map((l, i) => ({ id: `k${i}`, code: l.code, debit: l.debit, credit: l.credit, memo: '' }));

describe('mode ujian', () => {
  it('pemilihan soal deterministik per seed, tanpa duplikat, dan menghormati jenis', () => {
    const a = pickExam(15, ['txn', 'adj', 'sc'], 42);
    expect(a).toEqual(pickExam(15, ['txn', 'adj', 'sc'], 42));
    expect(a).not.toEqual(pickExam(15, ['txn', 'adj', 'sc'], 43));
    expect(new Set(a.map((x) => x.kind + x.id)).size).toBe(15);
    expect(pickExam(500, ['adj'], 1).every((x) => x.kind === 'adj')).toBe(true);
    expect(pickExam(500, ['adj'], 1).length).toBeLessThanOrEqual(28);
    expect(pickExam(5, [], 1)).toEqual([]);
  });

  it('menilai jawaban benar, salah, kosong, dan "tidak perlu jurnal" tanpa umpan balik sebelumnya', () => {
    const noJournalNo = Number(Object.keys(KEY.analysis).find((n) => KEY.analysis[n].debit === '-'));
    const items = [
      { kind: 'txn' as const, id: '2' },
      { kind: 'txn' as const, id: '3' },
      { kind: 'txn' as const, id: '4' },
      { kind: 'txn' as const, id: String(noJournalNo) },
    ];
    const ans = emptyAnswers();
    ans.journal['2'] = lines(2); // benar
    ans.journal['3'] = lines(3).map((l) => ({ ...l, debit: l.credit, credit: l.debit })); // sisi terbalik
    ans.noJournal[String(noJournalNo)] = true; // benar
    const s = gradeExam(items, ans);
    const st = Object.fromEntries(s.results.map((r) => [r.item.id, r.result.status]));
    expect(st['2']).toBe('BENAR');
    expect(st['3']).not.toBe('BENAR');
    expect(st['4']).toBe('BELUM DIISI');
    expect(st[String(noJournalNo)]).toBe('BENAR');
    expect(s.correct).toBe(2);
    expect(s.total).toBe(4);
  });

  it('skenario numerik dan pilihan dinilai dengan kunci', () => {
    const sc = Object.entries(KEY.scenario);
    const num = sc.find(([, v]) => typeof v.key === 'number')!;
    const ans = emptyAnswers();
    ans.scenarios[num[0]] = { answer: String(num[1].key) };
    const s = gradeExam([{ kind: 'sc', id: num[0] }], ans);
    expect(s.results[0].result.status).toBe('BENAR');
  });
});

describe('ujian: cakupan dan jenis soal tambahan', () => {
  it('menyertakan koreksi dan deteksi kesalahan', async () => {
    const { pickExam: pick } = await import('../../src/store/exam');
    const a = pick(500, ['cor', 'err'], 1);
    expect(a.filter((x) => x.kind === 'cor')).toHaveLength(12);
    expect(a.filter((x) => x.kind === 'err')).toHaveLength(12);
  });
  it('cakupan tingkat, ditandai, dan topik lemah menyaring pool', async () => {
    const { pickExam: pick, scopeFilter } = await import('../../src/store/exam');
    const st = { flags: ['txn:5', 'adj:AJ01'], review: { 'txn:9': { box: 1, due: '2026-01-01' } } } as never;
    expect(
      pick(99, ['txn', 'adj'], 1, scopeFilter('ditandai', st))
        .map((x) => `${x.kind}:${x.id}`)
        .sort(),
    ).toEqual(['adj:AJ01', 'txn:5']);
    expect(pick(99, ['txn', 'adj', 'sc'], 1, scopeFilter('lemah', st))).toEqual([{ kind: 'txn', id: '9' }]);
    const exp = pick(999, ['txn', 'adj', 'sc'], 1, scopeFilter('Expert', st));
    expect(exp.length).toBeGreaterThan(0);
    expect(exp.every((x) => x.kind !== 'sc')).toBe(true);
  });
  it('menilai koreksi dan deteksi kesalahan dari kunci', () => {
    const corId = Object.keys(KEY.correctingNet)[0];
    const net = KEY.correctingNet[corId];
    const ans = emptyAnswers();
    ans.correcting[corId] = Object.entries(net).map(([code, v], i) => ({ id: `c${i}`, code, debit: v > 0 ? v : 0, credit: v < 0 ? -v : 0, memo: '' }));
    ans.errorType[corId] = KEY.errorType[corId];
    const errId = Object.keys(KEY.errorType).find((k) => !(k in KEY.correctingNet) && k !== corId)!;
    ans.errorType[errId] = KEY.errorType[errId];
    const s = gradeExam(
      [
        { kind: 'cor', id: corId },
        { kind: 'err', id: errId },
      ],
      ans,
    );
    expect(s.results.map((r) => r.result.status)).toEqual(['BENAR', 'BENAR']);
  });
});
