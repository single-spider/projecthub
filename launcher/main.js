const { app, BrowserWindow, globalShortcut, screen, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const CAPTURE = process.argv.includes('--capture-test');
const HOTKEY = String(process.env.LAUNCHER_HOTKEY || 'Ctrl+Alt+Space').trim() || 'Ctrl+Alt+Space';
const APP_DATA = path.join(__dirname, '.user-data');
app.setPath('userData', APP_DATA);
app.setAppUserModelId('com.projecthub.radial-launcher');

let win;
let mode = 'dormant';
let hotkeyRegistered = false;

function workArea() {
  const point = screen.getCursorScreenPoint();
  return screen.getDisplayNearestPoint(point).workArea;
}

function boundsFor(nextMode) {
  const area = workArea();
  if (nextMode === 'dormant') {
    const size = Math.min(260, Math.max(210, Math.round(Math.min(area.width, area.height) * 0.22)));
    return {
      x: area.x + area.width - size - 26,
      y: area.y + area.height - size - 34,
      width: size,
      height: size
    };
  }
  const width = Math.min(area.width, Math.max(980, Math.round(area.width * 0.78)));
  const height = Math.min(area.height, Math.max(760, Math.round(area.height * 0.88)));
  return {
    x: area.x + Math.round((area.width - width) / 2),
    y: area.y + Math.round((area.height - height) / 2),
    width,
    height
  };
}

function setMode(nextMode, summon = false) {
  if (!win || win.isDestroyed() || !['dormant', 'expanded'].includes(nextMode)) return;
  mode = nextMode;
  win.setBounds(boundsFor(mode), true);
  win.setAlwaysOnTop(mode === 'expanded', 'floating');
  win.setIgnoreMouseEvents(false);
  win.webContents.send('launcher-mode', mode);
  if (mode === 'expanded') {
    win.show();
    win.focus();
  } else {
    win.showInactive();
  }
  if (summon && mode === 'expanded') {
    // Give Windows/Electron a compositor beat after the bounds change so the
    // user sees the machine wake instead of only the finished expanded state.
    setTimeout(() => {
      if (win && !win.isDestroyed() && mode === 'expanded') {
        win.webContents.send('launcher-summon');
      }
    }, 170);
  }
}

function createWindow() {
  win = new BrowserWindow({
    ...boundsFor('dormant'),
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    show: false,
    skipTaskbar: true,
    alwaysOnTop: false,
    hasShadow: false,
    backgroundColor: '#00000000',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  win.loadFile(path.join(__dirname, 'index.html'));
  win.webContents.on('did-finish-load', () => {
    if (!hotkeyRegistered) win.webContents.send('launcher-hotkey-error', HOTKEY);
  });
  win.once('ready-to-show', () => {
    win.show();
    setMode('dormant');
  });
  win.on('blur', () => {
    // Keep expanded during visual evaluation. A production preference can later auto-collapse on blur.
  });
  win.on('closed', () => { win = null; });
}

function registerHotkey() {
  try { hotkeyRegistered = globalShortcut.register(HOTKEY, () => setMode('expanded', true)); }
  catch (_) { hotkeyRegistered = false; }
  if (!hotkeyRegistered && win) win.webContents.send('launcher-hotkey-error', HOTKEY);
}

function own(event) { return Boolean(win && !win.isDestroyed() && event.sender === win.webContents); }
ipcMain.handle('launcher-ready', event => own(event) ? ({ hotkey: HOTKEY, platform: process.platform, mode, capture: CAPTURE, registered: hotkeyRegistered }) : null);
ipcMain.handle('launcher-set-mode', (event, value) => { if (!own(event)) return mode; if (value === 'dormant' || value === 'expanded') setMode(value); return mode; });
ipcMain.handle('launcher-pointer', (event, interactive) => { if (!own(event) || typeof interactive !== 'boolean' || !win) return false; win.setIgnoreMouseEvents(!interactive, { forward: true }); return true; });
ipcMain.handle('launcher-config', event => own(event) ? ({ hotkey: HOTKEY, platform: process.platform, mode, registered: hotkeyRegistered }) : null);
ipcMain.on('launcher-quit', event => { if (own(event)) app.quit(); });

async function captureTest() {
  if (!win || win.isDestroyed()) return;
  const out = path.join(__dirname, 'evidence');
  fs.mkdirSync(out, { recursive: true });
  const shot = async name => fs.writeFileSync(path.join(out, name), (await win.webContents.capturePage()).toPNG());
  await new Promise(r => setTimeout(r, 900));
  await shot('01-dormant.png');
  setMode('expanded', true);
  await new Promise(r => setTimeout(r, 1100));
  await shot('02-expanded.png');
  await win.webContents.executeJavaScript("document.querySelector('[data-node-id=development]')?.dispatchEvent(new MouseEvent('click',{bubbles:true}))", true);
  await new Promise(r => setTimeout(r, 700));
  await shot('03-development.png');
  await win.webContents.executeJavaScript("document.querySelector('[data-node-id=development-moneycontrol]')?.dispatchEvent(new MouseEvent('click',{bubbles:true}))", true);
  await new Promise(r => setTimeout(r, 700));
  await shot('04-moneycontrol.png');
  app.quit();
}

app.whenReady().then(() => {
  createWindow();
  registerHotkey();
  if (CAPTURE) setTimeout(() => captureTest().catch(error => { console.error(error); app.exit(1); }), 1600);
});
app.on('will-quit', () => { globalShortcut.unregisterAll(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
