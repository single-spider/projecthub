const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, execFile } = require('child_process');
const os = require('os');
const net = require('net');
const http = require('http');
const https = require('https');
const pty = require('node-pty');

let mainWindow;
const runningProcesses = new Map();
const resourceSamples = new Map();
const resourceSampleTimers = new Map();
let cleanupPromise = null;
let quitAfterCleanup = false;
let quitCleanupPromise = null;
const DATA_FILE = path.join(app.getPath('userData'), 'projects.json');
const LOGS_FILE = path.join(app.getPath('userData'), 'process-logs.json');
const SETTINGS_FILE = path.join(app.getPath('userData'), 'settings.json');
const MAX_LOG_ENTRIES_PER_PROJECT = 1000;
const RESOURCE_SAMPLE_MS = 2000;
const MAX_PROJECT_TREE_ENTRIES = 1200;
const MAX_TEXT_PREVIEW_BYTES = 120 * 1024;
const MAX_IMAGE_PREVIEW_BYTES = 5 * 1024 * 1024;
const HEALTH_TIMEOUT_MS = 3500;
const DOCKER_COMPOSE_FILES = ['docker-compose.yml', 'docker-compose.yaml', 'compose.yml', 'compose.yaml'];
const AGENT_CLIS = ['codex', 'claude', 'aider', 'gemini', 'goose'];
const TREE_IGNORE_DIRS = new Set([
  '.git', 'node_modules', '.venv', 'venv', 'env', 'dist', 'build', 'out',
  '.next', '.expo', '.turbo', '.cache', '__pycache__',
]);
let windowsPathCache = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    frame: false,
    transparent: true,
    vibrancy: 'under-window',
    visualEffectState: 'active',
    titleBarStyle: 'hidden',
    backgroundColor: '#00000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
    cleanupAllProcesses();
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', (event) => {
  if (quitAfterCleanup) return;

  event.preventDefault();
  if (!quitCleanupPromise) {
    quitCleanupPromise = cleanupAllProcesses().finally(() => {
      quitAfterCleanup = true;
      app.quit();
    });
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ─── Data persistence ───────────────────────────────────────────────────────

function loadProjects() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (e) {}
  return [];
}

function saveProjects(projects) {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(projects, null, 2));
    return true;
  } catch (e) {
    return false;
  }
}

ipcMain.handle('get-projects', () => loadProjects());
ipcMain.handle('save-projects', (_, projects) => saveProjects(projects));

function normalizeSettings(settings) {
  const value = settings && typeof settings === 'object' && !Array.isArray(settings) ? settings : {};
  const logRetention = Math.max(100, Math.min(5000, Number(value.logRetention) || MAX_LOG_ENTRIES_PER_PROJECT));
  return {
    defaultShell: String(value.defaultShell || '').trim(),
    logRetention,
    startupView: ['projects', 'output', 'terminal'].includes(value.startupView) ? value.startupView : 'projects',
  };
}

function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return normalizeSettings(JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')));
    }
  } catch (e) {}
  return normalizeSettings({});
}

function saveSettings(settings) {
  try {
    fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(normalizeSettings(settings), null, 2));
    return true;
  } catch (e) {
    return false;
  }
}

function getLogRetentionLimit() {
  return loadSettings().logRetention || MAX_LOG_ENTRIES_PER_PROJECT;
}

ipcMain.handle('get-settings', () => loadSettings());
ipcMain.handle('save-settings', (_, settings) => saveSettings(settings));

function normalizeProcessLogs(logs) {
  const normalized = {};
  const limit = getLogRetentionLimit();
  if (!logs || typeof logs !== 'object' || Array.isArray(logs)) return normalized;

  Object.entries(logs).forEach(([id, value]) => {
    if (!value || typeof value !== 'object') return;
    const entries = Array.isArray(value.entries)
      ? value.entries.slice(-limit).map((entry) => ({
          data: String(entry.data || ''),
          type: String(entry.type || 'stdout'),
          time: Number(entry.time) || Date.now(),
        }))
      : [];

    normalized[id] = {
      entries,
      lastRun: value.lastRun && typeof value.lastRun === 'object' ? value.lastRun : null,
    };
  });

  return normalized;
}

function loadProcessLogs() {
  try {
    if (fs.existsSync(LOGS_FILE)) {
      return normalizeProcessLogs(JSON.parse(fs.readFileSync(LOGS_FILE, 'utf8')));
    }
  } catch (e) {}
  return {};
}

function saveProcessLogs(logs) {
  try {
    fs.mkdirSync(path.dirname(LOGS_FILE), { recursive: true });
    fs.writeFileSync(LOGS_FILE, JSON.stringify(normalizeProcessLogs(logs), null, 2));
    return true;
  } catch (e) {
    return false;
  }
}

ipcMain.handle('get-process-logs', () => loadProcessLogs());
ipcMain.handle('save-process-logs', (_, logs) => saveProcessLogs(logs));
ipcMain.handle('clear-process-log', (_, id) => {
  const logs = loadProcessLogs();
  if (id) delete logs[id];
  return saveProcessLogs(logs);
});

function isInsidePath(rootPath, targetPath) {
  const root = path.resolve(rootPath);
  const target = path.resolve(targetPath);
  return target === root || target.startsWith(root + path.sep);
}

