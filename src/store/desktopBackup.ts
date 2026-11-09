import { create } from 'zustand';
import { hasProgress, makeBackup } from './state';
import { getScope } from './scope';
import { flushSave, onBeforeSwitchUser, useApp } from './useApp';

/** Jembatan cadangan versi EXE (lihat desktop/preload.cjs). Tidak ada di peramban biasa. */
export interface DesktopBackupApi {
  write(text: string, user?: string): Promise<{ dir: string; at: string }>;
  readLatest(user?: string): Promise<string | null>;
  info(user?: string): Promise<{ dir: string; latestAt: string | null; files: string[] }>;
  openFolder(): Promise<string>;
  onBeforeClose(cb: () => void): void;
  closeReady(): void;
  savePdf(name: string): Promise<{ ok: boolean; canceled?: boolean; path?: string; error?: string }>;
}
declare global {
  interface Window {
    desktopBackup?: DesktopBackupApi;
  }
}

export const desktopApi = (): DesktopBackupApi | undefined => (typeof window === 'undefined' ? undefined : window.desktopBackup);

interface Store {
  available: boolean;
  dir: string;
  latestAt: string | null;
  error: string;
  refresh: () => Promise<void>;
  backupNow: () => Promise<void>;
}

export const useDesktopBackup = create<Store>((set) => ({
  available: !!desktopApi(),
  dir: '',
  latestAt: null,
  error: '',
  refresh: async () => {
    const api = desktopApi();
    if (!api) return;
    try {
      const i = await api.info(getScope() ?? undefined);
      set({ available: true, dir: i.dir, latestAt: i.latestAt, error: '' });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Gagal membaca folder cadangan.' });
    }
  },
  backupNow: async () => {
    const api = desktopApi();
    const st = useApp.getState();
    if (!api || !st.hydrated || !hasProgress(st.state)) return;
    try {
      const r = await api.write(JSON.stringify(makeBackup(st.state), null, 1), getScope() ?? undefined);
      set({ latestAt: r.at, dir: r.dir, error: '' });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Gagal menulis cadangan.' });
    }
  },
}));

/** Tulis cadangan 3 detik setelah perubahan terakhir dan saat jendela ditutup. Mengembalikan fungsi berhenti. */
export function startDesktopBackup(delayMs = 3000): () => void {
  const api = desktopApi();
  if (!api) return () => {};
  void useDesktopBackup.getState().refresh();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let last = useApp.getState().state;
  const unsub = useApp.subscribe((s) => {
    if (!s.hydrated || s.state === last) return;
    last = s.state;
    clearTimeout(timer);
    timer = setTimeout(() => void useDesktopBackup.getState().backupNow(), delayMs);
  });
  // Berganti pengguna: cadangkan perubahan pengguna lama sekarang (jangan menunggu 3 detik, ruang data segera berganti),
  // lalu muat ulang info cadangan setelah data pengguna baru siap.
  const stopSwitch = onBeforeSwitchUser(async () => {
    clearTimeout(timer);
    await useDesktopBackup.getState().backupNow();
  });
  let wasHydrated = useApp.getState().hydrated;
  const unsubHydrated = useApp.subscribe((s) => {
    if (s.hydrated && !wasHydrated) void useDesktopBackup.getState().refresh();
    wasHydrated = s.hydrated;
  });
  api.onBeforeClose(() => {
    clearTimeout(timer);
    // simpan IndexedDB lebih dulu, lalu tulis cadangan berkas; keduanya gagal pun jendela tetap ditutup
    void flushSave()
      .catch(() => undefined)
      .then(() => useDesktopBackup.getState().backupNow())
      .finally(() => api.closeReady());
  });
  return () => {
    clearTimeout(timer);
    unsub();
    stopSwitch();
    unsubHydrated();
  };
}
