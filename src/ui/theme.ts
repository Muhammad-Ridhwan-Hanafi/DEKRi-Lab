export type Theme = 'auto' | 'light' | 'dark';
const KEY = 'akuntansi-practice:theme';

export function getTheme(): Theme {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

const prefersDark = () => typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;

export function applyTheme(theme: Theme = getTheme()): void {
  document.documentElement.classList.toggle('dark', theme === 'dark' || (theme === 'auto' && prefersDark()));
}

export function setTheme(theme: Theme): void {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* penyimpanan tidak tersedia: tema berlaku untuk sesi ini saja */
  }
  applyTheme(theme);
}

/** Pasang tema saat mulai, ikuti perubahan sistem, dan paksa tema terang saat mencetak. */
export function initTheme(): void {
  applyTheme();
  if (typeof matchMedia === 'function') matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => applyTheme());
  window.addEventListener('beforeprint', () => document.documentElement.classList.remove('dark'));
  window.addEventListener('afterprint', () => applyTheme());
}
