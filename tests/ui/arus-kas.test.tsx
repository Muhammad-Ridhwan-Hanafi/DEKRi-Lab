// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

async function open() {
  vi.resetModules();
  window.location.hash = '#/skenario';
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

describe('latihan arus kas di Skenario', () => {
  it('tampil di bawah skenario inti, dinilai, menjelaskan pilihan, dan tidak memengaruhi akurasi', async () => {
    const { useApp } = await open();
    const user = userEvent.setup();
    expect(await screen.findByText(/klasifikasi arus kas \(PSAK 207\)/i)).toBeTruthy();
    expect(screen.getByText(/7A\. Klasifikasi arus kas/)).toBeTruthy();
    expect(screen.getByText(/7B\. Klasifikasi arus kas/)).toBeTruthy();

    const card = screen.getByTestId('kas-7B-1');
    await user.selectOptions(within(card).getByLabelText('Jawaban 7B-1'), '0'); // Operasi (salah)
    await user.click(within(card).getByRole('button', { name: 'Periksa' }));
    expect(within(card).getByText('Belum tepat.')).toBeTruthy();
    expect(within(card).getByText(/Jawaban yang benar \(Pendanaan\)/)).toBeTruthy();
    expect(within(card).getByText(/Dasar: PSAK 207/)).toBeTruthy();

    await user.selectOptions(within(card).getByLabelText('Jawaban 7B-1'), '2'); // Pendanaan
    await user.click(within(card).getByRole('button', { name: 'Periksa' }));
    expect(within(card).getByText('Benar.')).toBeTruthy();

    const st = useApp.getState().state;
    expect(st.pajak['v:kas:7B-1']).toBe('2');
    expect(Object.keys(st.scenarios)).toHaveLength(0); // skenario inti tidak tersentuh
    expect(st.log.filter((l) => l.kind === 'kas')).toHaveLength(2);
  });
});
