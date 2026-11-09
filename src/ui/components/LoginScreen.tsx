import { useEffect, useRef, useState } from 'react';
import { BrandIcon } from './Brand';
import { Icon } from './Icon';
import { NAME_MAX, NAME_MIN, initials, login, recentNames } from '../profile';

/**
 * Layar masuk: cukup nama pengguna. Nama menentukan ruang data: kemajuan belajar, riwayat, ujian, dan paket soal
 * disimpan terpisah per nama (huruf besar/kecil dianggap sama). Bukan autentikasi; tidak ada kata sandi.
 */
export function LoginScreen() {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [recent] = useState(recentNames);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input.current?.focus();
  }, []);

  const submit = (raw: string) => {
    const err = login(raw);
    if (err) {
      setError(err);
      input.current?.focus();
    }
  };

  return (
    <main className="ap-dots relative grid min-h-screen place-items-center overflow-hidden p-6" aria-labelledby="login-title">
      {/* bentuk dekoratif yang terus bergerak (berputar, melayang, mengayun); tidak dibaca pembaca layar dan disembunyikan di layar sempit.
          Gerak dimatikan oleh Reduce Motion. */}
      <span
        aria-hidden="true"
        className="ap-float absolute left-[11%] top-[13%] hidden size-20 rounded-full border-2 border-slate-900 bg-[var(--tag-lime-bg)] shadow-[4px_4px_0_var(--neo-shadow)] md:block"
      />
      <span
        aria-hidden="true"
        className="ap-spin absolute right-[12%] top-[17%] hidden size-16 rounded-2xl border-2 border-slate-900 bg-[var(--tag-blush-bg)] shadow-[4px_4px_0_var(--neo-shadow)] md:block"
      />
      <span
        aria-hidden="true"
        className="ap-sway absolute bottom-[15%] left-[13%] hidden h-10 w-32 rounded-full border-2 border-slate-900 bg-[var(--tag-aqua-bg)] shadow-[4px_4px_0_var(--neo-shadow)] md:block"
      />
      <span
        aria-hidden="true"
        className="ap-spin-rev absolute bottom-[11%] right-[15%] hidden size-14 rounded-xl border-2 border-slate-900 bg-[var(--tag-lilac-bg)] shadow-[4px_4px_0_var(--neo-shadow)] md:block"
      />
      <span
        aria-hidden="true"
        style={{ animationDelay: '-2s' }}
        className="ap-float absolute right-[26%] top-[8%] hidden size-8 rounded-full border-2 border-slate-900 bg-[var(--tag-blush-bg)] shadow-[3px_3px_0_var(--neo-shadow)] md:block"
      />
      <span
        aria-hidden="true"
        style={{ animationDuration: '9s' }}
        className="ap-spin absolute bottom-[30%] left-[6%] hidden size-9 rounded-lg border-2 border-slate-900 bg-[var(--tag-lime-bg)] shadow-[3px_3px_0_var(--neo-shadow)] md:block"
      />
      <span
        aria-hidden="true"
        style={{ animationDelay: '-3s' }}
        className="ap-sway absolute right-[6%] top-[46%] hidden h-8 w-20 rounded-full border-2 border-slate-900 bg-[var(--tag-lilac-bg)] shadow-[3px_3px_0_var(--neo-shadow)] md:block"
      />

      <div className="ap-enter relative w-full max-w-md">
        <div className="card !p-7">
          <div className="flex items-center gap-3">
            <BrandIcon className="ap-wiggle size-12 shrink-0" />
            <div>
              <div className="eyebrow">DEKRi Lab</div>
              <h1 id="login-title" className="page-title leading-tight">
                Masuk
              </h1>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-700">Ketik nama Anda untuk mulai belajar.</p>

          <form
            className="mt-4 space-y-3"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              submit(name);
            }}
          >
            <div>
              <label htmlFor="login-name" className="mb-1 block text-sm font-bold text-slate-900">
                Nama pengguna
              </label>
              <input
                id="login-name"
                ref={input}
                className="w-full"
                value={name}
                autoComplete="off"
                autoCapitalize="words"
                spellCheck={false}
                placeholder="Contoh: Rina"
                aria-invalid={error ? 'true' : undefined}
                aria-describedby={error ? 'login-help login-error' : 'login-help'}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                }}
              />
              <p id="login-help" className="mt-1 text-xs text-slate-600">
                {NAME_MIN}–{NAME_MAX} karakter. Huruf besar dan kecil dianggap sama.
              </p>
              {error && (
                <p id="login-error" role="alert" className="ap-shake mt-1 text-sm font-semibold text-red-700">
                  {error}
                </p>
              )}
            </div>
            <button type="submit" className="btn btn-primary h-11 w-full">
              Masuk <Icon name="arrow" size={16} />
            </button>
          </form>

          {recent.length > 0 && (
            <section className="mt-5 border-t-2 border-slate-900 pt-4" aria-labelledby="login-recent">
              <h2 id="login-recent" className="eyebrow mb-2 !text-xs !font-semibold">
                Pernah masuk di perangkat ini
              </h2>
              <ul className="flex flex-wrap gap-2">
                {recent.map((n) => (
                  <li key={n}>
                    <button type="button" className="btn !gap-2 !px-3 !py-1" onClick={() => submit(n)} aria-label={`Masuk sebagai ${n}`}>
                      <span aria-hidden="true" className="tag-lilac flex size-6 items-center justify-center rounded-full text-[11px] font-bold">
                        {initials(n)}
                      </span>
                      {n}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
        <p className="mt-4 text-center text-xs text-slate-700">
          Kemajuan belajar disimpan per nama pengguna di perangkat ini. Masuk dengan nama yang sama untuk melanjutkan progres Anda.
        </p>
      </div>
    </main>
  );
}
