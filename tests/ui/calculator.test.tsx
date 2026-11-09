// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  return { useApp };
}
afterEach(() => {
  cleanup();
  localStorage.setItem('akuntansi-practice:onboarded', '1');
});

describe('kalkulator (UI)', () => {
  it('Alt+C membuka, menghitung langsung, Esc menutup', async () => {
    await open('#/dashboard');
    fireEvent.keyDown(window, { key: 'c', altKey: true });
    const box = await screen.findByRole('dialog', { name: 'Kalkulator' });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Ekspresi'), '1.250.000+750.000');
    expect(screen.getByTestId('calc-result').textContent).toContain('2.000.000');
    fireEvent.keyDown(box, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Kalkulator' })).toBeNull();
  });

  it('tombol header dan keypad bekerja; galat ditampilkan; riwayat tersimpan setelah =', async () => {
    await open('#/dashboard');
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Kalkulator' }));
    await user.click(screen.getByRole('button', { name: '7' }));
    await user.click(screen.getByRole('button', { name: 'kali' }));
    await user.click(screen.getByRole('button', { name: '6' }));
    expect(screen.getByTestId('calc-result').textContent).toContain('42');
    await user.click(screen.getByRole('button', { name: '=' }));
    expect(screen.getByText(/7×6/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'C' }));
    await user.type(screen.getByLabelText('Ekspresi'), '1/0');
    expect(screen.getByTestId('calc-result').textContent).toMatch(/nol/);
  });

  it('Masukkan ke kolom nominal mengisi kolom terakhir yang difokuskan dan state jurnal ikut berubah', async () => {
    const { useApp } = await open('#/transaksi/2');
    const user = userEvent.setup();
    const field = (await screen.findAllByLabelText(/ debit baris 1$/))[0] as HTMLInputElement;
    await user.click(field);
    await user.click(screen.getByRole('button', { name: 'Kalkulator' }));
    await user.type(screen.getByLabelText('Ekspresi'), '2.500.000*2%');
    await user.click(screen.getByRole('button', { name: 'Masukkan ke kolom nominal' }));
    await waitFor(() => expect(field.value).toBe('50.000'));
    const lines = Object.values(useApp.getState().state.journal).flat();
    expect(lines.some((l) => l.debit === 50000 || l.credit === 50000)).toBe(true);
  });

  it('tanpa kolom terpilih, tombol memberi petunjuk dan tidak mengubah apa pun', async () => {
    const { useApp } = await open('#/dashboard');
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Kalkulator' }));
    await user.type(screen.getByLabelText('Ekspresi'), '5+5');
    await user.click(screen.getByRole('button', { name: 'Masukkan ke kolom nominal' }));
    expect(await screen.findByText(/Klik dulu kolom nominal/)).toBeTruthy();
    expect(Object.keys(useApp.getState().state.journal)).toHaveLength(0);
  });

  it('titik ribuan terisi otomatis saat mengetik; desimal setelah koma tidak diberi titik', async () => {
    await open('#/dashboard');
    fireEvent.keyDown(window, { key: 'c', altKey: true });
    await screen.findByRole('dialog', { name: 'Kalkulator' });
    const user = userEvent.setup();
    const f = screen.getByLabelText('Ekspresi') as HTMLInputElement;
    await user.type(f, '1250000+75000');
    expect(f.value).toBe('1.250.000+75.000');
    expect(screen.getByTestId('calc-result').textContent).toContain('1.325.000');
    await user.clear(f);
    await user.type(f, '2500,12345*2');
    expect(f.value).toBe('2.500,12345×2');
    await user.clear(f);
    await user.click(screen.getByRole('button', { name: '5' }));
    await user.click(screen.getByRole('button', { name: 'tiga nol' }));
    await user.click(screen.getByRole('button', { name: 'tiga nol' }));
    expect(f.value).toBe('5.000.000');
  });

  it('Backspace tepat setelah titik ribuan tetap menghapus angka (tidak macet)', async () => {
    await open('#/dashboard');
    fireEvent.keyDown(window, { key: 'c', altKey: true });
    await screen.findByRole('dialog', { name: 'Kalkulator' });
    const user = userEvent.setup();
    const f = screen.getByLabelText('Ekspresi') as HTMLInputElement;
    await user.type(f, '1234567');
    expect(f.value).toBe('1.234.567');
    f.setSelectionRange(6, 6); // tepat setelah titik kedua: "1.234.|567"
    await user.keyboard('{Backspace}');
    expect(f.value).toBe('123.567');
  });

  it('kalkulator bisa digeser dengan tombol panah dan posisinya diingat', async () => {
    await open('#/dashboard');
    fireEvent.keyDown(window, { key: 'c', altKey: true });
    const box = await screen.findByRole('dialog', { name: 'Kalkulator' });
    expect(screen.queryByRole('button', { name: /Geser/ })).toBeNull();
    fireEvent.keyDown(box, { key: 'ArrowRight', altKey: true });
    fireEvent.keyDown(box, { key: 'ArrowDown', altKey: true });
    expect(box.style.left).toBe('16px');
    expect(box.style.top).toBe('16px');
    expect(JSON.parse(localStorage.getItem('akuntansi-practice:calc-pos') ?? 'null')).toEqual({ x: 16, y: 16 });
  });
});
