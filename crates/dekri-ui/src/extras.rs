//! Pendamping: kalkulator, pencarian global (Ctrl+K), dan toast.
use crate::session::Session;
use dekri_core::data::data;
use dekri_core::money::format_rupiah;
use dioxus::prelude::*;

// ---------- kalkulator ----------
struct P<'a> {
    s: &'a [char],
    i: usize,
}
impl P<'_> {
    fn ws(&mut self) {
        while self.s.get(self.i).is_some_and(|c| c.is_whitespace()) {
            self.i += 1;
        }
    }
    fn peek(&mut self) -> Option<char> {
        self.ws();
        self.s.get(self.i).copied()
    }
    fn expr(&mut self) -> Result<f64, String> {
        let mut v = self.term()?;
        while let Some(c) = self.peek() {
            if c == '+' || c == '-' {
                self.i += 1;
                let r = self.term()?;
                v = if c == '+' { v + r } else { v - r };
            } else {
                break;
            }
        }
        Ok(v)
    }
    fn term(&mut self) -> Result<f64, String> {
        let mut v = self.unary()?;
        while let Some(c) = self.peek() {
            if matches!(c, '*' | '×' | 'x' | 'X' | '/' | '÷') {
                self.i += 1;
                let r = self.unary()?;
                let divide = matches!(c, '/' | '÷');
                if divide && r == 0.0 {
                    return Err("pembagi nol".into());
                }
                v = if divide { v / r } else { v * r };
            } else {
                break;
            }
        }
        Ok(v)
    }
    fn unary(&mut self) -> Result<f64, String> {
        match self.peek() {
            Some('-') => {
                self.i += 1;
                Ok(-self.unary()?)
            }
            Some('+') => {
                self.i += 1;
                self.unary()
            }
            _ => self.postfix(),
        }
    }
    fn postfix(&mut self) -> Result<f64, String> {
        let mut v = self.atom()?;
        while self.peek() == Some('%') {
            self.i += 1;
            v /= 100.0;
        }
        Ok(v)
    }
    fn atom(&mut self) -> Result<f64, String> {
        match self.peek() {
            Some('(') => {
                self.i += 1;
                let v = self.expr()?;
                if self.peek() != Some(')') {
                    return Err("kurung belum ditutup".into());
                }
                self.i += 1;
                Ok(v)
            }
            Some(c) if c.is_ascii_digit() || c == '.' || c == ',' => self.number(),
            _ => Err("ekspresi tidak valid".into()),
        }
    }
    fn number(&mut self) -> Result<f64, String> {
        let start = self.i;
        while self
            .s
            .get(self.i)
            .is_some_and(|c| c.is_ascii_digit() || *c == '.' || *c == ',')
        {
            self.i += 1;
        }
        let t: String = self.s[start..self.i].iter().collect();
        parse_number(&t).ok_or_else(|| format!("angka tidak valid: {t}"))
    }
}

/// Angka format Indonesia: titik = pemisah ribuan, koma = desimal ("1.250,5" = seribu dua ratus lima puluh
/// koma lima). Tanpa koma, titik yang membentuk pola ribuan ("1.250.000") dibaca ribuan dan selainnya desimal
/// ("12.5"), supaya rumus dari sumber lain tetap terbaca. Selain itu ditolak, tidak ditebak.
fn parse_number(t: &str) -> Option<f64> {
    fn ribuan(int: &str) -> bool {
        let g: Vec<&str> = int.split('.').collect();
        g.len() > 1
            && !g[0].is_empty()
            && g[0].len() <= 3
            && g[1..].iter().all(|x| x.len() == 3)
            && g.iter().all(|x| x.bytes().all(|b| b.is_ascii_digit()))
    }
    let clean = match t.split_once(',') {
        Some((int, frac)) => {
            // desimal hanya boleh berisi angka: koma kedua atau titik di sini berarti salah ketik
            if (int.is_empty() && frac.is_empty()) || !frac.bytes().all(|b| b.is_ascii_digit()) {
                return None;
            }
            let int = if int.contains('.') {
                if !ribuan(int) {
                    return None;
                }
                int.replace('.', "")
            } else {
                int.to_string()
            };
            format!("{}.{frac}", if int.is_empty() { "0" } else { &int })
        }
        None if ribuan(t) => t.replace('.', ""),
        None => t.to_string(),
    };
    clean.parse::<f64>().ok()
}

pub fn calc(expr: &str) -> Result<f64, String> {
    let chars: Vec<char> = expr.chars().collect();
    let mut p = P { s: &chars, i: 0 };
    let v = p.expr()?;
    if p.peek().is_some() {
        return Err("ekspresi tidak valid".into());
    }
    if v.is_finite() {
        Ok(v)
    } else {
        Err("hasil tidak terhingga".into())
    }
}

pub fn show_num(v: f64) -> String {
    if v.fract() == 0.0 && v.abs() < 1e15 {
        format_rupiah(v, false)
    } else {
        let r = (v * 1e6).round() / 1e6;
        let s = format!("{r}");
        let (int, frac) = s.split_once('.').unwrap_or((&s, ""));
        let i: f64 = int.parse().unwrap_or(0.0);
        format!(
            "{}{},{}",
            if v < 0.0 && i == 0.0 { "-" } else { "" },
            format_rupiah(i, false),
            frac
        )
    }
}

