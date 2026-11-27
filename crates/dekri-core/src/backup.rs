//! Cadangan otomatis versi desktop. Port Rust dari `desktop/backup.cjs`; nama berkas, aturan slug
//! pengguna, batas ukuran, dan pesan galat sengaja dibuat identik agar cadangan lama tetap terbaca.
//! Modul ini tidak bergantung pada Tauri sehingga bisa diuji sendiri (`cargo test`).

use chrono::{DateTime, SecondsFormat, Utc};
use serde::Serialize;
use sha1::{Digest, Sha1};
use std::{
    ffi::OsString,
    fs,
    path::{Path, PathBuf},
};
use unicode_normalization::UnicodeNormalization;

pub const APP: &str = "akuntansi-practice";
pub const LATEST: &str = "akuntansi-cadangan-terbaru.json";
pub const KEEP_DAYS: usize = 7;
pub const MAX_BYTES: u64 = 20 * 1024 * 1024;

const PREFIX: &str = "akuntansi-cadangan-";
const LATEST_SUFFIX: &str = "-terbaru.json";
const JSON_SUFFIX: &str = ".json";

#[derive(Debug, Serialize, PartialEq, Eq)]
pub struct WriteResult {
    pub dir: String,
    pub at: String,
}

#[derive(Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Info {
    pub dir: String,
    pub latest_at: Option<String>,
    pub files: Vec<String>,
}

fn iso(t: DateTime<Utc>) -> String {
    t.to_rfc3339_opts(SecondsFormat::Millis, true)
}

/// Penanda pengguna pada nama berkas. Nama datang dari halaman, jadi dibentuk ulang di sini:
/// hanya `[a-z0-9-]` dan potongan hash SHA-1, tanpa karakter jalur, dan dua nama berbeda tidak bertabrakan.
/// `None`/kosong memakai nama berkas lama.
pub fn user_slug(user: Option<&str>) -> Result<Option<String>, String> {
    let Some(user) = user else { return Ok(None) };
    if user.is_empty() {
        return Ok(None);
    }
    if user.encode_utf16().count() > 200 {
        return Err("Nama pengguna tidak valid.".into());
    }
    let collapsed = user.split_whitespace().collect::<Vec<_>>().join(" ");
    let key: String = collapsed.nfc().collect::<String>().to_lowercase();
    if key.is_empty() {
        return Ok(None);
    }
    let mut base = String::new();
    let mut pending = false;
    for c in key.nfkd() {
        if c.is_ascii_lowercase() || c.is_ascii_digit() {
            if pending && !base.is_empty() {
                base.push('-');
            }
            pending = false;
            base.push(c);
        } else {
            pending = true;
        }
    }
    let mut base: String = base.chars().take(24).collect();
    if base.is_empty() {
        base.push('u');
    }
    let digest = Sha1::digest(key.as_bytes());
    let hash: String = digest.iter().take(4).map(|b| format!("{b:02x}")).collect();
    Ok(Some(format!("{base}-{hash}")))
}

fn latest_of(slug: Option<&str>) -> String {
    match slug {
        Some(s) => format!("{PREFIX}{s}{LATEST_SUFFIX}"),
        None => LATEST.to_string(),
    }
}

fn daily_of(now: DateTime<Utc>, slug: Option<&str>) -> String {
    let d = now.format("%Y-%m-%d");
    match slug {
        Some(s) => format!("{PREFIX}{s}-{d}{JSON_SUFFIX}"),
        None => format!("{PREFIX}{d}{JSON_SUFFIX}"),
    }
}

fn is_date(s: &str) -> bool {
    let b = s.as_bytes();
    b.len() == 10
        && b.iter().enumerate().all(|(i, c)| {
            if i == 4 || i == 7 {
                *c == b'-'
            } else {
                c.is_ascii_digit()
            }
        })
}

fn is_daily(name: &str, slug: Option<&str>) -> bool {
    let Some(rest) = name.strip_prefix(PREFIX) else {
        return false;
    };
    let rest = match slug {
        Some(s) => match rest.strip_prefix(s).and_then(|r| r.strip_prefix('-')) {
            Some(r) => r,
            None => return false,
        },
        None => rest,
    };
    rest.strip_suffix(JSON_SUFFIX).is_some_and(is_date)
}

