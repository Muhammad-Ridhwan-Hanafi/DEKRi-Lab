import { useState } from 'react';
import { desktopApi } from '../../store/desktopBackup';

/** Kop yang hanya tampil saat dicetak. */
export function PrintHeader({ title }: { title?: string }) {
  return (
    <div className="hidden print:block">
      <div className="text-sm font-semibold">PT Sumber Cahaya Elektrindo</div>
      {title && <div className="text-base font-bold">{title}</div>}
      <div className="mb-2 text-xs">Dicetak {new Date().toLocaleString('id-ID')} · disusun dari jawaban latihan, bukan laporan resmi</div>
    </div>
  );
}

/** Cetak lewat dialog sistem; pada aplikasi desktop ada juga tombol Simpan PDF langsung. */
export function PrintButton({ name = 'laporan' }: { name?: string }) {
  const [msg, setMsg] = useState('');
  const api = desktopApi();
  const pdf = async () => {
    setMsg('');
    try {
      const r = await api!.savePdf(name);
      setMsg(r.ok ? `PDF disimpan: ${r.path}` : r.canceled ? '' : `Gagal: ${r.error ?? 'tidak diketahui'}`);
    } catch (e) {
      setMsg(`Gagal menyimpan PDF: ${(e as Error).message}`);
    }
  };
  return (
    <span className="no-print inline-flex items-center gap-2">
      <button className="btn" onClick={() => window.print()}>
        Cetak
      </button>
      {api?.savePdf && (
        <button className="btn" onClick={() => void pdf()}>
          Simpan PDF
        </button>
      )}
      {msg && (
        <span role="status" className="text-xs text-slate-600">
          {msg}
        </span>
      )}
    </span>
  );
}
