import 'fake-indexeddb/auto';
import { beforeAll, describe, expect, it } from 'vitest';
import corrData from '../../data/correcting-cases.json';
import { ADJUSTMENTS, COA, CORRECTING, KEY, OPENING, SCENARIOS, TRANSACTIONS } from '../../src/data';
import { INDUSTRY_PACKS } from '../../src/data/industri';
import { basis, cashFlowAnalysis, commonSizeBalance, commonSizeIncome, dupont, ratios, worksheet } from '../../src/engine/analysis';
import { packNet, parsePack, EXAMPLE_PACK } from '../../src/engine/casepack';
import { expectedClosing, postClosingTB, type ClosingEntry } from '../../src/engine/closing';
import { reconcileWithKey, runChecks } from '../../src/engine/checks';
import { tbTotals } from '../../src/engine/ledger';
import { buildTraceIndex } from '../../src/engine/trace';
import { PATTERNS, generate } from '../../src/engine/variants';
import type { JournalLine } from '../../src/engine/types';
import { MODULES } from '../../src/learning/modules';
import { moduleStatuses, overallPercent, practiceMap, recommend } from '../../src/learning/progress';
import { ledgerInputFor, makeCtx, resultFor, summarize, summarizeComponents, SECTION_IDS, closingVsKey, type ItemKind } from '../../src/store/derive';
import { dailyActivity, streak, weeklyAccuracy } from '../../src/store/activity';
import { gradeExam, pickExam, emptyAnswers, type ExamAnswers, type ExamKind } from '../../src/store/exam';
import { clearState, loadState, saveState } from '../../src/store/persistence';
import { dueReviews } from '../../src/store/review';
import { emptyState, makeBackup, parseBackup, type UserState } from '../../src/store/state';
import { weaknessReport } from '../../src/store/weakness';
import { useApp } from '../../src/store/useApp';
import { gradeJournal } from '../../src/validation/grade';

let n = 0;
const line = (code: string, debit = 0, credit = 0): JournalLine => ({ id: `s${++n}`, code, debit, credit, memo: '' });
const netToLines = (net: Record<string, number>): JournalLine[] => Object.entries(net).map(([c, v]) => (v >= 0 ? line(c, v, 0) : line(c, 0, -v)));
const S = () => useApp.getState();
const ctxNow = () => makeCtx(S().state);

const KINDS: ItemKind[] = ['ana', 'txn', 'adj', 'clo', 'rev', 'cor', 'err', 'sc'];

/** Kerjakan SELURUH soal seperti pengguna yang menjawab benar semuanya, lalu tekan Periksa di tiap soal. */
function solveEverything() {
  const st = S();
  // 1. analisis + jurnal transaksi
  for (const t of TRANSACTIONS) {
    const id = String(t.no);
    const a = KEY.analysis[id];
    const none = a.debit === '-' || a.debit === null;
    if (none) st.setAnalysis(id, { decision: 'Tidak perlu jurnal' });
    else
      st.setAnalysis(id, {
        decision: 'Perlu jurnal',
        debit: a.debit!,
        credit: a.credit!,
        amount: a.amount!,
        cashClass: a.cashClass ?? '',
        needsAdj: a.needsAdj!,
        affectsProfit: a.affectsProfit!,
        affectsCash: a.affectsCash!,
        reason: a.reason ?? '',
      });
    const r = KEY.readableTxn.find((x) => x.no === t.no)!;
    const real = r.lines.filter((l) => l.code !== '-');
    if (real.length)
      st.setLines(
        'journal',
        id,
        real.map((l) => line(l.code, l.debit, l.credit)),
      );
  }
  // 2. penyesuaian
  for (const a of KEY.readableAdj)
    st.setLines(
      'adjusting',
      a.code,
      a.lines.map((l) => line(l.code, l.debit, l.credit)),
    );
  // 3. penutup (butuh buku pengguna)
  const ctx = ctxNow();
  for (const code of SECTION_IDS.clo) {
    const e = expectedClosing(code, ctx.report.tb, ctx.netIncome);
    st.setClosing(code, e);
  }
  // 4. pembalik, koreksi, deteksi, skenario
  for (const [no, net] of Object.entries(KEY.reversingNet)) st.setLines('reversing', no, netToLines(net));
  for (const [no, net] of Object.entries(KEY.correctingNet)) st.setLines('correcting', no, netToLines(net));
  for (const [no, v] of Object.entries(KEY.errorType)) st.setErrorType(no, v);
  for (const s of SCENARIOS) st.setScenario(String(s.no), { answer: String(KEY.scenario[String(s.no)].key), reasoning: 'ok' });
  // 5. periksa semuanya
  for (const k of KINDS) for (const id of SECTION_IDS[k]) st.check(k, id);
}

