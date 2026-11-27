//! Cangkang aplikasi: keadaan, penyimpanan otomatis, navigasi.
use dekri_core::actions::{self, Content};
use dekri_core::backup;
use dekri_core::closing::expected_closing;
use dekri_core::data::data;
use dekri_core::derive::*;
use dekri_core::exam::{ExamAnswers, ExamItem, ExamScore, Scope};
use dekri_core::grade::GradeResult;
use dekri_core::learning::QuizResult;
use dekri_core::state::{make_backup, parse_backup, UserState};
use dekri_core::Report;
use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::time::{Duration, Instant};

#[derive(Clone, Copy, PartialEq, Eq, Debug, Hash)]
pub enum Page {
    Beranda,
    Belajar,
    Materi,
    Transaksi,
    Penyesuaian,
    Penutup,
    Koreksi,
    Skenario,
    ArusKas,
    Kasus,
    JurnalUmum,
    BukuBesar,
    BukuPembantu,
    NeracaSaldo,
    Laporan,
    Pemeriksaan,
    Varian,
    Pajak,
    Ujian,
    Latihan,
    Pengaturan,
}
impl Page {
    /// (halaman, nama, kelompok menu)
    pub const ALL: [(Page, &'static str, &'static str); 21] = [
        (Page::Beranda, "Beranda", ""),
        (Page::Belajar, "Jalur Belajar", "Belajar"),
        (Page::Materi, "Ringkasan BAB", "Belajar"),
        (Page::Transaksi, "Transaksi", "Kerjakan"),
        (Page::Penyesuaian, "Penyesuaian", "Kerjakan"),
        (Page::Penutup, "Penutup", "Kerjakan"),
        (Page::Koreksi, "Koreksi", "Kerjakan"),
        (Page::Skenario, "Skenario", "Kerjakan"),
        (Page::ArusKas, "Arus Kas", "Kerjakan"),
        (Page::Kasus, "Kasus", "Buku dan laporan"),
        (Page::JurnalUmum, "Jurnal Umum", "Buku dan laporan"),
        (Page::BukuBesar, "Buku Besar", "Buku dan laporan"),
        (Page::BukuPembantu, "Buku Pembantu", "Buku dan laporan"),
        (Page::NeracaSaldo, "Neraca Saldo", "Buku dan laporan"),
        (Page::Laporan, "Laporan", "Buku dan laporan"),
        (Page::Pemeriksaan, "Pemeriksaan", "Buku dan laporan"),
        (Page::Varian, "Varian", "Latihan"),
        (Page::Pajak, "Pajak", "Latihan"),
        (Page::Ujian, "Ujian", "Latihan"),
        (Page::Latihan, "Latihan Hari Ini", "Latihan"),
        (Page::Pengaturan, "Pengaturan", ""),
    ];
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum Phase {
    Setup,
    Run,
    Done,
}

/// Sesi ujian: hidup di memori dan disalin ke berkas selama berjalan (selamat dari penutupan aplikasi; waktu tetap berjalan).
pub struct ExamUi {
    pub phase: Phase,
    pub items: Vec<ExamItem>,
    pub answers: ExamAnswers,
    pub index: usize,
    pub started_at: i64,
    pub finished_at: i64,
    pub limit_sec: i64,
    pub scope: String,
    pub score: Option<ExamScore>,
    pub count: usize,
    pub kinds: [bool; 5],
    pub scope_sel: Scope,
    pub minutes: i64,
    pub dirty: bool,
}
impl Default for ExamUi {
    fn default() -> Self {
        ExamUi {
            phase: Phase::Setup,
            items: vec![],
            answers: ExamAnswers::default(),
            index: 0,
            started_at: 0,
            finished_at: 0,
            limit_sec: 0,
            scope: "semua".into(),
            score: None,
            count: 10,
            kinds: [true, true, true, false, false],
            scope_sel: Scope::Semua,
            minutes: 0,
            dirty: false,
        }
    }
}
pub fn unix_now() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

/// Daftar pengguna terakhir (users.json di folder data).
#[derive(Default, Clone, Debug, serde::Serialize, serde::Deserialize)]
pub struct Users {
    #[serde(default)]
    pub last: Option<String>,
    #[serde(default)]
    pub recent: Vec<String>,
}

pub struct Paths {
    pub data_dir: PathBuf,
    pub state_file: PathBuf,
    pub backup_dir: PathBuf,
}

pub struct Session {
    pub st: UserState,
    pub report: Report,
    pub trace_cache: Option<(u64, std::rc::Rc<dekri_core::trace::TraceIndex>)>,
    pub page: Page,
    pub sel: HashMap<&'static str, usize>,
    pub bufs: HashMap<String, String>,
    pub list_filter: String,
    pub acct_filter: String,
    pub report_tab: usize,
    pub paths: Paths,
    pub dark: bool,
    pub theme_pref: String,
    pub dirty: bool,
    pub last_save: Instant,
    pub last_backup: Instant,
    pub toast: Option<(String, Instant)>,
    pub confirm_reset: bool,
    pub hide_zero: bool,
    pub gl_code: Option<String>,
    pub gl_active: bool,
    pub bp_tab: usize,
    pub kasus_tab: usize,
    pub bab_sel: usize,
    pub learn_sel: usize,
    pub quiz_chosen: HashMap<String, Vec<i32>>,
    pub quiz_result: HashMap<String, QuizResult>,
    pub exam: ExamUi,
    pub var_idx: [usize; 2],
    pub var_seed: [i64; 2],
    pub var_shown: HashMap<String, GradeResult>,
    pub var_reveal: HashSet<String>,
    pub pack_sel: Option<(usize, usize)>,
    pub kas_chosen: HashMap<String, usize>,
    pub past: Vec<Content>,
    pub future: Vec<Content>,
    pub last_content: Content,
    pub last_push: Instant,
    pub last_key: String,
    pub last_exam_save: Instant,
    pub user: Option<String>,
    pub logged_in: bool,
    pub users: Users,
    pub login_input: String,
    pub calc_open: bool,
    pub calc_input: String,
    pub calc_hist: Vec<(String, f64)>,
    pub help_open: bool,
    pub focus: bool,
    pub recent: Vec<String>,
    pub nonce: u32,
    pub calc_err: Option<String>,
    pub search_open: bool,
    pub search_q: String,
}

fn home() -> PathBuf {
    std::env::var_os("USERPROFILE")
        .or_else(|| std::env::var_os("HOME"))
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("."))
}

