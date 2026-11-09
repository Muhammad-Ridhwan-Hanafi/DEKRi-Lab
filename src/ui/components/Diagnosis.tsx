import type { JournalLine } from '../../engine/types';
import { compareWithKey, diagnose, numbersIn, type VerdictKind } from '../../validation/feedback';

interface KeyLine {
  code: string;
  debit: number;
  credit: number;
}
const toNet = (lines: readonly KeyLine[]) => {
  const net: Record<string, number> = {};
  for (const l of lines) net[l.code] = (net[l.code] ?? 0) + l.debit - l.credit;
  return net;
};

const STYLE: Record<VerdictKind, string> = {
  ok: 'text-green-800',
  'wrong-side': 'text-red-800',
  'wrong-amount': 'text-red-800',
  extra: 'text-red-800',
  missing: 'text-amber-900',
};
const LABEL: Record<VerdictKind, string> = {
  ok: 'Tepat',
  'wrong-side': 'Sisi terbalik',
  'wrong-amount': 'Nominal',
  extra: 'Tidak diperlukan',
  missing: 'Belum ada',
};

/** Diagnosis kesalahan tanpa membuka kunci: tidak menampilkan nominal jawaban yang benar. */
export function Diagnosis({ lines, keyLines, text }: { lines: readonly JournalLine[]; keyLines: readonly KeyLine[]; text: string }) {
  const f = diagnose(lines, toNet(keyLines), numbersIn(text));
  return (
    <div className="ap-fade mt-3 rounded-lg border border-red-200 bg-red-50/50 p-3 text-sm" data-testid="diagnosis">
      <div className="mb-1 font-semibold">Mengapa belum tepat</div>
      <ul className="space-y-0.5">
        {f.verdicts.map((v) => (
          <li key={v.code} className={STYLE[v.kind]}>
            <b>{LABEL[v.kind]}</b> · <span className="font-mono text-xs">{v.code}</span> {v.note}
          </li>
        ))}
      </ul>
      {f.concepts.length > 0 && (
        <div className="mt-2">
          <div className="font-medium">Kemungkinan kesalahan konsep</div>
          <ul className="list-disc pl-5">
            {f.concepts.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const rp = (n: number) => n.toLocaleString('id-ID');

/** Perbandingan jawaban Anda dengan kunci; dipakai di dalam panel kunci yang sudah dibuka. */
export function KeyCompare({ lines, keyLines }: { lines: readonly JournalLine[]; keyLines: readonly KeyLine[] }) {
  if (!lines.some((l) => l.code)) return null;
  const rows = compareWithKey(lines, toNet(keyLines));
  const cell = (c: { side: 'D' | 'K'; amount: number } | null) => (c ? `${c.side === 'D' ? 'Debit' : 'Kredit'} ${rp(c.amount)}` : '—');
  return (
    <table className="my-2 bg-white" data-testid="key-compare">
      <thead>
        <tr>
          <th>Akun</th>
          <th>Jawaban Anda</th>
          <th>Kunci</th>
          <th>Hasil</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.code}>
            <td>
              <span className="font-mono text-xs">{r.code}</span> {r.name}
            </td>
            <td className="num">{cell(r.user)}</td>
            <td className="num">{cell(r.key)}</td>
            <td className={r.match ? 'text-green-800' : 'text-red-800'}>
              {r.match ? 'Cocok' : r.key && !r.user ? 'Belum ada' : !r.key ? 'Tidak diperlukan' : 'Berbeda'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
