//! Padanan fungsi Excel yang dipakai rumus laporan. Murni.
use crate::types::{Row, Val};

/// Excel ROUND: setengah menjauhi nol. Setara `xround` TS (membulatkan ke 15 digit signifikan lebih dulu).
pub fn xround(x: f64, digits: f64) -> f64 {
    if !x.is_finite() {
        return x;
    }
    let f = 10f64.powf(digits);
    let y = x.abs() * f;
    let y15: f64 = format!("{:.14e}", y).parse().unwrap_or(y);
    let fl = y15.floor();
    let r = if y15 - fl >= 0.5 { fl + 1.0 } else { fl }; // Math.round untuk nilai >= 0
    let sign = if x > 0.0 {
        1.0
    } else if x < 0.0 {
        -1.0
    } else {
        0.0
    };
    let out = sign * r / f;
    if out == 0.0 {
        0.0
    } else {
        out
    }
}

/// IFERROR(a/b, default): pembagi nol atau hasil tak terhingga memakai nilai bawaan.
pub fn iferror_div(a: f64, b: f64, default: f64) -> f64 {
    if b == 0.0 {
        return default;
    }
    let v = a / b;
    if v.is_finite() {
        v
    } else {
        default
    }
}

pub fn sum(xs: &[f64]) -> f64 {
    xs.iter().sum()
}

fn js_num_string(n: f64) -> String {
    if n.fract() == 0.0 && n.abs() < 1e21 {
        format!("{}", n as i64)
    } else {
        format!("{n}")
    }
}

/// Kriteria teks SUMIFS: sama dengan tanpa membedakan huruf besar/kecil; `*` dan `?` sebagai wildcard.
fn crit_matches(crit: &str, cell: Option<&Val>) -> bool {
    let text = match cell {
        None => String::new(),
        Some(Val::S(s)) => s.clone(),
        Some(Val::N(n)) => js_num_string(*n),
    };
    if cell.is_none() {
        return crit.is_empty();
    }
    wildcard(
        &crit.to_lowercase().chars().collect::<Vec<_>>(),
        &text.to_lowercase().chars().collect::<Vec<_>>(),
    )
}

fn wildcard(p: &[char], t: &[char]) -> bool {
    match p.first() {
        None => t.is_empty(),
        Some('*') => (0..=t.len()).any(|i| wildcard(&p[1..], &t[i..])),
        Some('?') => !t.is_empty() && wildcard(&p[1..], &t[1..]),
        Some(c) => t.first() == Some(c) && wildcard(&p[1..], &t[1..]),
    }
}

/// SUMIFS(sumCol, [kolom, kriteria]...) atas satu tabel. Hanya sel angka yang dijumlahkan.
pub fn sumifs(table: &[Row], sum_col: char, criteria: &[(char, &str)]) -> f64 {
    let mut total = 0.0;
    for row in table {
        if criteria
            .iter()
            .all(|(col, crit)| crit_matches(crit, row.get(col)))
        {
            if let Some(Val::N(v)) = row.get(&sum_col) {
                total += v;
            }
        }
    }
    total
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn xround_menjauhi_nol() {
        assert_eq!(xround(2.5, 0.0), 3.0);
        assert_eq!(xround(-2.5, 0.0), -3.0);
        assert_eq!(xround(0.4, 0.0), 0.0);
        assert_eq!(xround(1.005, 2.0), 1.01);
        assert_eq!(xround(-0.0001, 0.0), 0.0);
        assert!(xround(f64::NAN, 0.0).is_nan());
    }
    #[test]
    fn iferror_div_nol() {
        assert_eq!(iferror_div(1.0, 0.0, 7.0), 7.0);
        assert_eq!(iferror_div(6.0, 3.0, 7.0), 2.0);
    }
}
