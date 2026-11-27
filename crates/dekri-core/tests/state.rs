//! Kompatibilitas berkas cadangan dengan versi web/Electron/Tauri.
use dekri_core::derive::{ctx_for, report_for, result_for, ItemKind};
use dekri_core::grade::Status;
use dekri_core::state::{make_backup, parse_backup};

const WEB_BACKUP: &str = r#"{
  "app": "akuntansi-practice", "version": 1, "exportedAt": "2026-11-01T01:00:00.000Z",
  "state": {
    "version": 1,
    "analysis": {"1": {"needsAdj": "Tidak", "affectsProfit": "Tidak", "affectsCash": "Ya"}},
    "journal": {"1": [
      {"id": "a", "code": "1-1100", "debit": 400000000, "credit": 0, "memo": ""},
      {"id": "b", "code": "3-1000", "debit": 0, "credit": 400000000, "memo": "setoran"},
      {"id": "c", "code": null, "debit": 0, "credit": 0, "memo": ""}]},
    "adjusting": {}, "closing": {"4-1000": {"debit": 5, "credit": 0}}, "reversing": {}, "correcting": {},
    "errorType": {}, "scenarios": {"1": {"answer": "123"}}, "checked": {"txn:1": "1-1100:400000000:0|3-1000:0:400000000#"},
    "attempts": {"txn:1": 2}, "revealed": [], "review": {"txn:1": {"box": 0, "due": "2026-11-01"}},
    "settings": {"validationMode": "check"}, "hints": {}, "flags": [], "notes": {}, "log": [], "exams": [],
    "pajak": {}, "tables": {}, "learning": {"quiz": {}, "history": []}, "updatedAt": "2026-11-01T01:00:00.000Z"
  }
}"#;

#[test]
fn membaca_cadangan_web_dan_menilai_jawabannya() {
    let st = parse_backup(WEB_BACKUP).unwrap();
    assert_eq!(st.journal["1"].len(), 3);
    let report = report_for(&st);
    let ctx = ctx_for(&st, &report);
    let r = result_for(&st, ItemKind::Txn, "1", &ctx);
    assert_eq!(r.grade.status, Status::Benar);
    // mode Periksa: tanda tangan cocok -> status ditampilkan
    assert_eq!(r.shown, Some(Status::Benar));
}

#[test]
fn bolak_balik_mempertahankan_bagian_yang_belum_dipakai_ui_native() {
    let st = parse_backup(WEB_BACKUP).unwrap();
    let text = make_backup(&st, "2026-11-12T00:00:00.000Z");
    let v: serde_json::Value = serde_json::from_str(&text).unwrap();
    assert_eq!(v["app"], "akuntansi-practice");
    assert_eq!(v["version"], 1);
    // bagian yang tidak dikenal UI native tetap ada
    assert_eq!(v["state"]["review"]["txn:1"]["due"], "2026-11-01");
    assert_eq!(v["state"]["learning"]["quiz"], serde_json::json!({}));
    // angka bulat ditulis sebagai bilangan bulat (bukan 400000000.0)
    assert!(text.contains("\"debit\":400000000,"), "{text}");
    assert_eq!(
        v["state"]["settings"]["lastExportAt"],
        "2026-11-12T00:00:00.000Z"
    );
    assert_eq!(parse_backup(&text).unwrap().journal, st.journal);
}

#[test]
fn menolak_cadangan_yang_salah_dengan_pesan_yang_sama() {
    assert_eq!(
        parse_backup("bukan json").unwrap_err().0,
        "File bukan JSON yang valid."
    );
    assert_eq!(
        parse_backup("{}").unwrap_err().0,
        "File ini bukan cadangan aplikasi latihan akuntansi."
    );
    assert_eq!(
        parse_backup(r#"{"app":"akuntansi-practice","version":2}"#)
            .unwrap_err()
            .0,
        "Versi cadangan tidak didukung."
    );
}

#[test]
fn membuang_nominal_rusak_dan_akun_tak_dikenal() {
    let text = WEB_BACKUP
        .replace(
            "\"credit\": 400000000, \"memo\": \"setoran\"",
            "\"credit\": 1e300, \"memo\": \"x\"",
        )
        .replace("\"1-1100\"", "\"9-9999\"");
    let st = parse_backup(&text).unwrap();
    assert_eq!(st.journal["1"].len(), 2); // baris 1e300 dibuang
    assert_eq!(st.journal["1"][0].code, None); // akun tak dikenal dikosongkan
}
