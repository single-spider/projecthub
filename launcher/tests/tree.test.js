const assert = require('node:assert/strict');
const { createController } = require('../tree.js');
const { createMockTree } = require('../mock-data.js');

function fresh() { return createController(createMockTree()); }

{
  const c = fresh();
  assert.equal(c.getState().isOpen, false);
  c.open();
  assert.equal(c.getState().levels[0].children.length, 6);
  c.select('development');
  c.select('development-moneycontrol');
  c.select('dev-moneycontrol-terminal');
  assert.equal(c.getState().leaf.id, 'dev-moneycontrol-terminal');
  assert.equal(c.getState().levels.length, 3);
  c.back();
  assert.equal(c.getState().current.id, 'development-moneycontrol');
}

{
  const c = fresh();
  c.open();
  c.select('capture');
  c.select('capture-idea');
  assert.deepEqual(c.getState().levels.map(x => x.parentId), ['projecthub', 'capture', 'capture-idea']);
  c.select('capture-idea-current');
  assert.equal(c.getState().leaf.label, 'Current Project');
}

{
  const c = fresh();
  c.open();
  c.select('ai');
  c.select('ai-ask');
  c.select('ai-ask-project');
  assert.equal(c.getState().leaf.id, 'ai-ask-project');
  c.reset();
  assert.equal(c.getState().isOpen, false);
  assert.deepEqual(c.getState().path, ['projecthub']);
}

console.log('tree controller: PASS');