// ---------- kalkulator melayang (padanan Calculator.tsx) ----------
const KEYS: [[&str; 4]; 6] = [
    ["C", "(", ")", "⌫"],
    ["7", "8", "9", "÷"],
    ["4", "5", "6", "×"],
    ["1", "2", "3", "-"],
    ["0", "000", ",", "+"],
    ["%", "=", "", ""],
];

/// Operator dalam bentuk tampilan: `*`, `x`, `X` menjadi ×; `/` menjadi ÷ (papan ketik tidak punya × dan ÷).
fn to_display(s: &str) -> String {
    s.replace(['*', 'x', 'X'], "×").replace('/', "÷")
}
fn from_display(s: &str) -> String {
    s.replace('×', "*").replace('÷', "/")
}
/// Beri titik ribuan pada tiap angka bulat; bagian desimal (setelah koma) tidak disentuh. Titik lama di dalam
/// atau di tepi deretan angka dibuang dulu, jadi menghapus angka pertama ("1.234" -> ".234") atau menyisipkan
/// angka di tengah selalu menghasilkan pengelompokan yang benar. Titik tanpa angka di sekitarnya dibiarkan,
/// supaya perhitungan menolaknya. Hasilnya idempoten: memformat hasil format tidak mengubah apa pun.
pub fn group_expr(s: &str) -> String {
    let ch: Vec<char> = s.chars().collect();
    let mut out = String::new();
    let mut i = 0;
    while i < ch.len() {
        // Titik tepat setelah koma atau setelah angka desimal bukan pemisah ribuan: biarkan, supaya salah
        // ketik seperti "1,250.50" tetap tampak dan ditolak, bukan diam-diam dibaca lain.
        let setelah_desimal = i > 0 && (ch[i - 1].is_ascii_digit() || ch[i - 1] == ',');
        if !(ch[i].is_ascii_digit() || (ch[i] == '.' && !setelah_desimal)) {
            out.push(ch[i]);
            i += 1;
            continue;
        }
        let start = i;
        let mut digits = String::new();
        while i < ch.len() && (ch[i].is_ascii_digit() || ch[i] == '.') {
            if ch[i] != '.' {
                digits.push(ch[i]);
            }
            i += 1;
        }
        if digits.is_empty() {
            out.extend(&ch[start..i]);
            continue;
        }
        let n = digits.len();
        for (k, c) in digits.chars().enumerate() {
            if k > 0 && (n - k).is_multiple_of(3) {
                out.push('.');
            }
            out.push(c);
        }
        if i < ch.len() && ch[i] == ',' {
            out.push(',');
            i += 1;
            while i < ch.len() && ch[i].is_ascii_digit() {
                out.push(ch[i]);
                i += 1;
            }
        }
    }
    out
}
/// Format teks hasil ketikan atau penyisipan (operator ke bentuk tampilan, titik ribuan) dan petakan kursor:
/// kursor tetap berada setelah jumlah karakter bermakna (bukan titik ribuan) yang sama seperti sebelum
/// pemformatan. Indeks dalam karakter. Padanan JS-nya `formatTyped` di assets/kalkulator-ketik.js; keduanya
/// diuji dengan test-data/kalkulator-ketik.json.
pub(crate) fn reformat(raw: &str, caret: usize) -> (String, usize) {
    let disp = to_display(raw);
    let sig = disp.chars().take(caret).filter(|c| *c != '.').count();
    let text = group_expr(&disp);
    let mut pos = 0usize;
    if sig > 0 {
        let mut seen = 0usize;
        for (i, c) in text.chars().enumerate() {
            if c != '.' {
                seen += 1;
            }
            pos = i + 1;
            if seen == sig {
                break;
            }
        }
    }
    (text, pos)
}
fn plain_num(v: f64) -> String {
    format!("{}", (v * 1e4).round() / 1e4).replace('.', ",")
}

const DRAG_JS: &str = r#"
(function(){
  const box=document.querySelector('[data-calculator]'); const h=box&&box.querySelector('[data-drag]');
  if(!box||!h||h.__dk) return; h.__dk=true;
  try{const v=JSON.parse(localStorage.getItem('dekri:calc-pos')||'null'); if(v&&isFinite(v.x)&&isFinite(v.y)){box.style.left=v.x+'px';box.style.top=v.y+'px';box.style.right='auto';box.style.bottom='auto';}}catch(e){}
  const clamp=(x,y)=>[Math.max(0,Math.min(x,innerWidth-box.offsetWidth)),Math.max(0,Math.min(y,innerHeight-Math.min(box.offsetHeight,80)))];
  const put=(x,y)=>{const c=clamp(x,y);box.style.left=c[0]+'px';box.style.top=c[1]+'px';box.style.right='auto';box.style.bottom='auto';return c;};
  h.addEventListener('pointerdown',e=>{
    if(e.target.closest('button'))return; const r=box.getBoundingClientRect(); const dx=e.clientX-r.left, dy=e.clientY-r.top; h.setPointerCapture&&h.setPointerCapture(e.pointerId); let last=[r.left,r.top];
    const mv=ev=>{last=put(ev.clientX-dx,ev.clientY-dy);};
    const up=()=>{h.removeEventListener('pointermove',mv);h.removeEventListener('pointerup',up);h.removeEventListener('pointercancel',up);try{localStorage.setItem('dekri:calc-pos',JSON.stringify({x:last[0],y:last[1]}));}catch(e){}};
    h.addEventListener('pointermove',mv);h.addEventListener('pointerup',up);h.addEventListener('pointercancel',up);
  });
  box.addEventListener('keydown',e=>{ if(!e.altKey)return; const d={ArrowLeft:[-16,0],ArrowRight:[16,0],ArrowUp:[0,-16],ArrowDown:[0,16]}[e.key]; if(!d)return; e.preventDefault(); const r=box.getBoundingClientRect(); const c=put(r.left+d[0],r.top+d[1]); try{localStorage.setItem('dekri:calc-pos',JSON.stringify({x:c[0],y:c[1]}));}catch(_){} });
})();
"#;