/// Cadangan lama (tanpa pengguna) hanya ditawarkan selama belum ada cadangan per pengguna sama sekali.
fn legacy_usable(dir: &Path) -> bool {
    match fs::read_dir(dir) {
        Ok(rd) => !rd.filter_map(Result::ok).any(|e| {
            let n = e.file_name().to_string_lossy().into_owned();
            n.strip_prefix(PREFIX)
                .and_then(|r| r.strip_suffix(LATEST_SUFFIX))
                .is_some_and(|x| !x.is_empty())
        }),
        Err(_) => true,
    }
}

/// Terima hanya teks JSON cadangan aplikasi ini; tolak yang lain sebelum menyentuh disk.
pub fn validate(text: &str) -> Result<(), String> {
    if text.len() as u64 > MAX_BYTES {
        return Err("Cadangan terlalu besar.".into());
    }
    let raw: serde_json::Value =
        serde_json::from_str(text).map_err(|_| "Cadangan bukan JSON yang valid.".to_string())?;
    let ok = raw.get("app").and_then(|v| v.as_str()) == Some(APP)
        && raw.get("version").and_then(|v| v.as_f64()) == Some(1.0)
        && raw.get("state").is_some_and(|v| v.is_object());
    if ok {
        Ok(())
    } else {
        Err("Bukan cadangan aplikasi ini.".into())
    }
}

/// Tulis lewat berkas sementara lalu ganti nama, sehingga cadangan lama tidak rusak bila proses terhenti di tengah.
fn atomic_write(file: &Path, text: &str) -> std::io::Result<()> {
    if let Ok(m) = fs::symlink_metadata(file) {
        if m.file_type().is_symlink() {
            let _ = fs::remove_file(file); // jangan menulis menembus tautan simbolik
        }
    }
    let mut tmp: OsString = file.as_os_str().to_owned();
    tmp.push(".tmp");
    let tmp = PathBuf::from(tmp);
    fs::write(&tmp, text.as_bytes())?;
    fs::rename(&tmp, file)
}

fn io(e: std::io::Error) -> String {
    e.to_string()
}

pub fn write_backup(
    dir: &Path,
    text: &str,
    user: Option<&str>,
    now: DateTime<Utc>,
) -> Result<WriteResult, String> {
    validate(text)?;
    let slug = user_slug(user)?;
    let slug = slug.as_deref();
    fs::create_dir_all(dir).map_err(io)?;
    atomic_write(&dir.join(latest_of(slug)), text).map_err(io)?;
    atomic_write(&dir.join(daily_of(now, slug)), text).map_err(io)?;
    let mut dated: Vec<String> = fs::read_dir(dir)
        .map_err(io)?
        .filter_map(Result::ok)
        .map(|e| e.file_name().to_string_lossy().into_owned())
        .filter(|n| is_daily(n, slug))
        .collect();
    dated.sort();
    let extra = dated.len().saturating_sub(KEEP_DAYS);
    for n in dated.iter().take(extra) {
        let _ = fs::remove_file(dir.join(n));
    }
    Ok(WriteResult {
        dir: dir.to_string_lossy().into_owned(),
        at: iso(now),
    })
}

/// Tolak tautan simbolik/bukan berkas biasa dan berkas terlalu besar sebelum dibaca. `Ok(false)` = belum ada.
fn safe_regular_file(f: &Path) -> Result<bool, String> {
    let Ok(m) = fs::symlink_metadata(f) else {
        return Ok(false);
    };
    if !m.file_type().is_file() {
        return Err("Berkas cadangan bukan berkas biasa.".into());
    }
    if m.len() > MAX_BYTES {
        return Err("Cadangan terlalu besar.".into());
    }
    Ok(true)
}

pub fn read_latest(dir: &Path, user: Option<&str>) -> Result<Option<String>, String> {
    let slug = user_slug(user)?;
    let mut f = dir.join(latest_of(slug.as_deref()));
    if slug.is_some() && !f.exists() && legacy_usable(dir) {
        f = dir.join(LATEST);
    }
    if !safe_regular_file(&f)? {
        return Ok(None);
    }
    let text = fs::read_to_string(&f).map_err(io)?;
    validate(&text)?;
    Ok(Some(text))
}

