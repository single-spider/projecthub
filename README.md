# ProjectHub

ProjectHub is a lightweight Electron desktop app for managing local development projects: Python scripts, Node servers, Docker Compose stacks, web projects, shell tools, and agent-oriented workflows.

## Features

- Project cards with status indicators, icons, color accents, and grid/list layout.
- One-click Run, Stop, and Restart.
- Windows process-tree cleanup with `taskkill /PID <pid> /T /F`.
- Live stdout/stderr output with timestamps, input sending, persisted recent logs, and log export.
- Built-in multi-tab terminal with command history and per-project CWD.
- Terminal context panel for project tree, file preview, git status, docs, runbooks, prompts, and agent context files.
- Auto-detection for Python, Node, web folders, and Docker Compose files.
- `.env` loading, per-project environment variables, Python virtualenv detection, and project-local `node_modules/.bin`.
- Command presets from `package.json`, custom presets, and Docker Compose presets.
- Optional agent CLI presets for Codex, Claude Code, Aider, Gemini CLI, and Goose when installed.
- Type, tag, group, favorite, and text filters.
- Lightweight workspaces through project groups, including Run Group and Stop Group.
- Favorites and recent-project ranking.
- Optional URL or port health checks with output URL detection and open-in-browser action.
- Import/export for project definitions.
- Settings for default terminal shell, log retention, and startup view.

## Completed Checklist

- [x] Project cards.
- [x] One-click run, stop, and restart.
- [x] Live output panel.
- [x] Built-in terminal.
- [x] Project auto-detection.
- [x] Type and tag filters.
- [x] Project search.
- [x] Right-click context menu.
- [x] Local project persistence.
- [x] Grid and list layout toggle.
- [x] Project path and command validation.
- [x] `.env` and per-project environment variables.
- [x] Command presets.
- [x] Docker Compose detection.
- [x] Agent CLI preset detection.
- [x] Project import/export.
- [x] Process log export.
- [x] Groups/workspaces and favorites.
- [x] Health checks.
- [x] Settings.

## Quick Start

### Prerequisites

- Node.js 18+ and npm.
- Git is optional but recommended.

### Install And Run

```bash
cd projecthub
npm install
npm start
```

## Documentation

- [Roadmap](docs/ROADMAP.md) - implementation status and remaining future slices.
- [Feature gaps](docs/FEATURE_GAPS.md) - current remaining gaps and decision notes.

## Build A Native App

```bash
npm run build:win
npm run build:linux
npm run build:mac
```

## Usage

### Adding A Project

1. Click Add Project.
2. Choose a folder or paste a path.
3. Use Auto-detect when possible.
4. Set the run command, presets, env vars, group, health check, tags, and favorite status as needed.
5. Save the project.

### Running A Project

- Click Run on any card.
- Use Presets to launch alternate commands.
- Use Stop or Restart from cards, output view, or the context menu.
- Use group filters and the Run/Stop group action pills for related projects.

### Built-In Terminal

- Open Terminal from the sidebar.
- Use the project selector to start a shell in a project folder.
- Use the context tabs for tree, preview, git, and workflow context files.
- Use up/down arrows for command history.

## Data Storage

Project definitions, settings, and process logs are stored under Electron's user-data directory:

- Windows: `%APPDATA%\projecthub`
- Linux/macOS: the platform-specific Electron user-data path.

Files:

- `projects.json` - project definitions.
- `process-logs.json` - recent output and last-run metadata.
- `settings.json` - app preferences.

## Tech Stack

- Electron.
- Vanilla HTML/CSS/JS.
- Electron Builder.
- Node.js `child_process` for project and terminal processes.
