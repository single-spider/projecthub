const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const renderer = fs.readFileSync(path.join(root, 'renderer.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');

assert.match(index, /core-collar-outer/, 'core needs a persistent outer collar');
assert.match(index, /mechanism-outer/, 'machine needs a persistent outer locking assembly');

assert.match(renderer, /const ringRegistry = new Map\(\)/, 'renderer should persist ring assemblies');
assert.match(renderer, /wedge-carriage/, 'wedge faces should move separately from their beds');
assert.match(renderer, /setMotion\('waking'\)/, 'wake state must be explicit');
assert.match(renderer, /activateRecords/, 'carrier deployment coordinator is required');
assert.doesNotMatch(renderer, /svg\.innerHTML\s*=\s*markup/, 'state changes must not rebuild the whole SVG');

assert.match(styles, /@keyframes outerUnlock/, 'outer locking mechanism needs a wake motion');
assert.match(styles, /@keyframes moduleDeploy/, 'modules need structural deployment motion');
assert.match(styles, /@keyframes rotorWake/, 'core rotor needs a purposeful wake response');
assert.match(styles, /\.wedge \.wedge-carriage/, 'hover/selection should move the plate carriage');

console.log('visual structure: PASS');
