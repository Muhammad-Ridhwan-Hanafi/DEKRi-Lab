// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../src/ui/format', async (orig) => ({ ...(await orig<typeof import('../../src/ui/format')>()), downloadText: vi.fn() }));

import { App } from '../../src/ui/App';
import { downloadText } from '../../src/ui/format';
import { loadState } from '../../src/store/persistence';
import { KEY } from '../../src/data';
import { emptyState } from '../../src/store/state';
import { useApp } from '../../src/store/useApp';

type User = ReturnType<typeof userEvent.setup>;

async function freshStore() {
  await useApp.getState().reset();
  useApp.setState({ hydrated: false, state: emptyState(), saveStatus: 'idle' });
}

beforeEach(async () => {
  vi.stubGlobal('confirm', () => true);
  window.location.hash = '';
  await freshStore();
  vi.mocked(downloadText).mockClear();
});
afterEach(() => cleanup());

async function open(user: User, hash: string) {
  render(<App />);
  await screen.findByRole('navigation', { name: 'Navigasi utama' });
  window.location.hash = hash;
  return user;
}

async function fillLine(user: User, prefix: string, row: number, code: string, debit: number, credit: number) {
  const acc = screen.getByLabelText(`${prefix} akun baris ${row}`);
  await user.click(acc);
  await user.type(acc, `${code}{Enter}`);
  if (debit) await user.type(screen.getByLabelText(`${prefix} debit baris ${row}`), String(debit));
  if (credit) await user.type(screen.getByLabelText(`${prefix} kredit baris ${row}`), String(credit));
}

async function openJournalTab(_user: User) {
  await screen.findByLabelText('Jurnal 1 akun baris 1'); // satu alur: jurnal selalu tampil
}

