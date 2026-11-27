//! Kesetaraan logika belajar/ujian/varian dengan versi TypeScript (vektor dihasilkan oleh tools/export_variant_vectors.ts).
use dekri_core::actions::*;
use dekri_core::data::data;
use dekri_core::derive::*;
use dekri_core::exam::*;
use dekri_core::grade::Status;
use dekri_core::learning::*;
use dekri_core::state::UserState;
use dekri_core::types::JournalLine;
use dekri_core::variants::*;
use serde_json::Value;

fn vec(name: &str) -> Value {
    let p = format!("{}/tests/{name}", env!("CARGO_MANIFEST_DIR"));
    serde_json::from_str(&std::fs::read_to_string(p).unwrap()).unwrap()
}
fn line(code: &str, d: f64, c: f64) -> JournalLine {
    JournalLine {
        id: code.into(),
        code: Some(code.into()),
        debit: d,
        credit: c,
        memo: String::new(),
    }
}

#[test]
fn generator_varian_sama_dengan_versi_ts_untuk_72_soal() {
    let v = vec("variant-vectors.json");
    let v = v.as_array().unwrap();
    assert_eq!(v.len(), 72);
    for x in v {
        let (pattern, seed) = parse_id(x["id"].as_str().unwrap()).unwrap();
        let mine = generate(pattern, seed).unwrap();
        assert_eq!(mine.id, x["id"].as_str().unwrap());
        assert_eq!(
            mine.narrative,
            x["narrative"].as_str().unwrap(),
            "{}",
            mine.id
        );
        assert_eq!(mine.explain, x["explain"].as_str().unwrap(), "{}", mine.id);
        assert_eq!(mine.title, x["title"].as_str().unwrap());
        assert_eq!(mine.tax, x["tax"].as_bool().unwrap());
        let lines = x["lines"].as_array().unwrap();
        assert_eq!(mine.lines.len(), lines.len(), "{}", mine.id);
        for (a, b) in mine.lines.iter().zip(lines) {
            assert_eq!(
                (a.code.as_str(), a.name.as_str(), a.debit, a.credit),
                (
                    b["code"].as_str().unwrap(),
                    b["name"].as_str().unwrap(),
                    b["debit"].as_f64().unwrap(),
                    b["credit"].as_f64().unwrap()
                ),
                "{}",
                mine.id
            );
        }
        for (k, n) in x["net"].as_object().unwrap() {
            assert_eq!(mine.net[k.as_str()], n.as_f64().unwrap(), "{} {k}", mine.id);
        }
    }
}

#[test]
fn acak_ujian_sama_dengan_versi_ts() {
    for x in vec("exam-vectors.json").as_array().unwrap() {
        let items = pick_exam(
            x["n"].as_u64().unwrap() as usize,
            &["txn", "adj", "sc", "cor", "err"],
            x["seed"].as_i64().unwrap(),
            |_| true,
        );
        let got: Vec<String> = items.iter().map(|i| i.key()).collect();
        let want: Vec<String> = x["items"]
            .as_array()
            .unwrap()
            .iter()
            .map(|s| s.as_str().unwrap().to_string())
            .collect();
        assert_eq!(got, want, "seed {}", x["seed"]);
    }
}

#[test]
fn nilai_ujian_dari_kunci_benar_semua() {
    let d = data();
    let items = vec![
        ExamItem {
            kind: "txn".into(),
            id: "1".into(),
        },
        ExamItem {
            kind: "adj".into(),
            id: d.adjustments[0].code.clone(),
        },
        ExamItem {
            kind: "sc".into(),
            id: "1".into(),
        },
    ];
    let mut a = ExamAnswers::default();
    let t1 = &d.key.readable_txn[0];
    a.journal.insert(
        "1".into(),
        t1.lines
            .iter()
            .map(|l| line(&l.code, l.debit, l.credit))
            .collect(),
    );
    let adj = d
        .key
        .readable_adj
        .iter()
        .find(|x| x.code == d.adjustments[0].code)
        .unwrap();
    a.adjusting.insert(
        adj.code.clone(),
        adj.lines
            .iter()
            .map(|l| line(&l.code, l.debit, l.credit))
            .collect(),
    );
    let s = grade_exam(&items, &a);
    assert_eq!((s.total, s.correct), (3, 2)); // skenario sengaja belum dijawab
    assert!(!s.results[2].2);
}

