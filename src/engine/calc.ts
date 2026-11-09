// Kalkulator ekspresi untuk aplikasi. Penguraian rekursif murni: tidak memakai eval atau Function.
// Format angka Indonesia: koma = desimal; titik = pemisah ribuan bila membentuk kelompok tiga angka (1.250.000),
// selain itu titik dibaca desimal (2.5). Operator: + - * / (juga x dan :), tanda kurung, dan % setelah angka (5% = 0,05).

export type CalcResult = { ok: true; value: number } | { ok: false; error: string };

type Tok = { t: 'num'; v: number } | { t: 'op'; v: '+' | '-' | '*' | '/' | '(' | ')' | '%' };

const MAX_LEN = 200;
const THOUSANDS = /^\d{1,3}(\.\d{3})+(,\d+)?$/;

function parseNumber(raw: string): number | null {
  let s = raw;
  if (THOUSANDS.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(',', '.');
  if (!/^\d+(\.\d+)?$|^\.\d+$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function tokenize(src: string): Tok[] | string {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === ' ' || c === ' ') {
      i++;
      continue;
    }
    if (/[0-9.,]/.test(c)) {
      let j = i;
      while (j < src.length && /[0-9.,]/.test(src[j])) j++;
      const n = parseNumber(src.slice(i, j));
      if (n === null) return `Angka tidak valid: "${src.slice(i, j)}"`;
      out.push({ t: 'num', v: n });
      i = j;
      continue;
    }
    const map: Record<string, '+' | '-' | '*' | '/' | '(' | ')' | '%'> = {
      '+': '+',
      '-': '-',
      '−': '-',
      '*': '*',
      x: '*',
      X: '*',
      '×': '*',
      '/': '/',
      ':': '/',
      '÷': '/',
      '(': '(',
      ')': ')',
      '%': '%',
    };
    if (c in map) {
      out.push({ t: 'op', v: map[c] });
      i++;
      continue;
    }
    return `Karakter tidak dikenal: "${c}"`;
  }
  return out;
}

/** Hitung ekspresi. Tidak pernah melempar galat; kegagalan dikembalikan sebagai { ok: false }. */
export function calculate(src: string): CalcResult {
  if (src.length > MAX_LEN) return { ok: false, error: 'Ekspresi terlalu panjang.' };
  if (src.trim() === '') return { ok: false, error: 'Kosong.' };
  const toks = tokenize(src);
  if (typeof toks === 'string') return { ok: false, error: toks };
  let p = 0;
  const peek = () => toks[p];
  class Fail extends Error {}
  const fail = (m: string): never => {
    throw new Fail(m);
  };
  const isOp = (v: string) => {
    const k = peek();
    return k !== undefined && k.t === 'op' && k.v === v;
  };

  // ekspresi := suku (('+'|'-') suku)*   suku := unary (('*'|'/') unary)*
  function expr(): number {
    let v = term();
    for (;;) {
      if (isOp('+')) (p++, (v += term()));
      else if (isOp('-')) (p++, (v -= term()));
      else return v;
    }
  }
  function term(): number {
    let v = unary();
    for (;;) {
      if (isOp('*')) (p++, (v *= unary()));
      else if (isOp('/')) {
        p++;
        const d = unary();
        if (d === 0) fail('Pembagian dengan nol.');
        v /= d;
      } else return v;
    }
  }
  function unary(): number {
    if (isOp('-')) return (p++, -unary());
    if (isOp('+')) return (p++, unary());
    return postfix();
  }
  function postfix(): number {
    let v = primary();
    while (isOp('%')) (p++, (v /= 100));
    return v;
  }
  function primary(): number {
    const k = peek();
    if (!k) return fail('Ekspresi belum lengkap.');
    if (k.t === 'num') return (p++, k.v);
    if (k.v === '(') {
      p++;
      const v = expr();
      if (!isOp(')')) fail('Kurung buka belum ditutup.');
      p++;
      return v;
    }
    return fail(`Tidak terduga: "${k.v}"`);
  }

  try {
    const v = expr();
    if (p < toks.length) fail('Ekspresi tidak lengkap atau ada tanda kurung berlebih.');
    if (!Number.isFinite(v)) return { ok: false, error: 'Hasil di luar jangkauan.' };
    return { ok: true, value: v };
  } catch (e) {
    if (e instanceof Fail) return { ok: false, error: e.message };
    throw e;
  }
}

/** Tampilkan hasil dengan format Indonesia, maksimal 4 desimal (nol di belakang dibuang). */
export function formatCalc(v: number): string {
  const r = Math.round(v * 1e4) / 1e4;
  return r.toLocaleString('id-ID', { maximumFractionDigits: 4, useGrouping: true });
}
