// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, configure, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Test pertama memuat halaman lazy dari nol; di mesin lambat/terbebani batas bawaan 1 detik terlalu ketat (halaman tertahan di "Memuat halaman…" sampai modul lazy selesai dikompilasi).
configure({ asyncUtilTimeout: 15000 });

async function open(hash: string) {
  vi.resetModules();
  window.location.hash = hash;
  const { App } = await import('../../src/ui/App');
  const { useApp } = await import('../../src/store/useApp');
  const { emptyState } = await import('../../src/store/state');
  await useApp.getState().reset();
  useApp.setState({ hydrated: false, state: emptyState(), saveStatus: 'idle' });
  render(<App />);
  await screen.findByRole('navigation', { name: 'Navigasi utama' });
  return { useApp };
}
afterEach(() => cleanup());

describe('fitur roadmap (UI)', () => {
  it('tangga petunjuk: 3 tingkat berurutan, lalu tombol hilang; petunjuk dicatat di state', async () => {
    const { useApp } = await open('#/transaksi/3');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Beri petunjuk' }));
    expect(await screen.findByText(/Petunjuk 1:/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /Petunjuk berikutnya \(2\/3\)/ }));
    await user.click(screen.getByRole('button', { name: /Petunjuk berikutnya \(3\/3\)/ }));
    expect(screen.getByText(/Petunjuk 3:/).closest('p')!.textContent).toMatch(/DEBIT|KREDIT/);
    expect(screen.queryByRole('button', { name: /Petunjuk berikutnya/ })).toBeNull();
    expect(useApp.getState().state.hints['txn:3']).toBe(3);
  });

  it('tandai dan catatan tersimpan; filter Ditandai menyaring daftar', async () => {
    const { useApp } = await open('#/transaksi/3');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: '☆ Tandai' }));
    await user.type(screen.getByLabelText('Catatan pribadi'), 'cek syarat diskon');
    expect(useApp.getState().state.flags).toEqual(['txn:3']);
    expect(useApp.getState().state.notes['txn:3']).toBe('cek syarat diskon');
    await user.selectOptions(screen.getByLabelText('Filter status'), 'Ditandai');
    expect(await screen.findByText('1 dari 147 transaksi')).toBeTruthy();
  });

  it('Periksa mencatat percobaan ke log; Dashboard menampilkan aktivitas', async () => {
    const { useApp } = await open('#/dashboard');
    expect(await screen.findByText(/Belum ada percobaan tercatat/)).toBeTruthy();
    useApp.getState().check('txn', 1);
    expect(useApp.getState().state.log).toHaveLength(1);
    expect(useApp.getState().state.log[0]).toMatchObject({ kind: 'txn', id: '1' });
    await waitFor(() => expect(screen.queryByText(/Belum ada percobaan tercatat/)).toBeNull());
  });

  it('Buku Pembantu: rekonsiliasi cocok dengan jurnal kunci diadopsi, dan kartu persediaan tampil', async () => {
    const { useApp } = await open('#/buku-pembantu');
    const { KEY } = await import('../../src/data');
    const t = KEY.readableTxn.find((x) => x.no === 6)!;
    useApp.getState().setLines(
      'journal',
      '6',
      t.lines.map((l, i) => ({ id: `k${i}`, code: l.code, debit: l.debit, credit: l.credit, memo: '' })),
    );
    const rec = await screen.findByTestId('rekonsiliasi');
    await waitFor(() => expect(rec.textContent).toMatch(/Cocok\./));
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Kartu persediaan' }));
    expect(await screen.findByText('Saldo awal')).toBeTruthy();
  });

  it('Latihan Varian: kunci dinilai benar lewat form, hasil dicatat ke log', async () => {
    const { useApp } = await open('#/varian');
    const { generate, parseId } = await import('../../src/engine/variants');
    const user = userEvent.setup();
    await screen.findByText(/Kode soal /);
    const id = parseId(useApp.getState().state.tables['cur:varian'] ?? 'beli-kredit:1')!;
    const v = generate(id.pattern, id.seed);
    // isi jawaban langsung ke state agar tes tidak bergantung pada pengetikan akun satu per satu
    useApp.getState().setPajak(`v:${v.id}`, JSON.stringify(v.lines.map((l, i) => ({ id: `k${i}`, code: l.code, debit: l.debit, credit: l.credit, memo: '' }))));
    await user.click(await screen.findByRole('button', { name: 'Periksa' }));
    expect((await screen.findByTestId('varian-hasil')).textContent).toMatch(/BENAR/);
    expect(useApp.getState().state.log.at(-1)).toMatchObject({ kind: 'var', status: 'BENAR' });
  });

  it('Latihan Pajak hanya menawarkan pola pajak', async () => {
    await open('#/pajak');
    const sel = (await screen.findByLabelText('Pola soal')) as HTMLSelectElement;
    expect(Array.from(sel.options).map((o) => o.textContent)).toEqual(expect.arrayContaining(['Pembelian kredit dengan PPN masukan']));
    expect(sel.options).toHaveLength(3);
  });

  it('Materi BAB: memilih BAB menampilkan jurnal, rumus, dan jebakan', async () => {
    await open('#/belajar/bab/14');
    expect(await screen.findByRole('heading', { name: /BAB 14 · Sewa/ })).toBeTruthy();
    expect(screen.getByText('Jebakan umum')).toBeTruthy();
    expect(screen.getByText(/Bunga liabilitas sewa sering terlewat/)).toBeTruthy();
  });

  it('Ujian: pengaturan cakupan dan batas waktu; ujian berjalan menampilkan timer dan tanda ragu', async () => {
    await open('#/ujian');
    const user = userEvent.setup();
    await screen.findByText('Riwayat ujian');
    await user.clear(screen.getByLabelText('Jumlah soal'));
    await user.type(screen.getByLabelText('Jumlah soal'), '3');
    await user.clear(screen.getByLabelText('Batas waktu menit'));
    await user.type(screen.getByLabelText('Batas waktu menit'), '30');
    await user.click(screen.getByRole('button', { name: 'Mulai ujian' }));
    expect(await screen.findByRole('timer', { name: 'Sisa waktu' })).toBeTruthy();
    await user.click(screen.getByLabelText('Ragu-ragu', { exact: false }));
    expect(screen.getByLabelText(/Ke soal 1 \(ragu-ragu\)/)).toBeTruthy();
  });
});

