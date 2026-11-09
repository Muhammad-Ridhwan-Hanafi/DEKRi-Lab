import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { emptyState, hasProgress, makeBackup, parseBackup } from '../../src/store/state';

const req = createRequire(import.meta.url);
const b = req('../../desktop/backup.cjs') as {
  writeBackup(dir: string, text: string, now?: Date, user?: unknown): { dir: string; at: string };
  readLatest(dir: string, user?: unknown): string | null;
  info(dir: string, user?: unknown): { dir: string; latestAt: string | null; files: string[] };
  userSlug(user: unknown): string | null;
};
const text = (n = 0) => JSON.stringify(makeBackup({ ...emptyState(), flags: Array.from({ length: n }, (_, i) => `txn:${i}`) }));
const dir = () => join(mkdtempSync(join(tmpdir(), 'bk-')), 'Cadangan', 'dalam');

describe('cadangan otomatis EXE (modul Node)', () => {
  it('menulis berkas terbaru dan harian, membuat folder yang belum ada', () => {
    const d = dir();
    const t = text(1);
    b.writeBackup(d, t, new Date('2026-11-02T01:00:00Z'));
    expect(readdirSync(d).sort()).toEqual(['akuntansi-cadangan-2026-11-02.json', 'akuntansi-cadangan-terbaru.json']);
    expect(readFileSync(join(d, 'akuntansi-cadangan-terbaru.json'), 'utf8')).toBe(t);
    expect(readFileSync(join(d, 'akuntansi-cadangan-2026-11-02.json'), 'utf8')).toBe(t);
  });
  it('menyimpan hanya 7 hari terakhir dan tidak menyentuh berkas lain', () => {
    const d = dir();
    b.writeBackup(d, text(), new Date('2026-10-01T00:00:00Z'));
    writeFileSync(join(d, 'catatan-saya.txt'), 'jangan hapus');
    for (let i = 2; i <= 12; i++) b.writeBackup(d, text(), new Date(Date.UTC(2026, 9, i)));
    const names = readdirSync(d);
    expect(names.filter((n) => /\d{4}-\d{2}-\d{2}/.test(n))).toHaveLength(7);
    expect(names).toContain('catatan-saya.txt');
    expect(names).toContain('akuntansi-cadangan-2026-10-12.json');
    expect(names).not.toContain('akuntansi-cadangan-2026-10-01.json');
  });
  it('readLatest mengembalikan isi terakhir, null bila belum ada', () => {
    const d = dir();
    expect(b.readLatest(d)).toBeNull();
    b.writeBackup(d, text(2));
    expect(JSON.parse(b.readLatest(d)!).state.flags).toHaveLength(2);
  });
  it('menolak teks yang bukan cadangan, rusak, atau kebesaran, tanpa menulis apa pun', () => {
    const d = dir();
    expect(() => b.writeBackup(d, '{"app":"lain","version":1,"state":{}}')).toThrow(/Bukan cadangan/);
    expect(() => b.writeBackup(d, 'bukan json')).toThrow(/JSON/);
    expect(() => b.writeBackup(d, 42 as unknown as string)).toThrow(/teks/);
    expect(() => b.writeBackup(d, 'x'.repeat(21 * 1024 * 1024))).toThrow(/besar/);
    expect(() => readdirSync(d)).toThrow();
  });
  it('tidak meninggalkan berkas .tmp dan info melaporkan daftar berkas', () => {
    const d = dir();
    b.writeBackup(d, text());
    expect(readdirSync(d).some((n) => n.endsWith('.tmp'))).toBe(false);
    const i = b.info(d);
    expect(i.files).toContain('akuntansi-cadangan-terbaru.json');
    expect(i.latestAt).toMatch(/^\d{4}-/);
    expect(b.info(join(d, 'tidak-ada')).latestAt).toBeNull();
  });
});