beforeAll(async () => {
  await clearState();
  useApp.setState({ state: emptyState(), hydrated: true, saveStatus: 'idle' });
  solveEverything();
}, 120000);

describe('SIM 1 - semua soal dijawab benar lewat store asli', () => {
  it('jumlah soal sesuai data', () => {
    expect(TRANSACTIONS).toHaveLength(147);
    expect(ADJUSTMENTS).toHaveLength(28);
    expect(SCENARIOS).toHaveLength(26);
    expect(CORRECTING.correcting).toHaveLength(12);
    expect(CORRECTING.detect).toHaveLength(12);
  });

  for (const k of KINDS)
    it(`semua soal "${k}" berstatus BENAR setelah Periksa`, () => {
      const s = S().state;
      const c = ctxNow();
      const bad = SECTION_IDS[k].map((id) => ({ id, r: resultFor(s, k, id, c) })).filter((x) => x.r.status !== 'BENAR');
      expect(bad.map((b) => `${k}:${b.id}=${b.r.status} (${b.r.grade.message})`)).toEqual([]);
    });

  it('ringkasan tiap bagian: akurasi 100% tanpa item tertunda', () => {
    const s = S().state;
    const c = ctxNow();
    for (const k of KINDS) {
      const sm = summarize(s, k, c);
      expect(sm.pending, `${k} pending`).toBe(0);
      expect(sm.correct, `${k} correct`).toBe(sm.total);
      expect(sm.accuracy).toBe(1);
    }
  });

  it('skor komponen = 100%', () => {
    const cs = summarizeComponents(S().state, ctxNow());
    expect(cs.ratio).toBe(1);
    expect(cs.earned).toBe(cs.total);
  });

  it('penutup juga sesuai kunci kasus (status ganda)', () => {
    const bad = SECTION_IDS.clo.filter((c) => closingVsKey(S().state, c).status !== 'BENAR');
    expect(bad).toEqual([]);
  });

  it('transaksi pengecoh: tepat 11 dan semuanya dinilai tanpa jurnal', () => {
    const d = TRANSACTIONS.filter((t) => t.isDistractor);
    expect(d).toHaveLength(11);
    for (const t of d) expect(KEY.txnNet[String(t.no)]).toBeUndefined();
  });
});