fn default_paths() -> Paths {
    let data_dir = if cfg!(windows) {
        std::env::var_os("APPDATA")
            .map(PathBuf::from)
            .unwrap_or_else(home)
            .join("Latihan Siklus Akuntansi")
    } else if cfg!(target_os = "macos") {
        home().join("Library/Application Support/DEKRi Lab")
    } else {
        std::env::var_os("XDG_DATA_HOME")
            .map(PathBuf::from)
            .unwrap_or_else(|| home().join(".local/share"))
            .join("dekri-lab")
    };
    // Folder data bernama sama dengan versi 1 (Latihan Siklus Akuntansi). Pratinjau 2.0 memakai "DEKRi Lab": salin sekali bila ada.
    if cfg!(windows) && !data_dir.join("users.json").exists() {
        if let Some(old) = data_dir.parent().map(|p| p.join("DEKRi Lab")) {
            if let Ok(rd) = std::fs::read_dir(&old) {
                let _ = std::fs::create_dir_all(&data_dir);
                for f in rd.flatten() {
                    let p = f.path();
                    if p.is_file() {
                        let _ = std::fs::copy(&p, data_dir.join(f.file_name()));
                    }
                }
            }
        }
    }
    // Folder cadangan sama dengan versi Electron/Tauri agar cadangan lama langsung terbaca.
    let backup_dir = std::env::var_os("AKUNTANSI_BACKUP_DIR")
        .filter(|d| !d.is_empty())
        .map(PathBuf::from)
        .unwrap_or_else(|| {
            home()
                .join("Documents")
                .join("Latihan Siklus Akuntansi")
                .join("Cadangan")
        });
    Paths {
        state_file: data_dir.join("state.json"),
        data_dir,
        backup_dir,
    }
}

