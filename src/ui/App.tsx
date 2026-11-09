import { Component, Suspense, lazy, useEffect, useMemo, useState, type ReactNode } from 'react';
import { BrandIcon } from './components/Brand';
import { Icon, type IconName } from './components/Icon';
import { SearchDialog } from './components/SearchDialog';
import { ShortcutDialog } from './components/Shortcuts';
import { Calculator } from './components/Calculator';
import { trackLastField } from './lastField';
import { StartupSplash } from './components/StartupSplash';
import { LoginScreen } from './components/LoginScreen';
import { initials, logout, useProfile } from './profile';
import { userKeyOf } from '../store/scope';
import { startDesktopBackup, useDesktopBackup } from '../store/desktopBackup';
import { DesktopRestoreBanner } from './components/DesktopBackup';
import { summarize } from '../store/derive';
import { startAutosave, useApp } from '../store/useApp';
import { useCtx } from './hooks';
import { useRoute, navigate } from './router';

const BukuBesar = lazy(() => import('./pages/BukuBesar').then((x) => ({ default: x.BukuBesar })));
const Dashboard = lazy(() => import('./pages/Dashboard').then((x) => ({ default: x.Dashboard })));
const JurnalUmum = lazy(() => import('./pages/JurnalUmum').then((x) => ({ default: x.JurnalUmum })));
const Kasus = lazy(() => import('./pages/Kasus').then((x) => ({ default: x.Kasus })));
const Koreksi = lazy(() => import('./pages/Koreksi').then((x) => ({ default: x.Koreksi })));
const NeracaSaldo = lazy(() => import('./pages/NeracaSaldo').then((x) => ({ default: x.NeracaSaldo })));
const Pengaturan = lazy(() => import('./pages/Pengaturan').then((x) => ({ default: x.Pengaturan })));
const Penutup = lazy(() => import('./pages/Penutup').then((x) => ({ default: x.Penutup })));
const Penyesuaian = lazy(() => import('./pages/Penyesuaian').then((x) => ({ default: x.Penyesuaian })));
const Laporan = lazy(() => import('./pages/Laporan').then((x) => ({ default: x.Laporan })));
const Skenario = lazy(() => import('./pages/Skenario').then((x) => ({ default: x.Skenario })));
const Ujian = lazy(() => import('./pages/Ujian').then((x) => ({ default: x.Ujian })));
const Belajar = lazy(() => import('./pages/Belajar').then((x) => ({ default: x.Belajar })));
const Analisis = lazy(() => import('./pages/Analisis').then((x) => ({ default: x.Analisis })));
const BukuPembantu = lazy(() => import('./pages/BukuPembantu').then((x) => ({ default: x.BukuPembantu })));
const Materi = lazy(() => import('./pages/Materi').then((x) => ({ default: x.Materi })));
const Varian = lazy(() => import('./pages/Varian').then((x) => ({ default: x.Varian })));
const Transaksi = lazy(() => import('./pages/Transaksi').then((x) => ({ default: x.Transaksi })));

const NAV: Array<[string, string]> = [
  ['dashboard', 'Dashboard'],
  ['belajar', 'Jalur Belajar'],
  ['kasus', 'Kasus'],
  ['transaksi', 'Transaksi'],
  ['jurnal', 'Jurnal Umum'],
  ['buku-besar', 'Buku Besar'],
  ['neraca-saldo', 'Neraca Saldo'],
  ['penyesuaian', 'Penyesuaian'],
  ['laporan', 'Laporan'],
  ['analisis', 'Analisis'],
  ['buku-pembantu', 'Buku Pembantu'],
  ['penutup', 'Penutup'],
  ['koreksi', 'Koreksi'],
  ['skenario', 'Skenario'],
  ['varian', 'Latihan Varian'],
  ['pajak', 'Latihan Pajak'],
  ['ujian', 'Ujian'],
  ['pengaturan', 'Pengaturan'],
];

/** Pengelompokan menurut aktivitas pengguna. Semua 18 menu tetap ada; urutan di dalam kelompok mengikuti alur kerja. */
const NAV_GROUPS: Array<{ id: string; label: string; paths: string[] }> = [
  { id: 'ruang-kerja', label: 'Ruang kerja', paths: ['dashboard'] },
  {
    id: 'siklus',
    label: 'Siklus akuntansi',
    paths: ['kasus', 'transaksi', 'jurnal', 'buku-besar', 'buku-pembantu', 'neraca-saldo', 'penyesuaian', 'laporan', 'penutup'],
  },
  { id: 'analisis-belajar', label: 'Analisis dan belajar', paths: ['analisis', 'belajar'] },
  { id: 'latihan', label: 'Latihan dan evaluasi', paths: ['koreksi', 'skenario', 'varian', 'pajak', 'ujian'] },
];
const NAV_LABEL: Record<string, string> = Object.fromEntries(NAV);