/// Pemformat ketikan kolom ekspresi: titik ribuan dan kursor dijaga di WebView sebelum Dioxus membaca nilainya.
const KETIK_JS: &str = include_str!("../assets/kalkulator-ketik.js");

const INSERT_JS: &str = r#"
const n=String(__N__); const el=window.__dkLast;
if(!el||!el.isConnected||el.disabled||el.readOnly){dioxus.send(false);}
else{const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; set.call(el,n); el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); el.focus(); dioxus.send(true);}
"#;

/// Tulis teks ke kolom ekspresi dan taruh kursor, lalu beri tahu Dioxus lewat kejadian input.
/// Kolom ini milik DOM: Dioxus tidak pernah menulis nilainya (tidak ada atribut `value`). Bila ditulis dari
/// Rust, ketikan yang masuk saat penulisan ulang masih dalam perjalanan ikut tertimpa nilai usang, sehingga
/// angka hilang dan kursor melompat ke akhir saat mengetik cepat atau menahan Backspace.
fn tulis_kolom(text: &str, caret: usize) {
    let t = serde_json::to_string(text).unwrap_or_else(|_| "\"\"".into());
    let _ = document::eval(&format!(
        "var i=document.querySelector('[data-calculator] input');if(i){{var s=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;s.call(i,{t});i.focus();try{{i.setSelectionRange({caret},{caret});}}catch(e){{}}i.dispatchEvent(new Event('input',{{bubbles:true}}));}}"
    ));
}

/// Terapkan satu tombol pada ekspresi di posisi kursor/seleksi (indeks karakter). Mengembalikan teks
/// berformat dan posisi kursor baru, supaya kursor tidak melompat ke akhir saat tombol diklik.
pub(crate) fn apply_key(
    cur: &str,
    sel_a: Option<usize>,
    sel_b: Option<usize>,
    k: &str,
) -> (String, usize) {
    let mut cur: Vec<char> = cur.chars().collect();
    let len = cur.len();
    let (mut a, mut b) = (sel_a.unwrap_or(len).min(len), sel_b.unwrap_or(len).min(len));
    if a > b {
        std::mem::swap(&mut a, &mut b);
    }
    let caret;
    if k == "⌫" {
        if a != b {
            cur.drain(a..b);
            caret = a;
        } else if a > 0 {
            cur.remove(a - 1);
            caret = a - 1;
        } else {
            caret = 0;
        }
    } else {
        let ins: Vec<char> = k.chars().collect();
        let n = ins.len();
        cur.splice(a..b, ins);
        caret = a + n;
    }
    let raw: String = cur.into_iter().collect();
    reformat(&raw, caret)
}

#[cfg(test)]
mod key_tests {
    use super::apply_key;

    #[test]
    fn inserts_at_caret_not_at_end() {
        // "12+5" dengan kursor setelah "12": menekan 3 -> "123+5", kursor di 3
        assert_eq!(
            apply_key("12+5", Some(2), Some(2), "3"),
            ("123+5".to_string(), 3)
        );
    }
    #[test]
    fn grouping_keeps_caret_after_inserted_digit() {
        // "999+1" kursor setelah 999, tekan 9 -> "9.999+1", kursor setelah digit baru
        let (t, p) = apply_key("999+1", Some(3), Some(3), "9");
        assert_eq!(t, "9.999+1");
        assert_eq!(p, 5);
    }
    #[test]
    fn backspace_and_selection() {
        assert_eq!(
            apply_key("123+5", Some(3), Some(3), "⌫"),
            ("12+5".to_string(), 2)
        );
        assert_eq!(
            apply_key("123+5", Some(1), Some(4), "7"),
            ("175".to_string(), 2)
        );
        assert_eq!(apply_key("", None, None, "4"), ("4".to_string(), 1));
    }
}

#[cfg(test)]
mod hitung_tests {
    use super::*;

    /// Jalur yang sama dengan kolom: tampilan (operator, titik ribuan) lalu hitung.
    fn lewat_kolom(s: &str) -> Result<f64, String> {
        calc(&from_display(&group_expr(&to_display(s))))
    }
    fn dekat(a: f64, b: f64) -> bool {
        (a - b).abs() < 1e-9 * b.abs().max(1.0)
    }

    #[test]
    fn x_di_papan_ketik_berarti_kali() {
        for s in ["6x7", "6X7", "6*7", "6×7", "6 x 7", "2x3x7"] {
            assert_eq!(lewat_kolom(s), Ok(42.0), "{s}");
            assert_eq!(calc(s), Ok(42.0), "calc langsung: {s}");
        }
        assert_eq!(lewat_kolom("1.000x1.000"), Ok(1_000_000.0));
        assert_eq!(lewat_kolom("10+2x3"), Ok(16.0), "kali didahulukan");
        assert_eq!(to_display("6x7X8*9/3"), "6×7×8×9÷3");
    }

