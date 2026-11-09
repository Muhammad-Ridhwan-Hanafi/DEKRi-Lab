import { beforeEach } from 'vitest';
import { setScope, userKeyOf } from '../src/store/scope';

// Layar masuk menutupi aplikasi bila belum ada profil. Tes yang merender <App /> dianggap sudah masuk,
// kecuali tests/ui/login.test.tsx yang menghapus profil ini sendiri.
export const PROFILE_KEY = 'akuntansi-practice:profile:v1';
function seed() {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ name: 'Penguji', since: '2024-01-01T00:00:00.000Z' }));
  } catch {
    // diabaikan
  }
}
// Berkas tes yang mengimpor store secara statis memakai ruang data pengguna bawaan ini (sama dengan yang dipilih App
// untuk profil di atas), sehingga loadState/saveState langsung di tes mengarah ke data yang sama dengan aplikasi.
const scope = () => setScope(userKeyOf('Penguji'));
seed(); // untuk berkas yang memakai beforeAll
scope();
beforeEach(() => {
  seed();
  scope();
});
