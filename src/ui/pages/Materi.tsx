import { MATERI, scenariosOfBab } from '../../data/materi';
import { useCtx } from '../hooks';
import { resultFor } from '../../store/derive';
import { StatusBadge } from '../components/StatusBadge';
import { navigate } from '../router';

/** Pindah antara jalur berurutan dan ringkasan BAB; keduanya satu bagian belajar. */
export function BelajarTabs({ active }: { active: 'jalur' | 'bab' }) {
  return (
    <div className="no-print mb-3 flex gap-1" role="tablist" aria-label="Bagian belajar">
      <button role="tab" aria-selected={active === 'jalur'} className={`btn ${active === 'jalur' ? 'btn-primary' : ''}`} onClick={() => navigate('belajar')}>
        Jalur 13 materi
      </button>
      <button role="tab" aria-selected={active === 'bab'} className={`btn ${active === 'bab' ? 'btn-primary' : ''}`} onClick={() => navigate('belajar/bab')}>
        Ringkasan BAB 7–18
      </button>
    </div>
  );
}

export function Materi({ bab }: { bab?: string }) {
  const { state, ctx } = useCtx();
  const m = MATERI.find((x) => String(x.bab) === bab);
  return (
    <div>
      <BelajarTabs active="bab" />
      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="card h-fit">
          <ul>
            {MATERI.map((x) => (
              <li key={x.bab}>
                <button
                  className={`w-full rounded-lg px-2.5 py-2 text-left text-sm hover:bg-slate-100 ${m?.bab === x.bab ? 'bg-blue-50 font-medium' : ''}`}
                  onClick={() => navigate(`belajar/bab/${x.bab}`)}
                >
                  BAB {x.bab} · {x.title}
                </button>
              </li>
            ))}
          </ul>
        </aside>
        <section>
          {!m ? (
            <div className="card text-sm text-slate-600">
              Pilih BAB untuk membaca ringkasan satu halaman: jurnal standar, rumus, dan jebakan umum. Ringkasan ini alat belajar, bukan pengganti teks standar
              (PSAK).
            </div>
          ) : (
            <div className="card space-y-3" data-testid="materi">
              <h2 className="text-lg font-semibold">
                BAB {m.bab} · {m.title}
              </h2>
              <p className="text-sm">{m.ringkas}</p>
              <div>
                <h3 className="mb-1 font-semibold">Jurnal standar</h3>
                {m.jurnal.map((j) => (
                  <div key={j.judul} className="mb-2 rounded-md bg-slate-50 p-2 text-sm">
                    <div className="font-medium">{j.judul}</div>
                    {j.baris.map((b) => (
                      <div key={b} className="font-mono text-xs">
                        {b}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div>
                <h3 className="mb-1 font-semibold">Rumus</h3>
                <ul className="list-disc pl-5 text-sm">
                  {m.rumus.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="mb-1 font-semibold">Jebakan umum</h3>
                <ul className="list-disc pl-5 text-sm">
                  {m.jebakan.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="mb-1 font-semibold">Soal skenario BAB ini</h3>
                <ul className="text-sm">
                  {scenariosOfBab(m.bab).map((s) => (
                    <li key={s.no} className="flex items-center gap-2 py-0.5">
                      <button className="text-blue-700 underline" onClick={() => navigate('skenario')}>
                        Skenario {s.no}: {s.topic.split('\n')[0]}
                      </button>
                      <StatusBadge status={resultFor(state, 'sc', s.no, ctx).status} />
                    </li>
                  ))}
                  {scenariosOfBab(m.bab).length === 0 && <li className="text-slate-500">Tidak ada skenario untuk BAB ini.</li>}
                </ul>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
