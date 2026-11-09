import { useState } from 'react';
import { markOnboarded, seenOnboarding } from '../prefs';
import { navigate } from '../router';

/** Panduan singkat untuk pemakaian pertama; hilang permanen setelah ditutup. */
export function Onboarding() {
  const [open, setOpen] = useState(() => !seenOnboarding());
  if (!open) return null;
  const close = () => (markOnboarded(), setOpen(false));
  return (
    <section className="card no-print relative mb-4 overflow-hidden bg-[var(--tag-lime-bg)]" aria-label="Panduan awal">
      <span aria-hidden="true" className="absolute -right-6 -top-8 size-28 rounded-full bg-white" />
      <div className="eyebrow relative !text-[var(--tag-lime-fg)]">Mulai di sini</div>
      <h2 className="relative text-2xl">Selamat datang</h2>
      <ol className="relative mt-2 list-decimal space-y-1 pl-5 text-sm">
        <li>
          Mulai dari <b>Jalur Belajar</b>: 13 materi berurutan dengan kuis dan latihan.
        </li>
        <li>
          Kerjakan jurnal di <b>Transaksi</b>; tombol Periksa menilai jawaban dan menjelaskan letak salahnya.
        </li>
        <li>
          Semua pekerjaan tersimpan otomatis di perangkat ini. Ekspor cadangan dari <b>Pengaturan</b> secara berkala.
        </li>
        <li>
          Tekan <b>?</b> untuk melihat pintasan keyboard.
        </li>
      </ol>
      <div className="relative mt-3 flex gap-2">
        <button
          className="btn btn-primary"
          onClick={() => {
            close();
            navigate('belajar');
          }}
        >
          Buka Jalur Belajar
        </button>
        <button className="btn" onClick={close}>
          Tutup panduan
        </button>
      </div>
    </section>
  );
}
