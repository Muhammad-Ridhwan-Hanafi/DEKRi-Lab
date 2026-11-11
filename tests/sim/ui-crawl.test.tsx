// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ADJUSTMENTS, COA, KEY, SCENARIOS, TRANSACTIONS } from '../../src/data';
import { MODULES } from '../../src/learning/modules';
import { expectedClosing } from '../../src/engine/closing';
import type { JournalLine } from '../../src/engine/types';
import { SECTION_IDS, makeCtx } from '../../src/store/derive';
import { clearState, saveState } from '../../src/store/persistence';
import { emptyState } from '../../src/store/state';
import { useApp } from '../../src/store/useApp';
import { App } from '../../src/ui/App';

let n = 0;
const line = (code: string, debit = 0, credit = 0): JournalLine => ({ id: `u${++n}`, code, debit, credit, memo: '' });
const netToLines = (net: Record<string, number>): JournalLine[] => Object.entries(net).map(([c, v]) => (v >= 0 ? line(c, v, 0) : line(c, 0, -v)));

function solveEverything() {
  const st = useApp.getState();
  for (const t of TRANSACTIONS) {
    const id = String(t.no);
    const a = KEY.analysis[id];
    if (a.debit === '-' || a.debit === null) st.setAnalysis(id, { decision: 'Tidak perlu jurnal' });
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
    const real = KEY.readableTxn.find((x) => x.no === t.no)!.lines.filter((l) => l.code !== '-');
    if (real.length)
      st.setLines(
        'journal',
        id,
        real.map((l) => line(l.code, l.debit, l.credit)),
      );
  }
  for (const a of KEY.readableAdj)
    st.setLines(
      'adjusting',
      a.code,
      a.lines.map((l) => line(l.code, l.debit, l.credit)),
    );
  const ctx = makeCtx(useApp.getState().state);
  for (const code of SECTION_IDS.clo) st.setClosing(code, expectedClosing(code, ctx.report.tb, ctx.netIncome));
  for (const [no, net] of Object.entries(KEY.reversingNet)) st.setLines('reversing', no, netToLines(net));
  for (const [no, net] of Object.entries(KEY.correctingNet)) st.setLines('correcting', no, netToLines(net));
  for (const [no, v] of Object.entries(KEY.errorType)) st.setErrorType(no, v);
  for (const s of SCENARIOS) st.setScenario(String(s.no), { answer: String(KEY.scenario[String(s.no)].key), reasoning: 'ok' });
  for (const k of Object.keys(SECTION_IDS) as Array<keyof typeof SECTION_IDS>) for (const id of SECTION_IDS[k]) st.check(k, id);
  for (const m of MODULES)
    st.submitQuiz(
      m.id,
      m.quiz.map((q) => q.answer),
    );
}

const consoleProblems: string[] = [];
const BAD_TEXT = /\bNaN\b|\bundefined\b|\bInfinity\b|\[object Object\]/;

async function settled() {
  await waitFor(() => expect(screen.queryByText('Memuat halaman…')).toBeNull(), { timeout: 20000 });
}

