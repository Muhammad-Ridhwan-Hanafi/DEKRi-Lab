import { describe, expect, it } from 'vitest';
import { KEY } from '../../src/data';
import { computeReport } from '../../src/engine';
import { generate } from '../../src/engine/variants';
import { MODULES } from '../../src/learning/modules';
import { gradeQuiz, moduleStatuses, overallPercent, practiceMap, recommend } from '../../src/learning/progress';
import { makeCtx } from '../../src/store/derive';
import { emptyState, migrate, type UserState } from '../../src/store/state';
import { useApp } from '../../src/store/useApp';
import { keyLedgerInput } from '../helpers';

const statuses = (s: UserState) => moduleStatuses(s.learning, practiceMap(s, makeCtx(s)));
const allRight = (id: string) => MODULES.find((m) => m.id === id)!.quiz.map((q) => q.answer);

describe('struktur materi', () => {
  it('13 materi berurutan, prasyarat mengacu ke materi sebelumnya, tiap materi lengkap', () => {
    expect(MODULES).toHaveLength(13);
    MODULES.forEach((m, i) => {
      expect(m.no).toBe(i + 1);
      for (const p of m.prereq) expect(MODULES.findIndex((x) => x.id === p)).toBeLessThan(i);
      expect(m.objectives.length).toBeGreaterThan(0);
      expect(m.concept.length).toBeGreaterThan(40);
      expect(m.theory.length).toBeGreaterThan(0);
      expect(m.quiz).toHaveLength(3);
      for (const q of m.quiz) {
        expect(q.options.length).toBeGreaterThanOrEqual(3);
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expect(q.answer).toBeLessThan(q.options.length);
        expect(new Set(q.options).size).toBe(q.options.length);
        expect(q.why.length).toBeGreaterThan(10);
      }
      expect(m.example.variant || (m.example.caseText && m.example.solutionText)).toBeTruthy();
    });
  });
  it('jawaban benar tidak selalu di posisi yang sama', () => {
    const pos = new Set(MODULES.flatMap((m) => m.quiz.map((q) => q.answer)));
    expect(pos.size).toBeGreaterThan(1);
  });
  it('contoh berbasis varian valid dan seimbang', () => {
    for (const m of MODULES)
      if (m.example.variant) {
        const v = generate(m.example.variant.pattern, m.example.variant.seed);
        expect(v.lines.reduce((t, l) => t + l.debit - l.credit, 0)).toBe(0);
      }
  });
  it('angka yang disebut dalam materi cocok dengan data: AJ01 = 72 juta + 36 juta saldo awal = 108 juta, diskon 2% atas 186 juta', () => {
    const r = computeReport({ ...keyLedgerInput(), adjusting: [] });
    expect(r.tb.find((x) => x.code === '1-1600')!.opening).toBe(36_000_000);
    expect(r.tb.find((x) => x.code === '1-1400')!.opening).toBe(468_500_000);
    expect(r.tb.find((x) => x.code === '1-1500')!.opening).toBe(9_800_000);
    expect(72_000_000 + 36_000_000).toBe(108_000_000);
    expect(KEY.readableAdj.find((a) => a.code === 'AJ01')!.lines.find((l) => l.code === '6-1100')!.debit).toBe(108_000_000);
    expect(Math.round(186_000_000 * 0.02)).toBe(3_720_000);
    expect(468_500_000 + 186_000_000 - 57_000_000).toBe(597_500_000);
  });
});

describe('penilaian kuis', () => {
  it('semua benar lulus; 2 dari 3 lulus; 1 dari 3 tidak; jawaban kosong atau di luar rentang dianggap salah', () => {
    const q = MODULES[0].quiz;
    expect(
      gradeQuiz(
        q,
        q.map((x) => x.answer),
      ).passed,
    ).toBe(true);
    const two = q.map((x, i) => (i === 0 ? (x.answer + 1) % x.options.length : x.answer));
    expect(gradeQuiz(q, two)).toMatchObject({ correct: 2, passed: true });
    const one = q.map((x, i) => (i === 0 ? x.answer : (x.answer + 1) % x.options.length));
    expect(gradeQuiz(q, one)).toMatchObject({ correct: 1, passed: false });
    expect(gradeQuiz(q, [])).toMatchObject({ correct: 0, passed: false });
    expect(gradeQuiz(q, [99, -5, 1.5]).correct).toBe(0);
  });
});

