const { ipcRenderer } = require('electron')

const SELECT_DIR = 'select-dirs';
const SELECT_BACKUP_FILE = 'select-backup-file';

debugger;
process.once('loaded', () => {
  window.addEventListener('message', evt => {
    if (evt.data.type === SELECT_DIR) {
      ipcRenderer.send(SELECT_DIR, evt.data.walletData);
    }
    if (evt.data.type === SELECT_BACKUP_FILE) {
      ipcRenderer.send(SELECT_BACKUP_FILE);
    }
  })
});

window.darkMode = {
  on: () => ipcRenderer.invoke('dark-mode:on'),
  off: () => ipcRenderer.invoke('dark-mode:off')
}

window.electron = {};
window.electron.ipcRenderer = ipcRenderer;
