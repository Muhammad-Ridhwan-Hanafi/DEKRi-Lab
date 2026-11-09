// Logika cadangan otomatis versi EXE. Modul Node murni (tanpa Electron) agar bisa diuji.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const APP = 'akuntansi-practice';
const LATEST = 'akuntansi-cadangan-terbaru.json';
const DAILY = /^akuntansi-cadangan-(\d{4}-\d{2}-\d{2})\.json$/;
const KEEP_DAYS = 7;
const MAX_BYTES = 20 * 1024 * 1024;

const dailyName = (d) => `akuntansi-cadangan-${d.toISOString().slice(0, 10)}.json`;

/**
 * Cadangan per pengguna: nama berkas memuat penanda pengguna. Nama datang dari halaman, jadi dibentuk ulang di sini:
 * hanya [a-z0-9-] dan potongan hash, sehingga tidak ada karakter jalur dan dua nama berbeda tidak bisa bertabrakan.
 * Tanpa pengguna (null/undefined) memakai nama berkas lama.
 */
function userSlug(user) {
  if (user === undefined || user === null || user === '') return null;
  if (typeof user !== 'string' || user.length > 200) throw new Error('Nama pengguna tidak valid.');
  const key = user.replace(/\s+/g, ' ').trim().normalize('NFC').toLowerCase();
  if (!key) return null;
  const base =
    key
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24) || 'u';
  return `${base}-${crypto.createHash('sha1').update(key).digest('hex').slice(0, 8)}`;
}
const latestOf = (slug) => (slug ? `akuntansi-cadangan-${slug}-terbaru.json` : LATEST);
const dailyOf = (d, slug) => (slug ? `akuntansi-cadangan-${slug}-${d.toISOString().slice(0, 10)}.json` : dailyName(d));
const dailyRe = (slug) => (slug ? new RegExp(`^akuntansi-cadangan-${slug}-(\\d{4}-\\d{2}-\\d{2})\\.json$`) : DAILY);
const SCOPED_LATEST = /^akuntansi-cadangan-.+-terbaru\.json$/;
/** Cadangan lama (tanpa pengguna) hanya ditawarkan selama belum ada cadangan per pengguna sama sekali. */
function legacyUsable(dir) {
  try {
    return !fs.readdirSync(dir).some((n) => SCOPED_LATEST.test(n));
  } catch {
    return true;
  }
}

/** Terima hanya teks JSON cadangan aplikasi ini; menolak yang lain sebelum menyentuh disk. */
function validate(text) {
  if (typeof text !== 'string') throw new Error('Isi cadangan harus berupa teks.');
  if (Buffer.byteLength(text) > MAX_BYTES) throw new Error('Cadangan terlalu besar.');
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('Cadangan bukan JSON yang valid.');
  }
  if (!raw || typeof raw !== 'object' || raw.app !== APP || raw.version !== 1 || typeof raw.state !== 'object' || raw.state === null)
    throw new Error('Bukan cadangan aplikasi ini.');
}

/** Tulis lewat berkas sementara lalu ganti nama, sehingga cadangan lama tidak rusak bila proses terhenti di tengah. */
function atomicWrite(file, text) {
  try {
    if (fs.lstatSync(file).isSymbolicLink()) fs.rmSync(file, { force: true }); // jangan menulis menembus tautan simbolik
  } catch {
    /* belum ada */
  }
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, text, 'utf8');
  fs.renameSync(tmp, file);
}

function writeBackup(dir, text, now = new Date(), user) {
  validate(text);
  const slug = userSlug(user);
  fs.mkdirSync(dir, { recursive: true });
  atomicWrite(path.join(dir, latestOf(slug)), text);
  atomicWrite(path.join(dir, dailyOf(now, slug)), text);
  const re = dailyRe(slug);
  const dated = fs
    .readdirSync(dir)
    .filter((n) => re.test(n))
    .sort();
  for (const n of dated.slice(0, Math.max(0, dated.length - KEEP_DAYS))) fs.rmSync(path.join(dir, n), { force: true });
  return { dir, at: now.toISOString() };
}

/** Tolak tautan simbolik/bukan berkas biasa dan berkas terlalu besar sebelum dibaca. */
function safeRegularFile(f) {
  let st;
  try {
    st = fs.lstatSync(f);
  } catch {
    return false;
  }
  if (!st.isFile()) throw new Error('Berkas cadangan bukan berkas biasa.');
  if (st.size > MAX_BYTES) throw new Error('Cadangan terlalu besar.');
  return true;
}

function readLatest(dir, user) {
  const slug = userSlug(user);
  let f = path.join(dir, latestOf(slug));
  if (slug && !fs.existsSync(f) && legacyUsable(dir)) f = path.join(dir, LATEST);
  if (!safeRegularFile(f)) return null;
  const text = fs.readFileSync(f, 'utf8');
  validate(text);
  return text;
}

function info(dir, user) {
  const slug = userSlug(user);
  const own = latestOf(slug);
  const useLegacy = !!slug && !fs.existsSync(path.join(dir, own)) && legacyUsable(dir);
  const f = path.join(dir, useLegacy ? LATEST : own);
  const re = dailyRe(useLegacy ? null : slug);
  const names = new Set([useLegacy ? LATEST : own]);
  let latestAt = null;
  try {
    latestAt = fs.statSync(f).mtime.toISOString();
  } catch {
    /* belum ada cadangan */
  }
  let files = [];
  try {
    files = fs
      .readdirSync(dir)
      .filter((n) => names.has(n) || re.test(n))
      .sort();
  } catch {
    /* folder belum ada */
  }
  return { dir, latestAt, files };
}

module.exports = { writeBackup, readLatest, info, validate, dailyName, userSlug, LATEST, KEEP_DAYS };
