import { ACCOUNT_BY_CODE } from '../../data';
import { itemKey, type ItemKind } from '../../store/derive';
import { useApp } from '../../store/useApp';
import { useCtx } from '../hooks';

interface KeyLine {
  code: string;
  name: string;
  debit: number;
  credit: number;
}

const TYPE_ID: Record<string, string> = { Asset: 'Aset', Liability: 'Liabilitas', Equity: 'Ekuitas', Revenue: 'Pendapatan', Expense: 'Beban' };

/** Buang angka hasil di ujung rumus ("... = 108.000.000") supaya dasar perhitungan tidak membocorkan jawaban. */
export const maskCalc = (calc: string, hide: number[] = []) => {
  const i = calc.lastIndexOf('=');
  let out = i < 0 ? calc.replace(/\d[\d.]*/g, '…') : calc.slice(0, i).trim() + ' = …';
  // angka antara yang sama dengan nominal jurnal juga ikut disamarkan
  for (const n of hide) if (n >= 1000) out = out.split(n.toLocaleString('id-ID')).join('…');
  return out;
};

/** Teks tiap tingkat petunjuk. Tidak pernah memuat nominal jawaban. */
export function hintTexts(topic: string, lines: KeyLine[], calc?: string | null): string[] {
  if (lines.length === 0)
    return [
      `Topik: ${topic}.`,
      'Pikirkan apakah peristiwa ini memang mengubah akun.',
      'Jawabannya mungkin tidak perlu jurnal. Kalau yakin, centang "tidak perlu jurnal".',
    ];
  const types = [...new Set(lines.map((l) => TYPE_ID[ACCOUNT_BY_CODE[l.code]?.type ?? ''] ?? '?'))];
  const accounts = lines.map((l) => `${l.code} ${l.name}`).sort();
  const first = lines[0];
  return [
    `Topik: ${topic}. Jurnalnya melibatkan ${lines.length} baris, dari kelompok akun: ${types.join(', ')}.`,
    calc
      ? `Dasar perhitungan: ${maskCalc(
          calc,
          lines.flatMap((l) => [l.debit, l.credit]),
        )}`
      : `Akun yang terlibat (urutan acak): ${accounts.join('; ')}.`,
    `Baris pertama: ${first.debit ? 'DEBIT' : 'KREDIT'} ${first.code} ${first.name}. Nominalnya tetap Anda hitung sendiri.`,
  ];
}

export function Hints({ kind, id, topic, lines, calc }: { kind: ItemKind; id: string; topic: string; lines: KeyLine[]; calc?: string | null }) {
  const { state } = useCtx();
  const level = state.hints[itemKey(kind, id)] ?? 0;
  const texts = hintTexts(topic, lines, calc);
  return (
    <div className="mt-3 text-sm" data-testid="hints">
      {texts.slice(0, level).map((t, i) => (
        <p key={i} className="mb-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1">
          <b>Petunjuk {i + 1}:</b> {t}
        </p>
      ))}
      {level < 3 && (
        <button className="btn" onClick={() => useApp.getState().openHint(kind, id)}>
          {level === 0 ? 'Beri petunjuk' : `Petunjuk berikutnya (${level + 1}/3)`}
        </button>
      )}
    </div>
  );
}

/** Penanda + catatan pribadi per soal. */
export function FlagNote({ kind, id }: { kind: ItemKind; id: string }) {
  const { state } = useCtx();
  const key = itemKey(kind, id);
  const flagged = state.flags.includes(key);
  return (
    <div className="mt-3 flex flex-wrap items-start gap-2 text-sm">
      <button className={`btn ${flagged ? 'btn-primary' : ''}`} aria-pressed={flagged} onClick={() => useApp.getState().toggleFlag(kind, id)}>
        {flagged ? '★ Ditandai' : '☆ Tandai'}
      </button>
      <label className="min-w-[14rem] flex-1">
        <span className="sr-only">Catatan pribadi</span>
        <textarea
          aria-label="Catatan pribadi"
          className="w-full"
          rows={1}
          placeholder="Catatan pribadi untuk soal ini"
          value={state.notes[key] ?? ''}
          onChange={(e) => useApp.getState().setNote(kind, id, e.target.value)}
        />
      </label>
    </div>
  );
}

/** Penjelasan setelah jawaban BENAR (orang sering benar karena kebetulan); tidak mengubah akurasi. */
export function WhyCorrect({ explain, calc, points }: { explain?: string | null; calc?: string | null; points?: string[] }) {
  if (!explain && !calc && !points?.length) return null;
  return (
    <details className="mt-2 rounded-md border border-green-200 bg-green-50 px-2 py-1 text-sm">
      <summary className="cursor-pointer select-none font-medium">Mengapa jawaban ini benar?</summary>
      {calc && (
        <p className="mt-1">
          <b>Perhitungan:</b> {calc}
        </p>
      )}
      {explain && <p className="mt-1">{explain}</p>}
      {points && points.length > 0 && (
        <ul className="mt-1 list-disc space-y-1 pl-5">
          {points.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      )}
    </details>
  );
}