function NavItem({ path, active }: { path: string; active: boolean }) {
  return (
    <li>
      <button
        onClick={() => navigate(path)}
        aria-current={active ? 'page' : undefined}
        className={`ap-nav group relative flex w-full items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm transition-[background-color,color,transform] duration-150 border-2 ${active ? 'border-slate-900 bg-[var(--tag-lime-bg)] font-bold text-[var(--tag-lime-fg)] shadow-[2px_2px_0_var(--neo-shadow)]' : 'border-transparent text-slate-700 hover:border-slate-900 hover:bg-white/70 hover:text-slate-900'}`}
      >
        <Icon name={path as IconName} size={19} className={`transition-transform duration-150 ${active ? '' : 'group-hover:scale-105'}`} />
        {NAV_LABEL[path]}
      </button>
    </li>
  );
}

class Boundary extends Component<{ children: ReactNode }, { err: Error | null }> {
  state = { err: null as Error | null };
  static getDerivedStateFromError(err: Error) {
    return { err };
  }
  render() {
    if (this.state.err)
      return (
        <div className="card m-4 border-red-300">
          <b>Terjadi kesalahan pada halaman ini.</b>
          <p className="text-sm">{this.state.err.message}</p>
          <p className="text-sm">Data Anda aman. Ekspor cadangan dari Pengaturan, lalu muat ulang halaman.</p>
          <button className="btn mt-2" onClick={() => ((window.location.hash = '/pengaturan'), window.location.reload())}>
            Buka Pengaturan
          </button>
        </div>
      );
    return this.props.children;
  }
}

function Redirect({ to }: { to: string }) {
  useEffect(() => navigate(to), [to]);
  return null;
}

function Page({ seg }: { seg: string[] }) {
  switch (seg[0] ?? 'dashboard') {
    case 'kasus':
      return <Kasus key={seg[1]} tab={seg[1]} />;
    case 'transaksi':
      return <Transaksi no={seg[1]} />;
    case 'jurnal':
      return <JurnalUmum />;
    case 'buku-besar':
      return <BukuBesar key={seg[1]} code={seg[1]} />;
    case 'neraca-saldo':
      return <NeracaSaldo />;
    case 'penyesuaian':
      return <Penyesuaian key={seg[1]} code={seg[1]} />;
    case 'laporan':
      return <Laporan key={seg[1]} tab={seg[1]} cell={seg[2]} />;
    case 'penutup':
      return <Penutup />;
    case 'koreksi':
      return <Koreksi />;
    case 'skenario':
      return <Skenario />;
    case 'belajar':
      if (seg[1] === 'bab') return <Materi key={seg[2]} bab={seg[2]} />;
      return <Belajar key={seg[1]} id={seg[1]} />;
    case 'analisis':
      return <Analisis />;
    case 'buku-pembantu':
      return <BukuPembantu />;
    case 'varian':
      return <Varian tax={false} />;
    case 'pajak':
      return <Varian tax />;
    case 'materi':
      return <Redirect to={seg[1] ? `belajar/bab/${seg[1]}` : 'belajar/bab'} />;
    case 'ujian':
      return <Ujian />;
    case 'pengaturan':
      return <Pengaturan />;
    default:
      return <Dashboard />;
  }
}