fn now_iso() -> String {
    chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true)
}

fn atomic_write(path: &Path, text: &str) -> std::io::Result<()> {
    if let Some(dir) = path.parent() {
        std::fs::create_dir_all(dir)?;
    }
    let mut tmp = path.as_os_str().to_owned();
    tmp.push(".tmp");
    std::fs::write(&tmp, text)?;
    std::fs::rename(&tmp, path)
}

fn load_initial(paths: &Paths, user: Option<&str>) -> (UserState, Option<String>) {
    if let Ok(text) = std::fs::read_to_string(&paths.state_file) {
        match parse_backup(&text) {
            Ok(st) => return (st, None),
            Err(e) => {
                return (
                    UserState::default(),
                    Some(format!("Berkas simpanan rusak, memulai kosong: {}", e.0)),
                )
            }
        }
    }
    // Belum ada simpanan: pulihkan dari cadangan terbaru (mis. milik versi Electron/Tauri sebelumnya).
    if let Ok(Some(text)) = backup::read_latest(&paths.backup_dir, user) {
        if let Ok(st) = parse_backup(&text) {
            return (
                st,
                Some("Progres dipulihkan dari cadangan terakhir.".into()),
            );
        }
    }
    (UserState::default(), None)
}

fn theme_file(paths: &Paths) -> PathBuf {
    paths.data_dir.join("tampilan.json")
}
fn load_theme(paths: &Paths) -> String {
    std::fs::read_to_string(theme_file(paths))
        .ok()
        .and_then(|t| serde_json::from_str::<serde_json::Value>(&t).ok())
        .and_then(|v| v["tema"].as_str().map(String::from))
        .map(|t| match t.as_str() {
            "gelap" | "terang" => t,
            "otomatis" => t,
            _ => "terang".to_string(),
        })
        .unwrap_or_else(|| "terang".to_string())
}

pub fn read_latest_backup(paths: &Paths, user: Option<&str>) -> Option<UserState> {
    let text = backup::read_latest(&paths.backup_dir, user)
        .ok()
        .flatten()?;
    parse_backup(&text).ok()
}

impl Session {
    /// Indeks penelusuran (dihitung sekali per keadaan jawaban; dipakai Laporan dan Transaksi).
    pub fn trace_index(&mut self) -> std::rc::Rc<dekri_core::trace::TraceIndex> {
        use std::hash::{Hash, Hasher};
        let mut h = std::collections::hash_map::DefaultHasher::new();
        serde_json::to_string(&(&self.st.journal, &self.st.adjusting))
            .unwrap_or_default()
            .hash(&mut h);
        let key = h.finish();
        if let Some((k, i)) = &self.trace_cache {
            if *k == key {
                return i.clone();
            }
        }
        let i = std::rc::Rc::new(dekri_core::trace::build_trace_index(&self.st));
        self.trace_cache = Some((key, i.clone()));
        i
    }
    pub fn set_theme(&mut self, dark: bool) {
        self.set_theme_pref(if dark { "gelap" } else { "terang" });
    }
    pub fn set_theme_pref(&mut self, pref: &str) {
        self.theme_pref = pref.to_string();
        self.dark = pref == "gelap";
        let _ = std::fs::create_dir_all(&self.paths.data_dir);
        let _ = atomic_write(
            &theme_file(&self.paths),
            &format!("{{\"tema\":\"{pref}\"}}"),
        );
    }

