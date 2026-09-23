const { contextBridge } = require('electron');
const calls = [];
contextBridge.exposeInMainWorld('launcherHost', {
  ready: () => ({ mode: 'dormant' }),
  setMode: mode => { calls.push(['mode', mode]); return mode; },
  setPointerInteractive: value => { calls.push(['pointer', value]); return true; },
  onSummon: () => {},
  quit: () => {}
});
contextBridge.exposeInMainWorld('smokeProbe', { getCalls: () => calls.slice() });