    #[test]
    fn koma_desimal_dibaca_baik_dengan_atau_tanpa_titik_ribuan() {
        let ok = [
            ("1,5", 1.5),
            ("0,5", 0.5),
            (",5", 0.5),
            ("5,", 5.0),
            ("1250,5", 1250.5),
            ("1.250,5", 1250.5),
            ("1.250,5+1", 1251.5),
            ("10.000,25*2", 20_000.5),
            ("(1.250,5-0,5)÷2", 625.0),
            ("12,5%", 0.125),
            ("1.234.567,891", 1_234_567.891),
        ];
        for (s, v) in ok {
            let got = calc(s).unwrap_or_else(|e| panic!("{s}: {e}"));
            assert!(dekat(got, v), "{s} = {got}, harapan {v}");
            let got = lewat_kolom(s).unwrap_or_else(|e| panic!("{s} lewat kolom: {e}"));
            assert!(dekat(got, v), "{s} lewat kolom = {got}, harapan {v}");
        }
    }

    #[test]
    fn angka_yang_memang_salah_tetap_ditolak() {
        for s in [
            "1,5,5", "1,5.3", "12.34,5", "1,250.50", ",", "1..5", "1.2.3", "1,2,3",
        ] {
            let r = calc(s);
            assert!(
                matches!(&r, Err(e) if e.starts_with("angka tidak valid")),
                "{s} -> {r:?}"
            );
        }
        assert_eq!(calc("5/0"), Err("pembagi nol".to_string()));
    }

    #[test]
    fn format_lama_tetap_terbaca() {
        assert_eq!(calc("1.250.000"), Ok(1_250_000.0));
        assert_eq!(calc("1.250"), Ok(1250.0));
        assert_eq!(calc("12.5"), Ok(12.5));
        assert_eq!(calc("72.000.000/12"), Ok(6_000_000.0));
        assert_eq!(calc("(120.000.000-12.000.000)÷5"), Ok(21_600_000.0));
    }

    #[test]
    fn hasil_dengan_desimal_bisa_dipakai_lagi_setelah_sama_dengan() {
        // Kasus asli: hasil "3.333,3333" gagal dibaca ulang ("angka tidak valid") sehingga rumus tidak bisa dilanjutkan.
        let v = calc("10000/3").unwrap();
        let teks = group_expr(&plain_num(v));
        assert_eq!(teks, "3.333,3333");
        assert!(dekat(calc(&teks).unwrap(), (v * 1e4).round() / 1e4));
        assert!(dekat(calc(&format!("{teks}+1")).unwrap(), 3334.3333));
        for v in [
            0.0,
            0.5,
            -5.5,
            1251.5,
            1_234_567.891,
            99999.9999,
            -1_000_000.25,
            12.0,
            1e12 + 0.5,
        ] {
            let teks = group_expr(&plain_num(v));
            let balik = lewat_kolom(&teks).unwrap_or_else(|e| panic!("{v} -> {teks}: {e}"));
            assert!(
                dekat(balik, (v * 1e4).round() / 1e4),
                "{v} -> {teks} -> {balik}"
            );
        }
    }

    #[test]
    fn menghapus_angka_pertama_tidak_meninggalkan_titik_di_depan() {
        // "1.234" dengan "1" dihapus menjadi ".234": harus 234, bukan 0,234.
        assert_eq!(group_expr(".234"), "234");
        assert_eq!(lewat_kolom(".234"), Ok(234.0));
        assert_eq!(group_expr("1.234+.567"), "1.234+567");
        assert_eq!(group_expr(".234.567"), "234.567");
    }
}

#[cfg(test)]
mod ketik_tests {
    use super::reformat;

    fn vektor() -> serde_json::Value {
        serde_json::from_str(include_str!("../test-data/kalkulator-ketik.json")).unwrap()
    }
    fn angka(v: &serde_json::Value, k: &str) -> usize {
        v[k].as_u64().unwrap() as usize
    }

    /// Vektor yang sama dibaca tests/ui/kalkulator-ketik.cjs untuk versi JS: dua implementasi harus identik.
    #[test]
    fn vektor_bersama_dengan_js() {
        let v = vektor();
        let daftar = v["format"].as_array().unwrap();
        assert!(daftar.len() >= 20);
        for c in daftar {
            let raw = c["raw"].as_str().unwrap();
            let got = reformat(raw, angka(c, "caret"));
            let want = (c["text"].as_str().unwrap().to_string(), angka(c, "pos"));
            assert_eq!(got, want, "{} ({raw:?} @{})", c["nama"], c["caret"]);
        }
    }

    #[test]
    fn hasil_format_tidak_berubah_lagi() {
        // Syarat agar Dioxus tidak menulis ulang kolom (dan kursor tidak melompat) setelah menerima nilainya.
        for c in vektor()["format"].as_array().unwrap() {
            let text = c["text"].as_str().unwrap();
            let pos = angka(c, "pos");
            assert_eq!(
                reformat(text, pos),
                (text.to_string(), pos),
                "{}",
                c["nama"]
            );
        }
        let abjad: Vec<char> = "0123456789,.+-*/xX()% 00".chars().collect();
        let mut benih: u64 = 12345;
        let mut acak = move || {
            benih = (benih.wrapping_mul(1_103_515_245).wrapping_add(12345)) & 0x7fff_ffff;
            benih as f64 / 0x7fff_ffff as f64
        };
        for _ in 0..5000 {
            let panjang = 1 + (acak() * 14.0) as usize;
            let raw: String = (0..panjang)
                .map(|_| abjad[(acak() * abjad.len() as f64) as usize % abjad.len()])
                .collect();
            let caret = (acak() * (raw.chars().count() + 1) as f64) as usize;
            let a = reformat(&raw, caret);
            assert_eq!(reformat(&a.0, a.1), a, "{raw:?} @{caret}");
            assert!(a.1 <= a.0.chars().count(), "{raw:?} @{caret}");
        }
    }
}

