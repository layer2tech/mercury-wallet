window.require = require;

const { ipcRenderer } = require('electron')

const SELECT_DIR = 'select-dirs';
const SELECT_BACKUP_FILE = 'select-backup-file';

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

window.electron = {};
window.electron.ipcRenderer = ipcRenderer;