function listProjectFiles(rootPath) {
  const validation = validateProjectPath(rootPath);
  if (!validation.valid) return { success: false, error: validation.error, files: [] };

  const files = [];
  let truncated = false;

  function walk(dirPath, depth) {
    if (files.length >= MAX_PROJECT_TREE_ENTRIES) {
      truncated = true;
      return;
    }

    let entries = [];
    try {
      entries = fs.readdirSync(dirPath, { withFileTypes: true });
    } catch (e) {
      return;
    }

    entries
      .filter((entry) => !entry.name.startsWith('.') || entry.name === '.env')
      .filter((entry) => !(entry.isDirectory() && TREE_IGNORE_DIRS.has(entry.name)))
      .sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name))
      .forEach((entry) => {
        if (files.length >= MAX_PROJECT_TREE_ENTRIES) {
          truncated = true;
          return;
        }

        const fullPath = path.join(dirPath, entry.name);
        const relativePath = path.relative(rootPath, fullPath);
        let stat = null;
        try {
          stat = fs.statSync(fullPath);
        } catch (e) {}

        files.push({
          name: entry.name,
          path: relativePath,
          type: entry.isDirectory() ? 'dir' : 'file',
          depth,
          size: stat?.size || 0,
          modified: stat?.mtimeMs || 0,
          ext: entry.isDirectory() ? '' : path.extname(entry.name).toLowerCase(),
        });

        if (entry.isDirectory()) walk(fullPath, depth + 1);
      });
  }

  walk(rootPath, 0);
  return { success: true, files, truncated };
}