#[component]
fn Calculator() -> Element {
    let mut app = use_context::<Signal<Session>>();
    let mut expr = use_signal(String::new);
    let mut note = use_signal(String::new);
    use_effect(move || {
        let _ = document::eval(DRAG_JS);
        let _ = document::eval(KETIK_JS);
        let _ = document::eval("setTimeout(function(){var i=document.querySelector('[data-calculator] input');i&&i.focus();},30)");
    });
    let hist = app.read().calc_hist.clone();
    let e = expr.read().clone();
    let res: Option<Result<f64, String>> = if e.trim().is_empty() {
        None
    } else {
        Some(calc(&from_display(&e)))
    };
    let current = res.as_ref().and_then(|r| r.as_ref().ok().copied());
    let mut commit = move || -> Option<f64> {
        let src = expr.read().clone();
        match calc(&from_display(&src)) {
            Ok(v) => {
                let mut s = app.write();
                s.calc_hist.insert(0, (src.trim().to_string(), v));
                s.calc_hist.truncate(10);
                note.set(String::new());
                Some(v)
            }
            Err(er) => {
                note.set(er);
                None
            }
        }
    };
    let press = move |k: &'static str| {
        spawn(async move {
            note.set(String::new());
            if k == "C" {
                expr.set(String::new());
                tulis_kolom("", 0);
                return;
            }
            if k == "=" {
                if let Some(v) = commit() {
                    let t = group_expr(&plain_num(v));
                    tulis_kolom(&t, t.chars().count());
                    expr.set(t);
                }
                return;
            }
            // teks dan kursor/seleksi diambil dari kolomnya sendiri (sumber kebenaran), supaya tombol
            // menyisipkan di tempat kursor berada
            let mut ev = document::eval(
                "var i=document.querySelector('[data-calculator] input');dioxus.send(i?[i.value,i.selectionStart==null?i.value.length:i.selectionStart,i.selectionEnd==null?i.value.length:i.selectionEnd]:['',0,0]);",
            );
            let Ok((cur_s, a, b)) = ev.recv::<(String, usize, usize)>().await else {
                return;
            };
            let (formatted, pos) = apply_key(&cur_s, Some(a), Some(b), k);
            tulis_kolom(&formatted, pos);
            expr.set(formatted);
        });
    };
    rsx! {
        div { role: "dialog", "aria-label": "Kalkulator", "data-calculator": true,
            class: "no-print fixed bottom-4 right-4 z-40 w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl ap-pop",
            onkeydown: move |ev| { if ev.key() == Key::Escape { ev.stop_propagation(); app.write().calc_open = false; } },
            div { class: "mb-2 flex cursor-move touch-none select-none items-center justify-between", "data-drag": true, title: "Tarik untuk menggeser (atau Alt + tombol panah)",
                h2 { class: "text-sm font-semibold", "Kalkulator" }
                div { class: "flex gap-1", button { class: "btn px-2 py-0.5 text-xs", "aria-label": "Tutup kalkulator", onclick: move |_| app.write().calc_open = false, "Tutup" } }
            }
            input { class: "w-full font-mono", "aria-label": "Ekspresi", placeholder: "mis. (120.000.000-12.000.000)÷5", spellcheck: false, autocomplete: "off",
                oninput: move |ev| {
                    let raw = ev.value();
                    let (text, _) = reformat(&raw, usize::MAX);
                    // cadangan bila pemformat di WebView (kalkulator-ketik.js) tidak aktif; biasanya sudah sama
                    if text != raw { tulis_kolom(&text, text.chars().count()); }
                    expr.set(text);
                    note.set(String::new());
                },
                onkeydown: move |ev| { if ev.key() == Key::Enter { ev.prevent_default(); press("="); } } }
            div { class: "mt-1 min-h-[2.5rem]", "aria-live": "polite",
                match &res {
                    None => rsx! { span { class: "text-xs text-slate-500", "Ketik angka; titik ribuan terisi otomatis (1.250.000). Koma = desimal. Kali: x atau *, bagi: /, persen: %." } },
                    Some(Ok(v)) => rsx! { span { class: "text-2xl font-semibold tabular-nums", "= {show_num(*v)}" } },
                    Some(Err(er)) => rsx! { span { class: "text-xs text-red-700", "{er}" } },
                }
            }
            div { class: "grid grid-cols-4 gap-1", role: "group", "aria-label": "Tombol angka",
                for (i, k) in KEYS.iter().flatten().enumerate() {
                    if k.is_empty() { span { key: "{i}" } }
                    else { button { key: "{i}", class: "btn justify-center px-0 py-1.5", onmousedown: move |ev| ev.prevent_default(), onclick: move |_| press(k), "{k}" } }
                }
            }
            div { class: "mt-2 flex flex-wrap gap-1",
                button { class: "btn text-xs", disabled: current.is_none(), onclick: move |_| {
                    if let Some(v) = current {
                        let t = plain_num(v);
                        let _ = document::eval(&format!("navigator.clipboard&&navigator.clipboard.writeText('{t}')"));
                        note.set("Hasil disalin.".into());
                    } }, "Salin hasil" }
                button { class: "btn text-xs", disabled: current.is_none(), onclick: move |_| async move {
                    if let Some(v) = current {
                        let n = v.round();
                        if !(0.0..=999_999_999_999_999.0).contains(&n) { note.set("Hanya hasil 0 sampai batas nominal yang bisa dimasukkan ke kolom.".into()); return; }
                        let mut ev = document::eval(&INSERT_JS.replace("__N__", &format!("{}", n as i64)));
                        let ok = ev.recv::<bool>().await.unwrap_or(false);
                        note.set(if ok { format!("Dimasukkan ke kolom nominal: {} (dibulatkan ke rupiah).", show_num(n)) } else { "Klik dulu kolom nominal di halaman, lalu tekan tombol ini.".into() });
                    } }, "Masukkan ke kolom nominal" }
            }
            p { role: "status", class: "mt-1 min-h-[1rem] text-xs text-slate-600", "{note}" }
            if !hist.is_empty() {
                div { class: "mt-1 border-t border-slate-200 pt-1",
                    div { class: "text-xs font-medium text-slate-500", "Riwayat" }
                    ul { class: "max-h-24 overflow-y-auto text-xs",
                        for (i, (ex, v)) in hist.into_iter().enumerate() {
                            li { key: "{i}", button { class: "w-full truncate text-left hover:underline", title: "{ex}", onclick: { let ex = ex.clone(); move |_| { let t = group_expr(&to_display(&ex)); tulis_kolom(&t, t.chars().count()); expr.set(t); } }, "{ex} = " b { "{show_num(v)}" } } }
                        }
                    }
                }
            }
        }
    }
}

