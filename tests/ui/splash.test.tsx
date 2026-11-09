// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SPLASH_EXIT_MS, SPLASH_MAX_MS, SPLASH_MIN_MS, StartupSplash } from '../../src/ui/components/StartupSplash';

const splash = () => document.querySelector('.ap-splash') as HTMLElement | null;

describe('StartupSplash', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('menampilkan nama, tagline, dan status tanpa persentase palsu', () => {
    render(<StartupSplash ready={false} onDone={() => undefined} />);
    expect(screen.getByRole('img', { name: 'DEKRi Lab' })).toBeTruthy();
    expect(screen.getByText('Belajar • Berlatih • Menguasai Akuntansi')).toBeTruthy();
    expect(screen.getByText('Menyiapkan workspace...')).toBeTruthy();
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBeNull(); // indeterminate
  });

  it('bila aplikasi sudah siap, tetap tampil sampai durasi minimum lalu keluar dan selesai', () => {
    const onDone = vi.fn();
    render(<StartupSplash ready onDone={onDone} />);
    act(() => void vi.advanceTimersByTime(SPLASH_MIN_MS - 50));
    expect(splash()!.dataset.leaving).toBe('false');
    act(() => void vi.advanceTimersByTime(60));
    expect(splash()!.dataset.leaving).toBe('true');
    expect(onDone).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(SPLASH_EXIT_MS + 5));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('menunggu selama aplikasi belum siap, lalu keluar setelah siap', () => {
    const onDone = vi.fn();
    const { rerender } = render(<StartupSplash ready={false} onDone={onDone} />);
    act(() => void vi.advanceTimersByTime(5000));
    expect(splash()!.dataset.leaving).toBe('false');
    rerender(<StartupSplash ready onDone={onDone} />);
    act(() => void vi.advanceTimersByTime(1));
    expect(splash()!.dataset.leaving).toBe('true'); // durasi minimum sudah lewat: langsung keluar
    act(() => void vi.advanceTimersByTime(SPLASH_EXIT_MS + 5));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('tidak memblokir selamanya bila inisialisasi macet', () => {
    const onDone = vi.fn();
    render(<StartupSplash ready={false} onDone={onDone} />);
    act(() => void vi.advanceTimersByTime(SPLASH_MAX_MS + 1));
    expect(splash()!.dataset.leaving).toBe('true');
    act(() => void vi.advanceTimersByTime(SPLASH_EXIT_MS + 5));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('mengunci gulir saat tampil, melepasnya saat dilepas, dan membuang latar awal', () => {
    document.body.insertAdjacentHTML('beforeend', '<div id="ap-boot"></div>');
    const { unmount } = render(<StartupSplash ready={false} onDone={() => undefined} />);
    expect(document.documentElement.classList.contains('ap-splash-lock')).toBe(true);
    expect(document.getElementById('ap-boot')).toBeNull();
    unmount();
    expect(document.documentElement.classList.contains('ap-splash-lock')).toBe(false);
  });
});