describe('SIM 2 - laporan keuangan dari jawaban pengguna = kunci', () => {
  it('semua pemeriksaan konsistensi (sheet 23) lulus', () => {
    const rep = ctxNow().report;
    const checks = runChecks(rep, S().state.closing);
    expect(checks.filter((c) => !c.ok).map((c) => `${c.label}: ${c.a} vs ${c.b}`)).toEqual([]);
    expect(checks.length).toBeGreaterThanOrEqual(14);
  });

  it('14 angka laporan cocok dengan kunci', () => {
    const rec = reconcileWithKey(ctxNow().report, KEY.expectedStatements);
    expect(rec.filter((r) => !r.ok)).toEqual([]);
  });

  it('neraca saldo (sebelum dan sesudah penyesuaian) cocok dengan kunci untuk setiap akun', () => {
    const tb = ctxNow().report.tb;
    const diffs: string[] = [];
    for (const a of COA) {
      const e = KEY.expectedTB[a.code];
      const r = tb.find((x) => x.code === a.code)!;
      if (!e) {
        if (r.preBalance || r.adjBalance) diffs.push(`${a.code}: tidak ada di kunci tetapi bersaldo`);
        continue;
      }
      if (Math.abs(r.preBalance - e.pre) > 1) diffs.push(`${a.code} pre ${r.preBalance} vs ${e.pre}`);
      if (Math.abs(r.adjBalance - e.adj) > 1) diffs.push(`${a.code} adj ${r.adjBalance} vs ${e.adj}`);
    }
    expect(diffs).toEqual([]);
  });

  it('neraca saldo seimbang pra-penyesuaian, pasca-penyesuaian, dan pasca-penutupan', () => {
    const rep = ctxNow().report;
    const pre = tbTotals(rep.tb, 'pre');
    const adj = tbTotals(rep.tb, 'adjusted');
    expect(pre.debit).toBe(pre.credit);
    expect(adj.debit).toBe(adj.credit);
    const pc = postClosingTB(rep.tb, S().state.closing);
    expect(pc.debit).toBe(pc.credit);
    expect(pc.debit).toBeGreaterThan(0);
  });

  it('jurnal kunci: tiap transaksi/penyesuaian seimbang dan sama dengan txnNet/adjNet', () => {
    for (const t of KEY.readableTxn) {
      const real = t.lines.filter((l) => l.code !== '-');
      if (!real.length) continue;
      const d = real.reduce((x, l) => x + l.debit, 0);
      const c = real.reduce((x, l) => x + l.credit, 0);
      expect(d, `txn ${t.no}`).toBe(c);
      const net: Record<string, number> = {};
      for (const l of real) net[l.code] = (net[l.code] ?? 0) + l.debit - l.credit;
      for (const [k, v] of Object.entries(KEY.txnNet[String(t.no)])) expect(net[k] ?? 0, `txn ${t.no} ${k}`).toBe(v);
    }
    for (const a of KEY.readableAdj) {
      const d = a.lines.reduce((x, l) => x + l.debit, 0);
      const c = a.lines.reduce((x, l) => x + l.credit, 0);
      expect(d, a.code).toBe(c);
    }
  });

  it('saldo awal seimbang dan semua akun dikenal', () => {
    const d = OPENING.reduce((t, o) => t + o.debit, 0);
    const c = OPENING.reduce((t, o) => t + o.credit, 0);
    expect(d).toBe(c);
    for (const o of OPENING)
      expect(
        COA.some((a) => a.code === o.code),
        o.code,
      ).toBe(true);
  });

  it('semua sel laporan berupa angka berhingga (tanpa NaN/Infinity/undefined)', () => {
    const cells = ctxNow().report.cells as Record<string, unknown>;
    const bad = Object.entries(cells).filter(([, v]) => typeof v === 'number' && !Number.isFinite(v));
    expect(bad).toEqual([]);
    expect(Object.keys(cells).length).toBeGreaterThan(100);
  });

  it('penelusuran angka (trace) berjalan dan menghasilkan indeks', () => {
    const idx = buildTraceIndex(ledgerInputFor(S().state));
    expect(idx.byCell.size).toBeGreaterThan(0);
  });
});

describe('SIM 3 - analisis keuangan dari jawaban lengkap', () => {
  it('kertas kerja 10 kolom seimbang di setiap kolom', () => {
    const rep = ctxNow().report;
    const ws = worksheet(rep.tb, COA);
    expect(ws.totals.ns[0]).toBe(ws.totals.ns[1]);
    expect(ws.totals.adj[0]).toBe(ws.totals.adj[1]);
    expect(ws.totals.nssp[0]).toBe(ws.totals.nssp[1]);
    expect(ws.final.lr[0]).toBe(ws.final.lr[1]);
    expect(ws.final.neraca[0]).toBe(ws.final.neraca[1]);
    expect(ws.netIncome).toBe(ctxNow().netIncome);
  });

  it('16 rasio, common size, DuPont, arus kas: tanpa NaN dan arus kas rekonsiliasi', () => {
    const rep = ctxNow().report;
    const b = basis(rep.tb, COA);
    const rs = ratios(b);
    expect(rs).toHaveLength(16);
    for (const r of rs) {
      expect(r.value === null || Number.isFinite(r.value), `${r.name} = ${r.value}`).toBe(true);
      expect(r.interpretation).not.toMatch(/NaN|undefined|Infinity/);
      expect(r.source).not.toMatch(/NaN|undefined|Infinity/);
    }
    // identitas akuntansi
    expect(b.totalAssets).toBe(b.totalLiabilities + b.equity);
    const dp = dupont(b);
    expect(dp).not.toBeNull();
    const cs = commonSizeIncome(rep.tb, COA, b.netSales);
    for (const r of cs) expect(Number.isFinite(r.amount) && (r.pct === null || Number.isFinite(r.pct))).toBe(true);
    const cb = commonSizeBalance(rep.tb, COA, b.totalAssets, ctxNow().netIncome);
    for (const r of [...cb.assets, ...cb.funding]) expect(Number.isFinite(r.amount) && (r.pct === null || Number.isFinite(r.pct))).toBe(true);
    const cf = cashFlowAnalysis(rep.cells as never, ctxNow().netIncome);
    expect(cf.gap).toBe(0);
    expect(cf.operating + cf.investing + cf.financing).toBe(cf.net);
    expect(cf.opening + cf.net).toBe(cf.closing);
  });
});