// ---------- pencarian (padanan search.ts dan SearchDialog.tsx) ----------
#[derive(Clone)]
struct Entry {
    kind: &'static str,
    title: String,
    sub: String,
    href: String,
    hay: String,
}

fn clip(s: &str, n: usize) -> String {
    if s.chars().count() > n {
        format!("{}…", s.chars().take(n - 1).collect::<String>())
    } else {
        s.to_string()
    }
}

fn build_index() -> Vec<Entry> {
    let d = data();
    let mut out = vec![];
    let mut add = |kind: &'static str, title: String, sub: String, href: String, extra: &[&str]| {
        let hay = format!("{} {} {}", title, sub, extra.join(" ")).to_lowercase();
        out.push(Entry {
            kind,
            title,
            sub: clip(&sub, 110),
            href,
            hay,
        });
    };
    for t in &d.transactions {
        add(
            "Transaksi",
            format!("{}. {}", t.no, t.topic),
            t.narrative.clone(),
            format!("transaksi/{}", t.no),
            &[&t.party, &t.amount_info, &t.date, &t.level],
        );
    }
    for a in &d.coa {
        add(
            "Akun",
            format!("{} {}", a.code, a.name),
            format!(
                "{} · saldo normal {} · {}",
                a.kind, a.normal, a.report_class
            ),
            format!("buku-besar/{}", a.code),
            &[],
        );
    }
    for a in &d.adjustments {
        add(
            "Penyesuaian",
            format!("{} {}", a.code, a.category),
            a.facts.clone(),
            format!("penyesuaian/{}", a.code),
            &[&a.level],
        );
    }
    for s in &d.scenarios {
        add(
            "Skenario",
            format!("{}. {}", s.no, s.topic),
            s.question.clone(),
            "skenario".into(),
            &[&s.case_and_facts],
        );
    }
    for (rows, tab, kind) in [
        (&d.case.background, "profil", "Kasus"),
        (&d.case.policies, "kebijakan", "Kasus"),
        (&d.case.sak, "sak", "SAK"),
    ] {
        for r in rows.iter() {
            let c: Vec<String> = r.iter().flatten().map(|x| x.trim().to_string()).collect();
            if c.len() >= 2 {
                add(
                    kind,
                    c[0].clone(),
                    c[1..].join(" · "),
                    format!("kasus/{tab}"),
                    &[],
                );
            }
        }
    }
    out
}

fn run_search(index: &[Entry], q: &str) -> Vec<Entry> {
    let terms: Vec<String> = q
        .to_lowercase()
        .split_whitespace()
        .map(String::from)
        .collect();
    if terms.is_empty() {
        return vec![];
    }
    let mut sc: Vec<(i32, &Entry)> = index
        .iter()
        .filter(|e| terms.iter().all(|t| e.hay.contains(t.as_str())))
        .map(|e| {
            let title = e.title.to_lowercase();
            (
                terms
                    .iter()
                    .map(|t| {
                        if title.starts_with(t.as_str()) {
                            3
                        } else if title.contains(t.as_str()) {
                            2
                        } else {
                            0
                        }
                    })
                    .sum::<i32>(),
                e,
            )
        })
        .collect();
    sc.sort_by_key(|x| std::cmp::Reverse(x.0));
    sc.into_iter().take(30).map(|(_, e)| e.clone()).collect()
}

impl Session {
    /// Buka tujuan pencarian (href gaya versi 1).
    pub fn open_href(&mut self, href: &str) {
        let (head, tail) = href.split_once('/').unwrap_or((href, ""));
        self.go(href);
        match head {
            "buku-besar" => {
                self.gl_code = Some(tail.to_string());
            }
            "transaksi" => {
                if let Ok(n) = tail.parse::<usize>() {
                    if n >= 1 {
                        self.sel.insert("txn", n - 1);
                    }
                }
            }
            "penyesuaian" => {
                if let Some(i) = data().adjustments.iter().position(|a| a.code == tail) {
                    self.sel.insert("adj", i);
                }
            }
            "kasus" => {
                self.kasus_tab = match tail {
                    "profil" => 0,
                    "kebijakan" => 1,
                    "sak" => 4,
                    _ => 0,
                };
            }
            _ => {}
        }
        self.nonce += 1;
    }
}