    pub fn new() -> Self {
        let paths = default_paths();
        let st = UserState::default();
        let note: Option<String> = None;
        let report = report_for(&st);
        let page = std::env::var("DEKRI_PAGE")
            .ok()
            .and_then(|p| {
                Page::ALL
                    .iter()
                    .find(|(_, n, _)| n.eq_ignore_ascii_case(&p))
                    .map(|(pg, _, _)| *pg)
            })
            .unwrap_or(Page::Beranda);
        let mut app = Session {
            st,
            report,
            trace_cache: None,
            page,
            sel: HashMap::new(),
            bufs: HashMap::new(),
            list_filter: String::new(),
            acct_filter: String::new(),
            report_tab: 0,
            paths,
            dark: false,
            theme_pref: "terang".to_string(),
            dirty: false,
            last_save: Instant::now(),
            last_backup: Instant::now(),
            toast: note.map(|n| (n, Instant::now())),
            confirm_reset: false,
            hide_zero: true,
            gl_code: Some("1-1100".into()),
            gl_active: true,
            bp_tab: 0,
            kasus_tab: 0,
            bab_sel: 0,
            learn_sel: usize::MAX,
            quiz_chosen: HashMap::new(),
            quiz_result: HashMap::new(),
            exam: ExamUi::default(),
            var_idx: [0, 0],
            var_seed: [1, 1],
            var_shown: HashMap::new(),
            var_reveal: HashSet::new(),
            pack_sel: None,
            kas_chosen: HashMap::new(),
            past: Vec::new(),
            future: Vec::new(),
            last_content: actions::pick_content(&UserState::default()),
            last_push: Instant::now(),
            last_key: String::new(),
            last_exam_save: Instant::now(),
            user: None,
            logged_in: false,
            users: Users::default(),
            login_input: String::new(),
            calc_open: false,
            calc_input: String::new(),
            calc_hist: Vec::new(),
            help_open: false,
            focus: false,
            recent: Vec::new(),
            nonce: 0,
            calc_err: None,
            search_open: false,
            search_q: String::new(),
        };
        app.calc_open = std::env::var_os("DEKRI_CALC").is_some();
        app.search_open = std::env::var_os("DEKRI_SEARCH").is_some();
        app.help_open = std::env::var_os("DEKRI_HELP").is_some();
        if let Some(t) = std::env::var("DEKRI_KASUS_TAB")
            .ok()
            .and_then(|v| v.parse::<usize>().ok())
        {
            app.kasus_tab = t;
        }
        app.theme_pref = match std::env::var("DEKRI_THEME").as_deref() {
            Ok("dark") => "gelap".to_string(),
            Ok("light") => "terang".to_string(),
            _ => load_theme(&app.paths),
        };
        app.dark = app.theme_pref == "gelap";
        app.users = load_users(&app.paths);
        if let Ok(u) = std::env::var("DEKRI_USER") {
            app.login(Some(u));
        } else if std::env::var_os("DEKRI_ANON").is_some() {
            app.login(None);
        } else if let Some(u) = app.users.last.clone() {
            app.login(Some(u));
        }
        app.last_content = actions::pick_content(&app.st);
        app.restore_exam();
        if cfg!(debug_assertions) {
            if let Ok(m) = std::env::var("DEKRI_EXAM") {
                app.debug_exam(&m);
            }
        }
        if let Ok(i) = std::env::var("DEKRI_SEL")
            .unwrap_or_default()
            .parse::<usize>()
        {
            app.sel.insert("txn", i);
            app.sel.insert("adj", i);
        }
        app
    }

    pub fn say(&mut self, msg: impl Into<String>) {
        self.toast = Some((msg.into(), Instant::now()));
    }

    /// Hitung ulang laporan tanpa mencatat riwayat undo (aksi yang bukan penyuntingan jawaban).
    pub fn refresh(&mut self) {
        self.report = report_for(&self.st);
        self.st.updated_at = now_iso();
        self.dirty = true;
    }