#[test]
fn periksa_mencatat_log_jadwal_ulasan_dan_percobaan() {
    let mut st = UserState::default();
    st.journal.insert(
        "1".into(),
        vec![
            line("1-1100", 400_000_000.0, 0.0),
            line("3-1000", 0.0, 399_000_000.0),
        ],
    );
    check(&mut st, ItemKind::Txn, "1");
    assert_eq!(st.attempts["txn:1"], 1.0);
    assert_eq!(st.log.last().unwrap().status, "PERIKSA");
    assert_eq!(st.review["txn:1"].box_, 0);
    // perbaiki -> benar pada hari yang sama (jatuh tempo hari ini): naik ke kotak 1
    st.journal.insert(
        "1".into(),
        vec![
            line("1-1100", 400_000_000.0, 0.0),
            line("3-1000", 0.0, 400_000_000.0),
        ],
    );
    check(&mut st, ItemKind::Txn, "1");
    assert_eq!(st.log.last().unwrap().status, "BENAR");
    assert_eq!(st.review["txn:1"].box_, 1);
    assert_eq!(st.attempts["txn:1"], 2.0);
    // kunci dibuka: tidak lagi masuk jadwal ulasan jatuh tempo
    reveal(&mut st, ItemKind::Txn, "1");
    assert!(dekri_core::review::due_reviews(&st, "2999-01-01").is_empty());
}

#[test]
fn ringkasan_kemajuan_tidak_menghitung_kunci_yang_dibuka() {
    let d = data();
    let mut st = UserState::default();
    for t in d
        .key
        .readable_txn
        .iter()
        .filter(|t| t.lines.first().is_some_and(|l| l.code != "-"))
        .take(5)
    {
        st.journal.insert(
            t.no.to_string(),
            t.lines
                .iter()
                .map(|l| line(&l.code, l.debit, l.credit))
                .collect(),
        );
        check(&mut st, ItemKind::Txn, &t.no.to_string());
    }
    let report = report_for(&st);
    assert_eq!(
        summarize(&st, ItemKind::Txn, &ctx_for(&st, &report)).correct,
        5
    );
    reveal(
        &mut st,
        ItemKind::Txn,
        &d.key.readable_txn[0].no.to_string(),
    );
    assert_eq!(
        summarize(&st, ItemKind::Txn, &ctx_for(&st, &report)).correct,
        4
    );
}

#[test]
fn jalur_belajar_prasyarat_kuis_dan_kunci() {
    assert_eq!(modules().len(), 13);
    assert_eq!(materi().len(), 12);
    let mut st = UserState::default();
    // materi kedua terkunci sampai materi pertama selesai
    assert!(submit_quiz(&mut st, "coa", &[0, 0, 0]).is_none());
    let m = module_by_id("fundamental").unwrap();
    let all_right: Vec<i32> = m.quiz.iter().map(|q| q.answer as i32).collect();
    let r = submit_quiz(&mut st, "fundamental", &all_right).unwrap();
    assert!(r.passed);
    assert_eq!(st.learning.quiz["fundamental"].best, 1.0);
    let wrong: Vec<i32> = m
        .quiz
        .iter()
        .map(|q| (q.answer as i32 + 1) % q.options.len() as i32)
        .collect();
    submit_quiz(&mut st, "fundamental", &wrong).unwrap();
    assert_eq!(st.learning.quiz["fundamental"].best, 1.0); // terbaik tidak turun
    assert_eq!(st.learning.quiz["fundamental"].attempts, 2);
    let report = report_for(&st);
    let ctx = ctx_for(&st, &report);
    let s = module_statuses(&st.learning, &practice_map(&st, &ctx));
    assert_eq!(s[0].status, LearnStatus::Completed); // tanpa syarat latihan
    assert!(!s[1].locked);
    assert!(recommend(&s).is_some());
    // contoh varian pada materi dipakai generator yang sama
    let v = module_by_id("jurnal")
        .unwrap()
        .example
        .variant
        .as_ref()
        .unwrap();
    assert!(generate(&v.pattern, v.seed).is_some());
    // kuis salah semua dengan indeks di luar jangkauan = tidak dijawab
    assert_eq!(grade_quiz(&m.quiz, &[-1, 99, 0]).items[0], (-1, false));
}

#[test]
fn undo_content_mengembalikan_jawaban_saja() {
    let mut st = UserState::default();
    let before = pick_content(&st);
    st.journal
        .insert("1".into(), vec![line("1-1100", 1.0, 0.0)]);
    log_attempt(&mut st, "var", "x", Status::Benar);
    apply_content(&mut st, before);
    assert!(st.journal.is_empty());
    assert_eq!(st.log.len(), 1); // log tidak ikut undo
}
