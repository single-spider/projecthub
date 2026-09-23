const { app, BrowserWindow, globalShortcut, screen, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const CAPTURE = process.argv.includes('--capture-test');
const DEFAULT_HOTKEY = 'Ctrl+Alt+Space';
const HOTKEY = String(process.env.LAUNCHER_HOTKEY || DEFAULT_HOTKEY).trim() || DEFAULT_HOTKEY;
// Keep prototype state isolated from ProjectHub and writable in a checked-out workspace.
const APP_DATA = path.join(__dirname, '.user-data');
app.setPath('userData', APP_DATA);
app.setAppUserModelId('com.projecthub.radial-launcher.prototype');
if (CAPTURE) app.commandLine.appendSwitch('disable-gpu');

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
    const size = Math.min(260, Math.max(180, Math.round(Math.min(area.width, area.height) * 0.18)));
    return { x: area.x + area.width - size - 26, y: area.y + area.height - size - 34, width: size, height: size };
  }
  const width = Math.min(area.width, Math.min(1120, Math.max(680, Math.round(area.width * 0.72))));
  const height = Math.min(area.height, Math.min(900, Math.max(560, Math.round(area.height * 0.78))));
  return { x: area.x + Math.round((area.width - width) / 2), y: area.y + Math.round((area.height - height) / 2), width, height };
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
  } else win.blur();
  if (summon && mode === 'expanded') win.webContents.send('launcher-summon');
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
    backgroundColor: '#00000000',
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, preload: path.join(__dirname, 'preload.js') }
  });
  win.loadFile(path.join(__dirname, 'index.html'));
  win.webContents.on('did-finish-load', () => { if (!hotkeyRegistered) win.webContents.send('launcher-hotkey-error', HOTKEY); });
  win.once('ready-to-show', () => { win.show(); setMode('dormant'); });
  win.on('closed', () => { win = null; });
}

function registerHotkey() {
  try {
    hotkeyRegistered = globalShortcut.register(HOTKEY, () => {
      setMode('expanded', true);
    });
  } catch (_) { hotkeyRegistered = false; }
  if (!hotkeyRegistered && win) win.webContents.send('launcher-hotkey-error', HOTKEY);
}

function own(event) { return Boolean(win && !win.isDestroyed() && event.sender === win.webContents); }
ipcMain.handle('launcher-ready', event => own(event) ? ({ hotkey: HOTKEY, platform: process.platform, mode, capture: CAPTURE, registered: hotkeyRegistered }) : null);
ipcMain.handle('launcher-set-mode', (event, value) => { if (!own(event)) return mode; if (value === 'dormant' || value === 'expanded') setMode(value); return mode; });
ipcMain.handle('launcher-pointer', (event, value) => { if (!own(event) || typeof value !== 'boolean' || !win) return false; win.setIgnoreMouseEvents(value, { forward: true }); return true; });
ipcMain.handle('launcher-config', event => own(event) ? ({ hotkey: HOTKEY, platform: process.platform, mode, registered: hotkeyRegistered }) : null);
ipcMain.on('launcher-quit', event => { if (own(event)) app.quit(); });

async function captureTest() {
  if (!win || win.isDestroyed()) return;
  const out = path.join(__dirname, 'evidence');
  fs.mkdirSync(out, { recursive: true });
  const shot = async (name) => fs.writeFileSync(path.join(out, name), (await win.webContents.capturePage()).toPNG());
  await new Promise(resolve => setTimeout(resolve, 500));
  await shot('01-dormant.png');
  setMode('expanded', true);
  await new Promise(resolve => setTimeout(resolve, 700));
  await shot('02-expanded.png');
  const branchRect = await win.webContents.executeJavaScript("(() => { var open = document.querySelector('#demo-open'); if (open) open.click(); var node = document.querySelector('[data-node-id=development]'); if (!node) throw new Error('development wedge missing'); var r = node.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; })()", true);
  win.webContents.sendInputEvent({ type: 'mouseMove', x: Math.round(branchRect.x), y: Math.round(branchRect.y) });
  win.webContents.sendInputEvent({ type: 'mouseDown', x: Math.round(branchRect.x), y: Math.round(branchRect.y), button: 'left', clickCount: 1 });
  win.webContents.sendInputEvent({ type: 'mouseUp', x: Math.round(branchRect.x), y: Math.round(branchRect.y), button: 'left', clickCount: 1 });
  await new Promise(resolve => setTimeout(resolve, 700));
  const branchResult = await win.webContents.executeJavaScript("(() => { var crumb = document.querySelector('#crumbs .active'); return crumb ? crumb.textContent : ''; })()", true);
  if (!/DEVELOPMENT/i.test(branchResult)) throw new Error('branch navigation did not reach DEVELOPMENT');
  await shot('03-branch.png');
  const rect = await win.webContents.executeJavaScript("(() => { var el = document.querySelector('.wedge text:last-child'); if (!el) throw new Error('hover wedge label missing'); var r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()", true);
  win.webContents.sendInputEvent({ type: 'mouseMove', x: Math.round(rect.x), y: Math.round(rect.y) });
  await new Promise(resolve => setTimeout(resolve, 350));
  const hovered = await win.webContents.executeJavaScript("!!document.querySelector('.wedge:hover')", true);
  if (!hovered) throw new Error('hover target did not enter a wedge');
  await shot('04-hover.png');
  app.quit();
}

app.whenReady().then(() => {
  createWindow();
  registerHotkey();
  // A timer keeps capture mode useful even when a renderer load event is lost during GPU/CI startup.
  if (CAPTURE) setTimeout(() => captureTest().catch(error => { console.error('capture-test failed:', error); app.exit(1); }), 1400);
});
app.on('will-quit', () => { if (hotkeyRegistered) globalShortcut.unregister(HOTKEY); globalShortcut.unregisterAll(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