#[component]
fn Search() -> Element {
    let mut app = use_context::<Signal<Session>>();
    let index = use_hook(build_index);
    let mut q = use_signal(String::new);
    let mut cur = use_signal(|| 0usize);
    let results = run_search(&index, &q.read());
    let n = results.len();
    use_effect(move || {
        let _ = document::eval("setTimeout(function(){var i=document.querySelector('[data-search] input');i&&i.focus();},30)");
    });
    let mut go = move |href: String| {
        let mut s = app.write();
        s.open_href(&href);
        s.search_open = false;
    };
    let hrefs: Vec<String> = results.iter().map(|r| r.href.clone()).collect();
    let empty = !q.read().trim().is_empty() && results.is_empty();
    let c = (*cur.read()).min(n.saturating_sub(1));
    rsx! {
        div { class: "no-print fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[10vh]", role: "presentation", onmousedown: move |_| app.write().search_open = false,
            div { role: "dialog", "aria-modal": "true", "aria-label": "Pencarian", "data-search": true, class: "ap-pop w-full max-w-2xl rounded-lg border border-slate-300 bg-white shadow-xl", onmousedown: move |e| e.stop_propagation(),
                input { class: "w-full rounded-b-none border-0 border-b border-slate-200 px-3 py-2.5 text-base focus:ring-0", "aria-label": "Cari", value: "{q}",
                    placeholder: "Cari transaksi, akun, penyesuaian, skenario, kebijakan, SAK…",
                    oninput: move |e| { q.set(e.value()); cur.set(0); },
                    onkeydown: { let hrefs = hrefs.clone(); move |e| match e.key() {
                        Key::Escape => app.write().search_open = false,
                        Key::ArrowDown => { e.prevent_default(); cur.set((c + 1).min(n.saturating_sub(1))); }
                        Key::ArrowUp => { e.prevent_default(); cur.set(c.saturating_sub(1)); }
                        Key::Enter => { e.prevent_default(); if let Some(h) = hrefs.get(c) { go(h.clone()); } }
                        _ => {}
                    } } }
                ul { class: "max-h-[60vh] overflow-auto", role: "listbox",
                    if empty { li { class: "px-3 py-2 text-sm text-slate-500", "Tidak ada hasil." } }
                    for (i, r) in results.into_iter().enumerate() {
                        li { key: "{r.href}:{r.title}", role: "option", "aria-selected": "{i == c}", class: if i == c { "cursor-pointer bg-blue-50 px-3 py-1.5 text-sm" } else { "cursor-pointer px-3 py-1.5 text-sm" },
                            onmouseenter: move |_| cur.set(i), onclick: { let h = r.href.clone(); move |_| go(h.clone()) },
                            span { class: "mr-2 rounded-sm bg-slate-100 px-1.5 py-0.5 text-xs uppercase tracking-wide text-slate-600", "{r.kind}" }
                            b { "{r.title}" }
                            div { class: "truncate text-xs text-slate-500", "{r.sub}" }
                        }
                    }
                }
                div { class: "border-t border-slate-200 px-3 py-1 text-xs text-slate-500", "↑↓ pilih · Enter buka · Esc tutup" }
            }
        }
    }
}

// ---------- pintasan (padanan Shortcuts.tsx) ----------
pub const SHORTCUTS: [(&str, &str); 8] = [
    ("Ctrl+K atau /", "Buka pencarian"),
    ("Ctrl+Z", "Urungkan"),
    ("Ctrl+Shift+Z atau Ctrl+Y", "Ulangi"),
    (
        "Ctrl+P",
        "Cetak halaman (atau Simpan PDF dari tombol di halaman laporan)",
    ),
    ("Alt+C", "Buka atau tutup kalkulator"),
    (
        "Alt+F",
        "Mode fokus: sembunyikan menu dan perbesar tampilan",
    ),
    ("?", "Tampilkan daftar pintasan ini"),
    ("Esc", "Tutup dialog"),
];

#[component]
pub fn ShortcutList() -> Element {
    rsx! {
        dl { class: "grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm",
            for (k, d) in SHORTCUTS.iter() { div { key: "{k}", class: "contents", dt { kbd { class: "rounded-sm border border-slate-300 bg-white px-1.5 text-xs", "{k}" } } dd { "{d}" } } }
        }
    }
}

#[component]
fn ShortcutDialog() -> Element {
    let mut app = use_context::<Signal<Session>>();
    rsx! {
        div { class: "no-print fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[10vh]", role: "presentation", onmousedown: move |_| app.write().help_open = false,
            div { role: "dialog", "aria-modal": "true", "aria-label": "Pintasan keyboard", class: "ap-pop w-full max-w-lg rounded-lg border border-slate-300 bg-white p-4 shadow-xl", onmousedown: move |e| e.stop_propagation(),
                h2 { class: "mb-2 font-semibold", "Pintasan keyboard" }
                ShortcutList {}
                button { class: "btn mt-3", onclick: move |_| app.write().help_open = false, "Tutup" }
            }
        }
    }
}

