// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PROFILE_KEY } from '../setup';

const RECENT_KEY = 'akuntansi-practice:profile-recent:v1';
const LINES = [
  { id: 'a', code: '1-1100', debit: 400000000, credit: 0, memo: '' },
  { id: 'b', code: '3-1000', debit: 0, credit: 400000000, memo: '' },
] as const;

type Mods = {
  useApp: typeof import('../../src/store/useApp').useApp;
  flushSave: typeof import('../../src/store/useApp').flushSave;
  persistence: typeof import('../../src/store/persistence');
  scope: typeof import('../../src/store/scope');
  hasProgress: typeof import('../../src/store/state').hasProgress;
};
async function mods(): Promise<Mods> {
  const u = await import('../../src/store/useApp');
  return {
    useApp: u.useApp,
    flushSave: u.flushSave,
    persistence: await import('../../src/store/persistence'),
    scope: await import('../../src/store/scope'),
    hasProgress: (await import('../../src/store/state')).hasProgress,
  };
}
// idb-keyval adalah dependensi eksternal: vi.resetModules() tidak mengatur ulang koneksinya, jadi basis data
// dikosongkan lewat instance yang sama agar tes tidak bergantung pada urutan.
async function wipeDb() {
  const { clear } = await import('idb-keyval');
  await clear();
}
const stops: Array<() => void> = [];
async function fresh() {
  vi.resetModules();
  await wipeDb();
  localStorage.clear();
  const m = await mods();
  const { startAutosave } = await import('../../src/store/useApp');
  stops.push(startAutosave()); // simpan otomatis sungguhan berjalan seperti di aplikasi
  return m;
}
const doWork = (m: Mods) => {
  m.useApp.getState().setLines('journal', '1', [...LINES]);
  m.useApp.getState().check('txn', '1');
};
const idle = () => new Promise((r) => setTimeout(r, 30));

beforeEach(() => {
  localStorage.removeItem(PROFILE_KEY);
  localStorage.removeItem(RECENT_KEY);
});
afterEach(() => {
  cleanup();
  while (stops.length) stops.pop()?.();
  localStorage.clear();
});

describe('kemajuan belajar per nama pengguna (lapisan data)', () => {
  it('data tiap nama terpisah dan kembali utuh saat nama yang sama masuk lagi', async () => {
    const m = await fresh();
    await m.useApp.getState().switchUser('rina');
    doWork(m);
    expect(m.hasProgress(m.useApp.getState().state)).toBe(true);

    await m.useApp.getState().switchUser('bayu');
    expect(m.hasProgress(m.useApp.getState().state)).toBe(false); // Bayu mulai dari kosong
    expect(m.useApp.getState().hydrated).toBe(true);

    await m.useApp.getState().switchUser('rina');
    expect(m.hasProgress(m.useApp.getState().state)).toBe(true); // progres Rina tidak hilang
    expect(m.useApp.getState().state.journal['1']).toHaveLength(2);
  });

  it('berganti nama sebelum simpan otomatis berjalan tetap menyimpan data nama lama, bukan mencampurnya', async () => {
    const m = await fresh();
    await m.useApp.getState().switchUser('rina');
    doWork(m); // belum 500 ms: simpan otomatis masih tertunda
    await m.useApp.getState().switchUser('bayu'); // harus menyimpan dulu milik Rina
    m.scope.setScope('rina');
    const rina = await m.persistence.loadState();
    m.scope.setScope('bayu');
    const bayu = await m.persistence.loadState();
    expect(rina && m.hasProgress(rina)).toBe(true);
    expect(bayu === null || !m.hasProgress(bayu)).toBe(true);
  });

  it('berganti nama berturut-turut dengan cepat: yang menang selalu nama terakhir', async () => {
    const m = await fresh();
    await m.useApp.getState().switchUser('rina');
    doWork(m);
    await m.useApp.getState().switchUser('bayu');
    const p1 = m.useApp.getState().switchUser('rina');
    const p2 = m.useApp.getState().switchUser('bayu'); // tanpa menunggu p1
    await Promise.all([p1, p2]);
    await idle();
    expect(m.scope.getScope()).toBe('bayu');
    expect(m.useApp.getState().hydrated).toBe(true);
    expect(m.hasProgress(m.useApp.getState().state)).toBe(false); // bukan data Rina yang terlambat tiba
  });

  it('keluar mengosongkan state di memori dan ruang data', async () => {
    const m = await fresh();
    await m.useApp.getState().switchUser('rina');
    doWork(m);
    await m.useApp.getState().switchUser(null);
    expect(m.scope.getScope()).toBeNull();
    expect(m.useApp.getState().hydrated).toBe(false);
    expect(m.hasProgress(m.useApp.getState().state)).toBe(false);
  });

  it('riwayat ujian, paket soal, dan sesi ujian juga terpisah per nama', async () => {
    const m = await fresh();
    m.scope.setScope('rina');
    await m.persistence.savePacks([{ id: 'p1' }]);
    await m.persistence.saveExamSession({ phase: 'run' });
    m.scope.setScope('bayu');
    expect(await m.persistence.loadPacks()).toEqual([]);
    expect(await m.persistence.loadExamSession()).toBeNull();
    m.scope.setScope('rina');
    expect(await m.persistence.loadPacks()).toEqual([{ id: 'p1' }]);
    expect(await m.persistence.loadExamSession()).toEqual({ phase: 'run' });
  });

  it('Hapus progres milik satu nama tidak menyentuh nama lain', async () => {
    const m = await fresh();
    await m.useApp.getState().switchUser('rina');
    doWork(m);
    await m.useApp.getState().switchUser('bayu');
    doWork(m);
    await m.useApp.getState().reset(); // Bayu mengosongkan miliknya
    await m.useApp.getState().switchUser('rina');
    expect(m.hasProgress(m.useApp.getState().state)).toBe(true);
  });

  it('"Rina", "rina", dan "RINA  " adalah nama yang sama', async () => {
    const m = await fresh();
    expect(m.scope.userKeyOf('Rina')).toBe(m.scope.userKeyOf('  rina '));
    expect(m.scope.userKeyOf('Rina  Putri')).toBe(m.scope.userKeyOf('rina putri'));
    expect(m.scope.userKeyOf('Rina')).not.toBe(m.scope.userKeyOf('Rini'));
  });
});

