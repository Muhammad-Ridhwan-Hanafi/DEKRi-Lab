// Padanan fungsi Excel yang dipakai rumus laporan. Murni: tanpa browser, storage, atau React.
import type { Row, Table } from './types';

/** Excel ROUND: setengah menjauhi nol (Math.round membulatkan -2,5 ke -2). */
export function xround(x: number, digits = 0): number {
  if (!Number.isFinite(x)) return x;
  const f = 10 ** digits;
  const y = Math.abs(x) * f;
  const r = Math.round(Number(y.toPrecision(15)));
  const out = (Math.sign(x) * r) / f;
  return out === 0 ? 0 : out;
}

export class ExcelError extends Error {}

/** Pembagian Excel: pembagi nol = #DIV/0! (ditangkap IFERROR). */
export function div(a: number, b: number): number {
  if (b === 0) throw new ExcelError('#DIV/0!');
  return a / b;
}

export function iferror<T, U>(f: () => T, g: () => U): T | U {
  try {
    const v = f();
    if (typeof v === 'number' && !Number.isFinite(v)) return g();
    return v;
  } catch (e) {
    if (e instanceof ExcelError) return g();
    throw e;
  }
}

type V = number | string | boolean;
const norm = (v: V) => (typeof v === 'string' ? v.toLowerCase() : v);
export const eq = (a: V, b: V) => norm(a) === norm(b);
export const ne = (a: V, b: V) => !eq(a, b);
export const lt = (a: V, b: V) => norm(a) < norm(b);
export const gt = (a: V, b: V) => norm(a) > norm(b);
export const le = (a: V, b: V) => norm(a) <= norm(b);
export const ge = (a: V, b: V) => norm(a) >= norm(b);

export function str(...parts: V[]): string {
  return parts.map(String).join('');
}

/** SUM: abaikan teks. */
export function sum(...xs: unknown[]): number {
  let t = 0;
  for (const x of xs) if (typeof x === 'number') t += x;
  return t;
}

function matcher(crit: string | number): (cell: string | number | undefined) => boolean {
  if (typeof crit === 'number') return (c) => typeof c === 'number' && c === crit;
  const m = /^(<=|>=|<>|<|>|=)(.*)$/.exec(crit);
  if (m) {
    const op = m[1];
    const rhs = m[2];
    const n = Number(rhs);
    if (rhs !== '' && !Number.isNaN(n)) {
      return (c) => {
        if (typeof c !== 'number') return op === '<>';
        return op === '>' ? c > n : op === '<' ? c < n : op === '>=' ? c >= n : op === '<=' ? c <= n : op === '=' ? c === n : c !== n;
      };
    }
    const inner = matcher(rhs);
    return op === '<>' ? (c) => !inner(c) : inner;
  }
  const re = new RegExp(
    '^' +
      crit
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.') +
      '$',
    'i',
  );
  return (c) => (c === undefined || c === null ? crit === '' : re.test(String(c)));
}

/** SUMIFS(sumCol, [kolom, kriteria]...) atas satu tabel. */
export function sumifs(table: Table, sumCol: string, criteria: Array<[string, string | number]>): number {
  const tests = criteria.map(([col, crit]) => [col, matcher(crit)] as const);
  let total = 0;
  for (const row of table) {
    let ok = true;
    for (const [col, test] of tests) {
      if (!test((row as Row)[col])) {
        ok = false;
        break;
      }
    }
    if (ok) {
      const v = (row as Row)[sumCol];
      if (typeof v === 'number') total += v;
    }
  }
  return total;
}
