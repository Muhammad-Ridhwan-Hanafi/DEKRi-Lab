// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

async function open(hash: string) {
  vi.resetModules();
  window.location.hash = hash;
  const { App } = await import('../../src/ui/App');
  const { useApp } = await import('../../src/store/useApp');
  const { emptyState } = await import('../../src/store/state');
  const { KEY } = await import('../../src/data');
  await useApp.getState().reset();
  useApp.setState({ hydrated: false, state: emptyState(), saveStatus: 'idle' });
  render(<App />);
  await screen.findByRole('navigation', { name: 'Navigasi utama' });
  return { KEY };
}
afterEach(() => {
  cleanup();
  localStorage.setItem('akuntansi-practice:onboarded', '1');
});

describe('Analisis: penjelasan setelah benar', () => {
  it('jawaban analisis benar menampilkan "Mengapa jawaban ini benar?" dengan alasan tiap pilihan; salah tidak', async () => {
    const { KEY } = await open('#/transaksi/1');
    const k = KEY.analysis['1'];
    const user = userEvent.setup();
    await user.click(await screen.findByText(/Analisis \(opsional\)/));
    const region = screen.getByText('Perlu penyesuaian akhir tahun?').closest('div')!.parentElement!.parentElement!;
    const sel = (label: string) => within(region).getByText(label).closest('label')!.querySelector('select')!;
    // salah dulu
    const wrong = (v: string | null) => (v === 'Ya' ? 'Tidak' : 'Ya');
    await user.selectOptions(sel('Perlu penyesuaian akhir tahun?'), wrong(k.needsAdj));
    await user.selectOptions(sel('Memengaruhi laba?'), k.affectsProfit!);
    await user.selectOptions(sel('Memengaruhi kas?'), k.affectsCash!);
    await user.click(within(region).getByRole('button', { name: 'Periksa' }));
    expect(within(region).queryByText('Mengapa jawaban ini benar?')).toBeNull();
    // benar
    await user.selectOptions(sel('Perlu penyesuaian akhir tahun?'), k.needsAdj!);
    await user.click(within(region).getByRole('button', { name: 'Periksa' }));
    const why = await within(region).findByText('Mengapa jawaban ini benar?');
    await user.click(why);
    const text = why.closest('details')!.textContent!;
    expect(why.closest('details')!.querySelectorAll('li').length).toBeGreaterThanOrEqual(4);
    expect(text).toContain('Penyesuaian akhir tahun —');
    expect(text).toContain('Laba —');
    expect(text).toContain('Kas —');
    if (k.reason) expect(text).toContain(k.reason);
  });
});

describe('Pengaturan: teks mode Langsung', () => {
  it('tidak menyebut Excel', async () => {
    await open('#/pengaturan');
    const live = (await screen.findByText('Langsung')).closest('span')!;
    expect(live.textContent).not.toMatch(/excel/i);
    expect(live.textContent).toContain('tanpa menekan tombol Periksa');
  });
});
