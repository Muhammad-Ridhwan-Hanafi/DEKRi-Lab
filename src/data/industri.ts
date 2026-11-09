import raw from '../../data/industri-packs.json';
import { parsePack, type Pack } from '../engine/casepack';
import { registerAccounts } from './ext';

/**
 * Paket soal bawaan berbagai industri (jasa, dagang, manufaktur, restoran, konstruksi, pendidikan, transportasi).
 * Tiap paket membawa bagan akunnya sendiri dan terpisah dari kasus utama: tidak memengaruhi laporan maupun akurasi Dashboard.
 * Dibuat oleh tools/gen_industri.py; parsePack memvalidasi ulang saat dimuat (jurnal seimbang, akun dikenal).
 */
export const INDUSTRY_PACKS: Pack[] = (raw as unknown[]).map((p) => parsePack(JSON.stringify(p)));
for (const pk of INDUSTRY_PACKS) registerAccounts(pk.accounts ?? []);
