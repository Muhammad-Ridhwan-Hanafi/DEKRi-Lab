import { ADJUSTMENTS, SCENARIOS, TRANSACTIONS } from '../data';
import type { Reason } from '../validation/grade';
import { itemKey, resultFor, type Ctx, type ItemKind } from './derive';
import type { UserState } from './state';

export type TopicKind = Extract<ItemKind, 'txn' | 'adj' | 'sc'>;

export interface TopicStat {
  topic: string;
  kind: TopicKind;
  /** item yang dikerjakan (sudah diperiksa, kunci tidak dibuka) */
  worked: number;
  /** item yang statusnya masih PERIKSA */
  wrong: number;
  /** percobaan ekstra pada item yang akhirnya BENAR (salah dulu baru benar) */
  retries: number;
  /** item pertama yang perlu dikerjakan ulang */
  next: { kind: TopicKind; id: string } | null;
  score: number;
}

export interface ReasonStat {
  reason: Reason;
  count: number;
}

const ITEMS: Array<{ kind: TopicKind; id: string; topic: string }> = [
  ...TRANSACTIONS.map((t) => ({ kind: 'txn' as const, id: String(t.no), topic: t.topic })),
  ...ADJUSTMENTS.map((a) => ({ kind: 'adj' as const, id: a.code, topic: a.category })),
  ...SCENARIOS.map((s) => ({ kind: 'sc' as const, id: String(s.no), topic: s.topic })),
];

/** Topik yang sering salah: PERIKSA bernilai 2 poin, tiap percobaan ulang pada item yang akhirnya benar 1 poin. */
export function weaknessReport(state: UserState, ctx: Ctx): { topics: TopicStat[]; reasons: ReasonStat[] } {
  const by = new Map<string, TopicStat>();
  const reasons = new Map<Reason, number>();
  for (const it of ITEMS) {
    const r = resultFor(state, it.kind, it.id, ctx);
    if (r.revealed || r.status === 'BELUM DIISI' || r.status === 'BELUM DIPERIKSA') continue;
    const k = `${it.kind}:${it.topic}`;
    const t = by.get(k) ?? { topic: it.topic, kind: it.kind, worked: 0, wrong: 0, retries: 0, next: null, score: 0 };
    t.worked++;
    if (r.status === 'PERIKSA') {
      t.wrong++;
      t.next ??= { kind: it.kind, id: it.id };
      reasons.set(r.grade.reason, (reasons.get(r.grade.reason) ?? 0) + 1);
    } else t.retries += Math.max(0, (state.attempts[itemKey(it.kind, it.id)] ?? 1) - 1);
    t.score = t.wrong * 2 + t.retries;
    by.set(k, t);
  }
  return {
    topics: [...by.values()].filter((t) => t.score > 0).sort((a, b) => b.score - a.score || a.topic.localeCompare(b.topic)),
    reasons: [...reasons.entries()].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count),
  };
}

export const REASON_TIPS: Partial<Record<Reason, { label: string; tip: string }>> = {
  'wrong-side': { label: 'Sisi debit/kredit terbalik', tip: 'Aset dan beban bertambah di debit; liabilitas, ekuitas, dan pendapatan bertambah di kredit.' },
  unbalanced: {
    label: 'Total debit tidak sama dengan kredit',
    tip: 'Jumlahkan kolom debit dan kredit sebelum Periksa; selisih biasanya satu baris yang terlewat.',
  },
  'extra-account': {
    label: 'Memakai akun yang tidak seharusnya',
    tip: 'Cek bagan akun: apakah ada akun yang lebih spesifik (mis. kontra-akun, atau beban vs aset)?',
  },
  'check-amount': {
    label: 'Akun atau nominal perlu diperiksa',
    tip: 'Totalnya sudah sama dengan kunci tetapi pembagian antar-akun berbeda; telaah rincian tiap akun.',
  },
  'wrong-amount': { label: 'Nominal salah', tip: 'Hitung ulang: periode, tarif, diskon, atau porsi yang diakui tahun ini.' },
  'not-needed': {
    label: 'Menjurnal peristiwa yang tidak perlu jurnal',
    tip: 'Tanyakan: apakah ada pertukaran nilai atau kewajiban yang timbul pada tanggal itu?',
  },
};
