const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, execFile } = require('child_process');
const os = require('os');
const net = require('net');
const http = require('http');
const https = require('https');

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
const MAX_PROJECT_TREE_ENTRIES = 500;
const MAX_TEXT_PREVIEW_BYTES = 120 * 1024;
const HEALTH_TIMEOUT_MS = 3500;
const DOCKER_COMPOSE_FILES = ['docker-compose.yml', 'docker-compose.yaml', 'compose.yml', 'compose.yaml'];
const TREE_IGNORE_DIRS = new Set([
  '.git', 'node_modules', '.venv', 'venv', 'env', 'dist', 'build', 'out',
  '.next', '.expo', '.turbo', '.cache', '__pycache__',
]);

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
        files.push({
          name: entry.name,
          path: relativePath,
          type: entry.isDirectory() ? 'dir' : 'file',
          depth,
        });

        if (entry.isDirectory() && depth < 3) walk(fullPath, depth + 1);
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
    if (stat.size > MAX_TEXT_PREVIEW_BYTES) return { success: false, error: 'File is too large to preview.' };

    const buffer = fs.readFileSync(fullPath);
    if (buffer.includes(0)) return { success: false, error: 'Binary files are not previewed.' };
    return { success: true, path: relativePath, size: stat.size, text: buffer.toString('utf8') };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function getGitInfo(rootPath) {
  const validation = validateProjectPath(rootPath);
  if (!validation.valid) return Promise.resolve({ success: false, error: validation.error });

  return new Promise((resolve) => {
    execFile('git', ['-C', rootPath, 'status', '--short', '--branch'], { timeout: 5000 }, (statusErr, statusOut) => {
      if (statusErr) return resolve({ success: false, error: 'No git repository detected.' });

      execFile('git', ['-C', rootPath, 'log', '--oneline', '-5'], { timeout: 5000 }, (logErr, logOut) => {
        resolve({
          success: true,
          status: statusOut || '',
          log: logErr ? '' : (logOut || ''),
        });
      });
    });
  });
}

ipcMain.handle('terminal-list-project-files', (_, rootPath) => listProjectFiles(rootPath));
ipcMain.handle('terminal-read-project-file', (_, { rootPath, relativePath }) => readProjectTextFile(rootPath, relativePath));
ipcMain.handle('terminal-git-info', (_, rootPath) => getGitInfo(rootPath));

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
      info.presets = [...info.presets, ...composePresets];
      if (info.type === 'unknown') {
        info.type = 'docker';
        info.entryFile = composeFile;
        info.runCommand = composePresets[0].command;
      }
    }

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

ipcMain.handle('terminal-create', async (_, { id, cwd }) => {
  if (terminals.has(id)) {
    try { await terminateProcessTree(terminals.get(id)); } catch(e) {}
    terminals.delete(id);
  }
  
  const settings = loadSettings();
  const shellExe = settings.defaultShell || (process.platform === 'win32' ? 'cmd.exe'
                 : process.env.SHELL || '/bin/bash');

  const launch = cwd ? buildLaunchOptions(cwd, '') : { env: { ...process.env, TERM: 'xterm-256color' } };
  const proc = spawn(shellExe, [], {
    cwd: cwd || os.homedir(),
    env: { ...launch.env, TERM: 'xterm-256color' },
    stdio: ['pipe','pipe','pipe'],
  });

  terminals.set(id, proc);

  proc.stdout.on('data', (d) => mainWindow?.webContents.send('terminal-data', { id, data: d.toString() }));
  proc.stderr.on('data', (d) => mainWindow?.webContents.send('terminal-data', { id, data: d.toString() }));
  proc.on('exit', () => {
    terminals.delete(id);
    mainWindow?.webContents.send('terminal-exit', { id });
  });

  return { success: true, pid: proc.pid };
});

ipcMain.handle('terminal-write', (_, { id, data }) => {
  const proc = terminals.get(id);
  if (proc?.stdin) { proc.stdin.write(data); return true; }
  return false;
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
