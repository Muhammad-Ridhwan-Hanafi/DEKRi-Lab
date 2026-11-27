# Berkontribusi

Terima kasih sudah mau membantu. Aplikasi ini adalah alat belajar akuntansi, jadi **ketepatan angka dan jawaban lebih penting daripada fitur baru**.

## Persiapan

Pasang Rust stabil ([rustup.rs](https://rustup.rs)). Di Linux (Debian atau Ubuntu), pasang juga `libgtk-3-dev libwebkit2gtk-4.1-dev libxdo-dev libayatana-appindicator3-dev libssl-dev`.

```bash
cargo fmt --all
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
cargo run -p dekri-ui --release
```

## Aturan

- Jangan mengubah lokasi data pengguna (`Latihan Siklus Akuntansi` di `%APPDATA%`) atau folder cadangan (`Dokumen\Latihan Siklus Akuntansi\Cadangan`), dan jangan mengubah format cadangan tanpa jalur migrasi.
- Perubahan pada data soal, kunci jawaban, rumus, atau penilaian harus disertai tes (lihat `crates/dekri-core/tests/` dan `tests/parity/`).
- Jangan menambah dependensi yang memanggil jaringan atau telemetri. Aplikasi harus tetap berjalan offline.
- Jalankan `cargo fmt --all` sebelum commit. Bila `Cargo.lock` berubah, jalankan `python3 tools/gen_notices.py`.
- Satu pull request, satu topik. Jelaskan apa yang berubah dan bagaimana mengujinya.

## Melaporkan masalah

Gunakan template issue. Jangan menyalin teks standar akuntansi berhak cipta, aset, atau kode tanpa lisensi yang jelas; dengan berkontribusi Anda menyatakan memiliki hak atas kontribusi dan setuju dilisensikan MIT.
