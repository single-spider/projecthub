const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, execFile } = require('child_process');
const os = require('os');

let mainWindow;
const runningProcesses = new Map();
const DATA_FILE = path.join(app.getPath('userData'), 'projects.json');
const LOGS_FILE = path.join(app.getPath('userData'), 'process-logs.json');
const MAX_LOG_ENTRIES_PER_PROJECT = 1000;

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
    runningProcesses.forEach((proc) => terminateProcessTree(proc));
    terminals.forEach((proc) => terminateProcessTree(proc));
    runningProcesses.clear();
    terminals.clear();
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
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

function normalizeProcessLogs(logs) {
  const normalized = {};
  if (!logs || typeof logs !== 'object' || Array.isArray(logs)) return normalized;

  Object.entries(logs).forEach(([id, value]) => {
    if (!value || typeof value !== 'object') return;
    const entries = Array.isArray(value.entries)
      ? value.entries.slice(-MAX_LOG_ENTRIES_PER_PROJECT).map((entry) => ({
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
  if (!proc || !proc.pid) return Promise.resolve(false);

  if (process.platform !== 'win32') {
    try {
      return Promise.resolve(proc.kill('SIGTERM'));
    } catch (e) {
      return Promise.resolve(false);
    }
  }

  return new Promise((resolve) => {
    execFile('taskkill', ['/PID', String(proc.pid), '/T', '/F'], (err) => {
      resolve(!err);
    });
  });
}

ipcMain.handle('detect-project', async (_, folderPath) => {
  try {
    const validation = validateProjectPath(folderPath);
    if (!validation.valid) return { type: 'unknown', runCommand: '', entryFile: '', error: validation.error };

    const files = fs.readdirSync(folderPath);
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

    proc.stdout.on('data', (data) => {
      mainWindow?.webContents.send('process-output', { id, data: data.toString(), type: 'stdout' });
    });

    proc.stderr.on('data', (data) => {
      mainWindow?.webContents.send('process-output', { id, data: data.toString(), type: 'stderr' });
    });

    proc.on('exit', (code) => {
      runningProcesses.delete(id);
      mainWindow?.webContents.send('process-exit', { id, code });
    });

    proc.on('error', (err) => {
      runningProcesses.delete(id);
      mainWindow?.webContents.send('process-output', { id, data: `Error: ${err.message}\n`, type: 'stderr' });
      mainWindow?.webContents.send('process-exit', { id, code: 1 });
    });

    return { success: true, command: launch.command };
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
  
  const shellExe = process.platform === 'win32' ? 'cmd.exe'
                 : process.env.SHELL || '/bin/bash';

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
