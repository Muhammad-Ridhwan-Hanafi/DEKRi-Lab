import { useEffect, useRef, useState } from 'react';
import { loadSnapshot, saveSnapshot, type Snapshot } from '../../store/persistence';
import { hasProgress } from '../../store/state';
import { DesktopBackupSection } from '../components/DesktopBackup';
import { MAX_BACKUP_BYTES, parseBackup, type BackupSummary } from '../../store/state';
import { useApp } from '../../store/useApp';
import { downloadText } from '../format';
import { FEEDBACK_URL } from '../links';
import { getTheme, setTheme, type Theme } from '../theme';
import { SCALES, getScale, setScale, type Scale } from '../prefs';
import { ShortcutList } from '../components/Shortcuts';
import pkg from '../../../package.json';

export function Pengaturan() {
  const state = useApp((s) => s.state);
  const [scale, setScaleState] = useState<Scale>(getScale());
  const saveStatus = useApp((s) => s.saveStatus);
  const [pending, setPending] = useState<BackupSummary | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [theme, setThemeState] = useState<Theme>(getTheme);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  useEffect(() => {
    void loadSnapshot().then(setSnap);
  }, []);
  /** Simpan salinan pengaman progres saat ini sebelum menimpanya. */
  const safeguard = async (reason: Snapshot['reason']) => {
    const cur = useApp.getState().state;
    if (!hasProgress(cur)) return;
    try {
      await saveSnapshot(cur, reason);
      setSnap(await loadSnapshot());
    } catch {
      /* penyimpanan salinan pengaman bersifat best-effort */
    }
  };

  const doExport = () => {
    const b = useApp.getState().exportBackup();
    downloadText(`akuntansi-backup-${b.exportedAt.slice(0, 10)}.json`, JSON.stringify(b, null, 1), 'application/json');
    setMsg({ ok: true, text: 'Cadangan diunduh.' });
  };

  const onFile = async (f: File | undefined) => {
    setMsg(null);
    setPending(null);
    if (!f) return;
    if (f.size > MAX_BACKUP_BYTES) {
      setMsg({ ok: false, text: 'File terlalu besar untuk berkas cadangan (maks. 25 MB).' });
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    try {
      setPending(parseBackup(await f.text()));
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'File tidak dapat dibaca.' });
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="max-w-2xl space-y-4">
      <section className="card">
        <h2 className="mb-2 font-semibold">Cara penilaian</h2>
        <label className="mb-1 flex items-start gap-2 text-sm">
          <input type="radio" name="mode" checked={state.settings.validationMode === 'check'} onChange={() => useApp.getState().setMode('check')} />
          <span>
            <b>Periksa</b> (bawaan): jawaban dinilai saat tombol Periksa ditekan dan jumlah percobaan dicatat. Cocok untuk belajar karena umpan balik instan
            membuat menebak terlalu mudah.
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="radio" name="mode" checked={state.settings.validationMode === 'live'} onChange={() => useApp.getState().setMode('live')} />
          <span>
            <b>Langsung</b>: status tampil otomatis setiap kali isian berubah, tanpa menekan tombol Periksa. Percobaan tidak dihitung.
          </span>
        </label>
      </section>

      <section className="card">
        <h2 className="mb-2 font-semibold">Tampilan</h2>
        <div className="flex flex-wrap gap-4 text-sm">
          {(
            [
              ['auto', 'Ikuti sistem'],
              ['light', 'Terang'],
              ['dark', 'Gelap'],
            ] as const
          ).map(([v, label]) => (
            <label key={v} className="flex items-center gap-1">
              <input type="radio" name="theme" checked={theme === v} onChange={() => (setTheme(v), setThemeState(v))} /> {label}
            </label>
          ))}
        </div>
        <p className="mt-1 text-xs text-slate-500">Saat mencetak, tampilan selalu terang.</p>
        <label className="mt-3 flex items-center gap-2 text-sm">
          Ukuran tampilan
          <select
            aria-label="Ukuran tampilan"
            value={scale}
            onChange={(e) => {
              const v = Number(e.target.value) as Scale;
              setScale(v);
              setScaleState(v);
            }}
          >
            {SCALES.map((v) => (
              <option key={v} value={v}>
                {v}%
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="card">
        <h2 className="mb-2 font-semibold">Pintasan keyboard</h2>
        <ShortcutList />
      </section>

      <section className="card" aria-label="Tentang">
        <h2 className="mb-2 font-semibold">Tentang</h2>
        <p className="text-sm">
          DEKRi Lab, versi <b>{pkg.version}</b>. Studi kasus PT Sumber Cahaya Elektrindo tahun buku 2024.
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Berjalan sepenuhnya offline; tidak ada server, akun, atau pengiriman data. Progres disimpan di penyimpanan peramban/aplikasi pada perangkat ini, jadi
          cadangkan secara berkala.
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Proyek sumber terbuka yang independen dan tidak memiliki afiliasi apa pun. Aplikasi ini bukan nasihat akuntansi, pajak, atau hukum. Kasus dan materi
          disusun dengan bantuan kecerdasan buatan (AI). Soal disusun agar sesuai dengan standar akuntansi (PSAK), tetapi masih mungkin ada kesalahan. Lisensi
          MIT hanya untuk kode sumber. Lihat DISCLAIMER.md dan docs/LICENSING.md pada repositori.
        </p>
        <p className="mt-1 text-xs text-slate-500">
          <b>Catatan PSAK:</b> mungkin terdapat soal, kunci, atau penjelasan yang tidak sesuai dengan PSAK. Bila berbeda, rujuk standar resmi yang berlaku atau
          tanyakan kepada pengajar Anda.
        </p>
        <FeedbackBox />
        <p className="mt-1 text-xs text-slate-500">
          <b>Perusahaan fiktif:</b> semua perusahaan, bank, nama, dan angka dalam aplikasi ini fiktif. Kesamaan dengan pihak nyata adalah ketidaksengajaan.
        </p>
      </section>

      <section className="card">
        <h2 className="mb-2 font-semibold">Cadangan</h2>
        <p className="mb-2 text-sm text-slate-600">
          Progres disimpan otomatis di peramban ini ({saveStatus === 'saving' ? 'menyimpan…' : saveStatus === 'error' ? 'GAGAL menyimpan' : 'tersimpan'}).
          Ekspor satu file JSON untuk pindah perangkat atau berjaga-jaga bila data peramban terhapus.
          {state.settings.lastExportAt && <> Ekspor terakhir: {new Date(state.settings.lastExportAt).toLocaleString('id-ID')}.</>}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn btn-primary" onClick={doExport}>
            Ekspor cadangan
          </button>
          <label className="btn">
            Impor cadangan…
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
          </label>
        </div>
        {msg && <p className={`mt-2 text-sm ${msg.ok ? 'text-emerald-700' : 'text-red-700'}`}>{msg.text}</p>}
        {snap && (
          <div className="mt-3 rounded-md border border-slate-300 p-3 text-sm">
            <p>
              Salinan pengaman progres sebelum {snap.reason === 'reset' ? 'reset' : 'impor'} terakhir (
              {snap.at ? new Date(snap.at).toLocaleString('id-ID') : 'waktu tidak diketahui'}) masih tersimpan.
            </p>
            <button
              className="btn mt-2"
              onClick={() => (useApp.getState().replaceState(snap.state), setMsg({ ok: true, text: 'Progres sebelum penimpaan dikembalikan.' }))}
            >
              Kembalikan progres tersebut
            </button>
          </div>
        )}
        {pending && (
          <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
            <p>
              Cadangan tertanggal {pending.exportedAt ? new Date(pending.exportedAt).toLocaleString('id-ID') : '(tidak diketahui)'}: {pending.journals}{' '}
              transaksi berjurnal, {pending.adjustments} penyesuaian, {pending.scenarios} jawaban skenario.
            </p>
            {pending.dropped > 0 && (
              <p className="mt-1 text-red-700" role="alert">
                {pending.dropped} isian tidak valid (nominal rusak atau kode akun tidak dikenal) akan diabaikan.
              </p>
            )}
            <p className="mt-1 font-medium">Mengimpor akan MENGGANTI seluruh progres saat ini.</p>
            <div className="mt-2 flex gap-2">
              <button
                className="btn btn-danger"
                onClick={() =>
                  void safeguard('impor').then(
                    () => (useApp.getState().replaceState(pending.state), setPending(null), setMsg({ ok: true, text: 'Cadangan dipulihkan.' })),
                  )
                }
              >
                Ganti progres dengan cadangan
              </button>
              <button className="btn" onClick={() => setPending(null)}>
                Batal
              </button>
            </div>
          </div>
        )}
      </section>

      <DesktopBackupSection />

      <section className="card">
        <h2 className="mb-2 font-semibold">Reset progres</h2>
        <p className="mb-2 text-sm text-slate-600">
          Menghapus seluruh jawaban, percobaan, dan kunci yang sudah dibuka. Ekspor cadangan lebih dulu bila perlu. Ketik <b>RESET</b> untuk mengaktifkan
          tombol.
        </p>
        <div className="flex gap-2">
          <input aria-label="Konfirmasi reset" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="RESET" className="w-32" />
          <button
            className="btn btn-danger"
            disabled={confirmText !== 'RESET'}
            onClick={() =>
              void safeguard('reset')
                .then(() => useApp.getState().reset())
                .then(() => (setConfirmText(''), setMsg({ ok: true, text: 'Progres dihapus.' })))
            }
          >
            Hapus semua progres
          </button>
        </div>
      </section>
    </div>
  );
}

function FeedbackBox() {
  const [copied, setCopied] = useState<'ok' | 'gagal' | null>(null);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(FEEDBACK_URL);
      setCopied('ok');
    } catch {
      setCopied('gagal');
    }
  };
  return (
    <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-2 text-xs" aria-label="Laporkan kesalahan soal">
      <p>
        <b>Menemukan soal atau kunci yang keliru?</b> Laporkan lewat GitHub agar bisa diperbaiki di versi berikutnya. Sebutkan nomor soal dan bagian yang
        menurut Anda salah. Aplikasi ini bekerja offline, jadi salin tautan di bawah lalu buka di peramban.
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <code className="break-all rounded bg-white px-1.5 py-0.5">{FEEDBACK_URL}</code>
        <button className="btn" onClick={() => void copy()}>
          Salin tautan
        </button>
        {copied && <span role="status">{copied === 'ok' ? 'Tautan disalin.' : 'Tidak bisa menyalin otomatis; salin teks tautan secara manual.'}</span>}
      </div>
    </div>
  );
}
