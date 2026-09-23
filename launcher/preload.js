const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('launcherHost', {
  ready: () => ipcRenderer.invoke('launcher-ready'),
  setMode: mode => ipcRenderer.invoke('launcher-set-mode', mode),
  setPointerInteractive: interactive => ipcRenderer.invoke('launcher-pointer', Boolean(interactive)),
  getConfig: () => ipcRenderer.invoke('launcher-config'),
  quit: () => ipcRenderer.send('launcher-quit'),
  onSummon: callback => ipcRenderer.on('launcher-summon', () => callback()),
  onMode: callback => ipcRenderer.on('launcher-mode', (_, mode) => callback(mode)),
  onHotkeyError: callback => ipcRenderer.on('launcher-hotkey-error', (_, key) => callback(key))
});
