// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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
}
afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.style.fontSize = '';
  delete (window as unknown as { desktopBackup?: unknown }).desktopBackup;
});

describe('UX desktop', () => {
  it('panduan awal muncul sekali, hilang permanen setelah ditutup', async () => {
    await open('#/dashboard');
    const user = userEvent.setup();
    expect(await screen.findByRole('region', { name: 'Panduan awal' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Tutup panduan' }));
    expect(screen.queryByRole('region', { name: 'Panduan awal' })).toBeNull();
    cleanup();
    await open('#/dashboard');
    await screen.findByText('Akurasi keseluruhan');
    expect(screen.queryByRole('region', { name: 'Panduan awal' })).toBeNull();
  });

  it('tombol ? membuka daftar pintasan dan Esc menutupnya', async () => {
    await open('#/dashboard');
    fireEvent.keyDown(window, { key: '?' });
    expect(await screen.findByRole('dialog', { name: 'Pintasan keyboard' })).toBeTruthy();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Pintasan keyboard' })).toBeNull();
  });

  it('Pengaturan: ukuran tampilan benar-benar mengubah skala dan tersimpan; Tentang memuat versi', async () => {
    await open('#/pengaturan');
    const user = userEvent.setup();
    await user.selectOptions(await screen.findByLabelText('Ukuran tampilan'), '125');
    expect(document.documentElement.style.fontSize).toBe('20px');
    expect(localStorage.getItem('akuntansi-practice:scale')).toBe('125');
    const pkg = (await import('../../package.json')).default;
    expect(screen.getByRole('region', { name: 'Tentang' }).textContent).toContain(pkg.version);
  });

  it('Simpan PDF hanya ada di aplikasi desktop dan memanggil jembatan', async () => {
    await open('#/neraca-saldo');
    expect(screen.queryByRole('button', { name: 'Simpan PDF' })).toBeNull();
    cleanup();
    const savePdf = vi.fn().mockResolvedValue({ ok: true, path: 'C:\\x\\laporan.pdf' });
    (window as unknown as { desktopBackup: unknown }).desktopBackup = {
      savePdf,
      write: vi.fn(),
      readLatest: vi.fn().mockResolvedValue(null),
      info: vi.fn().mockResolvedValue({ dir: '', latestAt: null, files: [] }),
      openFolder: vi.fn(),
      onBeforeClose: vi.fn(),
      closeReady: vi.fn(),
    };
    await open('#/neraca-saldo');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Simpan PDF' }));
    expect(savePdf).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/PDF disimpan: C:/)).toBeTruthy();
  });
});

describe('skor komponen dan status ganda penutupan (UI)', () => {
  it('Dashboard menampilkan skor komponen yang naik setelah jurnal benar diperiksa', async () => {
    await open('#/dashboard');
    expect((await screen.findByTestId('skor-komponen')).textContent).toMatch(/—/);
    const { useApp } = await import('../../src/store/useApp');
    const { KEY } = await import('../../src/data');
    const net = KEY.txnNet['2'];
    useApp
      .getState()
      .setLines(
        'journal',
        '2',
        Object.entries(net).map(([c, v], i) => ({ id: 'l' + i, code: c, debit: Math.max(v, 0), credit: Math.max(-v, 0), memo: '' })) as never,
      );
    useApp.getState().check('txn', 2);
    await waitFor(() => expect(screen.getByTestId('skor-komponen').textContent).toMatch(/Skor komponen jurnal: 100,0%/));
  });

  it('Penutup: baris PERIKSA menampilkan "Belum konsisten", bukan pesan grade mentah', async () => {
    await open('#/penutup');
    const { useApp } = await import('../../src/store/useApp');
    const { CLOSING_ROWS } = await import('../../src/store/derive');
    const code = CLOSING_ROWS[0].code;
    useApp.getState().setClosing(code, { debit: 1, credit: 0 });
    useApp.getState().check('clo', code);
    const el = await screen.findByTestId(`vs-buku-${code}`);
    expect(el.textContent).toBe('Belum konsisten dengan buku Anda');
    expect(screen.queryByText(/Konsisten dengan buku Anda: ya/)).toBeNull();
  });

  it('penutupConsistencyLabel: empat keadaan tanpa pesan kontradiktif', async () => {
    const { penutupConsistencyLabel } = await import('../../src/ui/format');
    expect(penutupConsistencyLabel('BENAR')).toBe('Konsisten dengan buku Anda: ya');
    expect(penutupConsistencyLabel('PERIKSA')).toBe('Belum konsisten dengan buku Anda');
    expect(penutupConsistencyLabel('BELUM DIISI')).toBe('Belum diisi');
    expect(penutupConsistencyLabel('BELUM DIPERIKSA')).toBe('Belum diperiksa');
  });
});

describe('laporan kesalahan soal', () => {
  it('Pengaturan menampilkan tautan GitHub dan tombol salin', async () => {
    await open('#/pengaturan');
    const user = userEvent.setup();
    const box = await screen.findByLabelText('Laporkan kesalahan soal');
    expect(box.textContent).toContain('issues/new?template=soal_salah.yml');
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    await user.click(within(box).getByRole('button', { name: 'Salin tautan' }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('github.com/'));
    expect(await within(box).findByText('Tautan disalin.')).toBeTruthy();
  });
});

describe('halaman Kasus: tampilan rapi', () => {
  it('Petunjuk penggunaan berupa daftar poin dan tabel aging berformat', async () => {
    await open('#/kasus');
    expect(await screen.findByText('PETUNJUK PENGGUNAAN')).toBeTruthy();
    const items = Array.from(document.querySelectorAll('td ul li')).map((l) => l.textContent ?? '');
    expect(items).toHaveLength(4);
    expect(items[0]).toMatch(/^Kerjakan berurutan/);
    expect(screen.queryByText('•')).toBeNull();
    expect(screen.getAllByText('240.000.000').length).toBeGreaterThan(0);
    expect(screen.getAllByText('30%').length).toBeGreaterThan(0);
    expect(screen.queryByText('240000000')).toBeNull();
  });
});
