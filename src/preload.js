const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Projects
  getProjects: () => ipcRenderer.invoke('get-projects'),
  saveProjects: (projects) => ipcRenderer.invoke('save-projects', projects),

  // Dialogs
  pickFolder: () => ipcRenderer.invoke('pick-folder'),
  pickFile: () => ipcRenderer.invoke('pick-file'),
  openInExplorer: (p) => ipcRenderer.invoke('open-in-explorer', p),
  detectProject: (p) => ipcRenderer.invoke('detect-project', p),
  validateProjectPath: (p) => ipcRenderer.invoke('validate-project-path', p),

  // Process management
  launchProject: (opts) => ipcRenderer.invoke('launch-project', opts),
  stopProject: (id) => ipcRenderer.invoke('stop-project', id),
  sendInput: (id, input) => ipcRenderer.invoke('send-input', { id, input }),
  isRunning: (id) => ipcRenderer.invoke('is-running', id),

  // Terminal
  terminalCreate: (id, cwd) => ipcRenderer.invoke('terminal-create', { id, cwd }),
  terminalWrite: (id, data) => ipcRenderer.invoke('terminal-write', { id, data }),
  terminalKill: (id) => ipcRenderer.invoke('terminal-kill', id),

  // Events
  onProcessOutput: (cb) => { ipcRenderer.on('process-output', (_, d) => cb(d)); },
  onProcessExit: (cb) => { ipcRenderer.on('process-exit', (_, d) => cb(d)); },
  onTerminalData: (cb) => { ipcRenderer.on('terminal-data', (_, d) => cb(d)); },
  onTerminalExit: (cb) => { ipcRenderer.on('terminal-exit', (_, d) => cb(d)); },
  offAllListeners: () => {
    ['process-output','process-exit','terminal-data','terminal-exit'].forEach(ch => ipcRenderer.removeAllListeners(ch));
  },

  // Window
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
});