function readProjectTextFile(rootPath, relativePath) {
  const validation = validateProjectPath(rootPath);
  if (!validation.valid) return { success: false, error: validation.error };
  if (!relativePath || path.isAbsolute(relativePath)) return { success: false, error: 'Select a project file first.' };

  const fullPath = path.resolve(rootPath, relativePath);
  if (!isInsidePath(rootPath, fullPath)) return { success: false, error: 'File is outside the project folder.' };

  try {
    const stat = fs.statSync(fullPath);
    if (!stat.isFile()) return { success: false, error: 'Select a file to preview.' };
    const ext = path.extname(fullPath).toLowerCase();
    const imageTypes = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.bmp': 'image/bmp',
    };

    if (imageTypes[ext]) {
      if (stat.size > MAX_IMAGE_PREVIEW_BYTES) return { success: false, error: 'Image is too large to preview.' };
      const buffer = fs.readFileSync(fullPath);
      return {
        success: true,
        path: relativePath,
        size: stat.size,
        kind: 'image',
        mime: imageTypes[ext],
        dataUrl: `data:${imageTypes[ext]};base64,${buffer.toString('base64')}`,
      };
    }

    if (stat.size > MAX_TEXT_PREVIEW_BYTES) return { success: false, error: 'File is too large to preview.' };

    const buffer = fs.readFileSync(fullPath);
    if (buffer.includes(0)) return { success: false, error: 'Binary files are not previewed.' };
    return { success: true, path: relativePath, size: stat.size, kind: 'text', text: buffer.toString('utf8') };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function writeProjectTextFile(rootPath, relativePath, text) {
  const validation = validateProjectPath(rootPath);
  if (!validation.valid) return { success: false, error: validation.error };
  if (!relativePath || path.isAbsolute(relativePath)) return { success: false, error: 'Select a project file first.' };

  const fullPath = path.resolve(rootPath, relativePath);
  if (!isInsidePath(rootPath, fullPath)) return { success: false, error: 'File is outside the project folder.' };

  try {
    const stat = fs.statSync(fullPath);
    if (!stat.isFile()) return { success: false, error: 'Select a file to edit.' };
    if (Buffer.byteLength(String(text || ''), 'utf8') > MAX_TEXT_PREVIEW_BYTES) {
      return { success: false, error: 'File is too large to save from ProjectHub.' };
    }
    fs.writeFileSync(fullPath, String(text || ''), 'utf8');
    return { success: true, path: relativePath, size: Buffer.byteLength(String(text || ''), 'utf8') };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function validateProjectEntryName(name) {
  const value = String(name || '').trim();
  if (!value) return { valid: false, error: 'Name is required.' };
  if (/[<>:"/\\|?*\x00-\x1F]/.test(value) || value === '.' || value === '..') {
    return { valid: false, error: 'Name contains invalid path characters.' };
  }
  return { valid: true, name: value };
}

function resolveProjectEntry(rootPath, relativePath='') {
  const validation = validateProjectPath(rootPath);
  if (!validation.valid) return { success: false, error: validation.error };
  if (path.isAbsolute(String(relativePath || ''))) return { success: false, error: 'Project entry must be relative.' };

  const fullPath = path.resolve(rootPath, relativePath || '.');
  if (!isInsidePath(rootPath, fullPath)) return { success: false, error: 'Path is outside the project folder.' };
  return { success: true, fullPath };
}

function createProjectEntry(rootPath, parentPath, name, type) {
  const parent = resolveProjectEntry(rootPath, parentPath || '');
  if (!parent.success) return parent;
  const nameCheck = validateProjectEntryName(name);
  if (!nameCheck.valid) return { success: false, error: nameCheck.error };

  const fullPath = path.resolve(parent.fullPath, nameCheck.name);
  if (!isInsidePath(rootPath, fullPath)) return { success: false, error: 'Path is outside the project folder.' };
  if (pathExists(fullPath)) return { success: false, error: 'A file or folder with that name already exists.' };

  try {
    if (type === 'dir') fs.mkdirSync(fullPath);
    else fs.writeFileSync(fullPath, '', { flag: 'wx' });
    return { success: true, path: path.relative(rootPath, fullPath) };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function renameProjectEntry(rootPath, relativePath, name) {
  const entry = resolveProjectEntry(rootPath, relativePath);
  if (!entry.success) return entry;
  const nameCheck = validateProjectEntryName(name);
  if (!nameCheck.valid) return { success: false, error: nameCheck.error };

  const fullPath = entry.fullPath;
  const targetPath = path.resolve(path.dirname(fullPath), nameCheck.name);
  if (!isInsidePath(rootPath, targetPath)) return { success: false, error: 'Path is outside the project folder.' };
  if (pathExists(targetPath)) return { success: false, error: 'A file or folder with that name already exists.' };

  try {
    fs.renameSync(fullPath, targetPath);
    return { success: true, path: path.relative(rootPath, targetPath) };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function deleteProjectEntry(rootPath, relativePath) {
  const entry = resolveProjectEntry(rootPath, relativePath);
  if (!entry.success) return entry;
  if (!relativePath) return { success: false, error: 'Cannot delete the project root.' };

  try {
    const stat = fs.statSync(entry.fullPath);
    if (stat.isDirectory()) fs.rmSync(entry.fullPath, { recursive: true, force: false });
    else fs.unlinkSync(entry.fullPath);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function parseGitStatus(statusOut) {
  return String(statusOut || '').split(/\r?\n/).filter(Boolean).map((line) => {
    if (line.startsWith('##')) return null;
    return {
      index: line.slice(0, 1).trim(),
      working: line.slice(1, 2).trim(),
      path: line.slice(3).trim(),
      raw: line,
    };
  }).filter(Boolean);
}

function splitGitChanges(changes) {
  const staged = [];
  const unstaged = [];
  const untracked = [];

  changes.forEach((change) => {
    if (change.index === '?' && change.working === '?') {
      untracked.push(change);
      return;
    }
    if (change.index) staged.push(change);
    if (change.working) unstaged.push(change);
  });

  return { staged, unstaged, untracked };
}

function parseGitLog(logOut) {
  return String(logOut || '').split(/\r?\n/).filter(Boolean).map((line) => {
    const match = line.match(/^([a-f0-9]{7,40})\s+(.+)$/i);
    if (!match) return null;
    return { hash: match[1], subject: match[2] };
  }).filter(Boolean);
}

function getGitInfo(rootPath) {
  const validation = validateProjectPath(rootPath);
  if (!validation.valid) return Promise.resolve({ success: false, error: validation.error });

  return new Promise((resolve) => {
    execFile('git', ['-C', rootPath, 'status', '--short', '--branch'], { timeout: 5000 }, (statusErr, statusOut) => {
      if (statusErr) return resolve({ success: false, error: 'No git repository detected.' });

      execFile('git', ['-C', rootPath, 'log', '--oneline', '-8'], { timeout: 5000 }, (logErr, logOut) => {
        const lines = String(statusOut || '').split(/\r?\n/);
        const branch = lines.find(line => line.startsWith('##')) || '';
        const changes = parseGitStatus(statusOut);
        resolve({
          success: true,
          status: statusOut || '',
          branch,
          changes,
          ...splitGitChanges(changes),
          commits: logErr ? [] : parseGitLog(logOut),
          log: logErr ? '' : (logOut || ''),
        });
      });
    });
  });
}

function runGit(rootPath, args) {
  const validation = validateProjectPath(rootPath);
  if (!validation.valid) return Promise.resolve({ success: false, error: validation.error });

  return new Promise((resolve) => {
    execFile('git', ['-C', rootPath, ...args], { timeout: 10000 }, (err, stdout, stderr) => {
      resolve({
        success: !err,
        output: stdout || '',
        error: err ? (stderr || err.message) : '',
      });
    });
  });
}

async function handleGitAction(rootPath, payload) {
  const action = String(payload?.action || '');
  const file = String(payload?.file || '');
  const message = String(payload?.message || '').trim();

  if (['stage', 'unstage', 'discard', 'diff', 'diff-staged', 'delete-untracked'].includes(action) && (!file || path.isAbsolute(file))) {
    return { success: false, error: 'Select a changed file first.' };
  }

  if (action === 'stage') return runGit(rootPath, ['add', '--', file]);
  if (action === 'stage-all') return runGit(rootPath, ['add', '--all']);
  if (action === 'unstage') return runGit(rootPath, ['restore', '--staged', '--', file]);
  if (action === 'unstage-all') return runGit(rootPath, ['restore', '--staged', '--', '.']);
  if (action === 'discard') return runGit(rootPath, ['restore', '--', file]);
  if (action === 'diff') return runGit(rootPath, ['diff', '--', file]);
  if (action === 'diff-staged') return runGit(rootPath, ['diff', '--cached', '--', file]);
  if (action === 'delete-untracked') return runGit(rootPath, ['clean', '-fd', '--', file]);
  if (action === 'revert-commit') {
    if (!/^[a-f0-9]{7,40}$/i.test(file)) return { success: false, error: 'Select a commit to revert.' };
    return runGit(rootPath, ['revert', '--no-edit', file]);
  }
  if (action === 'commit') {
    if (!message) return { success: false, error: 'Commit message is required.' };
    return runGit(rootPath, ['commit', '-m', message]);
  }

  return { success: false, error: 'Unknown git action.' };
}

ipcMain.handle('terminal-list-project-files', (_, rootPath) => listProjectFiles(rootPath));
ipcMain.handle('terminal-read-project-file', (_, { rootPath, relativePath }) => readProjectTextFile(rootPath, relativePath));
ipcMain.handle('terminal-write-project-file', (_, { rootPath, relativePath, text }) => writeProjectTextFile(rootPath, relativePath, text));
ipcMain.handle('terminal-create-project-entry', (_, { rootPath, parentPath, name, type }) => createProjectEntry(rootPath, parentPath, name, type));
ipcMain.handle('terminal-rename-project-entry', (_, { rootPath, relativePath, name }) => renameProjectEntry(rootPath, relativePath, name));
ipcMain.handle('terminal-delete-project-entry', (_, { rootPath, relativePath }) => deleteProjectEntry(rootPath, relativePath));
ipcMain.handle('terminal-git-info', (_, rootPath) => getGitInfo(rootPath));
ipcMain.handle('terminal-git-action', (_, { rootPath, action, file, message }) => handleGitAction(rootPath, { action, file, message }));

// ─── File / folder dialogs ───────────────────────────────────────────────────

ipcMain.handle('pick-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Project Folder'
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('pick-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    title: 'Select Entry Point File'
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('open-in-explorer', (_, folderPath) => {
  shell.openPath(folderPath);
});

ipcMain.handle('open-external', (_, target) => {
  const url = normalizeExternalUrl(target);
  if (!url) return false;
  shell.openExternal(url);
  return true;
});

ipcMain.handle('export-projects', async (_, projects) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export ProjectHub Projects',
    defaultPath: path.join(os.homedir(), 'projecthub-projects.json'),
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (result.canceled || !result.filePath) return { success: false, canceled: true };

  try {
    const exportData = Array.isArray(projects) ? projects : loadProjects();
    fs.writeFileSync(result.filePath, JSON.stringify(exportData, null, 2));
    return { success: true, path: result.filePath };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('import-projects', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Import ProjectHub Projects',
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (result.canceled || !result.filePaths[0]) return { success: false, canceled: true };

  try {
    const parsed = JSON.parse(fs.readFileSync(result.filePaths[0], 'utf8'));
    if (!Array.isArray(parsed)) return { success: false, error: 'Import file must contain a project array.' };
    return { success: true, projects: parsed, path: result.filePaths[0] };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('export-process-log', async (_, payload) => {
  const projectName = sanitizeFileName(payload?.project?.name || payload?.project?.id || 'project');
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Process Log',
    defaultPath: path.join(os.homedir(), `${projectName}-process-log.txt`),
    filters: [{ name: 'Text', extensions: ['txt'] }],
  });
  if (result.canceled || !result.filePath) return { success: false, canceled: true };

  try {
    fs.writeFileSync(result.filePath, formatProcessLogExport(payload), 'utf8');
    return { success: true, path: result.filePath };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

function validateProjectPath(folderPath) {
  if (!folderPath || !String(folderPath).trim()) {
    return { valid: false, error: 'Project folder is required.' };
  }

  try {
    const stat = fs.statSync(folderPath);
    if (!stat.isDirectory()) {
      return { valid: false, error: 'Project folder must be a directory.' };
    }
    return { valid: true };
  } catch (e) {
    if (e.code === 'ENOENT') return { valid: false, error: 'Project folder does not exist.' };
    if (e.code === 'EACCES' || e.code === 'EPERM') return { valid: false, error: 'Project folder is not accessible.' };
    return { valid: false, error: e.message || 'Project folder could not be checked.' };
  }
}

ipcMain.handle('validate-project-path', (_, folderPath) => validateProjectPath(folderPath));

function pathExists(targetPath) {
  try {
    return Boolean(targetPath && fs.existsSync(targetPath));
  } catch (e) {
    return false;
  }
}

function quoteCommandPath(commandPath) {
  return `"${String(commandPath).replace(/"/g, '\\"')}"`;
}

function sanitizeFileName(value) {
  return String(value || 'project').replace(/[<>:"/\\|?*\x00-\x1F]/g, '-').slice(0, 80) || 'project';
}

function normalizeExternalUrl(target) {
  const value = String(target || '').trim();
  if (!value) return '';
  if (/^\d{2,5}$/.test(value)) return `http://localhost:${value}`;
  if (/^https?:\/\//i.test(value)) return value;
  if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])[:/]/i.test(value)) return `http://${value}`;
  return '';
}

function formatProcessLogExport(payload) {
  const project = payload?.project || {};
  const meta = payload?.meta || {};
  const entries = Array.isArray(payload?.entries) ? payload.entries : [];
  const header = [
    `Project: ${project.name || project.id || 'Unknown'}`,
    `Command: ${meta.currentRun?.command || project.command || '--'}`,
    `Path: ${meta.currentRun?.cwd || project.path || '--'}`,
    `Exported: ${new Date().toISOString()}`,
    '',
  ];

  const body = entries.map((entry) => {
    const time = entry.time ? new Date(entry.time).toISOString() : '';
    const type = entry.type || 'stdout';
    return `[${time}] ${type}\n${String(entry.data || '')}`;
  });

  return [...header, ...body].join('\n');
}

function getPathKey(env) {
  return Object.keys(env).find((key) => key.toLowerCase() === 'path') || 'PATH';
}

function mergePathValues(...values) {
  const seen = new Set();
  const parts = [];

  values.join(path.delimiter).split(path.delimiter).forEach((part) => {
    const value = String(part || '').trim();
    const key = value.toLowerCase();
    if (!value || seen.has(key)) return;
    seen.add(key);
    parts.push(value);
  });

  return parts.join(path.delimiter);
}

function getFreshWindowsPath() {
  if (process.platform !== 'win32') return Promise.resolve('');
  if (windowsPathCache) return windowsPathCache;

  const script = [
    "$machine=[Environment]::GetEnvironmentVariable('Path','Machine')",
    "$user=[Environment]::GetEnvironmentVariable('Path','User')",
    "[Environment]::ExpandEnvironmentVariables(($machine,$user -join ';'))",
  ].join(';');

  windowsPathCache = new Promise((resolve) => {
    execFile('powershell.exe', ['-NoProfile', '-Command', script], { windowsHide: true, timeout: 2500 }, (err, stdout) => {
      if (err || !stdout) return resolve('');
      resolve(String(stdout || '').split(/\r?\n/).filter(Boolean).join(path.delimiter));
    });
  });

  return windowsPathCache;
}

async function enrichRuntimeEnv(env) {
  const pathKey = getPathKey(env);
  const freshWindowsPath = await getFreshWindowsPath();
  if (freshWindowsPath) {
    env[pathKey] = mergePathValues(env[pathKey], freshWindowsPath);
  }
  return env;
}

function parseEnvFile(contents) {
  const parsed = {};

  String(contents || '').split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) return;

    const equalsIndex = line.indexOf('=');
    if (equalsIndex <= 0) return;

    const key = line.slice(0, equalsIndex).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) return;

    let value = line.slice(equalsIndex + 1).trim();
    const quote = value[0];
    if ((quote === '"' || quote === "'") && value[value.length - 1] === quote) {
      value = value.slice(1, -1);
    }

    parsed[key] = value;
  });

  return parsed;
}

function loadDotEnv(cwd) {
  const envPath = path.join(cwd, '.env');
  try {
    if (!pathExists(envPath)) return {};
    return parseEnvFile(fs.readFileSync(envPath, 'utf8'));
  } catch (e) {
    return {};
  }
}

function normalizeProjectEnv(projectEnv) {
  const normalized = {};
  if (!projectEnv || typeof projectEnv !== 'object' || Array.isArray(projectEnv)) return normalized;

  Object.entries(projectEnv).forEach(([key, value]) => {
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      normalized[key] = String(value);
    }
  });

  return normalized;
}

function buildNpmScriptPresets(scripts) {
  if (!scripts || typeof scripts !== 'object' || Array.isArray(scripts)) return [];

  const preferredOrder = ['dev', 'start', 'test', 'build', 'lint', 'preview'];
  const scriptNames = Object.keys(scripts);
  const orderedNames = [
    ...preferredOrder.filter((name) => scriptNames.includes(name)),
    ...scriptNames.filter((name) => !preferredOrder.includes(name)).sort(),
  ];

  return orderedNames.map((name) => ({
    name,
    command: name === 'start' ? 'npm start'
      : name === 'test' ? 'npm test'
      : `npm run ${name}`,
  }));
}

function findDockerComposeFile(files) {
  return DOCKER_COMPOSE_FILES.find((file) => files.includes(file)) || '';
}

function buildDockerComposePresets(composeFile) {
  if (!composeFile) return [];
  const composeArg = `docker compose -f ${quoteCommandPath(composeFile)}`;
  return [
    { name: 'compose up', command: `${composeArg} up` },
    { name: 'compose down', command: `${composeArg} down` },
    { name: 'compose logs', command: `${composeArg} logs -f` },
    { name: 'compose build', command: `${composeArg} build` },
  ];
}

function commandExists(command) {
  const lookup = process.platform === 'win32' ? 'where.exe' : 'which';
  return new Promise((resolve) => {
    execFile(lookup, [command], { windowsHide: true, timeout: 1200 }, (err, stdout) => {
      resolve(!err && Boolean(String(stdout || '').trim()));
    });
  });
}

async function detectAgentPresets() {
  const checks = await Promise.all(AGENT_CLIS.map(async (command) => ({
    command,
    available: await commandExists(command),
  })));

  return checks
    .filter(result => result.available)
    .map(result => ({
      name: `agent ${result.command}`,
      command: result.command,
    }));
}

function appendUniquePresets(target, presets) {
  const seen = new Set(target.map(preset => String(preset.name || '').toLowerCase()));
  presets.forEach((preset) => {
    const key = String(preset.name || '').toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    target.push(preset);
  });
}

function findPythonVirtualEnv(cwd) {
  for (const dirName of ['.venv', 'venv', 'env']) {
    const envPath = path.join(cwd, dirName);
    const pythonPath = process.platform === 'win32'
      ? path.join(envPath, 'Scripts', 'python.exe')
      : path.join(envPath, 'bin', 'python');

    if (pathExists(pythonPath)) {
      return { envPath, pythonPath };
    }
  }

  return null;
}

function buildLaunchOptions(cwd, command, projectEnv = {}) {
  const env = { ...process.env, ...loadDotEnv(cwd), ...normalizeProjectEnv(projectEnv) };
  const pathKey = getPathKey(env);
  const pathParts = [];
  let resolvedCommand = command;
  const nodeBin = path.join(cwd, 'node_modules', '.bin');
  const venv = findPythonVirtualEnv(cwd);

  if (pathExists(nodeBin)) pathParts.push(nodeBin);

  if (venv) {
    const venvBin = process.platform === 'win32'
      ? path.join(venv.envPath, 'Scripts')
      : path.join(venv.envPath, 'bin');

    pathParts.push(venvBin);
    env.VIRTUAL_ENV = venv.envPath;

    if (/^python(?:3)?(\s|$)/i.test(command.trim())) {
      resolvedCommand = command.replace(/^python(?:3)?(?=\s|$)/i, quoteCommandPath(venv.pythonPath));
    }
  }

  if (pathParts.length) {
    env[pathKey] = [...pathParts, env[pathKey]].filter(Boolean).join(path.delimiter);
  }

  return { command: resolvedCommand, env };
}

function terminateProcessTree(proc) {
  const pid = Number(typeof proc === 'number' ? proc : proc?.pid);
  if (!pid) return Promise.resolve(false);

  if (process.platform !== 'win32') {
    try {
      return Promise.resolve(proc.kill('SIGTERM'));
    } catch (e) {
      return Promise.resolve(false);
    }
  }

  return new Promise((resolve) => {
    execFile('taskkill', ['/PID', String(pid), '/T', '/F'], { windowsHide: true, timeout: 10000 }, (err, stdout, stderr) => {
      if (!err) {
        resolve(true);
        return;
      }

      const message = `${err.message || ''}\n${stdout || ''}\n${stderr || ''}`;
      resolve(/not found|not running|no running instance/i.test(message));
    });
  });
}

function cleanupAllProcesses() {
  if (cleanupPromise) return cleanupPromise;

  cleanupPromise = (async () => {
    const processes = [...runningProcesses.values(), ...terminals.values()]
      .filter((proc) => proc?.pid);

    runningProcesses.clear();
    terminals.clear();
    resourceSampleTimers.forEach((timer) => clearInterval(timer));
    resourceSampleTimers.clear();
    resourceSamples.clear();

    await Promise.allSettled(processes.map((proc) => terminateProcessTree(proc)));
  })().finally(() => {
    cleanupPromise = null;
  });

  return cleanupPromise;
}

function stopResourceSampler(id) {
  const timer = resourceSampleTimers.get(id);
  if (timer) clearInterval(timer);
  resourceSampleTimers.delete(id);
  resourceSamples.delete(id);
}

function getDescendantProcesses(processes, rootPid) {
  const byParent = new Map();
  processes.forEach((proc) => {
    const parent = Number(proc.ppid);
    if (!byParent.has(parent)) byParent.set(parent, []);
    byParent.get(parent).push(proc);
  });

  const tree = [];
  const queue = [Number(rootPid)];
  const seen = new Set();

  while (queue.length) {
    const pid = queue.shift();
    if (seen.has(pid)) continue;
    seen.add(pid);

    const current = processes.find((proc) => Number(proc.pid) === pid);
    if (current) tree.push(current);

    (byParent.get(pid) || []).forEach((child) => queue.push(Number(child.pid)));
  }

  return tree;
}

function parsePsCpuTime(value) {
  const parts = String(value || '0').trim().split(/[-:]/).map(Number);
  if (parts.some((part) => Number.isNaN(part))) return 0;
  if (parts.length === 4) return (((parts[0] * 24 + parts[1]) * 60 + parts[2]) * 60 + parts[3]);
  if (parts.length === 3) return ((parts[0] * 60 + parts[1]) * 60 + parts[2]);
  if (parts.length === 2) return (parts[0] * 60 + parts[1]);
  return parts[0] || 0;
}

function collectWindowsProcesses() {
  const script = 'Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,WorkingSetSize,KernelModeTime,UserModeTime | ConvertTo-Json -Compress';
  return new Promise((resolve) => {
    execFile('powershell.exe', ['-NoProfile', '-Command', script], { windowsHide: true, timeout: 5000 }, (err, stdout) => {
      if (err || !stdout) return resolve([]);
      try {
        const parsed = JSON.parse(stdout);
        const rows = Array.isArray(parsed) ? parsed : [parsed];
        resolve(rows.map((row) => ({
          pid: Number(row.ProcessId),
          ppid: Number(row.ParentProcessId),
          memoryBytes: Number(row.WorkingSetSize) || 0,
          cpuTicks: (Number(row.KernelModeTime) || 0) + (Number(row.UserModeTime) || 0),
        })).filter((row) => row.pid));
      } catch (e) {
        resolve([]);
      }
    });
  });
}

function collectUnixProcesses() {
  return new Promise((resolve) => {
    execFile('ps', ['-eo', 'pid=,ppid=,rss=,time='], { timeout: 5000 }, (err, stdout) => {
      if (err || !stdout) return resolve([]);
      resolve(stdout.split(/\r?\n/).map((line) => {
        const match = line.trim().match(/^(\d+)\s+(\d+)\s+(\d+)\s+(.+)$/);
        if (!match) return null;
        return {
          pid: Number(match[1]),
          ppid: Number(match[2]),
          memoryBytes: Number(match[3]) * 1024,
          cpuTicks: parsePsCpuTime(match[4]) * 10000000,
        };
      }).filter(Boolean));
    });
  });
}

async function sampleProcessResources(id) {
  const proc = runningProcesses.get(id);
  if (!proc?.pid) return;

  const processes = process.platform === 'win32'
    ? await collectWindowsProcesses()
    : await collectUnixProcesses();
  const tree = getDescendantProcesses(processes, proc.pid);
  if (!tree.length) return;

  const now = Date.now();
  const cpuTicks = tree.reduce((sum, row) => sum + row.cpuTicks, 0);
  const memoryBytes = tree.reduce((sum, row) => sum + row.memoryBytes, 0);
  const previous = resourceSamples.get(id);
  const elapsedMs = previous ? Math.max(1, now - previous.time) : RESOURCE_SAMPLE_MS;
  const deltaTicks = previous ? Math.max(0, cpuTicks - previous.cpuTicks) : 0;
  const cpuPercent = Math.min(100, (deltaTicks / (elapsedMs * 10000) / Math.max(1, os.cpus().length)) * 100);
  const sample = {
    id,
    pid: proc.pid,
    cpu: Number(cpuPercent.toFixed(1)),
    memoryMb: Number((memoryBytes / 1024 / 1024).toFixed(1)),
    processCount: tree.length,
    time: now,
  };

  if (!runningProcesses.has(id)) return;
  resourceSamples.set(id, { time: now, cpuTicks });
  mainWindow?.webContents.send('process-resource', sample);
}

function startResourceSampler(id) {
  stopResourceSampler(id);
  sampleProcessResources(id);
  resourceSampleTimers.set(id, setInterval(() => sampleProcessResources(id), RESOURCE_SAMPLE_MS));
}

function checkPort(host, port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port: Number(port) });
    let settled = false;

    function finish(success, error = '') {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve({ success, target: `${host}:${port}`, error });
    }

    socket.setTimeout(HEALTH_TIMEOUT_MS);
    socket.on('connect', () => finish(true));
    socket.on('timeout', () => finish(false, 'Connection timed out.'));
    socket.on('error', (err) => finish(false, err.message));
  });
}

function checkUrl(target) {
  return new Promise((resolve) => {
    let url;
    try {
      url = new URL(normalizeExternalUrl(target) || target);
    } catch (e) {
      resolve({ success: false, target, error: 'Invalid health URL.' });
      return;
    }

    const client = url.protocol === 'https:' ? https : http;
    const req = client.request(url, { method: 'GET', timeout: HEALTH_TIMEOUT_MS }, (res) => {
      res.resume();
      resolve({
        success: res.statusCode >= 200 && res.statusCode < 500,
        target: url.href,
        status: res.statusCode,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, target: url.href, error: 'Request timed out.' });
    });
    req.on('error', (err) => resolve({ success: false, target: url.href, error: err.message }));
    req.end();
  });
}

function checkHealthTarget(target) {
  const value = String(target || '').trim();
  if (!value) return Promise.resolve({ success: false, error: 'No health target configured.' });
  if (/^\d{2,5}$/.test(value)) return checkPort('127.0.0.1', value);

  const hostPort = value.match(/^(localhost|127\.0\.0\.1|0\.0\.0\.0):(\d{2,5})$/i);
  if (hostPort) return checkPort(hostPort[1] === '0.0.0.0' ? '127.0.0.1' : hostPort[1], hostPort[2]);

  return checkUrl(value);
}

ipcMain.handle('check-health', (_, target) => checkHealthTarget(target));

ipcMain.handle('detect-project', async (_, folderPath) => {
  try {
    const validation = validateProjectPath(folderPath);
    if (!validation.valid) return { type: 'unknown', runCommand: '', entryFile: '', error: validation.error };

    const files = fs.readdirSync(folderPath);
    const composeFile = findDockerComposeFile(files);
    const info = { type: 'unknown', runCommand: '', entryFile: '', presets: [] };

    if (files.includes('package.json')) {
      const pkg = JSON.parse(fs.readFileSync(path.join(folderPath, 'package.json'), 'utf8'));
      const presets = buildNpmScriptPresets(pkg.scripts);
      info.type = 'node';
      info.presets = presets;
      info.runCommand = presets.find((preset) => preset.name === 'start')?.command
        || presets.find((preset) => preset.name === 'dev')?.command
        || presets[0]?.command
        || 'node index.js';
    } else if (files.find(f => f.endsWith('.py'))) {
      const pyFiles = files.filter(f => f.endsWith('.py'));
      const main = pyFiles.find(f => ['main.py','app.py','run.py','server.py'].includes(f)) || pyFiles[0];
      const venv = findPythonVirtualEnv(folderPath);
      info.type = 'python';
      info.entryFile = main;
      info.runCommand = `${venv ? quoteCommandPath(venv.pythonPath) : 'python'} ${main}`;
    } else if (files.find(f => f.endsWith('.html'))) {
      const html = files.find(f => f === 'index.html') || files.find(f => f.endsWith('.html'));
      info.type = 'web';
      info.entryFile = html;
      info.runCommand = `open ${html}`;
    }

    if (composeFile) {
      const composePresets = buildDockerComposePresets(composeFile);
      appendUniquePresets(info.presets, composePresets);
      if (info.type === 'unknown') {
        info.type = 'docker';
        info.entryFile = composeFile;
        info.runCommand = composePresets[0].command;
      }
    }

    appendUniquePresets(info.presets, await detectAgentPresets());

    return info;
  } catch(e) {
    return { type: 'unknown', runCommand: '', entryFile: '' };
  }
});

// ─── Process management ─────────────────────────────────────────────────────

ipcMain.handle('launch-project', async (_, { id, command, cwd, env: projectEnv }) => {
  if (!id) return { success: false, error: 'Project id is required.' };
  if (!command || !String(command).trim()) return { success: false, error: 'Run command is required.' };

  const validation = validateProjectPath(cwd);
  if (!validation.valid) return { success: false, error: validation.error };

  // Kill existing process for this project
  if (runningProcesses.has(id)) {
    try { await terminateProcessTree(runningProcesses.get(id)); } catch(e) {}
    runningProcesses.delete(id);
  }

  try {
    const launch = buildLaunchOptions(cwd, command, projectEnv);
    await enrichRuntimeEnv(launch.env);
    const shellExe = process.platform === 'win32' ? 'cmd.exe' : '/bin/bash';
    const shellArgs = process.platform === 'win32' ? ['/c', launch.command] : ['-c', launch.command];
    
    const proc = spawn(shellExe, shellArgs, {
      cwd,
      env: launch.env,
      detached: false,
    });

    runningProcesses.set(id, proc);
    startResourceSampler(id);

    proc.stdout.on('data', (data) => {
      mainWindow?.webContents.send('process-output', { id, data: data.toString(), type: 'stdout' });
    });

    proc.stderr.on('data', (data) => {
      mainWindow?.webContents.send('process-output', { id, data: data.toString(), type: 'stderr' });
    });

    proc.on('exit', (code) => {
      runningProcesses.delete(id);
      stopResourceSampler(id);
      mainWindow?.webContents.send('process-exit', { id, code });
    });

    proc.on('error', (err) => {
      runningProcesses.delete(id);
      stopResourceSampler(id);
      mainWindow?.webContents.send('process-output', { id, data: `Error: ${err.message}\n`, type: 'stderr' });
      mainWindow?.webContents.send('process-exit', { id, code: 1 });
    });

    return { success: true, command: launch.command, pid: proc.pid };
  } catch(e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('stop-project', async (_, id) => {
  if (runningProcesses.has(id)) {
    try {
      const proc = runningProcesses.get(id);
      await terminateProcessTree(proc);
      runningProcesses.delete(id);
      stopResourceSampler(id);
      return true;
    } catch(e) { return false; }
  }
  return false;
});

ipcMain.handle('send-input', (_, { id, input }) => {
  const proc = runningProcesses.get(id);
  if (proc && proc.stdin) {
    proc.stdin.write(input + '\n');
    return true;
  }
  return false;
});

ipcMain.handle('is-running', (_, id) => runningProcesses.has(id));

// ─── Terminal ────────────────────────────────────────────────────────────────

const terminals = new Map();

ipcMain.handle('terminal-create', async (_, { id, cwd, cols, rows }) => {
  if (terminals.has(id)) {
    try { await terminateProcessTree(terminals.get(id)); } catch(e) {}
    terminals.delete(id);
  }
  
  const settings = loadSettings();
  const shellExe = settings.defaultShell || (process.platform === 'win32' ? 'cmd.exe'
                 : process.env.SHELL || '/bin/bash');

  try {
    const launch = cwd ? buildLaunchOptions(cwd, '') : { env: { ...process.env, TERM: 'xterm-256color' } };
    await enrichRuntimeEnv(launch.env);
    const proc = pty.spawn(shellExe, [], {
      name: 'xterm-256color',
      cols: Math.max(20, Number(cols) || 80),
      rows: Math.max(6, Number(rows) || 24),
      cwd: cwd || os.homedir(),
      env: { ...launch.env, TERM: 'xterm-256color', COLORTERM: 'truecolor' },
    });

    terminals.set(id, proc);

    proc.onData((data) => mainWindow?.webContents.send('terminal-data', { id, data }));
    proc.onExit(({ exitCode }) => {
      terminals.delete(id);
      mainWindow?.webContents.send('terminal-exit', { id, code: exitCode });
    });

    return { success: true, pid: proc.pid };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('terminal-write', (_, { id, data }) => {
  const proc = terminals.get(id);
  if (proc?.write) { proc.write(data); return true; }
  return false;
});

ipcMain.handle('terminal-resize', (_, { id, cols, rows }) => {
  const proc = terminals.get(id);
  if (!proc?.resize) return false;
  proc.resize(Math.max(20, Number(cols) || 80), Math.max(6, Number(rows) || 24));
  return true;
});

ipcMain.handle('terminal-kill', async (_, id) => {
  const proc = terminals.get(id);
  if (proc) {
    await terminateProcessTree(proc);
    terminals.delete(id);
    return true;
  }
  return false;
});

// ─── Window controls ─────────────────────────────────────────────────────────

ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize());
ipcMain.on('window-close', () => mainWindow?.close());
