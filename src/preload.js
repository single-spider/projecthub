const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Projects
  getProjects: () => ipcRenderer.invoke('get-projects'),
  saveProjects: (projects) => ipcRenderer.invoke('save-projects', projects),
  getProcessLogs: () => ipcRenderer.invoke('get-process-logs'),
  saveProcessLogs: (logs) => ipcRenderer.invoke('save-process-logs', logs),
  clearProcessLog: (id) => ipcRenderer.invoke('clear-process-log', id),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),

  // Dialogs
  pickFolder: () => ipcRenderer.invoke('pick-folder'),
  pickFile: () => ipcRenderer.invoke('pick-file'),
  openInExplorer: (p) => ipcRenderer.invoke('open-in-explorer', p),
  openExternal: (target) => ipcRenderer.invoke('open-external', target),
  detectProject: (p) => ipcRenderer.invoke('detect-project', p),
  validateProjectPath: (p) => ipcRenderer.invoke('validate-project-path', p),
  exportProjects: (projects) => ipcRenderer.invoke('export-projects', projects),
  importProjects: () => ipcRenderer.invoke('import-projects'),
  exportProcessLog: (payload) => ipcRenderer.invoke('export-process-log', payload),
  checkHealth: (target) => ipcRenderer.invoke('check-health', target),

  // Process management
  launchProject: (opts) => ipcRenderer.invoke('launch-project', opts),
  stopProject: (id) => ipcRenderer.invoke('stop-project', id),
  sendInput: (id, input) => ipcRenderer.invoke('send-input', { id, input }),
  isRunning: (id) => ipcRenderer.invoke('is-running', id),

  // Terminal
  terminalCreate: (id, cwd, size) => ipcRenderer.invoke('terminal-create', { id, cwd, ...(size || {}) }),
  terminalWrite: (id, data) => ipcRenderer.invoke('terminal-write', { id, data }),
  terminalResize: (id, cols, rows) => ipcRenderer.invoke('terminal-resize', { id, cols, rows }),
  terminalKill: (id) => ipcRenderer.invoke('terminal-kill', id),
  terminalListProjectFiles: (rootPath) => ipcRenderer.invoke('terminal-list-project-files', rootPath),
  terminalReadProjectFile: (rootPath, relativePath) => ipcRenderer.invoke('terminal-read-project-file', { rootPath, relativePath }),
  terminalWriteProjectFile: (rootPath, relativePath, text) => ipcRenderer.invoke('terminal-write-project-file', { rootPath, relativePath, text }),
  terminalCreateProjectEntry: (rootPath, parentPath, name, type) => ipcRenderer.invoke('terminal-create-project-entry', { rootPath, parentPath, name, type }),
  terminalRenameProjectEntry: (rootPath, relativePath, name) => ipcRenderer.invoke('terminal-rename-project-entry', { rootPath, relativePath, name }),
  terminalDeleteProjectEntry: (rootPath, relativePath) => ipcRenderer.invoke('terminal-delete-project-entry', { rootPath, relativePath }),
  terminalGitInfo: (rootPath) => ipcRenderer.invoke('terminal-git-info', rootPath),
  terminalGitAction: (rootPath, action, file, message) => ipcRenderer.invoke('terminal-git-action', { rootPath, action, file, message }),

  // Events
  onProcessOutput: (cb) => { ipcRenderer.on('process-output', (_, d) => cb(d)); },
  onProcessExit: (cb) => { ipcRenderer.on('process-exit', (_, d) => cb(d)); },
  onProcessResource: (cb) => { ipcRenderer.on('process-resource', (_, d) => cb(d)); },
  onTerminalData: (cb) => { ipcRenderer.on('terminal-data', (_, d) => cb(d)); },
  onTerminalExit: (cb) => { ipcRenderer.on('terminal-exit', (_, d) => cb(d)); },
  offAllListeners: () => {
    ['process-output','process-exit','process-resource','terminal-data','terminal-exit'].forEach(ch => ipcRenderer.removeAllListeners(ch));
  },

  // Window
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
});
