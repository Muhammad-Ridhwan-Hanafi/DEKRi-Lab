// Jembatan sempit ke proses utama: empat operasi cadangan dan simpan PDF. Tidak ada akses berkas umum ke halaman.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopBackup', {
  write: (text, user) => ipcRenderer.invoke('backup:write', text, user),
  readLatest: (user) => ipcRenderer.invoke('backup:read', user),
  info: (user) => ipcRenderer.invoke('backup:info', user),
  openFolder: () => ipcRenderer.invoke('backup:open'),
  /** Dipanggil saat jendela hendak ditutup: simpan dulu, lalu panggil `done()`. */
  onBeforeClose: (cb) => {
    ipcRenderer.removeAllListeners('app:before-close');
    ipcRenderer.on('app:before-close', () => cb());
  },
  savePdf: (name) => ipcRenderer.invoke('app:pdf', name),
  closeReady: () => ipcRenderer.send('app:close-ready'),
});