    /// Dipanggil setiap kali jawaban berubah: catat riwayat (ketikan beruntun dalam 1 dtk pada soal yang sama digabung),
    /// hitung ulang laporan, dan jadwalkan simpan.
    pub fn changed(&mut self) {
        let key = format!(
            "{:?}:{:?}",
            self.page,
            self.sel
                .iter()
                .map(|(k, v)| format!("{k}{v}"))
                .collect::<std::collections::BTreeSet<_>>()
        );
        let now = Instant::now();
        if key != self.last_key || now.duration_since(self.last_push) > Duration::from_secs(1) {
            self.past.push(self.last_content.clone());
            if self.past.len() > 100 {
                self.past.remove(0);
            }
        }
        self.last_key = key;
        self.last_push = now;
        self.future.clear();
        self.last_content = actions::pick_content(&self.st);
        self.refresh();
    }

    fn exam_file(&self) -> PathBuf {
        self.paths.state_file.with_file_name("exam-session.json")
    }

    /// Simpan sesi ujian yang sedang berjalan (maks. 1x/detik); hapus berkas bila tidak berjalan.
    pub fn persist_exam(&mut self) {
        let file = self.exam_file();
        if self.exam.phase != Phase::Run {
            if self.exam.dirty {
                let _ = std::fs::remove_file(&file);
                self.exam.dirty = false;
            }
            return;
        }
        if self.exam.dirty && self.last_exam_save.elapsed() > Duration::from_secs(1) {
            let e = &self.exam;
            let v = serde_json::json!({"items": e.items, "answers": e.answers, "index": e.index, "startedAt": e.started_at, "limitSec": e.limit_sec, "scope": e.scope});
            let _ = atomic_write(&file, &v.to_string());
            self.exam.dirty = false;
            self.last_exam_save = Instant::now();
        }
    }

    fn restore_exam(&mut self) {
        let Ok(text) = std::fs::read_to_string(self.exam_file()) else {
            return;
        };
        let Ok(v) = serde_json::from_str::<serde_json::Value>(&text) else {
            return;
        };
        let items: Vec<ExamItem> = serde_json::from_value(v["items"].clone()).unwrap_or_default();
        if items.is_empty() {
            return;
        }
        let e = &mut self.exam;
        e.items = items;
        e.answers = serde_json::from_value(v["answers"].clone()).unwrap_or_default();
        e.index = (v["index"].as_u64().unwrap_or(0) as usize).min(e.items.len() - 1);
        e.started_at = v["startedAt"].as_i64().unwrap_or_else(unix_now);
        e.limit_sec = v["limitSec"].as_i64().unwrap_or(0);
        e.scope = v["scope"].as_str().unwrap_or("semua").to_string();
        e.phase = Phase::Run;
    }

    fn save_users(&self) {
        let _ = atomic_write(
            &users_file(&self.paths),
            &serde_json::to_string(&self.users).unwrap_or_default(),
        );
    }