describe('Jalur Belajar (UI)', () => {
  it('materi 2 terkunci: kuis nonaktif dan prasyarat ditampilkan; materi 1 dapat dikerjakan sampai lulus dan membuka materi 2', async () => {
    const { useApp } = await open('#/belajar/coa');
    const user = userEvent.setup();
    expect(await screen.findByText(/terkunci untuk kuis dan penyelesaian/)).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Kirim jawaban' }) as HTMLButtonElement).disabled).toBe(true);
    await user.click(screen.getAllByRole('button', { name: /1\. Dasar-dasar Akuntansi/ })[0]);
    const { MODULES } = await import('../../src/learning/modules');
    const m = MODULES[0];
    for (let i = 0; i < m.quiz.length; i++) {
      const group = await screen.findByRole('radiogroup', { name: `Soal ${i + 1}` });
      const radios = group.querySelectorAll('input');
      await user.click(radios[m.quiz[i].answer]);
    }
    await user.click(screen.getByRole('button', { name: 'Kirim jawaban' }));
    expect((await screen.findByTestId('kuis-hasil')).textContent).toMatch(/3\/3 benar · Lulus/);
    expect(useApp.getState().state.learning.quiz.fundamental.best).toBe(1);
    expect(screen.getAllByText('Selesai').length).toBeGreaterThan(0);
  });

  it('Dashboard menampilkan kemajuan Jalur Belajar dari data nyata', async () => {
    await open('#/dashboard');
    const card = await screen.findByTestId('dash-jalur');
    expect(card.textContent).toMatch(/0 dari 13 materi selesai/);
    expect(card.textContent).toMatch(/1\. Dasar-dasar Akuntansi/);
  });
});

describe('umpan balik spesifik (UI)', () => {
  it('jawaban terbalik: diagnosis menyebut sisi terbalik dan saldo normal; setelah kunci dibuka muncul perbandingan', async () => {
    const { useApp } = await open('#/transaksi/5');
    const L = (code: string, debit: number, credit: number) => ({ id: code, code, debit, credit, memo: '' });
    useApp.getState().setLines('journal', '5', [L('2-1000', 0, 186_000_000), L('1-1100', 182_280_000, 0), L('1-1400', 3_720_000, 0)]);
    useApp.getState().check('txn', 5);
    const box = await screen.findByTestId('diagnosis');
    expect(box.textContent).toMatch(/Sisi terbalik/);
    expect(box.textContent).toMatch(/bersaldo normal kredit/);
    expect(box.textContent).not.toMatch(/182\.280\.000/);
    const user = userEvent.setup();
    await user.click(screen.getAllByRole('button', { name: 'Lihat kunci dan penjelasan' })[0]);
    await user.click(await screen.findByRole('button', { name: 'Ya, buka kunci' }));
    const cmp = await screen.findByTestId('key-compare');
    expect(cmp.textContent).toMatch(/Kredit 186\.000\.000/);
    expect(cmp.textContent).toMatch(/Debit 186\.000\.000/);
    expect(screen.queryByTestId('diagnosis')).toBeNull();
  });
});
