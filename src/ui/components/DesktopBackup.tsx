import { useState } from 'react';
import { hasProgress } from '../../store/state';
import { desktopApi, useDesktopBackup } from '../../store/desktopBackup';
import { parseBackup } from '../../store/state';
import { getScope } from '../../store/scope';
import { useApp } from '../../store/useApp';
import { ConfirmButton } from './ConfirmButton';
import { Icon } from './Icon';

async function restore(): Promise<string> {
  const api = desktopApi();
  if (!api) throw new Error('Cadangan otomatis hanya tersedia di aplikasi desktop.');
  const text = await api.readLatest(getScope() ?? undefined);
  if (!text) throw new Error('Belum ada cadangan.');
  useApp.getState().replaceState(parseBackup(text).state);
  return 'Progres dipulihkan dari cadangan terbaru.';
}

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : 'belum pernah');

/** Banner: progres kosong tetapi ada cadangan otomatis di folder Dokumen (mis. setelah data aplikasi terhapus). */
export function DesktopRestoreBanner() {
  const d = useDesktopBackup();
  const hydrated = useApp((s) => s.hydrated);
  const empty = useApp((s) => !hasProgress(s.state));
  const [msg, setMsg] = useState('');
  const [hidden, setHidden] = useState(false);
  if (!d.available || !hydrated || !empty || !d.latestAt || hidden) return msg ? <p className="mb-4 text-sm text-emerald-800">{msg}</p> : null;
  return (
    <div className="no-print mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-950" role="status">
      <Icon name="alert" size={18} />
      <span>Progres kosong, tetapi ditemukan cadangan otomatis ({when(d.latestAt)}).</span>
      <button className="btn btn-primary" onClick={() => restore().then(setMsg, (e) => setMsg(e instanceof Error ? e.message : 'Gagal memulihkan.'))}>
        Pulihkan sekarang
      </button>
      <button className="btn" onClick={() => setHidden(true)}>
        Abaikan
      </button>
    </div>
  );
}

export function DesktopBackupSection() {
  const d = useDesktopBackup();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  if (!d.available) return null;
  return (
    <section className="card" data-testid="cadangan-desktop">
      <h2 className="mb-2 font-semibold">Cadangan otomatis</h2>
      <p className="mb-2 text-sm text-slate-600">
        Progres dicadangkan otomatis beberapa detik setelah perubahan dan saat aplikasi ditutup: satu berkas &ldquo;terbaru&rdquo; dan satu berkas per hari (7
        hari terakhir). Data tidak dikirim ke mana pun.
      </p>
      <p className="mb-2 text-sm">
        Folder: <b className="break-all">{d.dir || '…'}</b> · cadangan terakhir: <b>{when(d.latestAt)}</b>
      </p>
      {d.error && <p className="mb-2 text-sm text-red-700">{d.error}</p>}
      {msg && <p className={`mb-2 text-sm ${msg.ok ? 'text-emerald-800' : 'text-red-700'}`}>{msg.text}</p>}
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-primary" onClick={() => void d.backupNow().then(() => d.refresh())}>
          Cadangkan sekarang
        </button>
        <button className="btn" onClick={() => void desktopApi()?.openFolder()}>
          Buka folder
        </button>
        <ConfirmButton
          label="Pulihkan dari cadangan terbaru"
          message="Progres saat ini diganti dengan cadangan terbaru."
          confirmLabel="Ya, pulihkan"
          onConfirm={() =>
            void restore().then(
              (t) => setMsg({ ok: true, text: t }),
              (e) => setMsg({ ok: false, text: e instanceof Error ? e.message : 'Gagal memulihkan.' }),
            )
          }
        />
      </div>
    </section>
  );
}
