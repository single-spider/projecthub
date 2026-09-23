(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LauncherData = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  function leaf(id, label, description) { return { id: id, label: label, description: description, children: [] }; }
  var root = {
    id: 'projecthub', label: 'ProjectHub', description: 'Your project command center.', icon: 'hub',
    children: [
      { id: 'development', label: 'Development', icon: 'code', children: [
        { id: 'moneycontrol', label: 'MoneyControl', children: [
          { id: 'moneycontrol-tools', label: 'Tools', children: [leaf('moneycontrol-terminal', 'Terminal', 'Open a shell in MoneyControl.') ] },
          leaf('moneycontrol-docs', 'Docs', 'Read project documentation.'),
          leaf('moneycontrol-dashboard', 'Dashboard', 'Open the project dashboard.')
        ] },
        { id: 'projecthub-project', label: 'ProjectHub', children: [leaf('projecthub-git', 'Git'), leaf('projecthub-run', 'Run')] }
      ] },
      { id: 'capture', label: 'Capture', children: [leaf('capture-idea', 'Idea'), leaf('capture-task', 'Task'), leaf('capture-note', 'Note')] },
      { id: 'knowledge', label: 'Knowledge', children: [leaf('knowledge-docs', 'Docs'), leaf('knowledge-roadmap', 'Roadmap'), leaf('knowledge-decisions', 'Decisions'), leaf('knowledge-references', 'References')] },
      { id: 'tools', label: 'Tools', children: [leaf('tools-terminal', 'Terminal'), leaf('tools-browser', 'Browser'), leaf('tools-utilities', 'Utilities'), leaf('tools-snippets', 'Snippets')] }
    ]
  };
  return { root: root, MOCK_ROOT: root, createMockTree: function () { return JSON.parse(JSON.stringify(root)); } };
}));