    /// Masuk sebagai `name` (None = tanpa nama, memakai simpanan lama). Pengguna sebelumnya disimpan dulu.
    /// Pengguna bernama pertama mengadopsi simpanan lama (state.json) bila ada.
    pub fn login(&mut self, name: Option<String>) {
        let name = name
            .map(|n| n.split_whitespace().collect::<Vec<_>>().join(" "))
            .filter(|n| !n.is_empty());
        let slug = match name.as_deref().map(|n| backup::user_slug(Some(n))) {
            Some(Err(e)) => {
                self.say(e);
                return;
            }
            Some(Ok(s)) => s,
            None => None,
        };
        if self.logged_in {
            self.save(true);
        }
        self.user = name.clone();
        let legacy = self.paths.data_dir.join("state.json");
        self.paths.state_file = match &slug {
            Some(s) => self.paths.data_dir.join(format!("state-{s}.json")),
            None => legacy.clone(),
        };
        if slug.is_some()
            && !self.paths.state_file.exists()
            && self.users.recent.is_empty()
            && legacy.exists()
        {
            let _ = std::fs::copy(&legacy, &self.paths.state_file);
        }
        let (mut st, note) = load_initial(&self.paths, name.as_deref());
        if cfg!(debug_assertions) && std::env::var_os("DEKRI_DEMO").is_some() {
            demo_fill(&mut st);
        }
        self.st = st;
        self.report = report_for(&self.st);
        self.bufs.clear();
        self.past.clear();
        self.future.clear();
        self.sel.clear();
        self.last_content = actions::pick_content(&self.st);
        self.quiz_chosen.clear();
        self.quiz_result.clear();
        self.var_shown.clear();
        self.var_reveal.clear();
        self.exam = ExamUi::default();
        self.restore_exam();
        self.logged_in = true;
        self.dirty = false;
        if let Some(n) = &name {
            self.users.recent.retain(|x| x != n);
            self.users.recent.insert(0, n.clone());
            self.users.recent.truncate(8);
        }
        self.users.last = name;
        self.save_users();
        if let Some(n) = note {
            self.say(n);
        }
    }

    pub fn undo(&mut self) {
        if let Some(prev) = self.past.pop() {
            self.future.push(actions::pick_content(&self.st));
            actions::apply_content(&mut self.st, prev);
            self.last_content = actions::pick_content(&self.st);
            self.bufs.clear();
            self.refresh();
        }
    }

    pub fn redo(&mut self) {
        if let Some(next) = self.future.pop() {
            self.past.push(actions::pick_content(&self.st));
            actions::apply_content(&mut self.st, next);
            self.last_content = actions::pick_content(&self.st);
            self.bufs.clear();
            self.refresh();
        }
    }

    /// Pindah halaman dari tautan gaya web ("transaksi/12", "kasus", "buku-besar", ...).
    pub fn go(&mut self, href: &str) {
        let (head, tail) = href.split_once('/').unwrap_or((href, ""));
        let page = match head {
            "kasus" => Page::Kasus,
            "transaksi" => Page::Transaksi,
            "jurnal" => Page::JurnalUmum,
            "buku-besar" => Page::BukuBesar,
            "buku-pembantu" => Page::BukuPembantu,
            "neraca-saldo" => Page::NeracaSaldo,
            "penyesuaian" => Page::Penyesuaian,
            "laporan" => Page::Laporan,
            "penutup" => Page::Penutup,
            "koreksi" => Page::Koreksi,
            "skenario" => Page::Skenario,
            "belajar" => Page::Belajar,
            "ujian" => Page::Ujian,
            "latihan" => Page::Latihan,
            "pemeriksaan" => Page::Pemeriksaan,
            _ => return,
        };
        self.page = page;
        if let Ok(n) = tail.parse::<usize>() {
            let key = match page {
                Page::Transaksi => "txn",
                Page::Koreksi => "cor",
                Page::Skenario => "sc",
                _ => "",
            };
            if !key.is_empty() {
                self.sel.insert(key, n.saturating_sub(1));
            }
        }
    }

