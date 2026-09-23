const { spawn } = require('child_process');
const path = require('path');
const electron = require('electron');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(electron, [path.resolve(__dirname), ...process.argv.slice(2)], { stdio: 'inherit', env, windowsHide: false });
child.on('close', (code, signal) => process.exit(signal ? 1 : (code ?? 0)));