export function App() {
  const seg = useRoute();
  const hydrated = useApp((s) => s.hydrated);
  const user = useProfile();
  const saveStatus = useApp((s) => s.saveStatus);
  const externalChange = useApp((s) => s.externalChange);
  const past = useApp((s) => s.past);
  const future = useApp((s) => s.future);
  const { state, ctx } = useCtx();
  const desk = useDesktopBackup();
  const [searching, setSearching] = useState(false);
  const [help, setHelp] = useState(false);
  const [calc, setCalc] = useState(false);
  const [splashOn, setSplashOn] = useState(true); // splash hanya sekali: App di-mount satu kali saat startup
  // akurasi hanya bergantung pada jurnal, jawaban analisis, status periksa, kunci terbuka, mode, dan laporan
  const acc = useMemo(
    () => summarize(state, 'txn', ctx),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.journal, state.analysis, state.checked, state.revealed, state.settings.validationMode, ctx],
  );

  // Ruang data mengikuti pengguna yang masuk: berganti nama = berganti data (hanya data pengguna itu yang dimuat).
  const userKey = user ? userKeyOf(user.name) : null;
  useEffect(() => {
    void useApp.getState().switchUser(userKey);
  }, [userKey]);

  useEffect(() => {
    const stopSave = startAutosave();
    const stopDesktop = startDesktopBackup();
    const stopField = trackLastField();
    return () => (stopSave(), stopDesktop(), stopField());
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      const mod = e.ctrlKey || e.metaKey;
      if (mod && !el?.closest('[role=dialog]') && (e.key === 'z' || e.key === 'Z' || e.key === 'y')) {
        e.preventDefault();
        if (e.key === 'y' || e.shiftKey) useApp.getState().redo();
        else useApp.getState().undo();
        return;
      }
      if (e.altKey && !mod && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        setCalc((v) => !v);
        return;
      }
      if (e.key === '?' && !typing && !mod) {
        e.preventDefault();
        setHelp(true);
        return;
      }
      if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing)) {
        e.preventDefault();
        setSearching(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const splash = splashOn ? <StartupSplash ready={hydrated || !user} onDone={() => setSplashOn(false)} /> : null;

  // Belum masuk: layar masuk (splash memudar di atasnya). Data baru dimuat setelah ada nama pengguna.
  if (!user)
    return (
      <>
        {splash}
        <LoginScreen />
      </>
    );

  if (!hydrated)
    return (
      <>
        {splash}
        <div className="p-6 text-slate-600">Memuat data tersimpan…</div>
      </>
    );

  const current = seg[0] ?? 'dashboard';
  const hasWork = Object.keys(state.journal).length > 0 || Object.keys(state.adjusting).length > 0;
  const autoOn = desk.available;
  const lastExport = state.settings.lastExportAt ? new Date(state.settings.lastExportAt).getTime() : 0;
  const stale = hasWork && !autoOn && Date.now() - lastExport > 7 * 86400000;

  const title = NAV.find(([path]) => path === current)?.[1] ?? 'Dashboard';
  const saved = saveStatus === 'saving' ? 'menyimpan…' : saveStatus === 'error' ? null : 'tersimpan';

  return (
    <>
      {splash}
      <div className="flex min-h-screen">
        <a
          href="#konten-utama"
          className="no-print sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-sm focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-blue-700 focus:shadow"
          onClick={(e) => {
            e.preventDefault();
            const el = document.getElementById('konten-utama');
            el?.focus();
            el?.scrollIntoView();
          }}
        >
          Lewati ke konten utama
        </a>
        <nav
          className="no-print sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r-2 border-slate-900 bg-[var(--tag-lilac-bg)]"
          aria-label="Navigasi utama"
        >
          <div className="flex items-center gap-3 px-4 py-4">
            <BrandIcon className="size-9 shrink-0" />
            <span className="leading-tight">
              <span className="block text-sm font-semibold tracking-tight text-slate-800">DEKRi Lab</span>
              <span className="block text-xs font-medium text-slate-700">Latihan akuntansi</span>
            </span>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto px-3 pb-3">
            {NAV_GROUPS.map((g) => (
              <div key={g.id}>
                <div id={`nav-${g.id}`} className="eyebrow px-3 pb-1">
                  {g.label}
                </div>
                <ul className="space-y-0.5" aria-labelledby={`nav-${g.id}`}>
                  {g.paths.map((path) => (
                    <NavItem key={path} path={path} active={current === path} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t-2 border-slate-900 px-3 py-3" aria-label="Pengguna">
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="tag-lime flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-slate-900 text-sm font-bold"
              >
                {initials(user.name)}
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-sm font-bold text-slate-900" title={user.name} data-testid="user-name">
                  {user.name}
                </span>
                <button type="button" className="text-xs font-medium text-slate-700 underline underline-offset-2 hover:text-slate-900" onClick={logout}>
                  Ganti pengguna
                </button>
              </span>
            </div>
          </div>
          <ul className="border-t border-slate-300 px-3 py-2">
            <NavItem path="pengaturan" active={current === 'pengaturan'} />
          </ul>
        </nav>
        <main id="konten-utama" tabIndex={-1} className="min-w-0 flex-1 outline-none">
          <header className="no-print sticky top-0 z-10 flex items-center gap-4 min-h-16 border-b-2 border-slate-900 bg-canvas px-6 py-2">
            <div className="min-w-0 shrink-0">
              <h1 className="page-title leading-tight">{title}</h1>
              <div className="text-xs text-slate-500">PT Sumber Cahaya Elektrindo · TA 2024</div>
            </div>
            <button
              className="flex h-9 min-w-0 max-w-sm flex-1 items-center gap-2 rounded-full border-2 border-slate-900 bg-white px-4 text-sm text-slate-600 shadow-[2px_2px_0_var(--neo-shadow)] transition-[transform,box-shadow] duration-150 hover:-translate-x-px hover:-translate-y-px hover:shadow-[3px_3px_0_var(--neo-shadow)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              onClick={() => setSearching(true)}
              aria-label="Buka pencarian"
            >
              <Icon name="search" size={18} />
              <span className="flex-1 text-left">Cari…</span>
              <kbd className="rounded-sm border border-slate-300 bg-white px-1.5 text-xs text-slate-500">Ctrl+K</kbd>
            </button>
            <div className="ml-auto flex items-center gap-2 text-sm text-slate-600">
              <button className="btn px-2.5" aria-label="Kalkulator" aria-pressed={calc} onClick={() => setCalc((v) => !v)} title="Kalkulator (Alt+C)">
                <Icon name="kalkulator" size={16} />
                <span className="hidden xl:inline">Kalkulator</span>
              </button>
              <button
                className="btn px-2.5"
                aria-label="Urungkan"
                disabled={past.length === 0}
                onClick={() => useApp.getState().undo()}
                title="Urungkan (Ctrl+Z)"
              >
                <Icon name="undo" size={16} />
                <span className="hidden xl:inline">Urungkan</span>
              </button>
              <button
                className="btn px-2.5"
                aria-label="Ulangi"
                disabled={future.length === 0}
                onClick={() => useApp.getState().redo()}
                title="Ulangi (Ctrl+Shift+Z)"
              >
                <Icon name="redo" size={16} />
                <span className="hidden xl:inline">Ulangi</span>
              </button>
              <span className="mx-1 h-6 w-px bg-slate-200" aria-hidden="true" />
              <span className="whitespace-nowrap">
                Akurasi<span className="hidden xl:inline"> transaksi</span>:{' '}
                <b className="font-medium text-slate-800">{acc.accuracy === null ? '—' : `${Math.round(acc.accuracy * 100)}%`}</b>
              </span>
              <span className="flex items-center gap-1 whitespace-nowrap" role="status" aria-live="polite">
                {saved === null ? (
                  <button className="flex items-center gap-1 font-medium text-red-700 underline" onClick={() => navigate('pengaturan')}>
                    <Icon name="alert" size={16} /> GAGAL menyimpan, ekspor cadangan
                  </button>
                ) : (
                  <>
                    <span
                      key={saveStatus}
                      aria-hidden="true"
                      className={`inline-flex ${saveStatus === 'saving' ? 'animate-pulse text-slate-400' : 'ap-pop text-emerald-600'}`}
                    >
                      <Icon name="check" size={16} />
                    </span>{' '}
                    {saved}
                  </>
                )}
              </span>
            </div>
          </header>
          <div className="p-6 print:p-0">
            <DesktopRestoreBanner />
            {externalChange && (
              <div
                className="no-print mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900"
                role="alert"
              >
                <Icon name="alert" size={18} />
                <span className="flex-1">
                  Data diubah di tab atau jendela lain. Penyimpanan di sini dijeda agar tidak saling menimpa. Pilih data mana yang dipakai.
                </span>
                <button className="btn" onClick={() => void useApp.getState().adoptExternal()}>
                  Muat data terbaru
                </button>
                <button className="btn btn-danger" onClick={() => useApp.getState().keepLocal()}>
                  Pakai data di tab ini
                </button>
              </div>
            )}
            {stale && (
              <div className="no-print mb-4 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <Icon name="alert" size={18} />
                <span>
                  Belum ada cadangan dalam 7 hari terakhir.{' '}
                  <button className="font-medium text-blue-700 underline" onClick={() => navigate('pengaturan')}>
                    Atur cadangan
                  </button>
                </span>
              </div>
            )}
            {searching && <SearchDialog onClose={() => setSearching(false)} />}
            {help && <ShortcutDialog onClose={() => setHelp(false)} />}
            {calc && <Calculator onClose={() => setCalc(false)} />}
            <Boundary key={current}>
              <Suspense fallback={<div className="ap-fade p-4 text-sm text-slate-500">Memuat halaman…</div>}>
                <div key={current} className="ap-enter">
                  <Page seg={seg} />
                </div>
              </Suspense>
            </Boundary>
          </div>
        </main>
      </div>
    </>
  );
}