describe('SIM 4 - ujian dengan semua jawaban benar', () => {
  const allKinds: ExamKind[] = ['txn', 'adj', 'sc', 'cor', 'err'];
  it('ujian seluruh soal (147+28+26+12+12) mendapat nilai 100%', () => {
    const items = pickExam(10_000, allKinds, 42);
    expect(items).toHaveLength(147 + 28 + 26 + 12 + 12);
    const a: ExamAnswers = emptyAnswers();
    for (const it of items) {
      if (it.kind === 'txn') {
        const t = KEY.readableTxn.find((x) => String(x.no) === it.id)!;
        const real = t.lines.filter((l) => l.code !== '-');
        if (real.length) a.journal[it.id] = real.map((l) => line(l.code, l.debit, l.credit));
        else a.noJournal[it.id] = true;
      } else if (it.kind === 'adj') a.adjusting[it.id] = KEY.readableAdj.find((x) => x.code === it.id)!.lines.map((l) => line(l.code, l.debit, l.credit));
      else if (it.kind === 'sc') a.scenarios[it.id] = { answer: String(KEY.scenario[it.id].key) };
      else if (it.kind === 'cor') {
        if (KEY.correctingNet[it.id]) a.correcting[it.id] = netToLines(KEY.correctingNet[it.id]);
        else a.errorType[it.id] = KEY.errorType[it.id];
      } else a.errorType[it.id] = KEY.errorType[it.id];
    }
    const score = gradeExam(items, a);
    const bad = score.results.filter((r) => r.result.status !== 'BENAR').map((r) => `${r.item.kind}:${r.item.id}=${r.result.status}`);
    expect(bad).toEqual([]);
    expect(score.correct).toBe(score.total);
  });

  it('ujian kosong: tidak ada yang BENAR kecuali yang memang tidak butuh jawaban', () => {
    const items = pickExam(10_000, allKinds, 7);
    const score = gradeExam(items, emptyAnswers());
    const right = score.results.filter((r) => r.result.status === 'BENAR').map((r) => `${r.item.kind}:${r.item.id}`);
    expect(right).toEqual([]);
  });

  it('pengacakan deterministik dan tidak ada soal ganda', () => {
    const a = pickExam(60, allKinds, 99).map((x) => `${x.kind}:${x.id}`);
    const b = pickExam(60, allKinds, 99).map((x) => `${x.kind}:${x.id}`);
    expect(a).toEqual(b);
    expect(new Set(a).size).toBe(a.length);
  });
});

describe('SIM 5 - Jalur Belajar sampai selesai', () => {
  it('kuis benar semua -> seluruh materi Completed berurutan sesuai prasyarat', () => {
    let guard = 0;
    for (;;) {
      const st = S().state;
      const stat = moduleStatuses(st.learning, practiceMap(st, ctxNow()));
      if (stat.every((x) => x.status === 'Completed')) break;
      const next = recommend(stat);
      expect(next, 'ada materi belum selesai tetapi tidak ada rekomendasi (buntu)').not.toBeNull();
      const m = next!.module;
      const res = S().submitQuiz(
        m.id,
        m.quiz.map((q) => q.answer),
      );
      expect(res, `kuis ${m.id} ditolak`).not.toBeNull();
      expect(res!.passed).toBe(true);
      if (++guard > 40) throw new Error('loop belajar tidak selesai');
    }
    const stat = moduleStatuses(S().state.learning, practiceMap(S().state, ctxNow()));
    expect(overallPercent(stat)).toBe(100);
    expect(stat).toHaveLength(MODULES.length);
  });

  it('data kuis tiap materi valid (indeks jawaban dalam rentang, opsi tidak duplikat)', () => {
    for (const m of MODULES)
      for (const q of m.quiz) {
        expect(q.answer, `${m.id}`).toBeGreaterThanOrEqual(0);
        expect(q.answer).toBeLessThan(q.options.length);
        expect(new Set(q.options).size).toBe(q.options.length);
      }
  });
});

