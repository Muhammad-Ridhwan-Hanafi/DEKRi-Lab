import { useEffect, useState } from 'react';
import { ACCOUNT_BY_CODE } from '../../data';
import { EXT_ACCOUNTS, EXT_BY_CODE, TAX_BY_CODE, registerAccounts } from '../../data/ext';
import { INDUSTRY_PACKS } from '../../data/industri';
import { EXAMPLE_PACK, packNet, parsePack, type Pack, type PackItem } from '../../engine/casepack';
import type { Account, JournalLine } from '../../engine/types';
import { PATTERNS, generate, parseId, type Pattern, type Variant } from '../../engine/variants';
import { loadPacks, savePacks } from '../../store/persistence';
import { useApp } from '../../store/useApp';
import { gradeJournal } from '../../validation/grade';
import { ConfirmButton } from '../components/ConfirmButton';
import { JournalForm } from '../components/JournalForm';
import { KeyJournal } from '../components/KeyReveal';
import { StatusBadge } from '../components/StatusBadge';
import { downloadText } from '../format';
import { useCtx } from '../hooks';

const newSeed = () => Math.floor(Math.random() * 1_000_000);
const parseLines = (s: string | undefined): JournalLine[] => {
  try {
    const v = s ? JSON.parse(s) : [];
    return Array.isArray(v) ? (v as JournalLine[]) : [];
  } catch {
    return [];
  }
};