const KEYS_JS: &str = r#"
window.__dkSend=function(m){dioxus.send(m);};
if(!window.__dkKeys){window.__dkKeys=true;
 document.addEventListener('focusin',function(e){var t=e.target;if(t instanceof HTMLInputElement&&t.inputMode==='numeric'&&!t.closest('[data-calculator]'))window.__dkLast=t;});
 (function(){
  var anim=new WeakMap(),reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  function stop(t,reset){var a=anim.get(t);if(a){a.stop=true;if(a.raf)cancelAnimationFrame(a.raf);if(a.to)clearTimeout(a.to);anim.delete(t);}if(reset)t.scrollLeft=0;}
  function start(t){
   stop(t,false);var max=t.scrollWidth-t.clientWidth;if(max<=1)return;
   if(reduce){t.scrollLeft=max;return;}
   var a={stop:false};anim.set(t,a);var dur=Math.max(1200,max/0.06);
   function run(dir){var t0=null;function step(ts){if(a.stop)return;if(t0===null)t0=ts;var p=Math.min(1,(ts-t0)/dur);t.scrollLeft=(dir>0?p:1-p)*max;
     if(p<1){a.raf=requestAnimationFrame(step);}else{a.to=setTimeout(function(){if(!a.stop)run(-dir);},700);}}
    a.raf=requestAnimationFrame(step);}
   a.to=setTimeout(function(){if(!a.stop)run(1);},350);
  }
  function m(e){var t=e.target;return t&&t.matches&&t.matches('[data-marquee]')?t:null;}
  document.addEventListener('mouseover',function(e){var t=m(e);if(t&&document.activeElement!==t)start(t);});
  document.addEventListener('mouseout',function(e){var t=m(e);if(t&&document.activeElement!==t)stop(t,true);});
  document.addEventListener('focusin',function(e){var t=m(e);if(t)stop(t,false);});
  document.addEventListener('keydown',function(e){var t=m(e);if(t)stop(t,false);},true);
  document.addEventListener('focusout',function(e){var t=m(e);if(t){stop(t,false);setTimeout(function(){t.scrollLeft=0;},0);}});
 })();
 window.addEventListener('keydown',function(e){
  var el=e.target,tag=el&&el.tagName,typing=tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT',mod=e.ctrlKey||e.metaKey;
  if(document.querySelector('[data-splash]'))return;
  if(e.key==='Escape'){window.__dkSend('esc');}
  var cell=el&&el.hasAttribute&&el.hasAttribute('data-cell');
  var nativeText=tag==='TEXTAREA'||tag==='SELECT'||(tag==='INPUT'&&!cell);
  if(e.key==='Tab'){var dlg=document.querySelector('[aria-modal="true"]');if(dlg){var f=Array.prototype.filter.call(dlg.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'),function(x){return x.offsetParent!==null;});if(f.length){var first=f[0],last=f[f.length-1];if(!dlg.contains(document.activeElement)){e.preventDefault();first.focus();}else if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}}
  if(mod&&!nativeText&&!(el&&el.closest&&el.closest('[role=dialog]'))&&(e.key==='z'||e.key==='Z'||e.key==='y')){e.preventDefault();window.__dkSend((e.key==='y'||e.shiftKey)?'redo':'undo');return;}
  if(e.altKey&&!mod&&(e.key==='c'||e.key==='C')){e.preventDefault();window.__dkSend('calc');return;}
  if(e.altKey&&!mod&&(e.key==='f'||e.key==='F')){e.preventDefault();window.__dkSend('focus');return;}
  if(e.key==='?'&&!typing&&!mod){e.preventDefault();window.__dkSend('help');return;}
  if((e.key==='k'&&mod)||(e.key==='/'&&!typing)){e.preventDefault();window.__dkSend('search');}
 });}
"#;

#[component]
pub fn Overlays() -> Element {
    let mut app = use_context::<Signal<Session>>();
    use_future(move || async move {
        let mut ev = document::eval(KEYS_JS);
        while let Ok(m) = ev.recv::<String>().await {
            let mut s = app.write();
            match m.as_str() {
                "undo" => s.undo(),
                "redo" => s.redo(),
                "calc" => s.calc_open = !s.calc_open,
                "focus" => s.focus = !s.focus,
                "help" => s.help_open = true,
                "search" => {
                    s.search_open = !s.search_open;
                }
                "esc" if s.help_open => s.help_open = false,
                "esc" if s.focus && !s.calc_open && !s.search_open => s.focus = false,
                _ => {}
            }
        }
    });
    let toast = app.read().toast.as_ref().map(|t| t.0.clone());
    let mut tick = use_signal(|| 0u32);
    use_future(move || async move {
        loop {
            tokio::time::sleep(std::time::Duration::from_millis(500)).await;
            tick += 1;
        }
    });
    let _ = tick();
    {
        let exp = app
            .read()
            .toast
            .as_ref()
            .is_some_and(|t| t.1.elapsed().as_secs() >= 4);
        if exp {
            app.write().toast = None;
        }
    }
    let (calc_open, search_open, help) = {
        let s = app.read();
        (s.calc_open, s.search_open, s.help_open)
    };
    rsx! {
        if let Some(t) = toast { div { class: "no-print ap-pop fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full border-2 border-slate-900 bg-white px-5 py-2 text-sm font-medium shadow-[3px_3px_0_var(--neo-shadow)]", role: "status", "{t}" } }
        if calc_open { Calculator {} }
        if search_open { Search {} }
        if help { ShortcutDialog {} }
    }
}