describe('SIM 6 - dasbor, riwayat, dan ulasan', () => {
  it('weaknessReport kosong saat semua benar; aktivitas, streak, akurasi mingguan terhitung', () => {
    const s = S().state;
    const w = weaknessReport(s, ctxNow());
    expect(w.topics).toEqual([]);
    expect(s.log.length).toBeGreaterThan(200);
    expect(dailyActivity(s.log, 14)).toHaveLength(14);
    expect(streak(s.log)).toBeGreaterThanOrEqual(1);
    for (const x of weeklyAccuracy(s.log, 4) as Array<{ accuracy: number | null }>)
      expect(x.accuracy === null || (x.accuracy >= 0 && x.accuracy <= 1)).toBe(true);
    expect(Array.isArray(dueReviews(s))).toBe(true);
  });

  it('riwayat urungkan dibatasi 100 langkah dan Ctrl+Z mundur satu langkah', () => {
    expect(S().past.length).toBeLessThanOrEqual(100);
    const before = S().state.journal['1'];
    S().setLines('journal', '1', []);
    S().undo();
    expect(S().state.journal['1']).toEqual(before);
    S().redo();
    S().undo();
  });
});

describe('SIM 7 - persistensi dan cadangan penuh', () => {
  it('simpan -> muat dari IndexedDB identik', async () => {
    await saveState(S().state);
    const loaded = await loadState();
    expect(loaded).not.toBeNull();
    expect(loaded!.journal).toEqual(S().state.journal);
    expect(loaded!.closing).toEqual(S().state.closing);
    expect(loaded!.learning).toEqual(S().state.learning);
  });

  it('ekspor -> impor cadangan penuh: tidak ada isian yang dibuang', () => {
    const b = makeBackup(S().state);
    const text = JSON.stringify(b);
    expect(text.length).toBeLessThan(25 * 1024 * 1024);
    const parsed = parseBackup(text);
    const st: UserState = (parsed as { state: UserState }).state ?? (parsed as unknown as UserState);
    expect(st.journal).toEqual(S().state.journal);
    expect(st.adjusting).toEqual(S().state.adjusting);
    expect(st.closing).toEqual(S().state.closing);
    expect(st.scenarios).toEqual(S().state.scenarios);
    expect(st.errorType).toEqual(S().state.errorType);
    expect(Object.keys(st.checked)).toEqual(Object.keys(S().state.checked));
    // impor lalu hitung ulang: hasil tetap sama
    const c2 = makeCtx(st);
    expect(c2.netIncome).toBe(ctxNow().netIncome);
  });
});

