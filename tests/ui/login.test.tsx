// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PROFILE_KEY } from '../setup';

const RECENT_KEY = 'akuntansi-practice:profile-recent:v1';

async function open() {
  vi.resetModules();
  window.location.hash = '#/dashboard';
  const { App } = await import('../../src/ui/App');
  const { useApp } = await import('../../src/store/useApp');
  const { emptyState } = await import('../../src/store/state');
  await useApp.getState().reset();
  useApp.setState({ hydrated: false, state: emptyState(), saveStatus: 'idle' });
  render(<App />);
}

beforeEach(() => {
  localStorage.removeItem(PROFILE_KEY); // setup bersama mengisinya; tes ini justru mulai dari belum masuk
  localStorage.removeItem(RECENT_KEY);
});
afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('layar masuk (nama saja, tanpa kata sandi)', () => {
  it('menampilkan layar masuk, bukan aplikasi, sebelum ada profil; tidak ada kolom kata sandi', async () => {
    await open();
    expect(await screen.findByRole('heading', { name: 'Masuk' })).toBeTruthy();
    expect(screen.getByLabelText('Nama pengguna')).toBeTruthy();
    expect(screen.queryByRole('navigation', { name: 'Navigasi utama' })).toBeNull();
    expect(document.querySelector('input[type="password"]')).toBeNull();
    expect(screen.queryByText(/kata sandi/i)).toBeNull(); // teks lama dihapus
    expect(screen.queryByText(/Boleh huruf/)).toBeNull();
    expect(screen.getByText('Ketik nama Anda untuk mulai belajar.')).toBeTruthy();
    expect(screen.getByText(/Kemajuan belajar disimpan per nama pengguna/)).toBeTruthy();
  });

  it('nama kosong, terlalu pendek, atau berisi simbol ditolak dengan pesan yang jelas', async () => {
    await open();
    const user = userEvent.setup();
    const input = await screen.findByLabelText('Nama pengguna');
    await user.click(screen.getByRole('button', { name: /^Masuk/ }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/Isi nama/);
    expect(input.getAttribute('aria-invalid')).toBe('true');

    await user.type(input, 'A');
    expect(screen.queryByRole('alert')).toBeNull(); // pesan hilang saat mengetik
    await user.click(screen.getByRole('button', { name: /^Masuk/ }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/minimal 2/);

    await user.clear(input);
    await user.type(input, 'Rina<script>');
    await user.click(screen.getByRole('button', { name: /^Masuk/ }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/huruf, angka/);
    expect(localStorage.getItem(PROFILE_KEY)).toBeNull();
    expect(screen.queryByRole('navigation', { name: 'Navigasi utama' })).toBeNull();
  });

  it('nama valid (Enter) membuka aplikasi, menyapa di Dashboard, dan tersimpan', async () => {
    await open();
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Nama pengguna'), '  Rina   Putri  {Enter}');
    const nav = await screen.findByRole('navigation', { name: 'Navigasi utama' });
    expect(within(nav).getByTestId('user-name').textContent).toBe('Rina Putri'); // spasi dirapikan
    await waitFor(() => expect(document.body.textContent).toMatch(/, Rina Putri/));
    expect(JSON.parse(localStorage.getItem(PROFILE_KEY)!).name).toBe('Rina Putri');
    expect(JSON.parse(localStorage.getItem(RECENT_KEY)!)).toEqual(['Rina Putri']);
  });

  it('profil tersimpan dipulihkan saat dimuat ulang tanpa meminta masuk lagi', async () => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ name: 'Bayu', since: '2024-01-01T00:00:00.000Z' }));
    await open();
    const nav = await screen.findByRole('navigation', { name: 'Navigasi utama' });
    expect(within(nav).getByTestId('user-name').textContent).toBe('Bayu');
    expect(screen.queryByRole('heading', { name: 'Masuk' })).toBeNull();
  });

  it('Ganti pengguna kembali ke layar masuk; nama lama jadi pilihan cepat', async () => {
    await open();
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Nama pengguna'), 'Rina{Enter}');
    await screen.findByRole('navigation', { name: 'Navigasi utama' });

    await user.click(screen.getByRole('button', { name: 'Ganti pengguna' }));
    expect(await screen.findByRole('heading', { name: 'Masuk' })).toBeTruthy();
    expect(localStorage.getItem(PROFILE_KEY)).toBeNull();

    // nama lama muncul sebagai pilihan cepat; satu klik langsung masuk
    await user.click(screen.getByRole('button', { name: 'Masuk sebagai Rina' }));
    const nav = await screen.findByRole('navigation', { name: 'Navigasi utama' });
    expect(within(nav).getByTestId('user-name').textContent).toBe('Rina');
  });

  it('nama yang sama dengan huruf berbeda tidak digandakan di daftar terakhir', async () => {
    localStorage.setItem(RECENT_KEY, JSON.stringify(['Rina', 'Bayu']));
    await open();
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Nama pengguna'), 'rina{Enter}');
    await screen.findByRole('navigation', { name: 'Navigasi utama' });
    expect(JSON.parse(localStorage.getItem(RECENT_KEY)!)).toEqual(['rina', 'Bayu']);
  });
});
