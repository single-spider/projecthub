const test = require('node:test');
const assert = require('node:assert/strict');
const LauncherTree = require('../launcher/tree');
const LauncherData = require('../launcher/mock-data');

const make = () => LauncherTree.createController(LauncherData.createMockTree());

test('starts collapsed at the root and open resets to root', () => {
  const controller = make();
  let state = controller.getState();
  assert.equal(state.isOpen, false);
  assert.deepEqual(state.path, ['projecthub']);
  state = controller.open();
  assert.equal(state.isOpen, true);
  assert.deepEqual(state.path, ['projecthub']);
  assert.equal(state.levels[0].children.length, 4);
});

test('follows a deep branch and exposes each dynamic level', () => {
  const controller = make();
  controller.open();
  controller.select('development');
  controller.select('moneycontrol');
  controller.select('moneycontrol-tools');
  const state = controller.select('moneycontrol-terminal');
  assert.deepEqual(state.path, ['projecthub', 'development', 'moneycontrol', 'moneycontrol-tools', 'moneycontrol-terminal']);
  assert.equal(state.leaf.id, 'moneycontrol-terminal');
  assert.deepEqual(state.levels.map(level => level.parentId), ['projecthub', 'development', 'moneycontrol', 'moneycontrol-tools']);
  assert.equal(state.levels[2].children.length, 3);
});

test('selecting an ancestor sibling truncates descendants', () => {
  const controller = make();
  controller.open();
  controller.select('development');
  controller.select('moneycontrol');
  const state = controller.select('capture');
  assert.deepEqual(state.path, ['projecthub', 'capture']);
  assert.equal(state.current.id, 'capture');
  assert.equal(state.levels[0].selectedId, 'capture');
});

test('invalid and non-visible selections do not mutate state', () => {
  const controller = make();
  controller.open();
  const before = controller.select('moneycontrol');
  const after = controller.select('does-not-exist');
  assert.deepEqual(after, before);
  assert.deepEqual(controller.select('moneycontrol-terminal').path, before.path);
});

test('back ascends and then collapses at root', () => {
  const controller = make();
  controller.open();
  controller.select('development');
  controller.select('moneycontrol');
  assert.deepEqual(controller.back().path, ['projecthub', 'development']);
  assert.equal(controller.back().current.id, 'projecthub');
  const collapsed = controller.back();
  assert.equal(collapsed.isOpen, false);
  assert.deepEqual(collapsed.path, ['projecthub']);
});

test('snapshots and input data are mutation isolated', () => {
  const input = LauncherData.createMockTree();
  const controller = LauncherTree.createController(input);
  input.children[0].label = 'CHANGED';
  const first = controller.open();
  first.current.label = 'MUTATED';
  first.levels[0].children[0].label = 'MUTATED';
  first.path.push('evil');
  const second = controller.getState();
  assert.equal(second.current.label, 'ProjectHub');
  assert.equal(second.levels[0].children[0].label, 'Development');
  assert.deepEqual(second.path, ['projecthub']);
  assert.notStrictEqual(second, controller.getState());
});