/** Latihan varian berbenih (tax=false) atau latihan pajak (tax=true). Jawaban tersimpan di UserState.pajak (kunci `v:<id>`). */
export function Varian({ tax }: { tax: boolean }) {
  const pool = PATTERNS.filter((p) => p.tax === tax);
  const curKey = tax ? 'cur:pajak' : 'cur:varian';
  const { state } = useCtx();
  const stored = parseId(state.tables[curKey] ?? '');
  const [pattern, setPattern] = useState<Pattern>(stored && pool.some((p) => p.pattern === stored.pattern) ? stored.pattern : pool[0].pattern);
  const [seed, setSeed] = useState<number>(stored && stored.pattern === pattern ? stored.seed : 1);
  const v = generate(pattern, seed);
  useEffect(() => {
    useApp.getState().setTable(curKey, v.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v.id]);
  return (
    <div className="space-y-3">
      <div className="card flex flex-wrap items-end gap-3">
        <label className="block text-sm">
          <span className="mb-0.5 block text-xs text-slate-500">Pola soal</span>
          <select aria-label="Pola soal" value={pattern} onChange={(e) => (setPattern(e.target.value as Pattern), setSeed(newSeed()))}>
            {pool.map((p) => (
              <option key={p.pattern} value={p.pattern}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
        <button className="btn btn-primary" onClick={() => setSeed(newSeed())}>
          Soal baru
        </button>
        <span className="text-xs text-slate-500">Kode soal {v.id}. Kode yang sama selalu memberi angka yang sama.</span>
      </div>
      {tax && (
        <div className="card text-sm text-slate-600">
          Latihan pajak memakai akun tambahan (PPN Masukan, Utang PPN, Utang PPh 23) yang tidak ada di bagan akun kasus. Tarif memakai ketentuan umum yang
          tertulis pada soal: PPN 11%, PPh 23 jasa 2%. Soal ini terpisah dari kasus utama dan tidak memengaruhi laporan maupun akurasi Dashboard.
        </div>
      )}
      <Soal key={v.id} v={v} tax={tax} />
      {!tax && <Industri />}
      {!tax && <Paket />}
    </div>
  );
}

function Soal({ v, tax }: { v: Variant; tax: boolean }) {
  const { state } = useCtx();
  const key = `v:${v.id}`;
  const lines = parseLines(state.pajak[key]);
  const [shown, setShown] = useState<ReturnType<typeof gradeJournal> | null>(null);
  const [reveal, setReveal] = useState(false);
  return (
    <Latihan
      title={v.title}
      narrative={v.narrative}
      lines={lines}
      onChange={(ls) => (useApp.getState().setPajak(key, JSON.stringify(ls)), setShown(null))}
      onCheck={() => {
        const g = gradeJournal(lines, v.net, 0);
        setShown(g);
        useApp.getState().logAttempt(tax ? 'pajak' : 'var', v.id, g.status === 'BENAR' ? 'BENAR' : g.status === 'PERIKSA' ? 'PERIKSA' : 'BELUM DIISI');
      }}
      shown={shown}
      reveal={reveal}
      onReveal={() => setReveal(true)}
      keyLines={v.lines}
      explain={v.explain}
      extra={tax ? EXT_ACCOUNTS : undefined}
    />
  );
}

interface LatihanProps {
  title: string;
  narrative: string;
  lines: JournalLine[];
  onChange: (l: JournalLine[]) => void;
  onCheck: () => void;
  shown: ReturnType<typeof gradeJournal> | null;
  reveal: boolean;
  onReveal: () => void;
  keyLines: Array<{ code: string; name?: string; debit: number; credit: number }>;
  explain?: string;
  /** akun tambahan di form jurnal (pajak atau bagan akun paket) */
  extra?: readonly Account[];
  /** hanya tawarkan akun dari `extra` */
  exclusive?: boolean;
}

function Latihan(p: LatihanProps) {
  return (
    <div className="card">
      <h2 className="mb-1 font-semibold">{p.title}</h2>
      <p className="mb-3 text-sm">{p.narrative}</p>
      <JournalForm
        idPrefix="Varian"
        lines={p.lines}
        minRows={4}
        showCheck
        extra={p.extra}
        exclusive={p.exclusive}
        result={p.shown ? { key: 'v', grade: p.shown, status: p.shown.status, revealed: false, checked: true } : null}
        onChange={p.onChange}
        onCheck={p.onCheck}
        onSubmit={p.onCheck}
      />
      {p.shown && (
        <p className="mt-2 flex items-center gap-2 text-sm" data-testid="varian-hasil">
          <StatusBadge status={p.shown.status} /> {p.shown.message}
        </p>
      )}
      {!p.reveal ? (
        <div className="mt-3">
          <ConfirmButton
            label="Lihat kunci dan penjelasan"
            message="Soal varian tidak dihitung ke akurasi Dashboard."
            confirmLabel="Ya, buka kunci"
            onConfirm={p.onReveal}
          />
        </div>
      ) : (
        <div className="mt-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm">
          <div className="mb-1 font-semibold text-blue-900">Kunci dan penjelasan</div>
          <KeyJournal lines={p.keyLines.map((l) => ({ ...l, name: l.name ?? '' }))} />
          {p.explain && <p>{p.explain}</p>}
        </div>
      )}
    </div>
  );
}

// ---------- soal berbagai industri ----------
function Industri() {
  const { state } = useCtx();
  const [packId, setPackId] = useState<string | null>(null);
  const [itemId, setItemId] = useState<string | null>(null);
  const pack = INDUSTRY_PACKS.find((x) => x.id === packId);
  const item = pack?.items.find((x) => x.id === itemId);
  const filled = (pk: Pack, it: PackItem) => parseLines(state.pajak[`v:pack:${pk.id}:${it.id}`]).some((l) => l.code);
  return (
    <div className="card space-y-4" data-testid="industri">
      <div>
        <h2>Soal berbagai industri</h2>
        <p className="mt-1 text-sm text-slate-600">
          Siklus akuntansi yang sama pada jenis usaha yang berbeda. Setiap industri punya bagan akun sendiri, jadi pilih akun dari daftar perusahaan itu. Soal
          ini terpisah dari kasus utama dan tidak memengaruhi laporan maupun akurasi Dashboard.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {INDUSTRY_PACKS.map((pk) => {
          const on = pk.id === packId;
          const done = pk.items.filter((it) => filled(pk, it)).length;
          return (
            <button
              key={pk.id}
              aria-pressed={on}
              onClick={() => (setPackId(on ? null : pk.id), setItemId(null))}
              className={`rounded-2xl border p-3 text-left transition-colors ${on ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
            >
              <div className="text-sm font-semibold text-slate-800">{pk.title}</div>
              <div className="mt-1 line-clamp-2 text-xs text-slate-500">{pk.description}</div>
              <div className="mt-2 text-xs font-medium text-blue-700">
                {pk.items.length} soal{done > 0 ? ` · ${done} sudah diisi` : ''}
              </div>
            </button>
          );
        })}
      </div>
      {pack && (
        <div className="space-y-3">
          <details className="rounded-xl bg-slate-50 p-3 text-sm">
            <summary className="cursor-pointer font-medium text-slate-700">Bagan akun {pack.title.split(':')[1]?.trim() ?? pack.title}</summary>
            <ul className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
              {pack.accounts?.map((a) => (
                <li key={a.code} className="flex justify-between gap-2">
                  <span>
                    <span className="font-mono text-xs text-slate-500">{a.code}</span> {a.name}
                  </span>
                  <span className="text-xs text-slate-400">{a.normal === 'Debit' ? 'D' : 'K'}</span>
                </li>
              ))}
            </ul>
          </details>
          <ol className="grid gap-1.5 sm:grid-cols-2" aria-label="Daftar soal">
            {pack.items.map((it, i) => (
              <li key={it.id}>
                <button
                  aria-current={itemId === it.id ? 'true' : undefined}
                  onClick={() => setItemId(it.id)}
                  className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors ${itemId === it.id ? 'bg-blue-100 font-medium text-blue-800' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
                >
                  <span className="w-6 shrink-0 text-xs tabular-nums text-slate-500">{i + 1}.</span>
                  <span className="flex-1">{it.title}</span>
                  {filled(pack, it) && <span className="text-xs text-emerald-700">terisi</span>}
                </button>
              </li>
            ))}
          </ol>
          {item && <PackSoal key={`${pack.id}:${item.id}`} pack={pack} item={item} />}
        </div>
      )}
    </div>
  );
}

// ---------- paket soal ----------
function Paket() {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [err, setErr] = useState('');
  const [active, setActive] = useState<{ pack: string; item: string } | null>(null);
  useEffect(() => {
    let live = true;
    void loadPacks().then((raw) => {
      if (!live) return;
      const ok: Pack[] = [];
      for (const r of raw) {
        try {
          const pk = parsePack(JSON.stringify(r));
          registerAccounts(pk.accounts ?? []);
          ok.push(pk);
        } catch {
          /* paket tersimpan yang rusak dilewati */
        }
      }
      setPacks(ok);
    });
    return () => {
      live = false;
    };
  }, []);
  const onFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      const pk = parsePack(await f.text());
      registerAccounts(pk.accounts ?? []);
      const next = [...packs.filter((x) => x.id !== pk.id), pk];
      await savePacks(next);
      setPacks(next);
      setErr('');
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  const remove = async (id: string) => {
    const next = packs.filter((x) => x.id !== id);
    await savePacks(next);
    setPacks(next);
    if (active?.pack === id) setActive(null);
  };
  const pack = packs.find((x) => x.id === active?.pack);
  const item = pack?.items.find((x) => x.id === active?.item);
  return (
    <div className="card space-y-3">
      <h2 className="font-semibold">Paket soal tambahan</h2>
      <p className="text-sm text-slate-600">
        Muat paket soal dari file JSON (misalnya buatan dosen atau Anda sendiri) tanpa membangun ulang aplikasi. Kunci jurnal divalidasi: harus seimbang dan
        memakai akun yang ada. Paket tersimpan di peramban ini dan tidak ikut cadangan jawaban.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="btn cursor-pointer">
          Muat paket (.json)
          <input
            aria-label="Muat paket soal"
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
        </label>
        <button className="btn" onClick={() => downloadText('contoh-paket-soal.json', JSON.stringify(EXAMPLE_PACK, null, 2), 'application/json')}>
          Unduh contoh format
        </button>
      </div>
      {err && (
        <p className="rounded-md border border-red-300 bg-red-50 p-2 text-sm text-red-800" role="alert">
          {err}
        </p>
      )}
      {packs.map((pk) => (
        <div key={pk.id} className="rounded-md border border-slate-200 p-2">
          <div className="flex flex-wrap items-center gap-2">
            <b>{pk.title}</b>
            <span className="text-xs text-slate-500">{pk.items.length} soal</span>
            <ConfirmButton
              className="btn ml-auto"
              label="Hapus paket"
              message="Paket dihapus dari peramban ini."
              confirmLabel="Ya, hapus"
              onConfirm={() => void remove(pk.id)}
            />
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {pk.items.map((it) => (
              <button
                key={it.id}
                className={`btn ${active?.pack === pk.id && active.item === it.id ? 'btn-primary' : ''}`}
                onClick={() => setActive({ pack: pk.id, item: it.id })}
              >
                {it.title}
              </button>
            ))}
          </div>
        </div>
      ))}
      {pack && item && <PackSoal key={`${pack.id}:${item.id}`} pack={pack} item={item} />}
    </div>
  );
}

function PackSoal({ pack, item }: { pack: Pack; item: PackItem }) {
  const { state } = useCtx();
  const key = `v:pack:${pack.id}:${item.id}`;
  const lines = parseLines(state.pajak[key]);
  const [shown, setShown] = useState<ReturnType<typeof gradeJournal> | null>(null);
  const [reveal, setReveal] = useState(false);
  const net = packNet(item);
  const nameOf = (c: string) => pack.accounts?.find((a) => a.code === c)?.name ?? ACCOUNT_BY_CODE[c]?.name ?? EXT_BY_CODE[c]?.name ?? '';
  return (
    <Latihan
      title={item.title}
      narrative={item.narrative}
      lines={lines}
      onChange={(ls) => (useApp.getState().setPajak(key, JSON.stringify(ls)), setShown(null))}
      onCheck={() => {
        const g = gradeJournal(lines, net, 0);
        setShown(g);
        useApp.getState().logAttempt('pack', `${pack.id}:${item.id}`, g.status === 'BENAR' ? 'BENAR' : g.status === 'PERIKSA' ? 'PERIKSA' : 'BELUM DIISI');
      }}
      shown={shown}
      reveal={reveal}
      onReveal={() => setReveal(true)}
      keyLines={item.lines.map((l) => ({ ...l, name: nameOf(l.code) }))}
      explain={item.explain}
      extra={pack.accounts ?? (item.lines.some((l) => l.code in TAX_BY_CODE) ? EXT_ACCOUNTS : undefined)}
      exclusive={!!pack.accounts}
    />
  );
}