    pub fn ctx(&self) -> Ctx<'_> {
        ctx_for(&self.st, &self.report)
    }

    pub fn save(&mut self, with_backup: bool) {
        let text = make_backup(&self.st, &now_iso());
        if let Err(e) = atomic_write(&self.paths.state_file, &text) {
            self.say(format!("Gagal menyimpan: {e}"));
            return;
        }
        self.dirty = false;
        self.last_save = Instant::now();
        if with_backup {
            match backup::write_backup(
                &self.paths.backup_dir,
                &text,
                self.user.as_deref(),
                chrono::Utc::now(),
            ) {
                Ok(_) => self.last_backup = Instant::now(),
                Err(e) => self.say(format!("Cadangan otomatis gagal: {e}")),
            }
        }
    }

    /// Tandai item sudah diperiksa (mode Periksa) dan tambah hitungan percobaan.
    /// Tandai item sudah diperiksa (log, percobaan, dan jadwal ulasan dicatat oleh mesin inti).
    /// Simpan salinan jawaban saat Periksa ditekan (maks. 6 per soal) supaya bisa dipulihkan.
    fn snapshot_answer(&mut self, kind: ItemKind, id: &str) {
        let lines: Vec<_> = match kind {
            ItemKind::Txn => self.st.journal.get(id),
            ItemKind::Adj => self.st.adjusting.get(id),
            _ => None,
        }
        .map(|v| v.iter().filter(|l| l.code.is_some()).cloned().collect())
        .unwrap_or_default();
        if lines.is_empty() {
            return;
        }
        let entry = serde_json::json!({"t": now_iso(), "lines": lines});
        let root = self
            .st
            .extra
            .entry("riwayat".to_string())
            .or_insert_with(|| serde_json::Value::Object(Default::default()));
        let Some(arr) = root
            .as_object_mut()
            .map(|m| {
                m.entry(item_key(kind, id))
                    .or_insert_with(|| serde_json::Value::Array(vec![]))
            })
            .and_then(|a| a.as_array_mut())
        else {
            return;
        };
        let same = |a: &serde_json::Value, b: &serde_json::Value| {
            let strip = |v: &serde_json::Value| {
                v["lines"]
                    .as_array()
                    .map(|ls| {
                        ls.iter()
                            .map(|l| (l["code"].clone(), l["debit"].clone(), l["credit"].clone()))
                            .collect::<Vec<_>>()
                    })
                    .unwrap_or_default()
            };
            strip(a) == strip(b)
        };
        if arr.last().is_some_and(|l| same(l, &entry)) {
            return;
        }
        arr.push(entry);
        while arr.len() > 6 {
            arr.remove(0);
        }
    }

    pub fn check_item(&mut self, kind: ItemKind, id: &str) {
        self.snapshot_answer(kind, id);
        actions::check(&mut self.st, kind, id);
        self.refresh();
    }
}

fn users_file(paths: &Paths) -> PathBuf {
    paths.data_dir.join("users.json")
}
fn load_users(paths: &Paths) -> Users {
    std::fs::read_to_string(users_file(paths))
        .ok()
        .and_then(|t| serde_json::from_str(&t).ok())
        .unwrap_or_default()
}

/// Khusus build pengembangan: isi jawaban dari kunci untuk uji tampilan (DEKRI_DEMO=1).
pub fn demo_fill(st: &mut UserState) {
    use dekri_core::types::JournalLine;
    let d = data();
    let mk = |ls: &Vec<dekri_core::data::ReadableLine>| -> Vec<JournalLine> {
        ls.iter()
            .enumerate()
            .map(|(i, l)| JournalLine {
                id: format!("d{i}"),
                code: Some(l.code.clone()),
                debit: l.debit,
                credit: l.credit,
                memo: String::new(),
            })
            .collect()
    };
    for (i, t) in d.key.readable_txn.iter().enumerate() {
        if i % 3 != 2 && !t.lines.is_empty() && t.lines[0].code != "-" {
            st.journal.insert(t.no.to_string(), mk(&t.lines));
        }
    }
    for a in &d.key.readable_adj {
        st.adjusting.insert(a.code.clone(), mk(&a.lines));
    }
    st.settings.validation_mode = "live".into();
    for no in ["1", "4"] {
        st.revealed.push(dekri_core::derive::item_key(
            dekri_core::derive::ItemKind::Txn,
            no,
        ));
    }
    let report = report_for(st);
    let ni = report.cells["S12_B53"].num();
    for r in &d.closing.closing_rows {
        st.closing
            .insert(r.code.clone(), expected_closing(&r.code, &report.tb, ni));
    }
}
