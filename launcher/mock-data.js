(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LauncherData = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  function leaf(id, label, description, icon) {
    return { id: id, label: label, description: description || '', icon: icon || 'dot', children: [] };
  }
  var root = {
    id: 'projecthub', label: 'ProjectHub', icon: 'hub', description: 'Mechanical context tree.',
    children: [
      { id: 'projects', label: 'Projects', icon: 'folder', description: 'Jump into a project context.', children: [
        { id: 'moneycontrol', label: 'MoneyControl', icon: 'database', description: 'Current finance application workspace.', children: [
          leaf('moneycontrol-overview', 'Overview', 'Open the project overview.', 'grid'),
          { id: 'moneycontrol-tools', label: 'Tools', icon: 'wrench', description: 'Development tools for MoneyControl.', children: [
            leaf('moneycontrol-terminal', 'Terminal', 'Open a shell in MoneyControl\'s root.', 'terminal'),
            leaf('moneycontrol-vscode', 'VS Code', 'Open the MoneyControl workspace.', 'code'),
            leaf('moneycontrol-git', 'Git', 'Inspect repository state.', 'git'),
            leaf('moneycontrol-docs', 'Docs', 'Open the primary documentation tree.', 'docs'),
            leaf('moneycontrol-run', 'Run', 'Start the project runtime.', 'play')
          ]},
          leaf('moneycontrol-recent', 'Recent', 'Resume recent MoneyControl work.', 'clock')
        ]},
        { id: 'projecthub-project', label: 'ProjectHub', icon: 'cube', description: 'ProjectHub itself.', children: [
          leaf('projecthub-vscode', 'VS Code', 'Open ProjectHub in VS Code.', 'code'),
          leaf('projecthub-terminal', 'Terminal', 'Open a ProjectHub shell.', 'terminal'),
          leaf('projecthub-run', 'Run', 'Run ProjectHub.', 'play')
        ]},
        leaf('projects-recent', 'Recent', 'Browse recently opened projects.', 'clock'),
        leaf('projects-all', 'All', 'Browse every registered project.', 'grid')
      ]},
      { id: 'capture', label: 'Capture', icon: 'capture', description: 'Capture an idea without leaving the desktop.', children: [
        { id: 'capture-idea', label: 'Idea', icon: 'spark', description: 'Save a new idea for later.', children: [
          leaf('capture-idea-current', 'Current Project', 'Capture for the active project.', 'target'),
          leaf('capture-idea-other', 'Another Project', 'Choose a project first.', 'folder'),
          leaf('capture-idea-unassigned', 'Unassigned', 'Keep the idea in the global inbox.', 'inbox'),
          leaf('capture-idea-new-project', 'New Project', 'Start an idea that may become a project.', 'plus')
        ]},
        leaf('capture-task', 'Task', 'Create a quick task.', 'check'),
        leaf('capture-research', 'Research', 'Create a research note.', 'search'),
        leaf('capture-scratch', 'Scratch', 'Open a temporary scratch capture.', 'edit')
      ]},
      { id: 'development', label: 'Development', icon: 'code', description: 'Code, run, inspect, and resume development.', children: [
        { id: 'development-moneycontrol', label: 'MoneyControl', icon: 'database', description: 'Development actions for MoneyControl.', children: [
          leaf('dev-moneycontrol-vscode', 'VS Code', 'Open MoneyControl in VS Code.', 'code'),
          leaf('dev-moneycontrol-terminal', 'Terminal', 'Open a shell in MoneyControl\'s root.', 'terminal'),
          leaf('dev-moneycontrol-git', 'Git', 'Inspect branches, commits, and changes.', 'git'),
          leaf('dev-moneycontrol-docs', 'Docs', 'Read project documentation.', 'docs'),
          leaf('dev-moneycontrol-run', 'Run', 'Start the project.', 'play')
        ]},
        { id: 'development-projecthub', label: 'ProjectHub', icon: 'cube', description: 'Development actions for ProjectHub.', children: [
          leaf('dev-projecthub-vscode', 'VS Code', 'Open ProjectHub in VS Code.', 'code'),
          leaf('dev-projecthub-terminal', 'Terminal', 'Open a ProjectHub shell.', 'terminal'),
          leaf('dev-projecthub-run', 'Run', 'Start ProjectHub.', 'play')
        ]},
        leaf('development-running', 'Running', 'Inspect running development processes.', 'play'),
        leaf('development-recent', 'Recent', 'Resume a recent development session.', 'clock')
      ]},
      { id: 'knowledge', label: 'Knowledge', icon: 'book', description: 'Project memory and planning context.', children: [
        leaf('knowledge-docs', 'Docs', 'Open current documentation.', 'docs'),
        leaf('knowledge-roadmap', 'Roadmap', 'See planned work.', 'roadmap'),
        leaf('knowledge-decisions', 'Decisions', 'Review durable architecture decisions.', 'diamond'),
        leaf('knowledge-research', 'Research', 'Browse research notes.', 'search')
      ]},
      { id: 'tools', label: 'Tools', icon: 'wrench', description: 'Small utilities for daily flow.', children: [
        leaf('tools-terminal', 'Terminal', 'Open a shell.', 'terminal'),
        leaf('tools-web', 'Web Search', 'Start a web search.', 'search'),
        leaf('tools-git', 'Git', 'Open repository tools.', 'git'),
        leaf('tools-services', 'Services', 'Inspect running services.', 'activity'),
        leaf('tools-snippets', 'Snippets', 'Open useful snippets.', 'braces')
      ]},
      { id: 'ai', label: 'AI', icon: 'brain', description: 'Optional assistants and bounded workflows.', children: [
        { id: 'ai-ask', label: 'Ask', icon: 'message', description: 'Start a contextual question.', children: [
          leaf('ai-ask-project', 'Current Project', 'Ask with current project context.', 'folder'),
          leaf('ai-ask-item', 'Current Item', 'Ask about the active work item.', 'target'),
          leaf('ai-ask-general', 'General', 'Open an unscoped conversation.', 'message')
        ]},
        leaf('ai-research', 'Research', 'Start AI-assisted research.', 'search'),
        leaf('ai-chatgpt', 'ChatGPT', 'Open ChatGPT.', 'spark'),
        leaf('ai-gemini', 'Gemini', 'Open Gemini.', 'diamond'),
        leaf('ai-cli', 'CLI Agent', 'Choose a command-line coding agent.', 'terminal')
      ]}
    ]
  };
  return { root: root, MOCK_ROOT: root, createMockTree: function () { return JSON.parse(JSON.stringify(root)); } };
}));
