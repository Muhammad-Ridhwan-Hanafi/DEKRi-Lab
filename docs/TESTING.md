# Pengujian

| Perintah                           | Isi                                                                                           |
| ---------------------------------- | --------------------------------------------------------------------------------------------- |
| `npm test`                         | tes unit/komponen (Vitest): mesin akuntansi, penilaian, paritas dengan workbook, UI, cadangan |
| `npm run typecheck`                | TypeScript tanpa emisi                                                                        |
| `npm run format:check`             | Prettier                                                                                      |
| `npm run check`                    | ketiganya                                                                                     |
| `npm run e2e`                      | Playwright + axe-core (butuh `npx vite preview --port 4173` berjalan)                         |
| `xvfb-run -a node e2e/desktop.cjs` | uji pembungkus Electron di Linux (butuh `npm run build:single` dan binari Electron)           |

Batasan yang jujur: tidak ada pengujian di Windows asli; tes paritas workbook memakai fixture di `tests/parity` yang diturunkan dari workbook sumber; rujukan paragraf PSAK tidak diuji otomatis.