describe('migrasi data bawaan sebelum ada login', () => {
  async function seedLegacy(m: Mods) {
    m.scope.setScope(null); // kunci tanpa nama pengguna, seperti versi lama
    const { emptyState } = await import('../../src/store/state');
    await m.persistence.saveState({ ...emptyState(), journal: { '1': [...LINES] } });
    await m.persistence.savePacks([{ id: 'lama' }]);
  }

  it('pengguna pertama yang masuk mengadopsi data lama; pengguna kedua tidak', async () => {
    const m = await fresh();
    await seedLegacy(m);

    await m.useApp.getState().switchUser('rina');
    expect(m.hasProgress(m.useApp.getState().state)).toBe(true); // progres lama tidak hilang
    expect(await m.persistence.loadPacks()).toEqual([{ id: 'lama' }]);

    await m.useApp.getState().switchUser('bayu');
    expect(m.hasProgress(m.useApp.getState().state)).toBe(false); // data Rina tidak bocor ke Bayu
    expect(await m.persistence.loadPacks()).toEqual([]);

    await m.useApp.getState().switchUser('rina');
    expect(m.hasProgress(m.useApp.getState().state)).toBe(true);
  });

  it('adopsi tidak menimpa data yang sudah dimiliki dan tidak terulang setelah progres dihapus', async () => {
    const m = await fresh();
    await seedLegacy(m);
    await m.useApp.getState().switchUser('rina');
    await m.useApp.getState().reset(); // Rina sengaja mengosongkan progres
    await m.useApp.getState().switchUser('bayu');
    await m.useApp.getState().switchUser('rina');
    expect(m.hasProgress(m.useApp.getState().state)).toBe(false); // data lama tidak "hidup kembali"
  });

  it('panduan awal dan akun terakhir milik versi lama ikut diadopsi pengguna pertama saja', async () => {
    const m = await fresh();
    localStorage.setItem('akuntansi-practice:onboarded', '1');
    localStorage.setItem('akuntansi-practice:recent-accounts', JSON.stringify(['1-1100']));
    await seedLegacy(m);
    await m.useApp.getState().switchUser('rina');
    expect(localStorage.getItem(m.scope.scoped('akuntansi-practice:onboarded', 'rina'))).toBe('1');
    expect(localStorage.getItem(m.scope.scoped('akuntansi-practice:onboarded', 'bayu'))).toBeNull();
  });
});

describe('kemajuan belajar per nama pengguna (antarmuka)', () => {
  async function openApp() {
    vi.resetModules();
    await wipeDb();
    localStorage.clear();
    window.location.hash = '#/dashboard';
    const { App } = await import('../../src/ui/App');
    render(<App />);
    return mods();
  }
  const signIn = async (user: ReturnType<typeof userEvent.setup>, name: string) => {
    await user.type(await screen.findByLabelText('Nama pengguna'), `${name}{Enter}`);
    return screen.findByRole('navigation', { name: 'Navigasi utama' });
  };

  it('Rina berlatih, Bayu masuk dan mulai dari nol, Rina kembali dan progresnya masih ada', async () => {
    const m = await openApp();
    const user = userEvent.setup();
    let nav = await signIn(user, 'Rina');
    await waitFor(() => expect(m.useApp.getState().hydrated).toBe(true));
    doWork(m);
    await waitFor(() => expect(document.body.textContent).toMatch(/1\s*benar dari 1 item/));

    await user.click(within(nav).getByRole('button', { name: 'Ganti pengguna' }));
    nav = await signIn(user, 'Bayu');
    await waitFor(() => expect(document.body.textContent).toMatch(/0\s*benar dari 0 item/));
    expect(within(nav).getByTestId('user-name').textContent).toBe('Bayu');
    expect(screen.getByRole('region', { name: 'Panduan awal' })).toBeTruthy(); // Bayu pengguna baru: panduan awal muncul

    await user.click(within(nav).getByRole('button', { name: 'Ganti pengguna' }));
    await user.click(await screen.findByRole('button', { name: 'Masuk sebagai Rina' }));
    await screen.findByRole('navigation', { name: 'Navigasi utama' });
    await waitFor(() => expect(document.body.textContent).toMatch(/1\s*benar dari 1 item/));
  });

  it('memuat ulang halaman mengembalikan pengguna dan datanya', async () => {
    let m = await openApp();
    const user = userEvent.setup();
    await signIn(user, 'Rina');
    await waitFor(() => expect(m.useApp.getState().hydrated).toBe(true));
    doWork(m);
    await m.flushSave();
    cleanup();

    // "muat ulang": modul baru, penyimpanan dan profil tetap
    vi.resetModules();
    window.location.hash = '#/dashboard';
    const { App } = await import('../../src/ui/App');
    render(<App />);
    m = await mods();
    await screen.findByRole('navigation', { name: 'Navigasi utama' });
    await waitFor(() => expect(document.body.textContent).toMatch(/1\s*benar dari 1 item/));
  });
});
