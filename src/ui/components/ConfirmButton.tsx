import { useState } from 'react';

interface Props {
  label: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  className?: string;
}

/** Tombol dengan konfirmasi di tempat (tanpa dialog bawaan peramban). */
export function ConfirmButton({ label, message, confirmLabel = 'Ya, lanjutkan', onConfirm, className = 'btn' }: Props) {
  const [asking, setAsking] = useState(false);
  if (!asking)
    return (
      <button className={className} onClick={() => setAsking(true)}>
        {label}
      </button>
    );
  return (
    <span className="inline-flex flex-wrap items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-sm" role="alert">
      <span>{message}</span>
      <button className="btn btn-danger" autoFocus onClick={() => (setAsking(false), onConfirm())}>
        {confirmLabel}
      </button>
      <button className="btn" onClick={() => setAsking(false)}>
        Batal
      </button>
    </span>
  );
}
