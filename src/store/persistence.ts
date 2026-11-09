import { get, set, del } from 'idb-keyval';
import { migrate, type UserState } from './state';
import { ONBOARD_KEY, RECENT_ACCOUNTS_KEY, scoped } from './scope';

const KEY = 'akuntansi-practice:state:v1';

export async function loadState(): Promise<UserState | null> {
  try {
    return migrate(await get(scoped(KEY)));
  } catch {
    return null;
  }
}

export async function saveState(state: UserState): Promise<void> {
  await set(scoped(KEY), state);
}

const HISTORY_KEY = 'akuntansi-practice:history:v1';
/** Riwayat Urungkan disimpan terpisah dan dibatasi agar tidak membengkak. */
export const PERSISTED_HISTORY = 30;

export async function loadHistory(): Promise<{ past: unknown[]; future: unknown[] } | null> {
  try {
    const h = await get(scoped(HISTORY_KEY));
    return h && Array.isArray(h.past) && Array.isArray(h.future) ? h : null;
  } catch {
    return null;
  }
}

export async function saveHistory(h: { past: unknown[]; future: unknown[] }): Promise<void> {
  await set(scoped(HISTORY_KEY), { past: h.past.slice(-PERSISTED_HISTORY), future: h.future.slice(-PERSISTED_HISTORY) });
}

export async function clearState(): Promise<void> {
  await del(scoped(KEY));
  await del(scoped(HISTORY_KEY));
}

/** Minta peramban tidak menghapus data saat ruang menipis (best-effort). */
export async function requestPersistence(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

// Sesi ujian yang sedang berjalan (agar selamat dari muat ulang). Bukan bagian UserState dan tidak ikut cadangan.
const EXAM_KEY = 'akuntansi-practice:exam-session:v1';
export async function loadExamSession(): Promise<unknown | null> {
  try {
    return (await get(scoped(EXAM_KEY))) ?? null;
  } catch {
    return null;
  }
}
export async function saveExamSession(v: unknown): Promise<void> {
  try {
    await set(scoped(EXAM_KEY), v);
  } catch {
    /* penyimpanan sesi bersifat best-effort */
  }
}
export async function clearExamSession(): Promise<void> {
  try {
    await del(scoped(EXAM_KEY));
  } catch {
    /* abaikan */
  }
}

// Paket soal tambahan (bukan bagian UserState; tidak ikut cadangan jawaban).
const PACKS_KEY = 'akuntansi-practice:packs:v1';
export async function loadPacks(): Promise<unknown[]> {
  try {
    const v = await get(scoped(PACKS_KEY));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
export async function savePacks(packs: unknown[]): Promise<void> {
  await set(scoped(PACKS_KEY), packs);
}

// Salinan pengaman sebelum tindakan yang menimpa progres (impor cadangan, reset). Satu slot; tidak ikut cadangan.
const SNAPSHOT_KEY = 'akuntansi-practice:pre-overwrite:v1';
export interface Snapshot {
  at: string;
  reason: 'impor' | 'reset';
  state: UserState;
}
export async function saveSnapshot(state: UserState, reason: Snapshot['reason']): Promise<void> {
  await set(scoped(SNAPSHOT_KEY), { at: new Date().toISOString(), reason, state } satisfies Snapshot);
}
export async function loadSnapshot(): Promise<Snapshot | null> {
  try {
    const v = await get(scoped(SNAPSHOT_KEY));
    const state = v && typeof v === 'object' ? migrate((v as { state?: unknown }).state) : null;
    if (!state) return null;
    return { at: typeof v.at === 'string' ? v.at : '', reason: v.reason === 'reset' ? 'reset' : 'impor', state };
  } catch {
    return null;
  }
}

// ---- Migrasi data bawaan (sebelum ada login) ----
// Data lama tersimpan di kunci tanpa nama pengguna. Pengguna pertama yang masuk setelah pembaruan mengadopsinya
// (disalin; kunci lama dibiarkan sebagai pengaman). Penanda pemilik mencegah pengguna kedua ikut mengadopsi.
const LEGACY_OWNER_KEY = 'akuntansi-practice:legacy-owner:v1';
const ADOPTED = [KEY, HISTORY_KEY, EXAM_KEY, PACKS_KEY, SNAPSHOT_KEY];

/** True bila data lama baru saja disalin ke `userKey`. Tidak pernah menimpa data yang sudah dimiliki pengguna itu. */
export async function adoptLegacy(userKey: string): Promise<boolean> {
  try {
    if (await get(LEGACY_OWNER_KEY)) return false;
    if (await get(scoped(KEY, userKey))) return false;
    if (!(await get(KEY))) return false;
    for (const base of ADOPTED) {
      const v = await get(base);
      if (v !== undefined) await set(scoped(base, userKey), v);
    }
    await set(LEGACY_OWNER_KEY, userKey);
    try {
      for (const base of [ONBOARD_KEY, RECENT_ACCOUNTS_KEY]) {
        const v = localStorage.getItem(base);
        if (v !== null) localStorage.setItem(scoped(base, userKey), v);
      }
    } catch {
      /* preferensi hanya kemudahan; abaikan */
    }
    return true;
  } catch {
    return false;
  }
}
