# Feature Gaps

ProjectHub now covers the core launcher, configuration, workflow, and persistence roadmap. This document tracks what remains and why it still matters.

## Implemented Capabilities

- [x] Project cards, status indicators, icons, color accents, grid/list layout.
- [x] One-click run, stop, and restart.
- [x] Windows process-tree cleanup for projects, terminals, and app shutdown.
- [x] Live output panel with persisted recent logs and export.
- [x] Built-in terminal tabs with project CWD selection.
- [x] Terminal context helper for tree, file preview, git status, docs, runbooks, prompts, and agent context files.
- [x] Project validation before save and launch.
- [x] Auto-detection for Node, Python, web folders, and Docker Compose.
- [x] `.env` loading, virtualenv detection, project-local `node_modules/.bin`, and per-project env overrides.
- [x] Command presets from `package.json` plus custom presets.
- [x] Import/export for project definitions.
- [x] Type, tag, group, favorite, and text filters.
- [x] Lightweight workspaces through project groups, including run group and stop group actions.
- [x] Favorites and recent-project ranking.
- [x] Optional URL/port health checks, output URL detection, and open-in-browser action.
- [x] App settings for default terminal shell, log retention, and startup view.
- [x] Agent CLI detection for Codex, Claude Code, Aider, Gemini CLI, and Goose when available on PATH.

## Remaining Gaps

### Real Terminal Emulation

Current state: terminal tabs still use standard `child_process.spawn` pipes.

Why it matters: interactive prompts, password entry, curses-style UIs, resize-sensitive tools, and full-screen terminal programs need a PTY.

Likely path: evaluate `node-pty` with `xterm.js` in a dedicated branch. This should not be mixed with ordinary roadmap work because native module support affects packaging on Windows, macOS, and Linux.

### Agent Preset Templates

Current state: projects can store custom command presets, auto-detect adds installed common agent CLIs as quick presets, and the Terminal context panel surfaces common agent context files.

Why it matters: AI workflows often use repeatable project-scoped commands such as `codex`, `claude`, `aider`, `gemini`, or `goose`.

Likely path: add user-editable agent preset templates for custom tools and preferred flags.

### Deeper Settings

Current state: settings cover default shell, log retention, and startup view.

Remaining useful settings:

- Theme preference.
- Default projects folder.
- Startup behavior beyond initial view.
- Build/package verification preferences.

### Per-Command Log Partitioning

Current state: output is stored per project, with the active command/preset saved in run metadata.

Why it matters: projects with many presets may benefit from separate logs for `dev`, `test`, `build`, and agent sessions.

Likely path: extend `process-logs.json` carefully without merging logs into `projects.json`.

## Decision Notes

- Keep ProjectHub lightweight and avoid a framework rewrite.
- Treat PTY work as its own phase.
- Keep process logs separate from project definitions.
- Preserve Windows `taskkill /T /F` cleanup.
- Prefer project-memory features over purely decorative UI work.