describe('alur UI', () => {
  it('jurnal benar -> Periksa -> BENAR, dan akurasi tampil di bilah atas', async () => {
    const user = userEvent.setup();
    await open(user, '#/transaksi/1');
    await openJournalTab(user);
    await fillLine(user, 'Jurnal 1', 1, '1-1100', 400000000, 0);
    await fillLine(user, 'Jurnal 1', 2, '3-1000', 0, 400000000);
    expect(screen.getAllByText('Tekan Periksa untuk menilai jawaban ini.').length).toBeGreaterThan(0); // mode Periksa: belum dinilai
    await user.click(screen.getAllByRole('button', { name: 'Periksa' })[0]);
    expect(await screen.findByText('Benar.')).toBeTruthy();
    expect(useApp.getState().state.attempts['txn:1']).toBe(1);
  });

  it('jawaban salah (sisi terbalik) -> PERIKSA dengan petunjuk, tanpa membuka kunci', async () => {
    const user = userEvent.setup();
    await open(user, '#/transaksi/1');
    await openJournalTab(user);
    await fillLine(user, 'Jurnal 1', 1, '1-1100', 0, 400000000);
    await fillLine(user, 'Jurnal 1', 2, '3-1000', 400000000, 0);
    await user.click(screen.getAllByRole('button', { name: 'Periksa' })[0]);
    expect(await screen.findByText('Ada akun yang sisi debit/kreditnya terbalik.')).toBeTruthy();
    expect(screen.getByText(/Sisi debit\/kredit terbalik/)).toBeTruthy();
    expect(screen.queryByText('Kunci dan penjelasan')).toBeNull(); // kunci tidak bocor
  });

  it('mengubah jawaban setelah Periksa mengembalikan status ke BELUM DIPERIKSA', async () => {
    const user = userEvent.setup();
    await open(user, '#/transaksi/1');
    await openJournalTab(user);
    await fillLine(user, 'Jurnal 1', 1, '1-1100', 400000000, 0);
    await fillLine(user, 'Jurnal 1', 2, '3-1000', 0, 400000000);
    await user.click(screen.getAllByRole('button', { name: 'Periksa' })[0]);
    await screen.findByText('Benar.');
    await user.type(screen.getByLabelText('Jurnal 1 debit baris 1'), '0');
    await waitFor(() => expect(screen.queryByText('Benar.')).toBeNull());
  });

  it('membuka kunci mengeluarkan item dari akurasi', async () => {
    const user = userEvent.setup();
    await open(user, '#/transaksi/1');
    await openJournalTab(user);
    await user.click(screen.getAllByRole('button', { name: /Lihat kunci/ })[0]);
    expect(screen.queryByText('Kunci dan penjelasan')).toBeNull(); // belum: menunggu konfirmasi di tempat
    await user.click(screen.getByRole('button', { name: 'Ya, buka kunci' }));
    expect(await screen.findByText('Kunci dan penjelasan')).toBeTruthy();
    expect(useApp.getState().state.revealed).toContain('txn:1');
  });

  it('progres tersimpan otomatis dan kembali setelah halaman dimuat ulang', async () => {
    const user = userEvent.setup();
    await open(user, '#/transaksi/1');
    await openJournalTab(user);
    await fillLine(user, 'Jurnal 1', 1, '1-1100', 400000000, 0);
    await waitFor(async () => expect((await loadState())?.journal['1']?.[0]?.code).toBe('1-1100'), { timeout: 3000 });
    cleanup();
    useApp.setState({ hydrated: false, state: emptyState() }); // simulasi muat ulang: DB tidak dihapus
    await open(user, '#/transaksi/1');
    await openJournalTab(user);
    expect((screen.getByLabelText('Jurnal 1 akun baris 1') as HTMLInputElement).value).toContain('1-1100');
    expect((screen.getByLabelText('Jurnal 1 debit baris 1') as HTMLInputElement).value).toBe('400.000.000');
  });

  it('ekspor -> reset (harus mengetik RESET) -> impor memulihkan progres', async () => {
    const user = userEvent.setup();
    await open(user, '#/transaksi/1');
    await openJournalTab(user);
    await fillLine(user, 'Jurnal 1', 1, '1-1100', 400000000, 0);
    await fillLine(user, 'Jurnal 1', 2, '3-1000', 0, 400000000);

    window.location.hash = '#/pengaturan';
    await user.click(await screen.findByRole('button', { name: 'Ekspor cadangan' }));
    const [, content] = vi.mocked(downloadText).mock.calls[0];
    expect(JSON.parse(String(content)).state.journal['1'].filter((l: { code: string | null }) => l.code)).toHaveLength(2);

    const resetBtn = screen.getByRole('button', { name: 'Hapus semua progres' }) as HTMLButtonElement;
    expect(resetBtn.disabled).toBe(true);
    await user.type(screen.getByLabelText('Konfirmasi reset'), 'RESET');
    await user.click(resetBtn);
    await waitFor(() => expect(Object.keys(useApp.getState().state.journal)).toHaveLength(0));

    const file = new File([String(content)], 'backup.json', { type: 'application/json' });
    if (!file.text) Object.defineProperty(file, 'text', { value: () => Promise.resolve(String(content)) });
    await user.upload(document.querySelector('input[type=file]') as HTMLInputElement, file);
    await user.click(await screen.findByRole('button', { name: 'Ganti progres dengan cadangan' }));
    await waitFor(() => expect(useApp.getState().state.journal['1']?.filter((l) => l.code)).toHaveLength(2));
  });

  it('impor file rusak ditolak dengan pesan dan progres tidak berubah', async () => {
    const user = userEvent.setup();
    await open(user, '#/pengaturan');
    await screen.findByText('Reset progres');
    useApp.getState().setLines('journal', '1', [{ id: 'a', code: '1-1100', debit: 5, credit: 0, memo: '' }]);
    const bad = new File(['bukan json'], 'x.json', { type: 'application/json' });
    if (!bad.text) Object.defineProperty(bad, 'text', { value: () => Promise.resolve('bukan json') });
    await user.upload(document.querySelector('input[type=file]') as HTMLInputElement, bad);
    expect(await screen.findByText('File bukan JSON yang valid.')).toBeTruthy();
    expect(useApp.getState().state.journal['1']).toHaveLength(1);
  });

  it('semua 17 halaman dapat dibuka tanpa error', async () => {
    const user = userEvent.setup();
    await open(user, '#/dashboard');
    const nav = screen.getByRole('navigation', { name: 'Navigasi utama' });
    const labels = Array.from(nav.querySelectorAll('li button')).map((b) => b.textContent ?? '');
    expect(labels).toHaveLength(17);
    for (const label of labels) {
      await user.click(within(nav).getByRole('button', { name: label }));
      await waitFor(() => expect(within(nav).getByRole('button', { name: label }).getAttribute('aria-current')).toBe('page'));
      await waitFor(() => expect(screen.queryByText('Memuat halaman…')).toBeNull());
      expect(screen.queryByText('Terjadi kesalahan pada halaman ini.')).toBeNull();
    }
  });

  it('keyboard: Enter pindah kolom/baris, Enter di baris terakhir menambah baris, Ctrl+D menyalin baris', async () => {
    const user = userEvent.setup();
    await open(user, '#/transaksi/1');
    await openJournalTab(user);
    const acc1 = screen.getByLabelText('Jurnal 1 akun baris 1');
    await user.click(acc1);
    await user.type(acc1, '1-1100{Enter}');
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('Jurnal 1 debit baris 1')));
    await user.keyboard('5000{Enter}');
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('Jurnal 1 kredit baris 1')));
    await user.keyboard('{Enter}');
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('Jurnal 1 akun baris 2')));
    // salin baris 1 dengan Ctrl+D
    screen.getByLabelText('Jurnal 1 debit baris 1').focus();
    await user.keyboard('{Control>}d{/Control}');
    await waitFor(() => expect((screen.getByLabelText('Jurnal 1 debit baris 2') as HTMLInputElement).value).toBe('5.000'));
    await user.click(screen.getByLabelText('Jurnal 1 kredit baris 2')); // lepas fokus dari pemilih akun
    await waitFor(() => expect((screen.getByLabelText('Jurnal 1 akun baris 2') as HTMLInputElement).value).toContain('1-1100'));
    // Enter di kolom kredit baris terakhir menambah baris baru
    const rows = () => screen.getAllByLabelText(/^Jurnal 1 akun baris/).length;
    const before = rows();
    const lastMemo = screen.getByLabelText(`Jurnal 1 kredit baris ${before}`);
    await user.click(lastMemo);
    await user.keyboard('{Enter}');
    await waitFor(() => expect(rows()).toBe(before + 1));
  });

  it('akun yang baru dipakai muncul di urutan atas daftar', async () => {
    const user = userEvent.setup();
    await open(user, '#/transaksi/1');
    await openJournalTab(user);
    const acc1 = screen.getByLabelText('Jurnal 1 akun baris 1');
    await user.click(acc1);
    await user.type(acc1, '4-1000{Enter}');
    const acc2 = screen.getByLabelText('Jurnal 1 akun baris 2');
    await user.click(acc2);
    expect(await screen.findByText('Terakhir dipakai di atas')).toBeTruthy();
    const first = document.querySelector('ul.absolute li:nth-child(2)'); // setelah penanda
    expect(first?.textContent).toContain('4-1000');
  });

  it('klik angka laporan menampilkan jurnal yang membentuknya', async () => {
    const user = userEvent.setup();
    const st = emptyState();
    for (const t of KEY.readableTxn)
      if (t.lines.length) st.journal[String(t.no)] = t.lines.map((l, i) => ({ id: `k${i}`, code: l.code, debit: l.debit, credit: l.credit, memo: '' }));
    for (const a of KEY.readableAdj) st.adjusting[a.code] = a.lines.map((l, i) => ({ id: `k${i}`, code: l.code, debit: l.debit, credit: l.credit, memo: '' }));
    await open(user, '#/laporan');
    useApp.getState().replaceState(st);
    const row = (await screen.findByText('LABA BERSIH TAHUN BERJALAN')).closest('tr') as HTMLElement;
    await user.click(within(row).getAllByRole('button')[0]);
    const panel = await screen.findByLabelText('Asal angka', {}, { timeout: 15000 });
    expect(within(panel).getAllByRole('button', { name: /Transaksi \d+/ }).length).toBeGreaterThan(5);
    await user.click(within(panel).getByRole('button', { name: /Tampilkan semua/ }));
    expect(within(panel).getAllByRole('button', { name: /Penyesuaian AJ/ }).length).toBeGreaterThan(3);
    await user.click(within(panel).getByRole('button', { name: 'Tutup' }));
    expect(screen.queryByLabelText('Asal angka')).toBeNull();
  }, 30000);

  it('Ctrl+K membuka pencarian, Enter membuka hasil pertama, Esc menutup', async () => {
    const user = userEvent.setup();
    await open(user, '#/dashboard');
    await user.keyboard('{Control>}k{/Control}');
    const box = await screen.findByLabelText('Cari');
    await user.type(box, '1-1100');
    await user.keyboard('{Enter}');
    await waitFor(() => expect(window.location.hash).toBe('#/buku-besar/1-1100'));
    expect(screen.queryByRole('dialog', { name: 'Pencarian' })).toBeNull();
    await user.keyboard('{Control>}k{/Control}');
    await screen.findByRole('dialog', { name: 'Pencarian' });
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Pencarian' })).toBeNull());
  });

  it('Ctrl+Enter memeriksa; setelah BENAR, Ctrl+Enter lagi pindah ke soal berikutnya', async () => {
    const user = userEvent.setup();
    await open(user, '#/transaksi/1');
    await openJournalTab(user);
    await fillLine(user, 'Jurnal 1', 1, '1-1100', 400000000, 0);
    await fillLine(user, 'Jurnal 1', 2, '3-1000', 0, 400000000);
    await user.keyboard('{Control>}{Enter}{/Control}');
    expect(await screen.findByText('Benar.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Soal berikutnya →' })).toBeTruthy();
    await user.keyboard('{Control>}{Enter}{/Control}');
    await waitFor(() => expect(window.location.hash).toBe('#/transaksi/2'));
  });

  it('Ctrl+Z mengurungkan hapus baris dan Ctrl+Shift+Z mengulanginya', async () => {
    const user = userEvent.setup();
    await open(user, '#/transaksi/1');
    await openJournalTab(user);
    await fillLine(user, 'Jurnal 1', 1, '1-1100', 400000000, 0);
    await user.click(screen.getByLabelText('Hapus baris 1'));
    await waitFor(() => expect((screen.getByLabelText('Jurnal 1 debit baris 1') as HTMLInputElement).value).toBe(''));
    await user.keyboard('{Control>}z{/Control}');
    await waitFor(() => expect((screen.getByLabelText('Jurnal 1 debit baris 1') as HTMLInputElement).value).toBe('400.000.000'));
    await user.keyboard('{Control>}{Shift>}z{/Shift}{/Control}');
    await waitFor(() => expect((screen.getByLabelText('Jurnal 1 debit baris 1') as HTMLInputElement).value).toBe(''));
  });

  it('soal yang salah masuk Ulasan hari ini dan Kerjakan ulang mengosongkan jawabannya', async () => {
    const user = userEvent.setup();
    await open(user, '#/transaksi/1');
    await openJournalTab(user);
    await fillLine(user, 'Jurnal 1', 1, '1-1100', 0, 400000000);
    await fillLine(user, 'Jurnal 1', 2, '3-1000', 400000000, 0);
    await user.click(screen.getAllByRole('button', { name: 'Periksa' })[0]);
    await screen.findByText('Ada akun yang sisi debit/kreditnya terbalik.');
    window.location.hash = '#/dashboard';
    await user.click(await screen.findByRole('button', { name: 'Kerjakan ulang' }));
    await waitFor(() => expect(window.location.hash).toBe('#/transaksi/1'));
    await waitFor(() => expect((screen.getByLabelText('Jurnal 1 debit baris 1') as HTMLInputElement).value).toBe(''));
  });
});
