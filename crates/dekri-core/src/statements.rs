// GENERATED oleh tools/gen_statements_rs.py dari src/engine/statements.generated.ts. Jangan edit manual.
// Setiap sel = terjemahan 1:1 dari rumus Excel.
#![allow(non_snake_case, unused_parens, clippy::all)]
use crate::excel::{iferror_div, sum, sumifs, xround};
use crate::types::{Cell, StatementCells, Tables};

pub fn compute_statements(t: &Tables) -> StatementCells {
    let S12_B6: f64 =
        (-(sumifs(&t.atb, 'D', &[('A', "4-1000")]) - sumifs(&t.atb, 'E', &[('A', "4-1000")])));
    let S12_B7: f64 =
        (sumifs(&t.atb, 'D', &[('A', "4-1100")]) - sumifs(&t.atb, 'E', &[('A', "4-1100")]));
    let S12_B8: f64 =
        (sumifs(&t.atb, 'D', &[('A', "4-1200")]) - sumifs(&t.atb, 'E', &[('A', "4-1200")]));
    let S12_B9: f64 = ((S12_B6 - S12_B7) - S12_B8);
    let S12_B10: f64 =
        (-(sumifs(&t.atb, 'D', &[('A', "4-2000")]) - sumifs(&t.atb, 'E', &[('A', "4-2000")])));
    let S12_B11: f64 = (S12_B9 + S12_B10);
    let S12_B13: f64 =
        (sumifs(&t.atb, 'D', &[('A', "5-1000")]) - sumifs(&t.atb, 'E', &[('A', "5-1000")]));
    let S12_B14: f64 = (S12_B11 - S12_B13);
    let S12_B17: f64 =
        (sumifs(&t.atb, 'D', &[('A', "6-1000")]) - sumifs(&t.atb, 'E', &[('A', "6-1000")]));
    let S12_B18: f64 =
        (sumifs(&t.atb, 'D', &[('A', "6-1100")]) - sumifs(&t.atb, 'E', &[('A', "6-1100")]));
    let S12_B19: f64 =
        (sumifs(&t.atb, 'D', &[('A', "6-1200")]) - sumifs(&t.atb, 'E', &[('A', "6-1200")]));
    let S12_B20: f64 =
        (sumifs(&t.atb, 'D', &[('A', "6-1300")]) - sumifs(&t.atb, 'E', &[('A', "6-1300")]));
    let S12_B21: f64 =
        (sumifs(&t.atb, 'D', &[('A', "6-1400")]) - sumifs(&t.atb, 'E', &[('A', "6-1400")]));
    let S12_B22: f64 =
        (sumifs(&t.atb, 'D', &[('A', "6-1500")]) - sumifs(&t.atb, 'E', &[('A', "6-1500")]));
    let S12_B23: f64 =
        (sumifs(&t.atb, 'D', &[('A', "6-1600")]) - sumifs(&t.atb, 'E', &[('A', "6-1600")]));
    let S12_B24: f64 =
        (sumifs(&t.atb, 'D', &[('A', "6-1700")]) - sumifs(&t.atb, 'E', &[('A', "6-1700")]));
    let S12_B25: f64 =
        (sumifs(&t.atb, 'D', &[('A', "6-1750")]) - sumifs(&t.atb, 'E', &[('A', "6-1750")]));
    let S12_B26: f64 =
        (sumifs(&t.atb, 'D', &[('A', "6-1800")]) - sumifs(&t.atb, 'E', &[('A', "6-1800")]));
    let S12_B27: f64 =
        (sumifs(&t.atb, 'D', &[('A', "6-1900")]) - sumifs(&t.atb, 'E', &[('A', "6-1900")]));
    let S12_B28: f64 =
        (sumifs(&t.atb, 'D', &[('A', "6-2000")]) - sumifs(&t.atb, 'E', &[('A', "6-2000")]));
    let S12_B29: f64 =
        (sumifs(&t.atb, 'D', &[('A', "6-2100")]) - sumifs(&t.atb, 'E', &[('A', "6-2100")]));
    let S12_B30: f64 =
        (sumifs(&t.atb, 'D', &[('A', "6-2200")]) - sumifs(&t.atb, 'E', &[('A', "6-2200")]));
    let S12_B31: f64 =
        (sumifs(&t.atb, 'D', &[('A', "6-2300")]) - sumifs(&t.atb, 'E', &[('A', "6-2300")]));
    let S12_B32: f64 =
        (sumifs(&t.atb, 'D', &[('A', "6-2400")]) - sumifs(&t.atb, 'E', &[('A', "6-2400")]));
    let S12_B33: f64 =
        (sumifs(&t.atb, 'D', &[('A', "6-2500")]) - sumifs(&t.atb, 'E', &[('A', "6-2500")]));
    let S12_B34: f64 =
        (sumifs(&t.atb, 'D', &[('A', "6-2600")]) - sumifs(&t.atb, 'E', &[('A', "6-2600")]));
    let S12_B35: f64 = sum(&[
        S12_B17, S12_B18, S12_B19, S12_B20, S12_B21, S12_B22, S12_B23, S12_B24, S12_B25, S12_B26,
        S12_B27, S12_B28, S12_B29, S12_B30, S12_B31, S12_B32, S12_B33, S12_B34,
    ]);
    let S12_B36: f64 = (S12_B14 - S12_B35);
    let S12_B39: f64 =
        (-(sumifs(&t.atb, 'D', &[('A', "4-8000")]) - sumifs(&t.atb, 'E', &[('A', "4-8000")])));
    let S12_B40: f64 =
        (-(sumifs(&t.atb, 'D', &[('A', "4-8100")]) - sumifs(&t.atb, 'E', &[('A', "4-8100")])));
    let S12_B41: f64 =
        (-(sumifs(&t.atb, 'D', &[('A', "4-8200")]) - sumifs(&t.atb, 'E', &[('A', "4-8200")])));
    let S12_B42: f64 =
        (-(sumifs(&t.atb, 'D', &[('A', "4-8300")]) - sumifs(&t.atb, 'E', &[('A', "4-8300")])));
    let S12_B43: f64 =
        (-(sumifs(&t.atb, 'D', &[('A', "4-8400")]) - sumifs(&t.atb, 'E', &[('A', "4-8400")])));
    let S12_B44: f64 =
        (-(sumifs(&t.atb, 'D', &[('A', "4-8500")]) - sumifs(&t.atb, 'E', &[('A', "4-8500")])));
    let S12_B45: f64 =
        (-(sumifs(&t.atb, 'D', &[('A', "7-1000")]) - sumifs(&t.atb, 'E', &[('A', "7-1000")])));
    let S12_B46: f64 =
        (-(sumifs(&t.atb, 'D', &[('A', "7-1100")]) - sumifs(&t.atb, 'E', &[('A', "7-1100")])));
    let S12_B47: f64 = sum(&[
        S12_B39, S12_B40, S12_B41, S12_B42, S12_B43, S12_B44, S12_B45, S12_B46,
    ]);
    let S12_B48: f64 = (S12_B36 + S12_B47);
    let S12_B50: f64 =
        (sumifs(&t.atb, 'D', &[('A', "7-1200")]) - sumifs(&t.atb, 'E', &[('A', "7-1200")]));
    let S12_B51: f64 =
        (sumifs(&t.atb, 'D', &[('A', "7-1300")]) - sumifs(&t.atb, 'E', &[('A', "7-1300")]));
    let S12_B52: f64 = (S12_B50 + S12_B51);
    let S12_B53: f64 = (S12_B48 - S12_B52);
    let S12_B56: f64 = 0.0;
    let S12_B57: f64 = (S12_B53 + S12_B56);
    let S12_B60: f64 = iferror_div(S12_B14, S12_B11, 0.0);
    let S12_B61: f64 = iferror_div(S12_B36, S12_B11, 0.0);
    let S12_B62: f64 = iferror_div(S12_B53, S12_B11, 0.0);
    let S12_B63: f64 = iferror_div(S12_B52, S12_B48, 0.0);
    let S12A_B6: f64 = S12_B9;
    let S12A_B7: f64 = S12_B10;
    let S12A_B8: f64 = (S12A_B6 + S12A_B7);
    let S12A_B9: f64 = S12_B13;
    let S12A_B10: f64 = (S12A_B8 - S12A_B9);
    let S12A_B11: f64 = S12_B17;
    let S12A_B12: f64 = S12_B18;
    let S12A_B13: f64 = S12_B19;
    let S12A_B14: f64 = S12_B20;
    let S12A_B15: f64 = S12_B21;
    let S12A_B16: f64 = S12_B22;
    let S12A_B17: f64 = S12_B23;
    let S12A_B18: f64 = S12_B24;
    let S12A_B19: f64 = S12_B25;
    let S12A_B20: f64 = S12_B26;
    let S12A_B21: f64 = S12_B27;
    let S12A_B22: f64 = S12_B28;
    let S12A_B23: f64 = S12_B29;
    let S12A_B24: f64 = S12_B30;
    let S12A_B25: f64 = S12_B31;
    let S12A_B26: f64 = S12_B32;
    let S12A_B27: f64 = S12_B33;
    let S12A_B28: f64 = (-((S12_B41 + S12_B44) + S12_B46));
    let S12A_B29: f64 = ((S12A_B10
        - sum(&[
            S12A_B11, S12A_B12, S12A_B13, S12A_B14, S12A_B15, S12A_B16, S12A_B17, S12A_B18,
            S12A_B19, S12A_B20, S12A_B21, S12A_B22, S12A_B23, S12A_B24, S12A_B25, S12A_B26,
            S12A_B27,
        ]))
        - S12A_B28);
    let S12A_B32: f64 = S12_B39;
    let S12A_B33: f64 = S12_B40;
    let S12A_B34: f64 = S12_B42;
    let S12A_B35: f64 = S12_B43;
    let S12A_B36: f64 = (-S12_B34);
    let S12A_B37: f64 = sum(&[S12A_B32, S12A_B33, S12A_B34, S12A_B35, S12A_B36]);
    let S12A_B38: f64 = (S12A_B29 + S12A_B37);
    let S12A_B41: f64 = (-S12_B45);
    let S12A_B42: f64 = (S12A_B38 - S12A_B41);
    let S12A_B45: f64 = S12_B52;
    let S12A_B46: f64 = (S12A_B42 - S12A_B45);
    let S12A_B47: String = if xround((S12A_B46 - S12_B53), 0.0) == 0.0 {
        "SAMA - hanya reklasifikasi".to_string()
    } else {
        "BEDA - periksa".to_string()
    };
    let S12A_B50: f64 = S12_B36;
    let S12A_B51: f64 = (S12_B41 + S12_B44);
    let S12A_B52: f64 = S12_B46;
    let S12A_B53: f64 = S12_B34;
    let S12A_B54: f64 = sum(&[S12A_B50, S12A_B51, S12A_B52, S12A_B53]);
    let S12A_B55: String = if xround((S12A_B54 - S12A_B29), 0.0) == 0.0 {
        "SAMA".to_string()
    } else {
        "BEDA - periksa".to_string()
    };
    let S12A_B58: f64 = 0.0;
    let S12A_B59: f64 = 0.0;
    let S12A_B60: f64 = 0.0;
    let S12A_B61: f64 = 0.0;
    let S12A_B62: f64 = sumifs(&t.adj, 'G', &[('A', "AJ19"), ('E', "5-1000")]);
    let S13_B5: f64 =
        (-(sumifs(&t.ob, 'C', &[('A', "3-1000")]) - sumifs(&t.ob, 'D', &[('A', "3-1000")])));
    let S13_C5: f64 =
        (-(sumifs(&t.ob, 'C', &[('A', "3-1100")]) - sumifs(&t.ob, 'D', &[('A', "3-1100")])));
    let S13_D5: f64 =
        (-(sumifs(&t.ob, 'C', &[('A', "3-2000")]) - sumifs(&t.ob, 'D', &[('A', "3-2000")])));
    let S13_E5: f64 = sum(&[S13_B5, S13_C5, S13_D5]);
    let S13_B6: f64 = ((-(sumifs(&t.atb, 'D', &[('A', "3-1000")])
        - sumifs(&t.atb, 'E', &[('A', "3-1000")])))
        - S13_B5);
    let S13_C6: f64 = 0.0;
    let S13_D6: f64 = 0.0;
    let S13_E6: f64 = sum(&[S13_B6, S13_C6, S13_D6]);
    let S13_B7: f64 = 0.0;
    let S13_C7: f64 = 0.0;
    let S13_D7: f64 = S12_B53;
    let S13_E7: f64 = sum(&[S13_B7, S13_C7, S13_D7]);
    let S13_B8: f64 = 0.0;
    let S13_C8: f64 = 0.0;
    let S13_D8: f64 =
        (-(sumifs(&t.atb, 'D', &[('A', "3-9000")]) - sumifs(&t.atb, 'E', &[('A', "3-9000")])));
    let S13_E8: f64 = sum(&[S13_B8, S13_C8, S13_D8]);
    let S13_B9: f64 = sum(&[S13_B5, S13_B6, S13_B7, S13_B8]);
    let S13_C9: f64 = sum(&[S13_C5, S13_C6, S13_C7, S13_C8]);
    let S13_D9: f64 = sum(&[S13_D5, S13_D6, S13_D7, S13_D8]);
    let S13_E9: f64 = sum(&[S13_E5, S13_E6, S13_E7, S13_E8]);
    let S13_B12: String = if xround(
        (S13_B9
            - (-(sumifs(&t.atb, 'D', &[('A', "3-1000")])
                - sumifs(&t.atb, 'E', &[('A', "3-1000")])))),
        0.0,
    ) == 0.0
    {
        "BENAR - sesuai ATB".to_string()
    } else {
        "PERIKSA - selisih dengan ATB".to_string()
    };
    let S13_B13: String = if xround(
        (S13_C9
            - (-(sumifs(&t.atb, 'D', &[('A', "3-1100")])
                - sumifs(&t.atb, 'E', &[('A', "3-1100")])))),
        0.0,
    ) == 0.0
    {
        "BENAR - sesuai ATB".to_string()
    } else {
        "PERIKSA - selisih dengan ATB".to_string()
    };
    let S13_B14: String = if xround(
        (S13_D9
            - (((-(sumifs(&t.atb, 'D', &[('A', "3-2000")])
                - sumifs(&t.atb, 'E', &[('A', "3-2000")])))
                + S12_B53)
                - (sumifs(&t.atb, 'D', &[('A', "3-9000")])
                    - sumifs(&t.atb, 'E', &[('A', "3-9000")])))),
        0.0,
    ) == 0.0
    {
        "BENAR - sesuai ATB".to_string()
    } else {
        "PERIKSA - selisih dengan ATB".to_string()
    };
    let S14_B6: f64 = (((sumifs(&t.atb, 'D', &[('A', "1-1000")])
        - sumifs(&t.atb, 'E', &[('A', "1-1000")]))
        + (sumifs(&t.atb, 'D', &[('A', "1-1100")]) - sumifs(&t.atb, 'E', &[('A', "1-1100")])))
        + (sumifs(&t.atb, 'D', &[('A', "1-1150")]) - sumifs(&t.atb, 'E', &[('A', "1-1150")])));
    let S14_C6: f64 = (((sumifs(&t.ob, 'C', &[('A', "1-1000")])
        - sumifs(&t.ob, 'D', &[('A', "1-1000")]))
        + (sumifs(&t.ob, 'C', &[('A', "1-1100")]) - sumifs(&t.ob, 'D', &[('A', "1-1100")])))
        + (sumifs(&t.ob, 'C', &[('A', "1-1150")]) - sumifs(&t.ob, 'D', &[('A', "1-1150")])));
    let S14_B7: f64 = (((sumifs(&t.atb, 'D', &[('A', "1-1200")])
        - sumifs(&t.atb, 'E', &[('A', "1-1200")]))
        + (sumifs(&t.atb, 'D', &[('A', "1-1210")]) - sumifs(&t.atb, 'E', &[('A', "1-1210")])))
        + (sumifs(&t.atb, 'D', &[('A', "1-1900")]) - sumifs(&t.atb, 'E', &[('A', "1-1900")])));
    let S14_C7: f64 = (((sumifs(&t.ob, 'C', &[('A', "1-1200")])
        - sumifs(&t.ob, 'D', &[('A', "1-1200")]))
        + (sumifs(&t.ob, 'C', &[('A', "1-1210")]) - sumifs(&t.ob, 'D', &[('A', "1-1210")])))
        + (sumifs(&t.ob, 'C', &[('A', "1-1900")]) - sumifs(&t.ob, 'D', &[('A', "1-1900")])));
    let S14_B8: f64 = ((sumifs(&t.atb, 'D', &[('A', "1-1300")])
        - sumifs(&t.atb, 'E', &[('A', "1-1300")]))
        + (sumifs(&t.atb, 'D', &[('A', "1-1310")]) - sumifs(&t.atb, 'E', &[('A', "1-1310")])));
    let S14_C8: f64 = ((sumifs(&t.ob, 'C', &[('A', "1-1300")])
        - sumifs(&t.ob, 'D', &[('A', "1-1300")]))
        + (sumifs(&t.ob, 'C', &[('A', "1-1310")]) - sumifs(&t.ob, 'D', &[('A', "1-1310")])));
    let S14_B9: f64 =
        (sumifs(&t.atb, 'D', &[('A', "1-1400")]) - sumifs(&t.atb, 'E', &[('A', "1-1400")]));
    let S14_C9: f64 =
        (sumifs(&t.ob, 'C', &[('A', "1-1400")]) - sumifs(&t.ob, 'D', &[('A', "1-1400")]));
    let S14_B10: f64 =
        (sumifs(&t.atb, 'D', &[('A', "1-1500")]) - sumifs(&t.atb, 'E', &[('A', "1-1500")]));
    let S14_C10: f64 =
        (sumifs(&t.ob, 'C', &[('A', "1-1500")]) - sumifs(&t.ob, 'D', &[('A', "1-1500")]));
    let S14_B11: f64 = ((sumifs(&t.atb, 'D', &[('A', "1-1600")])
        - sumifs(&t.atb, 'E', &[('A', "1-1600")]))
        + (sumifs(&t.atb, 'D', &[('A', "1-1700")]) - sumifs(&t.atb, 'E', &[('A', "1-1700")])));
    let S14_C11: f64 = ((sumifs(&t.ob, 'C', &[('A', "1-1600")])
        - sumifs(&t.ob, 'D', &[('A', "1-1600")]))
        + (sumifs(&t.ob, 'C', &[('A', "1-1700")]) - sumifs(&t.ob, 'D', &[('A', "1-1700")])));
    let S14_B12: f64 =
        (sumifs(&t.atb, 'D', &[('A', "1-1800")]) - sumifs(&t.atb, 'E', &[('A', "1-1800")]));
    let S14_C12: f64 =
        (sumifs(&t.ob, 'C', &[('A', "1-1800")]) - sumifs(&t.ob, 'D', &[('A', "1-1800")]));
    let S14_B13: f64 =
        (sumifs(&t.atb, 'D', &[('A', "1-2900")]) - sumifs(&t.atb, 'E', &[('A', "1-2900")]));
    let S14_C13: f64 =
        (sumifs(&t.ob, 'C', &[('A', "1-2900")]) - sumifs(&t.ob, 'D', &[('A', "1-2900")]));
    let S14_B14: f64 =
        (sumifs(&t.atb, 'D', &[('A', "1-2950")]) - sumifs(&t.atb, 'E', &[('A', "1-2950")]));
    let S14_C14: f64 =
        (sumifs(&t.ob, 'C', &[('A', "1-2950")]) - sumifs(&t.ob, 'D', &[('A', "1-2950")]));
    let S14_B15: f64 = sum(&[
        S14_B6, S14_B7, S14_B8, S14_B9, S14_B10, S14_B11, S14_B12, S14_B13, S14_B14,
    ]);
    let S14_C15: f64 = sum(&[
        S14_C6, S14_C7, S14_C8, S14_C9, S14_C10, S14_C11, S14_C12, S14_C13, S14_C14,
    ]);
    let S14_B18: f64 =
        (sumifs(&t.atb, 'D', &[('A', "1-2100")]) - sumifs(&t.atb, 'E', &[('A', "1-2100")]));
    let S14_C18: f64 =
        (sumifs(&t.ob, 'C', &[('A', "1-2100")]) - sumifs(&t.ob, 'D', &[('A', "1-2100")]));
    let S14_B19: f64 = ((sumifs(&t.atb, 'D', &[('A', "1-2200")])
        - sumifs(&t.atb, 'E', &[('A', "1-2200")]))
        + (sumifs(&t.atb, 'D', &[('A', "1-2210")]) - sumifs(&t.atb, 'E', &[('A', "1-2210")])));
    let S14_C19: f64 = ((sumifs(&t.ob, 'C', &[('A', "1-2200")])
        - sumifs(&t.ob, 'D', &[('A', "1-2200")]))
        + (sumifs(&t.ob, 'C', &[('A', "1-2210")]) - sumifs(&t.ob, 'D', &[('A', "1-2210")])));
    let S14_B20: f64 = ((sumifs(&t.atb, 'D', &[('A', "1-2300")])
        - sumifs(&t.atb, 'E', &[('A', "1-2300")]))
        + (sumifs(&t.atb, 'D', &[('A', "1-2310")]) - sumifs(&t.atb, 'E', &[('A', "1-2310")])));
    let S14_C20: f64 = ((sumifs(&t.ob, 'C', &[('A', "1-2300")])
        - sumifs(&t.ob, 'D', &[('A', "1-2300")]))
        + (sumifs(&t.ob, 'C', &[('A', "1-2310")]) - sumifs(&t.ob, 'D', &[('A', "1-2310")])));
    let S14_B21: f64 = ((sumifs(&t.atb, 'D', &[('A', "1-2400")])
        - sumifs(&t.atb, 'E', &[('A', "1-2400")]))
        + (sumifs(&t.atb, 'D', &[('A', "1-2410")]) - sumifs(&t.atb, 'E', &[('A', "1-2410")])));
    let S14_C21: f64 = ((sumifs(&t.ob, 'C', &[('A', "1-2400")])
        - sumifs(&t.ob, 'D', &[('A', "1-2400")]))
        + (sumifs(&t.ob, 'C', &[('A', "1-2410")]) - sumifs(&t.ob, 'D', &[('A', "1-2410")])));
    let S14_B22: f64 = ((sumifs(&t.atb, 'D', &[('A', "1-2500")])
        - sumifs(&t.atb, 'E', &[('A', "1-2500")]))
        + (sumifs(&t.atb, 'D', &[('A', "1-2510")]) - sumifs(&t.atb, 'E', &[('A', "1-2510")])));
    let S14_C22: f64 = ((sumifs(&t.ob, 'C', &[('A', "1-2500")])
        - sumifs(&t.ob, 'D', &[('A', "1-2500")]))
        + (sumifs(&t.ob, 'C', &[('A', "1-2510")]) - sumifs(&t.ob, 'D', &[('A', "1-2510")])));
    let S14_B23: f64 =
        (sumifs(&t.atb, 'D', &[('A', "1-2600")]) - sumifs(&t.atb, 'E', &[('A', "1-2600")]));
    let S14_C23: f64 =
        (sumifs(&t.ob, 'C', &[('A', "1-2600")]) - sumifs(&t.ob, 'D', &[('A', "1-2600")]));
    let S14_B24: f64 = ((sumifs(&t.atb, 'D', &[('A', "1-2700")])
        - sumifs(&t.atb, 'E', &[('A', "1-2700")]))
        + (sumifs(&t.atb, 'D', &[('A', "1-2710")]) - sumifs(&t.atb, 'E', &[('A', "1-2710")])));
    let S14_C24: f64 = ((sumifs(&t.ob, 'C', &[('A', "1-2700")])
        - sumifs(&t.ob, 'D', &[('A', "1-2700")]))
        + (sumifs(&t.ob, 'C', &[('A', "1-2710")]) - sumifs(&t.ob, 'D', &[('A', "1-2710")])));
    let S14_B25: f64 =
        (sumifs(&t.atb, 'D', &[('A', "1-2800")]) - sumifs(&t.atb, 'E', &[('A', "1-2800")]));
    let S14_C25: f64 =
        (sumifs(&t.ob, 'C', &[('A', "1-2800")]) - sumifs(&t.ob, 'D', &[('A', "1-2800")]));
    let S14_B28: f64 =
        (sumifs(&t.atb, 'D', &[('A', "1-2990")]) - sumifs(&t.atb, 'E', &[('A', "1-2990")]));
    let S14_C28: f64 =
        (sumifs(&t.ob, 'C', &[('A', "1-2990")]) - sumifs(&t.ob, 'D', &[('A', "1-2990")]));
    let S14_B29: f64 = sum(&[
        S14_B18, S14_B19, S14_B20, S14_B21, S14_B22, S14_B23, S14_B24, S14_B25, S14_B28,
    ]);
    let S14_C29: f64 = sum(&[
        S14_C18, S14_C19, S14_C20, S14_C21, S14_C22, S14_C23, S14_C24, S14_C25, S14_C28,
    ]);
    let S14_B31: f64 = (S14_B15 + S14_B29);
    let S14_C31: f64 = (S14_C15 + S14_C29);
    let S14_B34: f64 =
        (-(sumifs(&t.atb, 'D', &[('A', "2-1000")]) - sumifs(&t.atb, 'E', &[('A', "2-1000")])));
    let S14_C34: f64 =
        (-(sumifs(&t.ob, 'C', &[('A', "2-1000")]) - sumifs(&t.ob, 'D', &[('A', "2-1000")])));
    let S14_B35: f64 =
        (-(sumifs(&t.atb, 'D', &[('A', "2-1100")]) - sumifs(&t.atb, 'E', &[('A', "2-1100")])));
    let S14_C35: f64 =
        (-(sumifs(&t.ob, 'C', &[('A', "2-1100")]) - sumifs(&t.ob, 'D', &[('A', "2-1100")])));
    let S14_B36: f64 = (-((sumifs(&t.atb, 'D', &[('A', "2-1200")])
        - sumifs(&t.atb, 'E', &[('A', "2-1200")]))
        + (sumifs(&t.atb, 'D', &[('A', "2-1300")]) - sumifs(&t.atb, 'E', &[('A', "2-1300")]))));
    let S14_C36: f64 = (-((sumifs(&t.ob, 'C', &[('A', "2-1200")])
        - sumifs(&t.ob, 'D', &[('A', "2-1200")]))
        + (sumifs(&t.ob, 'C', &[('A', "2-1300")]) - sumifs(&t.ob, 'D', &[('A', "2-1300")]))));
    let S14_B37: f64 =
        (-(sumifs(&t.atb, 'D', &[('A', "2-1400")]) - sumifs(&t.atb, 'E', &[('A', "2-1400")])));
    let S14_C37: f64 =
        (-(sumifs(&t.ob, 'C', &[('A', "2-1400")]) - sumifs(&t.ob, 'D', &[('A', "2-1400")])));
    let S14_B38: f64 =
        (-(sumifs(&t.atb, 'D', &[('A', "2-1500")]) - sumifs(&t.atb, 'E', &[('A', "2-1500")])));
    let S14_C38: f64 =
        (-(sumifs(&t.ob, 'C', &[('A', "2-1500")]) - sumifs(&t.ob, 'D', &[('A', "2-1500")])));
    let S14_B39: f64 =
        (-(sumifs(&t.atb, 'D', &[('A', "2-1600")]) - sumifs(&t.atb, 'E', &[('A', "2-1600")])));
    let S14_C39: f64 =
        (-(sumifs(&t.ob, 'C', &[('A', "2-1600")]) - sumifs(&t.ob, 'D', &[('A', "2-1600")])));
    let S14_B40: f64 =
        (-(sumifs(&t.atb, 'D', &[('A', "2-1700")]) - sumifs(&t.atb, 'E', &[('A', "2-1700")])));
    let S14_C40: f64 =
        (-(sumifs(&t.ob, 'C', &[('A', "2-1700")]) - sumifs(&t.ob, 'D', &[('A', "2-1700")])));
    let S14_B41: f64 =
        (-(sumifs(&t.atb, 'D', &[('A', "2-1800")]) - sumifs(&t.atb, 'E', &[('A', "2-1800")])));
    let S14_C41: f64 =
        (-(sumifs(&t.ob, 'C', &[('A', "2-1800")]) - sumifs(&t.ob, 'D', &[('A', "2-1800")])));
    let S14_B42: f64 =
        (-(sumifs(&t.atb, 'D', &[('A', "2-1900")]) - sumifs(&t.atb, 'E', &[('A', "2-1900")])));
    let S14_C42: f64 =
        (-(sumifs(&t.ob, 'C', &[('A', "2-1900")]) - sumifs(&t.ob, 'D', &[('A', "2-1900")])));
    let S14_B43: f64 = sum(&[
        S14_B34, S14_B35, S14_B36, S14_B37, S14_B38, S14_B39, S14_B40, S14_B41, S14_B42,
    ]);
    let S14_C43: f64 = sum(&[
        S14_C34, S14_C35, S14_C36, S14_C37, S14_C38, S14_C39, S14_C40, S14_C41, S14_C42,
    ]);
    let S14_B46: f64 = (-((sumifs(&t.atb, 'D', &[('A', "2-2000")])
        - sumifs(&t.atb, 'E', &[('A', "2-2000")]))
        + (sumifs(&t.atb, 'D', &[('A', "2-2010")]) - sumifs(&t.atb, 'E', &[('A', "2-2010")]))));
    let S14_C46: f64 = (-((sumifs(&t.ob, 'C', &[('A', "2-2000")])
        - sumifs(&t.ob, 'D', &[('A', "2-2000")]))
        + (sumifs(&t.ob, 'C', &[('A', "2-2010")]) - sumifs(&t.ob, 'D', &[('A', "2-2010")]))));
    let S14_B47: f64 =
        (-(sumifs(&t.atb, 'D', &[('A', "2-2100")]) - sumifs(&t.atb, 'E', &[('A', "2-2100")])));
    let S14_C47: f64 =
        (-(sumifs(&t.ob, 'C', &[('A', "2-2100")]) - sumifs(&t.ob, 'D', &[('A', "2-2100")])));
    let S14_B48: f64 =
        (-(sumifs(&t.atb, 'D', &[('A', "2-2200")]) - sumifs(&t.atb, 'E', &[('A', "2-2200")])));
    let S14_C48: f64 =
        (-(sumifs(&t.ob, 'C', &[('A', "2-2200")]) - sumifs(&t.ob, 'D', &[('A', "2-2200")])));
    let S14_B49: f64 =
        (-(sumifs(&t.atb, 'D', &[('A', "2-2300")]) - sumifs(&t.atb, 'E', &[('A', "2-2300")])));
    let S14_C49: f64 =
        (-(sumifs(&t.ob, 'C', &[('A', "2-2300")]) - sumifs(&t.ob, 'D', &[('A', "2-2300")])));
    let S14_B50: f64 =
        (-(sumifs(&t.atb, 'D', &[('A', "2-2400")]) - sumifs(&t.atb, 'E', &[('A', "2-2400")])));
    let S14_C50: f64 =
        (-(sumifs(&t.ob, 'C', &[('A', "2-2400")]) - sumifs(&t.ob, 'D', &[('A', "2-2400")])));
    let S14_B51: f64 =
        (-(sumifs(&t.atb, 'D', &[('A', "2-2500")]) - sumifs(&t.atb, 'E', &[('A', "2-2500")])));
    let S14_C51: f64 =
        (-(sumifs(&t.ob, 'C', &[('A', "2-2500")]) - sumifs(&t.ob, 'D', &[('A', "2-2500")])));
    let S14_B52: f64 = sum(&[S14_B46, S14_B47, S14_B48, S14_B49, S14_B50, S14_B51]);
    let S14_C52: f64 = sum(&[S14_C46, S14_C47, S14_C48, S14_C49, S14_C50, S14_C51]);
    let S14_B54: f64 = (S14_B43 + S14_B52);
    let S14_C54: f64 = (S14_C43 + S14_C52);
    let S14_B57: f64 = S13_B9;
    let S14_C57: f64 =
        (-(sumifs(&t.ob, 'C', &[('A', "3-1000")]) - sumifs(&t.ob, 'D', &[('A', "3-1000")])));
    let S14_B58: f64 = S13_C9;
    let S14_C58: f64 =
        (-(sumifs(&t.ob, 'C', &[('A', "3-1100")]) - sumifs(&t.ob, 'D', &[('A', "3-1100")])));
    let S14_B59: f64 = S13_D9;
    let S14_C59: f64 =
        (-(sumifs(&t.ob, 'C', &[('A', "3-2000")]) - sumifs(&t.ob, 'D', &[('A', "3-2000")])));
    let S14_B60: f64 = sum(&[S14_B57, S14_B58, S14_B59]);
    let S14_C60: f64 = sum(&[S14_C57, S14_C58, S14_C59]);
    let S14_B62: f64 = (S14_B54 + S14_B60);
    let S14_C62: f64 = (S14_C54 + S14_C60);
    let S14_B65: f64 = (S14_B31 - S14_B62);
    let S14_B66: String = if xround(S14_B65, 0.0) == 0.0 {
        "SEIMBANG - Aset = Liabilitas + Ekuitas".to_string()
    } else {
        "TIDAK SEIMBANG".to_string()
    };
    let S14_B67: f64 = (S14_C31 - S14_C62);
    let S14_B68: String = if xround(S14_B67, 0.0) == 0.0 {
        "SEIMBANG".to_string()
    } else {
        "TIDAK SEIMBANG".to_string()
    };
    let S15_B6: f64 = S12_B53;
    let S15_B8: f64 = (((((sumifs(&t.atb, 'D', &[('A', "6-1400")])
        - sumifs(&t.atb, 'E', &[('A', "6-1400")]))
        + (sumifs(&t.atb, 'D', &[('A', "6-1500")]) - sumifs(&t.atb, 'E', &[('A', "6-1500")])))
        + (sumifs(&t.atb, 'D', &[('A', "6-1600")]) - sumifs(&t.atb, 'E', &[('A', "6-1600")])))
        + (sumifs(&t.atb, 'D', &[('A', "6-1700")]) - sumifs(&t.atb, 'E', &[('A', "6-1700")])))
        + (sumifs(&t.atb, 'D', &[('A', "6-1750")]) - sumifs(&t.atb, 'E', &[('A', "6-1750")])));
    let S15_B9: f64 = ((sumifs(&t.atb, 'D', &[('A', "6-2500")])
        - sumifs(&t.atb, 'E', &[('A', "6-2500")]))
        + (sumifs(&t.atb, 'D', &[('A', "6-2600")]) - sumifs(&t.atb, 'E', &[('A', "6-2600")])));
    let S15_B10: f64 = (((sumifs(&t.atb, 'D', &[('A', "7-1100")])
        - sumifs(&t.atb, 'E', &[('A', "7-1100")]))
        + (sumifs(&t.atb, 'D', &[('A', "4-8200")]) - sumifs(&t.atb, 'E', &[('A', "4-8200")])))
        + (sumifs(&t.atb, 'D', &[('A', "4-8500")]) - sumifs(&t.atb, 'E', &[('A', "4-8500")])));
    let S15_B11: f64 =
        (sumifs(&t.atb, 'D', &[('A', "4-8300")]) - sumifs(&t.atb, 'E', &[('A', "4-8300")]));
    let S15_B13: f64 = sumifs(&t.gl, 'Q', &[('L', "2-2010")]);
    let S15_B14: f64 = ((sumifs(&t.gl, 'Q', &[('L', "2-1700")])
        + sumifs(&t.gl, 'Q', &[('L', "2-2200")]))
        - sumifs(&t.gl, 'P', &[('L', "1-2700")]));
    let S15_B15: f64 =
        (sumifs(&t.adj, 'H', &[('E', "2-2400")]) - sumifs(&t.adj, 'G', &[('E', "2-2400")]));
    let S15_B16: f64 = (-(sumifs(&t.gl, 'P', &[('L', "1-2800")])
        - sumifs(&t.jrn, 'F', &[('C', "1-2800"), ('K', "Investasi*")])));
    let S15_B18: f64 = (-((((sumifs(&t.atb, 'D', &[('A', "1-1200")])
        - sumifs(&t.atb, 'E', &[('A', "1-1200")]))
        - (sumifs(&t.ob, 'C', &[('A', "1-1200")]) - sumifs(&t.ob, 'D', &[('A', "1-1200")])))
        + ((sumifs(&t.atb, 'D', &[('A', "1-1210")]) - sumifs(&t.atb, 'E', &[('A', "1-1210")]))
            - (sumifs(&t.ob, 'C', &[('A', "1-1210")]) - sumifs(&t.ob, 'D', &[('A', "1-1210")]))))
        + ((sumifs(&t.atb, 'D', &[('A', "1-1900")]) - sumifs(&t.atb, 'E', &[('A', "1-1900")]))
            - (sumifs(&t.ob, 'C', &[('A', "1-1900")]) - sumifs(&t.ob, 'D', &[('A', "1-1900")])))));
    let S15_B19: f64 = (-(((sumifs(&t.atb, 'D', &[('A', "1-1300")])
        - sumifs(&t.atb, 'E', &[('A', "1-1300")]))
        - (sumifs(&t.ob, 'C', &[('A', "1-1300")]) - sumifs(&t.ob, 'D', &[('A', "1-1300")])))
        + ((sumifs(&t.atb, 'D', &[('A', "1-1310")]) - sumifs(&t.atb, 'E', &[('A', "1-1310")]))
            - (sumifs(&t.ob, 'C', &[('A', "1-1310")]) - sumifs(&t.ob, 'D', &[('A', "1-1310")])))));
    let S15_B20: f64 = (-((sumifs(&t.atb, 'D', &[('A', "1-1400")])
        - sumifs(&t.atb, 'E', &[('A', "1-1400")]))
        - (sumifs(&t.ob, 'C', &[('A', "1-1400")]) - sumifs(&t.ob, 'D', &[('A', "1-1400")]))));
    let S15_B21: f64 = (-(((((sumifs(&t.atb, 'D', &[('A', "1-1500")])
        - sumifs(&t.atb, 'E', &[('A', "1-1500")]))
        - (sumifs(&t.ob, 'C', &[('A', "1-1500")]) - sumifs(&t.ob, 'D', &[('A', "1-1500")])))
        + ((sumifs(&t.atb, 'D', &[('A', "1-1600")]) - sumifs(&t.atb, 'E', &[('A', "1-1600")]))
            - (sumifs(&t.ob, 'C', &[('A', "1-1600")])
                - sumifs(&t.ob, 'D', &[('A', "1-1600")]))))
        + ((sumifs(&t.atb, 'D', &[('A', "1-1700")]) - sumifs(&t.atb, 'E', &[('A', "1-1700")]))
            - (sumifs(&t.ob, 'C', &[('A', "1-1700")]) - sumifs(&t.ob, 'D', &[('A', "1-1700")]))))
        + ((sumifs(&t.atb, 'D', &[('A', "1-1800")]) - sumifs(&t.atb, 'E', &[('A', "1-1800")]))
            - (sumifs(&t.ob, 'C', &[('A', "1-1800")]) - sumifs(&t.ob, 'D', &[('A', "1-1800")])))));
    let S15_B22: f64 = (-((sumifs(&t.atb, 'D', &[('A', "1-2990")])
        - sumifs(&t.atb, 'E', &[('A', "1-2990")]))
        - (sumifs(&t.ob, 'C', &[('A', "1-2990")]) - sumifs(&t.ob, 'D', &[('A', "1-2990")]))));
    let S15_B23: f64 = (-((sumifs(&t.atb, 'D', &[('A', "2-1000")])
        - sumifs(&t.atb, 'E', &[('A', "2-1000")]))
        - (sumifs(&t.ob, 'C', &[('A', "2-1000")]) - sumifs(&t.ob, 'D', &[('A', "2-1000")]))));
    let S15_B24: f64 = (-(((sumifs(&t.atb, 'D', &[('A', "2-1200")])
        - sumifs(&t.atb, 'E', &[('A', "2-1200")]))
        - (sumifs(&t.ob, 'C', &[('A', "2-1200")]) - sumifs(&t.ob, 'D', &[('A', "2-1200")])))
        + ((sumifs(&t.atb, 'D', &[('A', "2-1300")]) - sumifs(&t.atb, 'E', &[('A', "2-1300")]))
            - (sumifs(&t.ob, 'C', &[('A', "2-1300")]) - sumifs(&t.ob, 'D', &[('A', "2-1300")])))));
    let S15_B25: f64 = (-(((sumifs(&t.atb, 'D', &[('A', "2-1400")])
        - sumifs(&t.atb, 'E', &[('A', "2-1400")]))
        - (sumifs(&t.ob, 'C', &[('A', "2-1400")]) - sumifs(&t.ob, 'D', &[('A', "2-1400")])))
        + ((sumifs(&t.atb, 'D', &[('A', "2-1600")]) - sumifs(&t.atb, 'E', &[('A', "2-1600")]))
            - (sumifs(&t.ob, 'C', &[('A', "2-1600")]) - sumifs(&t.ob, 'D', &[('A', "2-1600")])))));
    let S15_B26: f64 = (-(((sumifs(&t.atb, 'D', &[('A', "2-1500")])
        - sumifs(&t.atb, 'E', &[('A', "2-1500")]))
        - (sumifs(&t.ob, 'C', &[('A', "2-1500")]) - sumifs(&t.ob, 'D', &[('A', "2-1500")])))
        + ((sumifs(&t.atb, 'D', &[('A', "2-2500")]) - sumifs(&t.atb, 'E', &[('A', "2-2500")]))
            - (sumifs(&t.ob, 'C', &[('A', "2-2500")]) - sumifs(&t.ob, 'D', &[('A', "2-2500")])))));
    let S15_B27: f64 = (-(((sumifs(&t.atb, 'D', &[('A', "2-1800")])
        - sumifs(&t.atb, 'E', &[('A', "2-1800")]))
        - (sumifs(&t.ob, 'C', &[('A', "2-1800")]) - sumifs(&t.ob, 'D', &[('A', "2-1800")])))
        + ((sumifs(&t.atb, 'D', &[('A', "2-2300")]) - sumifs(&t.atb, 'E', &[('A', "2-2300")]))
            - (sumifs(&t.ob, 'C', &[('A', "2-2300")]) - sumifs(&t.ob, 'D', &[('A', "2-2300")])))));
    let S15_B28: f64 = (S15_B6
        + sum(&[
            S15_B8, S15_B9, S15_B10, S15_B11, S15_B13, S15_B14, S15_B15, S15_B16, S15_B18, S15_B19,
            S15_B20, S15_B21, S15_B22, S15_B23, S15_B24, S15_B25, S15_B26, S15_B27,
        ]));
    let S15_B31: f64 = sumifs(&t.jrn, 'L', &[('K', "Investasi: perolehan aset tetap")]);
    let S15_B32: f64 = sumifs(
        &t.jrn,
        'L',
        &[('K', "Investasi: hasil pelepasan aset tetap")],
    );
    let S15_B33: f64 = sumifs(
        &t.jrn,
        'L',
        &[('K', "Investasi: perolehan investasi keuangan")],
    );
    let S15_B34: f64 = sumifs(
        &t.jrn,
        'L',
        &[('K', "Investasi: hasil pelepasan investasi keuangan")],
    );
    let S15_B35: f64 = sum(&[S15_B31, S15_B32, S15_B33, S15_B34]);
    let S15_B38: f64 = sumifs(&t.jrn, 'L', &[('K', "Pendanaan: setoran modal saham")]);
    let S15_B39: f64 = sumifs(
        &t.jrn,
        'L',
        &[('K', "Pendanaan: hasil penerbitan obligasi")],
    );
    let S15_B40: f64 = sumifs(&t.jrn, 'L', &[('K', "Pendanaan: pembayaran utang bank")]);
    let S15_B41: f64 = sumifs(&t.jrn, 'L', &[('K', "Pendanaan: pembayaran dividen")]);
    let S15_B42: f64 = sum(&[S15_B38, S15_B39, S15_B40, S15_B41]);
    let S15_B45: f64 = ((S15_B28 + S15_B35) + S15_B42);
    let S15_B46: f64 = (((sumifs(&t.ob, 'C', &[('A', "1-1000")])
        - sumifs(&t.ob, 'D', &[('A', "1-1000")]))
        + (sumifs(&t.ob, 'C', &[('A', "1-1100")]) - sumifs(&t.ob, 'D', &[('A', "1-1100")])))
        + (sumifs(&t.ob, 'C', &[('A', "1-1150")]) - sumifs(&t.ob, 'D', &[('A', "1-1150")])));
    let S15_B47: f64 = (S15_B46 + S15_B45);
    let S15_B50: f64 = sumifs(&t.jrn, 'G', &[('C', "2-1100")]);
    let S15_B51: f64 = sumifs(&t.jrn, 'F', &[('C', "1-2700")]);
    let S15_B52: f64 = sumifs(&t.jrn, 'G', &[('C', "2-2400")]);
    let S15_B53: f64 = sumifs(&t.jrn, 'F', &[('C', "1-2600")]);
    let S15_B54: f64 = sumifs(&t.jrn, 'F', &[('C', "1-2950")]);
    let S15_B57: f64 = (((sumifs(&t.atb, 'D', &[('A', "1-1000")])
        - sumifs(&t.atb, 'E', &[('A', "1-1000")]))
        + (sumifs(&t.atb, 'D', &[('A', "1-1100")]) - sumifs(&t.atb, 'E', &[('A', "1-1100")])))
        + (sumifs(&t.atb, 'D', &[('A', "1-1150")]) - sumifs(&t.atb, 'E', &[('A', "1-1150")])));
    let S15_B58: f64 = (S15_B47 - S15_B57);
    let S15_B59: String = if xround(S15_B58, 0.0) == 0.0 {
        "BENAR - kas akhir konsisten dengan neraca".to_string()
    } else {
        "PERIKSA - kas akhir tidak cocok".to_string()
    };
    let S15_B60: f64 = sumifs(&t.jrn, 'L', &[('K', "Operasi")]);
    let S15_B61: f64 = (S15_B28 - S15_B60);
    let S15_B62: String = if xround(S15_B61, 0.0) == 0.0 {
        "BENAR - operasi tidak langsung = jurnal kas".to_string()
    } else {
        "PERIKSA - ada pos bukan kas yang terlewat".to_string()
    };
    let S15_B63: String = if xround((S15_B6 - S12_B53), 0.0) == 0.0 {
        "BENAR - konsisten".to_string()
    } else {
        "PERIKSA".to_string()
    };
    let S15A_B6: f64 = S12A_B29;
    let S15A_B8: f64 = S15_B8;
    let S15A_B9: f64 = S15_B9;
    let S15A_B10: f64 = S15_B10;
    let S15A_B12: f64 = S15_B18;
    let S15A_B13: f64 = (-((sumifs(&t.atb, 'D', &[('A', "1-1310")])
        - sumifs(&t.atb, 'E', &[('A', "1-1310")]))
        - (sumifs(&t.ob, 'C', &[('A', "1-1310")]) - sumifs(&t.ob, 'D', &[('A', "1-1310")]))));
    let S15A_B14: f64 = S15_B20;
    let S15A_B15: f64 = S15_B21;
    let S15A_B16: f64 = S15_B23;
    let S15A_B17: f64 = (-((sumifs(&t.atb, 'D', &[('A', "2-1200")])
        - sumifs(&t.atb, 'E', &[('A', "2-1200")]))
        - (sumifs(&t.ob, 'C', &[('A', "2-1200")]) - sumifs(&t.ob, 'D', &[('A', "2-1200")]))));
    let S15A_B18: f64 = S15_B25;
    let S15A_B19: f64 = S15_B27;
    let S15A_B21: f64 = (-(sumifs(&t.jrn, 'F', &[('C', "1-2900")])));
    let S15A_B22: f64 = ((sumifs(&t.jrn, 'G', &[('C', "1-2900")])
        + sumifs(&t.jrn, 'G', &[('C', "4-8400")]))
        - sumifs(&t.jrn, 'F', &[('C', "4-8400")]));
    let S15A_B23: f64 = (((-S12_B50)
        + (-((sumifs(&t.atb, 'D', &[('A', "2-1500")])
            - sumifs(&t.atb, 'E', &[('A', "2-1500")]))
            - (sumifs(&t.ob, 'C', &[('A', "2-1500")]) - sumifs(&t.ob, 'D', &[('A', "2-1500")])))))
        + (-((sumifs(&t.atb, 'D', &[('A', "1-1800")]) - sumifs(&t.atb, 'E', &[('A', "1-1800")]))
            - (sumifs(&t.ob, 'C', &[('A', "1-1800")]) - sumifs(&t.ob, 'D', &[('A', "1-1800")])))));
    let S15A_B24: f64 = (S15A_B6
        + sum(&[
            S15A_B8, S15A_B9, S15A_B10, S15A_B12, S15A_B13, S15A_B14, S15A_B15, S15A_B16, S15A_B17,
            S15A_B18, S15A_B19, S15A_B21, S15A_B22, S15A_B23,
        ]));
    let S15A_B27: f64 = S15_B31;
    let S15A_B28: f64 = S15_B32;
    let S15A_B29: f64 = S15_B33;
    let S15A_B30: f64 = ((S12_B39 + S15_B16)
        + (-((sumifs(&t.atb, 'D', &[('A', "1-1300")]) - sumifs(&t.atb, 'E', &[('A', "1-1300")]))
            - (sumifs(&t.ob, 'C', &[('A', "1-1300")]) - sumifs(&t.ob, 'D', &[('A', "1-1300")])))));
    let S15A_B31: f64 = 0.0;
    let S15A_B32: f64 = 0.0;
    let S15A_B33: f64 = sum(&[S15A_B27, S15A_B28, S15A_B29, S15A_B30, S15A_B31, S15A_B32]);
    let S15A_B36: f64 = S15_B38;
    let S15A_B37: f64 = S15_B39;
    let S15A_B38: f64 = S15_B40;
    let S15A_B39: f64 = S15_B41;
    let S15A_B40: f64 = (-(((((-S12_B45) - S15_B13) - S15_B14) - S15_B15)
        - (-((sumifs(&t.atb, 'D', &[('A', "2-1300")])
            - sumifs(&t.atb, 'E', &[('A', "2-1300")]))
            - (sumifs(&t.ob, 'C', &[('A', "2-1300")]) - sumifs(&t.ob, 'D', &[('A', "2-1300")]))))));
    let S15A_B41: f64 = 0.0;
    let S15A_B42: f64 = 0.0;
    let S15A_B43: f64 = sum(&[
        S15A_B36, S15A_B37, S15A_B38, S15A_B39, S15A_B40, S15A_B41, S15A_B42,
    ]);
    let S15A_B46: f64 = ((S15A_B24 + S15A_B33) + S15A_B43);
    let S15A_B47: f64 = S15_B46;
    let S15A_B48: f64 = (S15A_B46 + S15A_B47);
    let S15A_B49: String = if xround((S15A_B48 - S15_B47), 0.0) == 0.0 {
        "BENAR - sama dengan sheet 15".to_string()
    } else {
        "BEDA - periksa".to_string()
    };
    let S15A_B53: f64 = S15_B28;
    let S15A_C53: f64 = S15A_B24;
    let S15A_B54: f64 = S15_B35;
    let S15A_C54: f64 = S15A_B33;
    let S15A_B55: f64 = S15_B42;
    let S15A_C55: f64 = S15A_B43;
    let S15A_B56: f64 = S15_B45;
    let S15A_C56: f64 = S15A_B46;
    let mut m = StatementCells::new();
    m.insert("S12_B6", Cell::Num(S12_B6));
    m.insert("S12_B7", Cell::Num(S12_B7));
    m.insert("S12_B8", Cell::Num(S12_B8));
    m.insert("S12_B9", Cell::Num(S12_B9));
    m.insert("S12_B10", Cell::Num(S12_B10));
    m.insert("S12_B11", Cell::Num(S12_B11));
    m.insert("S12_B13", Cell::Num(S12_B13));
    m.insert("S12_B14", Cell::Num(S12_B14));
    m.insert("S12_B17", Cell::Num(S12_B17));
    m.insert("S12_B18", Cell::Num(S12_B18));
    m.insert("S12_B19", Cell::Num(S12_B19));
    m.insert("S12_B20", Cell::Num(S12_B20));
    m.insert("S12_B21", Cell::Num(S12_B21));
    m.insert("S12_B22", Cell::Num(S12_B22));
    m.insert("S12_B23", Cell::Num(S12_B23));
    m.insert("S12_B24", Cell::Num(S12_B24));
    m.insert("S12_B25", Cell::Num(S12_B25));
    m.insert("S12_B26", Cell::Num(S12_B26));
    m.insert("S12_B27", Cell::Num(S12_B27));
    m.insert("S12_B28", Cell::Num(S12_B28));
    m.insert("S12_B29", Cell::Num(S12_B29));
    m.insert("S12_B30", Cell::Num(S12_B30));
    m.insert("S12_B31", Cell::Num(S12_B31));
    m.insert("S12_B32", Cell::Num(S12_B32));
    m.insert("S12_B33", Cell::Num(S12_B33));
    m.insert("S12_B34", Cell::Num(S12_B34));
    m.insert("S12_B35", Cell::Num(S12_B35));
    m.insert("S12_B36", Cell::Num(S12_B36));
    m.insert("S12_B39", Cell::Num(S12_B39));
    m.insert("S12_B40", Cell::Num(S12_B40));
    m.insert("S12_B41", Cell::Num(S12_B41));
    m.insert("S12_B42", Cell::Num(S12_B42));
    m.insert("S12_B43", Cell::Num(S12_B43));
    m.insert("S12_B44", Cell::Num(S12_B44));
    m.insert("S12_B45", Cell::Num(S12_B45));
    m.insert("S12_B46", Cell::Num(S12_B46));
    m.insert("S12_B47", Cell::Num(S12_B47));
    m.insert("S12_B48", Cell::Num(S12_B48));
    m.insert("S12_B50", Cell::Num(S12_B50));
    m.insert("S12_B51", Cell::Num(S12_B51));
    m.insert("S12_B52", Cell::Num(S12_B52));
    m.insert("S12_B53", Cell::Num(S12_B53));
    m.insert("S12_B56", Cell::Num(S12_B56));
    m.insert("S12_B57", Cell::Num(S12_B57));
    m.insert("S12_B60", Cell::Num(S12_B60));
    m.insert("S12_B61", Cell::Num(S12_B61));
    m.insert("S12_B62", Cell::Num(S12_B62));
    m.insert("S12_B63", Cell::Num(S12_B63));
    m.insert("S12A_B6", Cell::Num(S12A_B6));
    m.insert("S12A_B7", Cell::Num(S12A_B7));
    m.insert("S12A_B8", Cell::Num(S12A_B8));
    m.insert("S12A_B9", Cell::Num(S12A_B9));
    m.insert("S12A_B10", Cell::Num(S12A_B10));
    m.insert("S12A_B11", Cell::Num(S12A_B11));
    m.insert("S12A_B12", Cell::Num(S12A_B12));
    m.insert("S12A_B13", Cell::Num(S12A_B13));
    m.insert("S12A_B14", Cell::Num(S12A_B14));
    m.insert("S12A_B15", Cell::Num(S12A_B15));
    m.insert("S12A_B16", Cell::Num(S12A_B16));
    m.insert("S12A_B17", Cell::Num(S12A_B17));
    m.insert("S12A_B18", Cell::Num(S12A_B18));
    m.insert("S12A_B19", Cell::Num(S12A_B19));
    m.insert("S12A_B20", Cell::Num(S12A_B20));
    m.insert("S12A_B21", Cell::Num(S12A_B21));
    m.insert("S12A_B22", Cell::Num(S12A_B22));
    m.insert("S12A_B23", Cell::Num(S12A_B23));
    m.insert("S12A_B24", Cell::Num(S12A_B24));
    m.insert("S12A_B25", Cell::Num(S12A_B25));
    m.insert("S12A_B26", Cell::Num(S12A_B26));
    m.insert("S12A_B27", Cell::Num(S12A_B27));
    m.insert("S12A_B28", Cell::Num(S12A_B28));
    m.insert("S12A_B29", Cell::Num(S12A_B29));
    m.insert("S12A_B32", Cell::Num(S12A_B32));
    m.insert("S12A_B33", Cell::Num(S12A_B33));
    m.insert("S12A_B34", Cell::Num(S12A_B34));
    m.insert("S12A_B35", Cell::Num(S12A_B35));
    m.insert("S12A_B36", Cell::Num(S12A_B36));
    m.insert("S12A_B37", Cell::Num(S12A_B37));
    m.insert("S12A_B38", Cell::Num(S12A_B38));
    m.insert("S12A_B41", Cell::Num(S12A_B41));
    m.insert("S12A_B42", Cell::Num(S12A_B42));
    m.insert("S12A_B45", Cell::Num(S12A_B45));
    m.insert("S12A_B46", Cell::Num(S12A_B46));
    m.insert("S12A_B47", Cell::Str(S12A_B47.clone()));
    m.insert("S12A_B50", Cell::Num(S12A_B50));
    m.insert("S12A_B51", Cell::Num(S12A_B51));
    m.insert("S12A_B52", Cell::Num(S12A_B52));
    m.insert("S12A_B53", Cell::Num(S12A_B53));
    m.insert("S12A_B54", Cell::Num(S12A_B54));
    m.insert("S12A_B55", Cell::Str(S12A_B55.clone()));
    m.insert("S12A_B58", Cell::Num(S12A_B58));
    m.insert("S12A_B59", Cell::Num(S12A_B59));
    m.insert("S12A_B60", Cell::Num(S12A_B60));
    m.insert("S12A_B61", Cell::Num(S12A_B61));
    m.insert("S12A_B62", Cell::Num(S12A_B62));
    m.insert("S13_B5", Cell::Num(S13_B5));
    m.insert("S13_C5", Cell::Num(S13_C5));
    m.insert("S13_D5", Cell::Num(S13_D5));
    m.insert("S13_E5", Cell::Num(S13_E5));
    m.insert("S13_B6", Cell::Num(S13_B6));
    m.insert("S13_C6", Cell::Num(S13_C6));
    m.insert("S13_D6", Cell::Num(S13_D6));
    m.insert("S13_E6", Cell::Num(S13_E6));
    m.insert("S13_B7", Cell::Num(S13_B7));
    m.insert("S13_C7", Cell::Num(S13_C7));
    m.insert("S13_D7", Cell::Num(S13_D7));
    m.insert("S13_E7", Cell::Num(S13_E7));
    m.insert("S13_B8", Cell::Num(S13_B8));
    m.insert("S13_C8", Cell::Num(S13_C8));
    m.insert("S13_D8", Cell::Num(S13_D8));
    m.insert("S13_E8", Cell::Num(S13_E8));
    m.insert("S13_B9", Cell::Num(S13_B9));
    m.insert("S13_C9", Cell::Num(S13_C9));
    m.insert("S13_D9", Cell::Num(S13_D9));
    m.insert("S13_E9", Cell::Num(S13_E9));
    m.insert("S13_B12", Cell::Str(S13_B12.clone()));
    m.insert("S13_B13", Cell::Str(S13_B13.clone()));
    m.insert("S13_B14", Cell::Str(S13_B14.clone()));
    m.insert("S14_B6", Cell::Num(S14_B6));
    m.insert("S14_C6", Cell::Num(S14_C6));
    m.insert("S14_B7", Cell::Num(S14_B7));
    m.insert("S14_C7", Cell::Num(S14_C7));
    m.insert("S14_B8", Cell::Num(S14_B8));
    m.insert("S14_C8", Cell::Num(S14_C8));
    m.insert("S14_B9", Cell::Num(S14_B9));
    m.insert("S14_C9", Cell::Num(S14_C9));
    m.insert("S14_B10", Cell::Num(S14_B10));
    m.insert("S14_C10", Cell::Num(S14_C10));
    m.insert("S14_B11", Cell::Num(S14_B11));
    m.insert("S14_C11", Cell::Num(S14_C11));
    m.insert("S14_B12", Cell::Num(S14_B12));
    m.insert("S14_C12", Cell::Num(S14_C12));
    m.insert("S14_B13", Cell::Num(S14_B13));
    m.insert("S14_C13", Cell::Num(S14_C13));
    m.insert("S14_B14", Cell::Num(S14_B14));
    m.insert("S14_C14", Cell::Num(S14_C14));
    m.insert("S14_B15", Cell::Num(S14_B15));
    m.insert("S14_C15", Cell::Num(S14_C15));
    m.insert("S14_B18", Cell::Num(S14_B18));
    m.insert("S14_C18", Cell::Num(S14_C18));
    m.insert("S14_B19", Cell::Num(S14_B19));
    m.insert("S14_C19", Cell::Num(S14_C19));
    m.insert("S14_B20", Cell::Num(S14_B20));
    m.insert("S14_C20", Cell::Num(S14_C20));
    m.insert("S14_B21", Cell::Num(S14_B21));
    m.insert("S14_C21", Cell::Num(S14_C21));
    m.insert("S14_B22", Cell::Num(S14_B22));
    m.insert("S14_C22", Cell::Num(S14_C22));
    m.insert("S14_B23", Cell::Num(S14_B23));
    m.insert("S14_C23", Cell::Num(S14_C23));
    m.insert("S14_B24", Cell::Num(S14_B24));
    m.insert("S14_C24", Cell::Num(S14_C24));
    m.insert("S14_B25", Cell::Num(S14_B25));
    m.insert("S14_C25", Cell::Num(S14_C25));
    m.insert("S14_B28", Cell::Num(S14_B28));
    m.insert("S14_C28", Cell::Num(S14_C28));
    m.insert("S14_B29", Cell::Num(S14_B29));
    m.insert("S14_C29", Cell::Num(S14_C29));
    m.insert("S14_B31", Cell::Num(S14_B31));
    m.insert("S14_C31", Cell::Num(S14_C31));
    m.insert("S14_B34", Cell::Num(S14_B34));
    m.insert("S14_C34", Cell::Num(S14_C34));
    m.insert("S14_B35", Cell::Num(S14_B35));
    m.insert("S14_C35", Cell::Num(S14_C35));
    m.insert("S14_B36", Cell::Num(S14_B36));
    m.insert("S14_C36", Cell::Num(S14_C36));
    m.insert("S14_B37", Cell::Num(S14_B37));
    m.insert("S14_C37", Cell::Num(S14_C37));
    m.insert("S14_B38", Cell::Num(S14_B38));
    m.insert("S14_C38", Cell::Num(S14_C38));
    m.insert("S14_B39", Cell::Num(S14_B39));
    m.insert("S14_C39", Cell::Num(S14_C39));
    m.insert("S14_B40", Cell::Num(S14_B40));
    m.insert("S14_C40", Cell::Num(S14_C40));
    m.insert("S14_B41", Cell::Num(S14_B41));
    m.insert("S14_C41", Cell::Num(S14_C41));
    m.insert("S14_B42", Cell::Num(S14_B42));
    m.insert("S14_C42", Cell::Num(S14_C42));
    m.insert("S14_B43", Cell::Num(S14_B43));
    m.insert("S14_C43", Cell::Num(S14_C43));
    m.insert("S14_B46", Cell::Num(S14_B46));
    m.insert("S14_C46", Cell::Num(S14_C46));
    m.insert("S14_B47", Cell::Num(S14_B47));
    m.insert("S14_C47", Cell::Num(S14_C47));
    m.insert("S14_B48", Cell::Num(S14_B48));
    m.insert("S14_C48", Cell::Num(S14_C48));
    m.insert("S14_B49", Cell::Num(S14_B49));
    m.insert("S14_C49", Cell::Num(S14_C49));
    m.insert("S14_B50", Cell::Num(S14_B50));
    m.insert("S14_C50", Cell::Num(S14_C50));
    m.insert("S14_B51", Cell::Num(S14_B51));
    m.insert("S14_C51", Cell::Num(S14_C51));
    m.insert("S14_B52", Cell::Num(S14_B52));
    m.insert("S14_C52", Cell::Num(S14_C52));
    m.insert("S14_B54", Cell::Num(S14_B54));
    m.insert("S14_C54", Cell::Num(S14_C54));
    m.insert("S14_B57", Cell::Num(S14_B57));
    m.insert("S14_C57", Cell::Num(S14_C57));
    m.insert("S14_B58", Cell::Num(S14_B58));
    m.insert("S14_C58", Cell::Num(S14_C58));
    m.insert("S14_B59", Cell::Num(S14_B59));
    m.insert("S14_C59", Cell::Num(S14_C59));
    m.insert("S14_B60", Cell::Num(S14_B60));
    m.insert("S14_C60", Cell::Num(S14_C60));
    m.insert("S14_B62", Cell::Num(S14_B62));
    m.insert("S14_C62", Cell::Num(S14_C62));
    m.insert("S14_B65", Cell::Num(S14_B65));
    m.insert("S14_B66", Cell::Str(S14_B66.clone()));
    m.insert("S14_B67", Cell::Num(S14_B67));
    m.insert("S14_B68", Cell::Str(S14_B68.clone()));
    m.insert("S15_B6", Cell::Num(S15_B6));
    m.insert("S15_B8", Cell::Num(S15_B8));
    m.insert("S15_B9", Cell::Num(S15_B9));
    m.insert("S15_B10", Cell::Num(S15_B10));
    m.insert("S15_B11", Cell::Num(S15_B11));
    m.insert("S15_B13", Cell::Num(S15_B13));
    m.insert("S15_B14", Cell::Num(S15_B14));
    m.insert("S15_B15", Cell::Num(S15_B15));
    m.insert("S15_B16", Cell::Num(S15_B16));
    m.insert("S15_B18", Cell::Num(S15_B18));
    m.insert("S15_B19", Cell::Num(S15_B19));
    m.insert("S15_B20", Cell::Num(S15_B20));
    m.insert("S15_B21", Cell::Num(S15_B21));
    m.insert("S15_B22", Cell::Num(S15_B22));
    m.insert("S15_B23", Cell::Num(S15_B23));
    m.insert("S15_B24", Cell::Num(S15_B24));
    m.insert("S15_B25", Cell::Num(S15_B25));
    m.insert("S15_B26", Cell::Num(S15_B26));
    m.insert("S15_B27", Cell::Num(S15_B27));
    m.insert("S15_B28", Cell::Num(S15_B28));
    m.insert("S15_B31", Cell::Num(S15_B31));
    m.insert("S15_B32", Cell::Num(S15_B32));
    m.insert("S15_B33", Cell::Num(S15_B33));
    m.insert("S15_B34", Cell::Num(S15_B34));
    m.insert("S15_B35", Cell::Num(S15_B35));
    m.insert("S15_B38", Cell::Num(S15_B38));
    m.insert("S15_B39", Cell::Num(S15_B39));
    m.insert("S15_B40", Cell::Num(S15_B40));
    m.insert("S15_B41", Cell::Num(S15_B41));
    m.insert("S15_B42", Cell::Num(S15_B42));
    m.insert("S15_B45", Cell::Num(S15_B45));
    m.insert("S15_B46", Cell::Num(S15_B46));
    m.insert("S15_B47", Cell::Num(S15_B47));
    m.insert("S15_B50", Cell::Num(S15_B50));
    m.insert("S15_B51", Cell::Num(S15_B51));
    m.insert("S15_B52", Cell::Num(S15_B52));
    m.insert("S15_B53", Cell::Num(S15_B53));
    m.insert("S15_B54", Cell::Num(S15_B54));
    m.insert("S15_B57", Cell::Num(S15_B57));
    m.insert("S15_B58", Cell::Num(S15_B58));
    m.insert("S15_B59", Cell::Str(S15_B59.clone()));
    m.insert("S15_B60", Cell::Num(S15_B60));
    m.insert("S15_B61", Cell::Num(S15_B61));
    m.insert("S15_B62", Cell::Str(S15_B62.clone()));
    m.insert("S15_B63", Cell::Str(S15_B63.clone()));
    m.insert("S15A_B6", Cell::Num(S15A_B6));
    m.insert("S15A_B8", Cell::Num(S15A_B8));
    m.insert("S15A_B9", Cell::Num(S15A_B9));
    m.insert("S15A_B10", Cell::Num(S15A_B10));
    m.insert("S15A_B12", Cell::Num(S15A_B12));
    m.insert("S15A_B13", Cell::Num(S15A_B13));
    m.insert("S15A_B14", Cell::Num(S15A_B14));
    m.insert("S15A_B15", Cell::Num(S15A_B15));
    m.insert("S15A_B16", Cell::Num(S15A_B16));
    m.insert("S15A_B17", Cell::Num(S15A_B17));
    m.insert("S15A_B18", Cell::Num(S15A_B18));
    m.insert("S15A_B19", Cell::Num(S15A_B19));
    m.insert("S15A_B21", Cell::Num(S15A_B21));
    m.insert("S15A_B22", Cell::Num(S15A_B22));
    m.insert("S15A_B23", Cell::Num(S15A_B23));
    m.insert("S15A_B24", Cell::Num(S15A_B24));
    m.insert("S15A_B27", Cell::Num(S15A_B27));
    m.insert("S15A_B28", Cell::Num(S15A_B28));
    m.insert("S15A_B29", Cell::Num(S15A_B29));
    m.insert("S15A_B30", Cell::Num(S15A_B30));
    m.insert("S15A_B31", Cell::Num(S15A_B31));
    m.insert("S15A_B32", Cell::Num(S15A_B32));
    m.insert("S15A_B33", Cell::Num(S15A_B33));
    m.insert("S15A_B36", Cell::Num(S15A_B36));
    m.insert("S15A_B37", Cell::Num(S15A_B37));
    m.insert("S15A_B38", Cell::Num(S15A_B38));
    m.insert("S15A_B39", Cell::Num(S15A_B39));
    m.insert("S15A_B40", Cell::Num(S15A_B40));
    m.insert("S15A_B41", Cell::Num(S15A_B41));
    m.insert("S15A_B42", Cell::Num(S15A_B42));
    m.insert("S15A_B43", Cell::Num(S15A_B43));
    m.insert("S15A_B46", Cell::Num(S15A_B46));
    m.insert("S15A_B47", Cell::Num(S15A_B47));
    m.insert("S15A_B48", Cell::Num(S15A_B48));
    m.insert("S15A_B49", Cell::Str(S15A_B49.clone()));
    m.insert("S15A_B53", Cell::Num(S15A_B53));
    m.insert("S15A_C53", Cell::Num(S15A_C53));
    m.insert("S15A_B54", Cell::Num(S15A_B54));
    m.insert("S15A_C54", Cell::Num(S15A_C54));
    m.insert("S15A_B55", Cell::Num(S15A_B55));
    m.insert("S15A_C55", Cell::Num(S15A_C55));
    m.insert("S15A_B56", Cell::Num(S15A_B56));
    m.insert("S15A_C56", Cell::Num(S15A_C56));
    m
}