describe('kemajuan, prasyarat, rekomendasi', () => {
  it('awal: materi 1 terbuka dan Not Started, sisanya terkunci; rekomendasi = materi 1', () => {
    const s = statuses(emptyState());
    expect(s[0]).toMatchObject({ status: 'Not Started', locked: false, percent: 0 });
    expect(s.slice(1).every((x) => x.locked)).toBe(true);
    expect(recommend(s)!.module.id).toBe('fundamental');
    expect(overallPercent(s)).toBe(0);
  });
  it('kuis materi terkunci ditolak dan tidak mengubah apa pun', () => {
    useApp.setState({ state: emptyState() });
    expect(useApp.getState().submitQuiz('jurnal', allRight('jurnal'))).toBeNull();
    expect(useApp.getState().submitQuiz('tidak-ada', [])).toBeNull();
    expect(useApp.getState().state.learning).toEqual({ quiz: {}, history: [] });
  });
  it('lulus kuis materi tanpa latihan = Completed, membuka materi berikutnya, riwayat tercatat', () => {
    useApp.setState({ state: emptyState() });
    const r = useApp.getState().submitQuiz('fundamental', allRight('fundamental'))!;
    expect(r.passed).toBe(true);
    const st = useApp.getState().state;
    const s = statuses(st);
    expect(s[0]).toMatchObject({ status: 'Completed', percent: 100 });
    expect(s[1].locked).toBe(false);
    expect(s[2].locked).toBe(true);
    expect(recommend(s)!.module.id).toBe('coa');
    expect(st.learning.history).toHaveLength(1);
  });
  it('gagal kuis tidak menurunkan hasil terbaik; percobaan bertambah', () => {
    useApp.setState({ state: emptyState() });
    useApp.getState().submitQuiz('fundamental', allRight('fundamental'));
    useApp.getState().submitQuiz('fundamental', []);
    const q = useApp.getState().state.learning.quiz.fundamental;
    expect(q.best).toBe(1);
    expect(q.attempts).toBe(2);
  });
  it('materi dengan syarat latihan: lulus kuis saja belum Completed; latihan nyata melengkapinya', () => {
    // buka kunci materi 1-3 lewat kuis
    useApp.setState({ state: emptyState() });
    for (const id of ['fundamental', 'coa', 'persamaan']) useApp.getState().submitQuiz(id, allRight(id));
    useApp.getState().submitQuiz('analisis', allRight('analisis'));
    let s = statuses(useApp.getState().state);
    expect(s[3]).toMatchObject({ status: 'In Progress', practiceDone: false });
    expect(recommend(s)!.module.id).toBe('analisis');
    expect(s[4].locked).toBe(true); // jurnal menunggu analisis selesai
    // kerjakan 10 analisis dengan jawaban kunci, mode langsung
    const st = useApp.getState().state;
    const analysis: UserState['analysis'] = {};
    let n = 0;
    for (const [no, k] of Object.entries(KEY.analysis)) {
      if (k.debit === '-' || n >= 10) continue;
      analysis[no] = {
        decision: 'Perlu jurnal',
        debit: k.debit ?? undefined,
        credit: k.credit ?? undefined,
        amount: k.amount ?? undefined,
        cashClass: k.cashClass ?? undefined,
        needsAdj: k.needsAdj ?? undefined,
        affectsProfit: k.affectsProfit ?? undefined,
        affectsCash: k.affectsCash ?? undefined,
      };
      n++;
    }
    useApp.setState({ state: { ...st, analysis, settings: { ...st.settings, validationMode: 'live' } } });
    s = statuses(useApp.getState().state);
    expect(s[3].practice!.done).toBeGreaterThanOrEqual(10);
    expect(s[3].status).toBe('Completed');
    expect(s[4].locked).toBe(false);
  });
  it('item yang kuncinya dibuka tidak dihitung sebagai latihan', () => {
    const analysis: UserState['analysis'] = {};
    const revealed: string[] = [];
    for (const [no, k] of Object.entries(KEY.analysis).slice(0, 12)) {
      if (k.debit === '-') continue;
      analysis[no] = {
        decision: 'Perlu jurnal',
        debit: k.debit ?? undefined,
        credit: k.credit ?? undefined,
        amount: k.amount ?? undefined,
        cashClass: k.cashClass ?? undefined,
        needsAdj: k.needsAdj ?? undefined,
        affectsProfit: k.affectsProfit ?? undefined,
        affectsCash: k.affectsCash ?? undefined,
      };
      revealed.push(`ana:${no}`);
    }
    const st: UserState = { ...emptyState(), analysis, revealed, settings: { validationMode: 'live' } };
    expect(practiceMap(st, makeCtx(st)).analisis!.done).toBe(0);
  });
  it('persentase menggabungkan kuis dan latihan; tanpa latihan hanya kuis', () => {
    const st: UserState = {
      ...emptyState(),
      learning: {
        quiz: {
          fundamental: { best: 1, attempts: 1, lastAt: '' },
          coa: { best: 1, attempts: 1, lastAt: '' },
          persamaan: { best: 1, attempts: 1, lastAt: '' },
          analisis: { best: 1, attempts: 1, lastAt: '' },
        },
        history: [],
      },
    };
    const s = statuses(st);
    expect(s[3].percent).toBe(50);
    expect(s[0].percent).toBe(100);
  });
});

describe('migrasi data belajar', () => {
  it('cadangan lama tanpa kolom learning terbaca kosong; data rusak dibuang', () => {
    const old: Record<string, unknown> = { ...emptyState() };
    delete old.learning;
    expect(migrate(old)!.learning).toEqual({ quiz: {}, history: [] });
    const bad = {
      ...emptyState(),
      learning: {
        quiz: { a: { best: 5, attempts: 1 }, b: { best: 0.5, attempts: 2, lastAt: 'x' } },
        history: [{ x: 1 }, { ts: 't', module: 'a', correct: 1, total: 3 }],
      },
    };
    const m = migrate(bad)!.learning;
    expect(Object.keys(m.quiz)).toEqual(['b']);
    expect(m.history).toHaveLength(1);
  });
});
