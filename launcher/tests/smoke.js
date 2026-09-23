/* Bounded renderer smoke test. Run with the Electron executable, not plain node. */
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { app, BrowserWindow } = require('electron');

const page = path.join(__dirname, '..', 'index.html');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(win, predicate, label, timeout = 1200) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await win.webContents.executeJavaScript(`(${predicate.toString()})()`)) return;
    await sleep(25);
  }
  throw new Error(`Timed out waiting for ${label}`);
}
async function click(win, selector) {
  const ok = await win.webContents.executeJavaScript(`(()=>{const e=document.querySelector(${JSON.stringify(selector)}); if(!e)return false; e.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window})); return true})()`);
  assert.equal(ok, true, `missing clickable ${selector}`);
  await sleep(30);
}
function text(selector) {
  return `document.querySelector(${JSON.stringify(selector)})?.textContent.trim()`;
}

(async () => {
  app.setPath('userData', path.join(__dirname, '.user-data-smoke'));
  const killer = setTimeout(() => { try { app.exit(2); } catch (_) {} }, 20000);
  await app.whenReady();
  const errors = [];
  const win = new BrowserWindow({ show: false, width: 1100, height: 900, webPreferences: { contextIsolation: true, nodeIntegration: false, preload: path.join(__dirname, 'smoke-preload.js') } });
  win.webContents.on('render-process-gone', (_, details) => errors.push(details.reason));
  win.webContents.on('console-message', (_, __, message) => { if (/error/i.test(message)) errors.push(message); });
  await win.loadFile(page);
  await waitFor(win, () => document.querySelector('#status-text')?.textContent === 'DORMANT', 'initial render');
  assert.equal(await win.webContents.executeJavaScript('document.documentElement.classList.contains("desktop-host")'), true);
  assert.equal(await win.webContents.executeJavaScript('getComputedStyle(document.documentElement).backgroundColor'), 'rgba(0, 0, 0, 0)');
  assert.equal(await win.webContents.executeJavaScript('document.querySelector("#core").getBoundingClientRect().width >= 100 && document.querySelector("#core").getBoundingClientRect().width <= 180'), true);
  assert.equal(await win.webContents.executeJavaScript('typeof window.LauncherTree'), 'object');
  assert.equal(await win.webContents.executeJavaScript('typeof window.LauncherData'), 'object');

  await click(win, '#demo-open');
  assert.equal(await win.webContents.executeJavaScript(text('#status-text')), 'EXPANDED');
  await click(win, '[data-node-id="development"]');
  assert.match(await win.webContents.executeJavaScript(text('#core-label')), /DEVELOPMENT/);
  await click(win, '[data-node-id="moneycontrol"]');
  await click(win, '[data-node-id="moneycontrol-tools"]');
  await click(win, '[data-node-id="moneycontrol-terminal"]');
  assert.match(await win.webContents.executeJavaScript(text('#core-label')), /TERMINAL/);
  assert.match(await win.webContents.executeJavaScript(text('#crumbs')), /MONEYCONTROL/);
  assert.match(await win.webContents.executeJavaScript(text('#context-description')), /MOCK ACTION/);
  assert.equal(await win.webContents.executeJavaScript('document.querySelectorAll(".wedge").length'), 1);

  // Root breadcrumb must complete promptly and return to root, not loop on stale state.
  await click(win, '.crumb[data-depth="0"]');
  await waitFor(win, () => document.querySelector('#core-label')?.textContent === 'PROJECTHUB', 'root breadcrumb');
  await click(win, '[data-node-id="capture"]');
  assert.match(await win.webContents.executeJavaScript(text('#core-label')), /CAPTURE/);
  assert.match(await win.webContents.executeJavaScript(text('#crumbs')), /CAPTURE/);
  await click(win, '#core');
  assert.equal(await win.webContents.executeJavaScript(text('#status-text')), 'EXPANDED');
  await click(win, '#core');
  assert.equal(await win.webContents.executeJavaScript(text('#status-text')), 'DORMANT');
  const modes = await win.webContents.executeJavaScript('window.smokeProbe.getCalls().filter(x=>x[0]==="mode").map(x=>x[1])');
  assert.deepEqual(modes.filter((value, index) => index === 0 || value !== modes[index - 1]), ['dormant', 'expanded', 'dormant']);
  assert.deepEqual(errors, [], `renderer errors: ${errors.join('; ')}`);
  fs.mkdirSync(path.join(__dirname, '..', 'evidence'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, '..', 'evidence', 'smoke-result.json'), JSON.stringify({ pass: true, checks: ['scripts', 'deep-path', 'leaf', 'breadcrumb', 'capture-branch', 'transparency', 'dormant-size', 'mode-transitions', 'collapse'] }, null, 2));
  console.log('launcher renderer smoke: PASS');
  clearTimeout(killer);
  await win.destroy();
  app.quit();
})().catch(error => {
  try { fs.mkdirSync(path.join(__dirname, '..', 'evidence'), { recursive: true }); fs.writeFileSync(path.join(__dirname, '..', 'evidence', 'smoke-result.json'), JSON.stringify({ pass: false, error: String(error && error.stack || error) }, null, 2)); } catch (_) {}
  console.error(`launcher renderer smoke: FAIL\n${error.stack || error}`);
  app.exit(1);
});
