(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LauncherTree = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function copy(value) {
    if (value === null || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map(copy);
    var result = {};
    Object.keys(value).forEach(function (key) { result[key] = copy(value[key]); });
    return result;
  }

  function normalize(node, seen) {
    if (!node || typeof node !== 'object' || typeof node.id !== 'string' || !node.id) {
      throw new TypeError('Every launcher node needs a non-empty string id');
    }
    seen = seen || Object.create(null);
    if (seen[node.id]) throw new TypeError('Launcher node ids must be unique: ' + node.id);
    seen[node.id] = true;
    var result = { id: node.id, label: typeof node.label === 'string' ? node.label : node.id };
    if (typeof node.description === 'string') result.description = node.description;
    if (typeof node.icon === 'string') result.icon = node.icon;
    result.children = Array.isArray(node.children) ? node.children.map(function (child) {
      return normalize(child, seen);
    }) : [];
    return result;
  }

  function createController(rootNode) {
    var root = normalize(rootNode);
    var byId = Object.create(null);
    (function index(node) { byId[node.id] = node; node.children.forEach(index); }(root));
    var open = false;
    var path = [root.id];

    function snapshot() {
      var current = byId[path[path.length - 1]];
      var levels = [];
      for (var i = 0; i < path.length; i += 1) {
        var parent = byId[path[i]];
        if (i < path.length - 1 || parent.children.length) {
          levels.push({
            parentId: parent.id,
            children: copy(parent.children),
            selectedId: i < path.length - 1 ? path[i + 1] : null
          });
        }
      }
      return {
        isOpen: open,
        path: path.slice(),
        current: copy(current),
        levels: levels,
        leaf: current.children.length ? null : copy(current)
      };
    }

    function openLauncher() { open = true; path = [root.id]; return snapshot(); }
    function collapse() { open = false; path = [root.id]; return snapshot(); }
    function reset() { open = false; path = [root.id]; return snapshot(); }
    function select(id) {
      if (typeof id !== 'string') return snapshot();
      for (var i = 0; i < path.length; i += 1) {
        var parent = byId[path[i]];
        for (var j = 0; j < parent.children.length; j += 1) {
          if (parent.children[j].id === id) {
            path = path.slice(0, i + 1).concat(id);
            open = true;
            return snapshot();
          }
        }
      }
      return snapshot();
    }
    function back() {
      if (!open) return snapshot();
      if (path.length > 1) path.pop();
      else open = false;
      return snapshot();
    }
    return { getState: snapshot, open: openLauncher, collapse: collapse, select: select, back: back, reset: reset };
  }

  return { createController: createController };
}));