pub fn info(dir: &Path, user: Option<&str>) -> Result<Info, String> {
    let slug = user_slug(user)?;
    let own = latest_of(slug.as_deref());
    let use_legacy = slug.is_some() && !dir.join(&own).exists() && legacy_usable(dir);
    let name = if use_legacy { LATEST.to_string() } else { own };
    let re_slug = if use_legacy { None } else { slug.as_deref() };
    let latest_at = fs::metadata(dir.join(&name))
        .and_then(|m| m.modified())
        .ok()
        .map(|t| iso(DateTime::<Utc>::from(t)));
    let mut files: Vec<String> = match fs::read_dir(dir) {
        Ok(rd) => rd
            .filter_map(Result::ok)
            .map(|e| e.file_name().to_string_lossy().into_owned())
            .filter(|n| *n == name || is_daily(n, re_slug))
            .collect(),
        Err(_) => Vec::new(),
    };
    files.sort();
    Ok(Info {
        dir: dir.to_string_lossy().into_owned(),
        latest_at,
        files,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::TimeZone;
    use std::sync::atomic::{AtomicU32, Ordering};

    static N: AtomicU32 = AtomicU32::new(0);
    fn tmp() -> PathBuf {
        let p = std::env::temp_dir()
            .join(format!(
                "dekri-bk-{}-{}",
                std::process::id(),
                N.fetch_add(1, Ordering::SeqCst)
            ))
            .join("Cadangan")
            .join("dalam");
        let _ = fs::remove_dir_all(&p);
        p
    }
    fn text(n: usize) -> String {
        let flags: Vec<String> = (0..n).map(|i| format!("txn:{i}")).collect();
        serde_json::json!({ "app": APP, "version": 1, "state": { "flags": flags } }).to_string()
    }
    fn day(y: i32, m: u32, d: u32) -> DateTime<Utc> {
        Utc.with_ymd_and_hms(y, m, d, 1, 0, 0).unwrap()
    }
    fn names(d: &Path) -> Vec<String> {
        let mut v: Vec<String> = fs::read_dir(d)
            .unwrap()
            .map(|e| e.unwrap().file_name().to_string_lossy().into_owned())
            .collect();
        v.sort();
        v
    }

    /// Nilai acuan dihasilkan dari `desktop/backup.cjs` (Node) agar nama berkas lama tetap cocok.
    #[test]
    fn slug_identik_dengan_versi_node() {
        let cases: &[(&str, Option<&str>)] = &[
            ("Ridhwan", Some("ridhwan-fb2d4a77")),
            ("  Ridhwan   Putra ", Some("ridhwan-putra-166f52e4")),
            ("ÉCOLE Été", Some("e-cole-e-te-95e7550c")),
            ("Ünïcode ñ", Some("u-ni-code-n-d020c5aa")),
            ("日本語", Some("u-c12140a0")),
            ("a/b\\c..", Some("a-b-c-5c849fcc")),
            ("", None),
            ("   ", None),
            (&"x".repeat(100), Some("xxxxxxxxxxxxxxxxxxxxxxxx-50e48369")),
            ("Siti Nurhaliza", Some("siti-nurhaliza-4545f800")),
            ("İstanbul", Some("i-stanbul-4e4700bf")),
            ("ß-test", Some("test-280b2d39")),
            ("Ａｂｃ１２３", Some("abc123-5e6532a9")),
        ];
        for (input, want) in cases {
            assert_eq!(
                user_slug(Some(input)).unwrap().as_deref(),
                *want,
                "masukan: {input:?}"
            );
        }
        assert_eq!(user_slug(None).unwrap(), None);
        assert!(user_slug(Some(&"y".repeat(201))).is_err());
    }

    #[test]
    fn menulis_terbaru_dan_harian_serta_membuat_folder() {
        let d = tmp();
        let t = text(1);
        let r = write_backup(&d, &t, None, day(2026, 11, 2)).unwrap();
        assert_eq!(r.at, "2026-11-02T01:00:00.000Z");
        assert_eq!(
            names(&d),
            [
                "akuntansi-cadangan-2026-11-02.json",
                "akuntansi-cadangan-terbaru.json"
            ]
        );
        assert_eq!(fs::read_to_string(d.join(LATEST)).unwrap(), t);
    }

    #[test]
    fn menyimpan_hanya_7_hari_dan_tidak_menyentuh_berkas_lain() {
        let d = tmp();
        write_backup(&d, &text(0), None, day(2026, 10, 1)).unwrap();
        fs::write(d.join("catatan-saya.txt"), "jangan hapus").unwrap();
        for i in 2..=12 {
            write_backup(&d, &text(0), None, day(2026, 10, i)).unwrap();
        }
        let n = names(&d);
        assert_eq!(
            n.iter()
                .filter(|x| x.starts_with("akuntansi-cadangan-2026-"))
                .count(),
            7
        );
        assert!(n.contains(&"catatan-saya.txt".to_string()));
        assert!(n.contains(&"akuntansi-cadangan-2026-10-12.json".to_string()));
        assert!(!n.contains(&"akuntansi-cadangan-2026-10-01.json".to_string()));
    }

    #[test]
    fn baca_terbaru_dan_null_bila_belum_ada() {
        let d = tmp();
        assert_eq!(read_latest(&d, None).unwrap(), None);
        write_backup(&d, &text(1), None, day(2026, 11, 1)).unwrap();
        let t2 = text(2);
        write_backup(&d, &t2, None, day(2026, 11, 2)).unwrap();
        assert_eq!(read_latest(&d, None).unwrap().as_deref(), Some(t2.as_str()));
    }

    #[test]
    fn menolak_isi_yang_bukan_cadangan_aplikasi() {
        let d = tmp();
        for bad in [
            "bukan json",
            "{}",
            r#"{"app":"lain","version":1,"state":{}}"#,
            r#"{"app":"akuntansi-practice","version":2,"state":{}}"#,
            r#"{"app":"akuntansi-practice","version":1,"state":null}"#,
        ] {
            assert!(
                write_backup(&d, bad, None, day(2026, 11, 1)).is_err(),
                "{bad}"
            );
        }
        assert!(!d.exists(), "tidak boleh menyentuh disk");
        let big = format!(
            r#"{{"app":"{APP}","version":1,"state":{{"x":"{}"}}}}"#,
            "a".repeat(MAX_BYTES as usize)
        );
        assert_eq!(validate(&big).unwrap_err(), "Cadangan terlalu besar.");
    }

    #[test]
    fn cadangan_per_pengguna_terpisah_dan_cadangan_lama_hanya_bila_belum_ada_yang_bercakupan() {
        let d = tmp();
        let (legacy, a, b) = (text(1), text(2), text(3));
        write_backup(&d, &legacy, None, day(2026, 11, 1)).unwrap();
        // pengguna baru boleh melihat cadangan lama selama belum ada cadangan bercakupan
        assert_eq!(
            read_latest(&d, Some("Ani")).unwrap().as_deref(),
            Some(legacy.as_str())
        );
        write_backup(&d, &a, Some("Ani"), day(2026, 11, 2)).unwrap();
        write_backup(&d, &b, Some("Budi"), day(2026, 11, 2)).unwrap();
        assert_eq!(
            read_latest(&d, Some("ani")).unwrap().as_deref(),
            Some(a.as_str())
        );
        assert_eq!(
            read_latest(&d, Some("Budi")).unwrap().as_deref(),
            Some(b.as_str())
        );
        // pengguna ketiga tidak lagi diberi cadangan lama milik orang lain
        assert_eq!(read_latest(&d, Some("Cici")).unwrap(), None);
        let slug = user_slug(Some("Ani")).unwrap().unwrap();
        let i = info(&d, Some("Ani")).unwrap();
        assert_eq!(
            i.files,
            [
                format!("akuntansi-cadangan-{slug}-2026-11-02.json"),
                format!("akuntansi-cadangan-{slug}-terbaru.json")
            ]
        );
    }

    #[test]
    fn info_belum_ada_folder() {
        let d = tmp();
        let i = info(&d, None).unwrap();
        assert_eq!((i.latest_at, i.files.len()), (None, 0));
    }

    #[cfg(unix)]
    #[test]
    fn tidak_menulis_atau_membaca_menembus_tautan_simbolik() {
        let d = tmp();
        fs::create_dir_all(&d).unwrap();
        let target = d.join("..").join("sasaran.txt");
        fs::write(&target, "asli").unwrap();
        std::os::unix::fs::symlink(&target, d.join(LATEST)).unwrap();
        write_backup(&d, &text(1), None, day(2026, 11, 1)).unwrap();
        assert_eq!(fs::read_to_string(&target).unwrap(), "asli");
        assert!(fs::symlink_metadata(d.join(LATEST))
            .unwrap()
            .file_type()
            .is_file());
        fs::remove_file(d.join(LATEST)).unwrap();
        std::os::unix::fs::symlink(&target, d.join(LATEST)).unwrap();
        assert_eq!(
            read_latest(&d, None).unwrap_err(),
            "Berkas cadangan bukan berkas biasa."
        );
    }
}