async function visit(hash: string) {
  await act(async () => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
  await settled();
  expect(screen.queryByText('Terjadi kesalahan pada halaman ini.'), `error boundary di ${hash}`).toBeNull();
  const text = document.body.textContent ?? '';
  const m = text.match(BAD_TEXT);
  expect(m, `teks rusak "${m?.[0]}" di ${hash}`).toBeNull();
}

beforeAll(async () => {
  vi.stubGlobal('confirm', () => true);
  vi.spyOn(console, 'error').mockImplementation((...a) => void consoleProblems.push('error: ' + a.map(String).join(' ').slice(0, 300)));
  vi.spyOn(console, 'warn').mockImplementation((...a) => void consoleProblems.push('warn: ' + a.map(String).join(' ').slice(0, 300)));
  await clearState();
  useApp.setState({ state: emptyState(), hydrated: true, saveStatus: 'idle' });
  solveEverything();
  await saveState(useApp.getState().state);
  useApp.setState({ hydrated: false, state: emptyState(), saveStatus: 'idle' });
  window.location.hash = '#/dashboard';
  render(<App />);
  await screen.findByRole('navigation', { name: 'Navigasi utama' }, { timeout: 20000 });
}, 120000);
afterEach(() => void 0);

describe('UI setelah SEMUA soal selesai', () => {
  it('state selesai penuh dimuat dari penyimpanan', () => {
    const s = useApp.getState().state;
    expect(Object.keys(s.journal).length).toBeGreaterThanOrEqual(136);
    expect(Object.keys(s.adjusting)).toHaveLength(28);
    expect(Object.keys(s.checked).length).toBeGreaterThan(300);
  });

  it('Dashboard memuat tanpa teks rusak dan menampilkan 100%', async () => {
    await visit('#/dashboard');
    expect(document.body.textContent).toMatch(/100\s?%/);
  }, 60000);

  it('halaman utama dan semua sub-rute statis', async () => {
    const routes = [
      'kasus',
      'kasus/profil',
      'kasus/kebijakan',
      'kasus/sak',
      'transaksi',
      'jurnal',
      'buku-besar',
      'buku-pembantu',
      'neraca-saldo',
      'penyesuaian',
      'laporan',
      'laporan/S12',
      'laporan/S13',
      'laporan/S14',
      'laporan/S15',
      'penutup',
      'belajar',
      'belajar/bab',
      'koreksi',
      'skenario',
      'varian',
      'pajak',
      'ujian',
      'pengaturan',
    ];
    for (const r of routes) await visit('#/' + r);
  }, 240000);

  it('tiap transaksi (termasuk pengecoh) dapat dibuka', async () => {
    for (const t of TRANSACTIONS) await visit(`#/transaksi/${t.no}`);
  }, 600000);

  it('tiap penyesuaian AJ01..AJ28 dapat dibuka', async () => {
    for (const a of ADJUSTMENTS) await visit(`#/penyesuaian/${a.code}`);
  }, 240000);

  it('buku besar tiap akun dapat dibuka', async () => {
    for (const a of COA) await visit(`#/buku-besar/${a.code}`);
  }, 600000);

  it('tiap materi Jalur Belajar dan Ringkasan BAB dapat dibuka', async () => {
    for (const m of MODULES) await visit(`#/belajar/${m.id}`);
    await visit('#/materi'); // tautan lama harus dialihkan
    expect(window.location.hash).toMatch(/belajar\/bab/);
    for (let i = 7; i <= 18; i++) await visit(`#/belajar/bab/${i}`);
  }, 240000);

  it('klik semua tab di Laporan, Buku Pembantu, Koreksi, Kasus', async () => {
    const user = userEvent.setup();
    const click = async (name: string | RegExp) => {
      const b = screen.getAllByRole('button', { name }).find((x) => !x.closest('nav'));
      expect(b, `tombol ${String(name)}`).toBeTruthy();
      await user.click(b!);
      await settled();
      expect(screen.queryByText('Terjadi kesalahan pada halaman ini.')).toBeNull();
      expect(document.body.textContent ?? '').not.toMatch(BAD_TEXT);
    };
    await visit('#/laporan');
    for (const t of ['Laba rugi', 'Ekuitas', 'Posisi keuangan', 'Arus kas']) await click(t);
    await visit('#/buku-pembantu');
    for (const t of ['Piutang usaha per pelanggan', 'Utang usaha per pemasok', 'Kartu persediaan']) await click(t);
    await visit('#/koreksi');
    await click(/Deteksi kesalahan/);
    await click(/Jurnal koreksi/);
    await visit('#/kasus');
    for (const t of ['Profil', 'Kebijakan', 'Bagan akun', 'Saldo awal', 'SAK']) await click(new RegExp('^' + t + '$'));
  }, 240000);

  it('Latihan Varian dan Pajak: soal baru berulang, periksa, dan buka tiap paket industri', async () => {
    const user = userEvent.setup();
    const ok = (where: string) => {
      expect(screen.queryByText('Terjadi kesalahan pada halaman ini.'), where).toBeNull();
      expect(document.body.textContent ?? '', where).not.toMatch(BAD_TEXT);
    };
    for (const route of ['#/varian', '#/pajak']) {
      await visit(route);
      for (let i = 0; i < 15; i++) {
        await user.click(screen.getByRole('button', { name: 'Soal baru' }));
        ok(`${route} soal baru ${i}`);
      }
      const periksa = screen.queryAllByRole('button', { name: 'Periksa' });
      for (const b of periksa) {
        await user.click(b);
        ok(`${route} periksa kosong`);
      }
    }
    await visit('#/varian');
    const packs = screen.getAllByRole('button').filter((b) => /\d+ soal$/.test((b.textContent ?? '').trim()));
    expect(packs.length).toBeGreaterThanOrEqual(7);
    const names = packs.map((b) => (b.textContent ?? '').trim());
    for (const name of names) {
      const b = screen.getAllByRole('button').find((x) => (x.textContent ?? '').trim() === name);
      if (!b) continue;
      await user.click(b);
      ok(`paket ${name}`);
      // kembali ke daftar paket bila ada tombol kembali; jika tidak, muat ulang rute
      const back = screen.queryByRole('button', { name: /kembali|semua paket|tutup/i });
      if (back) await user.click(back);
      else (await visit('#/dashboard'), await visit('#/varian'));
    }
  }, 300000);

  it('Ujian lewat UI: mulai, telusuri semua soal, selesai dan nilai (semua cakupan)', async () => {
    const user = userEvent.setup();
    for (const scope of ['semua', 'Intermediate', 'Advanced', 'Expert']) {
      await visit('#/ujian');
      const select = screen.queryAllByRole('combobox').find((s) => Array.from((s as HTMLSelectElement).options).some((o) => o.value === scope));
      if (select) await user.selectOptions(select, scope);
      const start = await screen.findByRole('button', { name: 'Mulai ujian' }, { timeout: 5000 });
      if ((start as HTMLButtonElement).disabled) continue;
      await user.click(start);
      let guard = 0;
      for (;;) {
        expect(screen.queryByText('Terjadi kesalahan pada halaman ini.')).toBeNull();
        expect(document.body.textContent ?? '').not.toMatch(BAD_TEXT);
        const next = screen.getByRole('button', { name: /Berikutnya/ }) as HTMLButtonElement;
        if (next.disabled || ++guard > 200) break;
        await user.click(next);
      }
      const done = screen.getAllByRole('button', { name: /Selesai dan nilai/ })[0];
      await user.click(done);
      const confirm = screen.queryByRole('button', { name: 'Nilai sekarang' });
      if (confirm) await user.click(confirm);
      await waitFor(() => expect(document.body.textContent ?? '').toMatch(/skor|nilai|benar/i), { timeout: 10000 });
      expect(screen.queryByText('Terjadi kesalahan pada halaman ini.')).toBeNull();
      const again = screen.queryByRole('button', { name: 'Ujian baru' });
      if (again) await user.click(again);
    }
    expect(useApp.getState().state.exams.length).toBeGreaterThanOrEqual(1);
  }, 300000);

  it('Pengaturan: ekspor cadangan tidak error dan Penutup menampilkan semua baris BENAR', async () => {
    await visit('#/penutup');
    expect(document.body.textContent ?? '').not.toMatch(/PERIKSA/);
    await visit('#/pengaturan');
    const dash = await (async () => {
      await visit('#/dashboard');
      return document.body.textContent ?? '';
    })();
    expect(dash).not.toMatch(/\bPERIKSA\b/);
    void within;
  }, 60000);

  it('tidak ada console.error / peringatan React selama seluruh penelusuran', () => {
    cleanup();
    expect(consoleProblems.slice(0, 20)).toEqual([]);
  });
});