describe('SIM 8 - negatif: penilai tidak asal menerima', () => {
  it('membalik sisi, mengubah nominal, dan mengosongkan jawaban tidak pernah BENAR', () => {
    let tested = 0;
    for (const [no, net] of Object.entries(KEY.txnNet)) {
      const lines = netToLines(net);
      expect(gradeJournal(lines, net).status, `txn ${no} benar`).toBe('BENAR');
      expect(gradeJournal([], net).status, `txn ${no} kosong`).toBe('BELUM DIISI');
      const flipped = lines.map((l) => ({ ...l, debit: l.credit, credit: l.debit }));
      expect(gradeJournal(flipped, net).status, `txn ${no} terbalik`).not.toBe('BENAR');
      const off = lines.map((l, i) => (i === 0 ? { ...l, debit: l.debit ? l.debit + 5000 : 0, credit: l.credit ? l.credit + 5000 : 0 } : l));
      expect(gradeJournal(off, net).status, `txn ${no} nominal`).not.toBe('BENAR');
      tested++;
    }
    expect(tested).toBe(136);
  });

  it('kasus cor:11 (tanpa jurnal koreksi): hanya jenis kesalahan yang sesuai kunci dinilai BENAR', () => {
    const base = { ...emptyState(), settings: { validationMode: 'live' as const } };
    const right: UserState = { ...base, errorType: { '11': KEY.errorType['11'] } };
    const wrong: UserState = { ...base, errorType: { '11': 'Salah akun' } };
    expect(KEY.errorType['11']).toBe('Salah klasifikasi arus kas');
    expect(resultFor(right, 'cor', '11', makeCtx(right)).status).toBe('BENAR');
    expect(resultFor(wrong, 'cor', '11', makeCtx(wrong)).status).toBe('PERIKSA');
    expect(resultFor(base, 'cor', '11', makeCtx(base)).status).toBe('BELUM DIISI');
  });

  it('kasus koreksi dengan jurnal: yang dinilai jurnalnya; jenis kesalahan dinilai terpisah di soal "err"', () => {
    const s: UserState = {
      ...emptyState(),
      settings: { validationMode: 'live' },
      errorType: { '1': 'Salah nominal' },
      correcting: { '1': netToLines(KEY.correctingNet['1']) },
    };
    expect(resultFor(s, 'cor', '1', makeCtx(s)).status).toBe('BENAR');
    expect(resultFor(s, 'err', '1', makeCtx(s)).status).toBe(KEY.errorType['1'] === 'Salah nominal' ? 'BENAR' : 'PERIKSA');
  });
});

