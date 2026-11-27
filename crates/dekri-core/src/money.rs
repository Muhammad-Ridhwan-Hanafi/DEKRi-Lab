//! Format dan baca angka rupiah. Setara src/engine/money.ts.

/// Batas nominal per sel: 10 triliun rupiah (sama dengan pembersihan data cadangan).
pub const MAX_RUPIAH: f64 = 10_000_000_000_000.0;

/// 1234567 -> "1.234.567"; negatif -> "(1.234.567)" bila `accounting`, selain itu "-1.234.567".
pub fn format_rupiah(n: f64, accounting: bool) -> String {
    let digits = (n.abs().round() as u64).to_string();
    let mut s = String::new();
    for (i, c) in digits.chars().enumerate() {
        if i > 0 && (digits.len() - i) % 3 == 0 {
            s.push('.');
        }
        s.push(c);
    }
    if n < 0.0 && n.round() != 0.0 {
        if accounting {
            format!("({s})")
        } else {
            format!("-{s}")
        }
    } else {
        s
    }
}

/// Baca isian pengguna: "1.250.000", "1250000", "1,250,000" -> 1250000. Kosong/tidak valid -> 0.
/// Hanya tanda minus di depan yang dihormati; angka melebihi MAX_RUPIAH dibatasi.
pub fn parse_rupiah(input: &str) -> f64 {
    let negative = input.trim().starts_with('-');
    let digits: String = input.chars().filter(char::is_ascii_digit).collect();
    if digits.is_empty() {
        return 0.0;
    }
    let head: String = digits.chars().take(16).collect();
    let n = head.parse::<f64>().unwrap_or(0.0).min(MAX_RUPIAH);
    if negative {
        -n
    } else {
        n
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn format_dan_baca() {
        assert_eq!(format_rupiah(1234567.0, false), "1.234.567");
        assert_eq!(format_rupiah(-1234567.0, true), "(1.234.567)");
        assert_eq!(format_rupiah(-1500.0, false), "-1.500");
        assert_eq!(format_rupiah(0.0, true), "0");
        assert_eq!(parse_rupiah("1.250.000"), 1250000.0);
        assert_eq!(parse_rupiah("1,250,000"), 1250000.0);
        assert_eq!(parse_rupiah("-5.000"), -5000.0);
        assert_eq!(parse_rupiah("abc"), 0.0);
        assert_eq!(parse_rupiah("99999999999999999999"), MAX_RUPIAH);
    }
}
