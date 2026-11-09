// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
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
afterEach(() => cleanup());

describe('Soal berbagai industri (UI)', () => {
  it('memilih industri dan soal, menilai jawaban benar, dan mencatat ke log', async () => {
    const { useApp } = await open('#/varian');
    const { INDUSTRY_PACKS } = await import('../../src/data/industri');
    const user = userEvent.setup();
    const pk = INDUSTRY_PACKS[0];
    await user.click(await screen.findByRole('button', { name: new RegExp(pk.title) }));
    await user.click(await screen.findByRole('button', { name: new RegExp(pk.items[0].title) }));
    useApp
      .getState()
      .setPajak(
        `v:pack:${pk.id}:${pk.items[0].id}`,
        JSON.stringify(pk.items[0].lines.map((l, i) => ({ id: `k${i}`, code: l.code, debit: l.debit, credit: l.credit, memo: '' }))),
      );
    const within = screen.getByTestId('industri');
    await user.click(within.querySelector('button.btn-primary') as HTMLElement);
    expect((await screen.findByTestId('varian-hasil')).textContent).toMatch(/BENAR/);
    await waitFor(() => expect(useApp.getState().state.log.at(-1)).toMatchObject({ kind: 'pack', status: 'BENAR' }));
  });

  it('pemilih akun hanya menawarkan akun perusahaan itu, bukan bagan akun kasus utama', async () => {
    await open('#/varian');
    const { INDUSTRY_PACKS } = await import('../../src/data/industri');
    const user = userEvent.setup();
    const pk = INDUSTRY_PACKS[2];
    await user.click(await screen.findByRole('button', { name: new RegExp(pk.title) }));
    await user.click(await screen.findByRole('button', { name: new RegExp(pk.items[0].title) }));
    const box = (await within(screen.getByTestId('industri')).findAllByLabelText(/akun baris 1/))[0];
    await user.click(box);
    await user.type(box, 'Kas');
    const opts = within(screen.getByTestId('industri')).getAllByText(/Kas dan Bank/);
    expect(opts.length).toBeGreaterThan(0);
    expect(within(screen.getByTestId('industri')).queryByText(/^1-1000$/)).toBeNull();
  });
});