describe('SIM 9 - generator varian (semua pola x banyak benih)', () => {
  it('semua pola x 1..400 benih: jurnal seimbang, nominal bulat positif, narasi bersih, kunci dinilai BENAR', () => {
    const problems: string[] = [];
    for (const p of PATTERNS)
      for (let seed = 1; seed <= 400; seed++) {
        const v = generate(p.pattern, seed);
        const d = v.lines.reduce((t, l) => t + l.debit, 0);
        const c = v.lines.reduce((t, l) => t + l.credit, 0);
        if (d !== c) problems.push(`${v.id} tidak seimbang ${d}/${c}`);
        if (v.lines.some((l) => !Number.isInteger(l.debit) || !Number.isInteger(l.credit) || l.debit < 0 || l.credit < 0))
          problems.push(`${v.id} nominal tidak valid`);
        if (v.lines.some((l) => l.debit > 0 && l.credit > 0)) problems.push(`${v.id} satu baris dua sisi`);
        if (/NaN|undefined|Infinity|\[object/.test(v.narrative + v.explain)) problems.push(`${v.id} teks rusak`);
        const known = (code: string) => COA.some((a) => a.code === code) || ['1-1850', '2-1550', '2-1560'].includes(code);
        for (const l of v.lines) if (!known(l.code)) problems.push(`${v.id} akun ${l.code} tidak dikenal`);
        const lines = v.lines.map((l) => line(l.code, l.debit, l.credit));
        if (gradeJournal(lines, v.net, 0).status !== 'BENAR') problems.push(`${v.id} kunci tidak dinilai BENAR`);
        if (generate(p.pattern, seed).narrative !== v.narrative) problems.push(`${v.id} tidak deterministik`);
      }
    expect(problems.slice(0, 30)).toEqual([]);
  });
});

describe('SIM 10 - soal berbagai industri', () => {
  it('103 soal, tiap kunci seimbang, akun dikenal, tidak ada id ganda; buku besar tiap industri seimbang', () => {
    const total = INDUSTRY_PACKS.reduce((t, p) => t + p.items.length, 0);
    expect(INDUSTRY_PACKS).toHaveLength(7);
    expect(total).toBe(103);
    const problems: string[] = [];
    for (const pk of INDUSTRY_PACKS) {
      const own = new Set((pk.accounts ?? []).map((a) => a.code));
      const ids = new Set<string>();
      const bal: Record<string, number> = {};
      for (const it of pk.items) {
        if (ids.has(it.id)) problems.push(`${pk.id}/${it.id} id ganda`);
        ids.add(it.id);
        const d = it.lines.reduce((t, l) => t + l.debit, 0);
        const c = it.lines.reduce((t, l) => t + l.credit, 0);
        if (d !== c) problems.push(`${pk.id}/${it.id} tidak seimbang`);
        for (const l of it.lines) if (!own.has(l.code)) problems.push(`${pk.id}/${it.id} akun ${l.code} bukan milik paket`);
        const lines = it.lines.map((l) => line(l.code, l.debit, l.credit));
        if (gradeJournal(lines, packNet(it), 0).status !== 'BENAR') problems.push(`${pk.id}/${it.id} kunci tidak BENAR`);
        for (const [k, v] of Object.entries(packNet(it))) bal[k] = (bal[k] ?? 0) + v;
        if (!it.explain) problems.push(`${pk.id}/${it.id} tanpa penjelasan`);
        if (/NaN|undefined|Infinity/.test(it.narrative)) problems.push(`${pk.id}/${it.id} narasi rusak`);
      }
      if (Object.values(bal).reduce((t, v) => t + v, 0) !== 0) problems.push(`${pk.id} buku besar tidak seimbang`);
      // akun tanpa tipe normal yang masuk akal: akun beban bersaldo kredit akhir / pendapatan bersaldo debit akhir
      for (const a of pk.accounts ?? []) {
        const v = bal[a.code] ?? 0;
        if (a.type === 'Expense' && v < 0 && !/retur|potongan|pembalik/i.test(a.name)) problems.push(`${pk.id} beban ${a.code} ${a.name} bersaldo kredit ${v}`);
        if (a.type === 'Revenue' && v > 0 && !/retur|potongan|diskon/i.test(a.name))
          problems.push(`${pk.id} pendapatan ${a.code} ${a.name} bersaldo debit ${v}`);
        if (a.type === 'Asset' && a.normal === 'Debit' && v < 0 && !/akumulasi|penyisihan|cadangan/i.test(a.name))
          problems.push(`${pk.id} aset ${a.code} ${a.name} bersaldo kredit ${v}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('contoh paket JSON bawaan lolos parsePack', () => {
    expect(() => parsePack(JSON.stringify(EXAMPLE_PACK))).not.toThrow();
  });
});

describe('SIM 11 - integritas data kasus', () => {
  it('semua id soal punya kunci; tidak ada kunci yatim', () => {
    for (const t of TRANSACTIONS) expect(KEY.analysis[String(t.no)], `analysis ${t.no}`).toBeTruthy();
    for (const a of ADJUSTMENTS) expect(KEY.adjNet[a.code], `adj ${a.code}`).toBeTruthy();
    for (const s of SCENARIOS) expect(KEY.scenario[String(s.no)], `sc ${s.no}`).toBeTruthy();
    for (const c of corrData.detect) expect(KEY.errorType[String(c.no)], `err ${c.no}`).toBeTruthy();
    for (const k of Object.keys(KEY.txnNet))
      expect(
        TRANSACTIONS.some((t) => String(t.no) === k),
        `txnNet ${k}`,
      ).toBe(true);
    for (const k of Object.keys(KEY.adjNet))
      expect(
        ADJUSTMENTS.some((a) => a.code === k),
        `adjNet ${k}`,
      ).toBe(true);
  });

  it('kunci skenario pilihan ada di opsi; skenario numerik berupa angka', () => {
    for (const s of SCENARIOS) {
      const k = KEY.scenario[String(s.no)].key;
      if (s.kind === 'choice') expect(s.options?.map(String), `sc ${s.no}`).toContain(String(k));
      else expect(Number.isFinite(Number(k)), `sc ${s.no}`).toBe(true);
    }
  });

  it('opsi jenis kesalahan memuat semua kunci', () => {
    for (const v of Object.values(KEY.errorType)) expect(corrData.errorTypeOptions).toContain(v);
  });

  it('akun di semua kunci jurnal ada di bagan akun', () => {
    const codes = new Set(COA.map((a) => a.code));
    for (const m of [KEY.txnNet, KEY.adjNet, KEY.correctingNet, KEY.reversingNet])
      for (const net of Object.values(m)) for (const c of Object.keys(net)) expect(codes.has(c), c).toBe(true);
  });

  it('tidak ada hasil yang bergantung pada urutan (hitung ulang dua kali identik)', () => {
    const a = JSON.stringify(ctxNow().report.cells);
    const b = JSON.stringify(makeCtx(S().state).report.cells);
    expect(a).toBe(b);
  });
});

void ({} as ClosingEntry);
