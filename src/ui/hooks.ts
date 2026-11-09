import { useMemo } from 'react';
import { makeCtx } from '../store/derive';
import { useApp } from '../store/useApp';

/**
 * Status pengguna + hasil hitung ulang seluruh laporan.
 * Laporan hanya bergantung pada jurnal umum dan jurnal penyesuaian, jadi tidak dihitung ulang saat pengguna mengetik
 * catatan, analisis, skenario, atau membuka petunjuk (state lain berubah, `journal`/`adjusting` tetap objek yang sama).
 */
export function useCtx() {
  const state = useApp((s) => s.state);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ctx = useMemo(() => makeCtx(state), [state.journal, state.adjusting]);
  return { state, ctx };
}

export const useActions = () => useApp.getState();