describe('hasProgress', () => {
  it('keadaan kosong tidak dianggap progres; satu jawaban saja sudah dianggap', () => {
    expect(hasProgress(emptyState())).toBe(false);
    const s = emptyState();
    s.notes['txn:1'] = 'catatan';
    expect(hasProgress(s)).toBe(true);
  });

  describe('per pengguna', () => {
    it('setiap pengguna punya berkas terbaru dan harian sendiri; tidak saling membaca', () => {
      const d = dir();
      b.writeBackup(d, text(1), new Date('2026-11-02T01:00:00Z'), 'Rina');
      b.writeBackup(d, text(2), new Date('2026-11-02T01:00:00Z'), 'Bayu');
      expect(JSON.parse(b.readLatest(d, 'Rina')!).state.flags).toHaveLength(1);
      expect(JSON.parse(b.readLatest(d, 'Bayu')!).state.flags).toHaveLength(2);
      expect(readdirSync(d)).toHaveLength(4); // 2 pengguna x (terbaru + harian)
      expect(b.readLatest(d, 'Citra')).toBeNull(); // pengguna baru: tidak melihat milik orang lain
    });
    it('huruf besar/kecil dan spasi ganda dianggap pengguna yang sama', () => {
      const d = dir();
      b.writeBackup(d, text(1), undefined, 'Rina  Putri');
      expect(b.readLatest(d, 'rina putri')).not.toBeNull();
      expect(b.userSlug('Rina Putri')).toBe(b.userSlug('rina   PUTRI'));
    });
    it('retensi 7 hari dihitung per pengguna dan tidak menghapus cadangan pengguna lain', () => {
      const d = dir();
      for (let i = 1; i <= 10; i++) b.writeBackup(d, text(), new Date(Date.UTC(2026, 9, i)), 'Rina');
      b.writeBackup(d, text(), new Date(Date.UTC(2026, 9, 1)), 'Bayu');
      const names = readdirSync(d);
      const rina = b.userSlug('Rina')!;
      const bayu = b.userSlug('Bayu')!;
      expect(names.filter((n) => n.includes(rina) && /\d{4}-\d{2}-\d{2}/.test(n))).toHaveLength(7);
      expect(names.filter((n) => n.includes(bayu) && /\d{4}-\d{2}-\d{2}/.test(n))).toHaveLength(1);
    });
    it('nama berbahaya tidak bisa keluar dari folder dan tipe salah ditolak', () => {
      const d = dir();
      b.writeBackup(d, text(), undefined, '../../etc/passwd');
      for (const n of readdirSync(d)) expect(n).toMatch(/^[a-z0-9.-]+$/);
      expect(() => b.writeBackup(d, text(), undefined, { x: 1 })).toThrow(/tidak valid/);
      expect(() => b.writeBackup(d, text(), undefined, 'x'.repeat(201))).toThrow(/tidak valid/);
    });
    it('cadangan lama (tanpa pengguna) hanya ditawarkan sampai ada cadangan per pengguna', () => {
      const d = dir();
      b.writeBackup(d, text(3)); // berkas versi lama
      expect(JSON.parse(b.readLatest(d, 'Rina')!).state.flags).toHaveLength(3);
      expect(b.info(d, 'Rina').latestAt).not.toBeNull();
      b.writeBackup(d, text(1), undefined, 'Bayu'); // sudah ada cadangan per pengguna
      expect(b.readLatest(d, 'Rina')).toBeNull(); // Rina tidak lagi diberi cadangan lama milik orang lain
      expect(b.info(d, 'Rina').latestAt).toBeNull();
    });
  });
});

describe('cadangan: masukan berbahaya', () => {
  it('nama pengguna dengan karakter jalur tidak bisa keluar dari folder cadangan', () => {
    const d = dir();
    for (const u of ['../../evil', '..\\..\\evil', 'a/b/c', '\u0000x', 'C:\\Windows\\x', '%2e%2e/x']) {
      b.writeBackup(d, text(1), new Date('2026-11-02T01:00:00Z'), u);
    }
    for (const n of readdirSync(d)) expect(n).toMatch(/^akuntansi-cadangan-[a-z0-9-]+\.json$/);
  });
  it('menolak nama pengguna bukan teks atau terlalu panjang', () => {
    const d = dir();
    expect(() => b.writeBackup(d, text(), new Date(), 123)).toThrow();
    expect(() => b.writeBackup(d, text(), new Date(), {})).toThrow();
    expect(() => b.writeBackup(d, text(), new Date(), 'x'.repeat(201))).toThrow();
  });
  it('menolak isi bukan teks, bukan JSON, app salah, dan terlalu besar', () => {
    const d = dir();
    expect(() => b.writeBackup(d, { app: 'akuntansi-practice' } as never)).toThrow();
    expect(() => b.writeBackup(d, '{bukan json')).toThrow();
    expect(() => b.writeBackup(d, '{"app":"lain","version":1,"state":{}}')).toThrow();
    expect(() => b.writeBackup(d, '{"app":"akuntansi-practice","version":1,"state":null}')).toThrow();
    expect(() => b.writeBackup(d, ' '.repeat(21 * 1024 * 1024))).toThrow(/besar/);
  });
  it('tidak menulis menembus tautan simbolik dan menolak membaca berkas non-biasa', () => {
    const d = dir();
    mkdirSync(d, { recursive: true });
    const target = join(mkdtempSync(join(tmpdir(), 'tgt-')), 'korban.txt');
    writeFileSync(target, 'asli');
    symlinkSync(target, join(d, 'akuntansi-cadangan-terbaru.json'));
    const t = text(1); // satu kali: text() memuat cap waktu ekspor yang berubah tiap panggilan
    b.writeBackup(d, t, new Date('2026-11-02T01:00:00Z'));
    expect(readFileSync(target, 'utf8')).toBe('asli');
    expect(b.readLatest(d)).toBe(t);
    rmSync(join(d, 'akuntansi-cadangan-terbaru.json'));
    mkdirSync(join(d, 'akuntansi-cadangan-terbaru.json'));
    expect(() => b.readLatest(d)).toThrow(/bukan berkas biasa/);
  });
});

describe('impor cadangan: pencemaran prototipe', () => {
  it('kunci __proto__/constructor pada peta jawaban tidak mencemari Object.prototype', () => {
    const evil = `{"app":"akuntansi-practice","version":1,"exportedAt":"x","state":{"journal":{"__proto__":[{"code":"1-1100","debit":1,"credit":0}],"constructor":[]},"notes":{"__proto__":{"polluted":"ya"}},"pajak":{"__proto__":"x"},"__proto__":{"polluted":"ya"}}}`;
    try {
      parseBackup(evil);
    } catch {
      /* boleh ditolak */
    }
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(Object.prototype, 'polluted')).toBe(false);
  });
});
