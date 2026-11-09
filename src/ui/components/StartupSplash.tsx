import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BrandLogo } from './Brand';
import './startup-splash.css';

/** Waktu tampil minimum agar splash tidak berkedip bila aplikasi siap sangat cepat. */
export const SPLASH_MIN_MS = 1100;
/** Lama transisi keluar (harus sama dengan transisi opacity di startup-splash.css). */
export const SPLASH_EXIT_MS = 300;
/** Batas pengaman: bila inisialisasi macet, splash tidak boleh menutupi aplikasi selamanya. */
export const SPLASH_MAX_MS = 10000;

type Props = {
  /** true bila aplikasi benar-benar siap (data tersimpan sudah dimuat). */
  ready: boolean;
  /** Dipanggil sekali setelah transisi keluar selesai; induk lalu melepas komponen ini. */
  onDone: () => void;
};

/**
 * Splash startup. Di-mount sekali oleh <App/> (tidak muncul lagi saat pindah menu, membuka dialog, atau mengganti tema).
 * Timer hanya mengatur durasi minimum, transisi keluar, dan batas pengaman; kesiapan mengikuti prop `ready`.
 */
export function StartupSplash({ ready, onDone }: Props) {
  const startedAt = useRef(performance.now());
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const [leaving, setLeaving] = useState(false);

  // Latar statis dari index.html (anti flash putih) dilepas begitu splash React sudah menggantikannya.
  useLayoutEffect(() => {
    document.getElementById('ap-boot')?.remove();
  }, []);

  // Cegah scrollbar/gulir pada halaman di balik splash selama splash tampil.
  useEffect(() => {
    document.documentElement.classList.add('ap-splash-lock');
    return () => document.documentElement.classList.remove('ap-splash-lock');
  }, []);

  // Keluar setelah aplikasi siap dan durasi minimum terpenuhi.
  useEffect(() => {
    if (!ready) return;
    const wait = Math.max(0, SPLASH_MIN_MS - (performance.now() - startedAt.current));
    const t = window.setTimeout(() => setLeaving(true), wait);
    return () => window.clearTimeout(t);
  }, [ready]);

  // Pengaman: tetap keluar walau `ready` tidak pernah true; layar pemuatan/kesalahan milik aplikasi akan terlihat.
  useEffect(() => {
    const t = window.setTimeout(() => setLeaving(true), SPLASH_MAX_MS);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!leaving) return;
    const t = window.setTimeout(() => doneRef.current(), SPLASH_EXIT_MS);
    return () => window.clearTimeout(t);
  }, [leaving]);

  return (
    <div className="ap-splash" data-leaving={leaving ? 'true' : 'false'} role="status" aria-live="polite" aria-label="DEKRi Lab sedang dimuat">
      <div className="ap-splash__content">
        <span className="ap-splash__shape ap-splash__shape--a" aria-hidden="true" />
        <span className="ap-splash__shape ap-splash__shape--b" aria-hidden="true" />
        <span className="ap-splash__shape ap-splash__shape--c" aria-hidden="true" />
        <span className="ap-splash__shape ap-splash__shape--d" aria-hidden="true" />
        <div className="ap-splash__card">
          <BrandLogo className="ap-splash__mark" />
        </div>
        <div className="ap-splash__tagline">Belajar • Berlatih • Menguasai Akuntansi</div>
        <div className="ap-splash__progress" role="progressbar" aria-label="Memuat aplikasi" aria-busy="true">
          <span className="ap-splash__bar" />
        </div>
        <div className="ap-splash__status">Menyiapkan workspace...</div>
      </div>
    </div>
  );
}
