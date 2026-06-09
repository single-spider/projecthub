# ProjectHub Roadmap

This roadmap tracks ProjectHub as a lightweight local development command center. The major reliability and workflow items are now implemented; the remaining items are mostly deeper terminal emulation and optional polish.

## Completed

### Phase 1: Reliability

- [x] Save project definitions safely.
- [x] Validate paths and commands before launch.
- [x] Start, stop, restart, and exit processes predictably.
- [x] Use Windows process-tree cleanup with `taskkill /PID <pid> /T /F`.
- [x] Run cleanup during app quit so launched children do not keep ports locked.
- [x] Handle launch failures, stop failures, and non-zero exits with visible UI state.
- [x] Prevent duplicate launches by replacing an existing tracked process before relaunch.
- [x] Preserve recent output and last-run metadata across app restarts.

### Phase 2: Project Configuration

- [x] Load project `.env` files at launch.
- [x] Support per-project environment variables.
- [x] Let project env override `.env` and inherited environment values.
- [x] Detect Python virtual environments in `.venv`, `venv`, and `env`.
- [x] Prefer project-local `node_modules/.bin` on `PATH`.
- [x] Detect `package.json` scripts as command presets.
- [x] Store custom command presets.
- [x] Keep a simple default Run command.
- [x] Launch alternate presets from project cards.
- [x] Detect Docker Compose files and add compose presets.
- [x] Export process logs.
- [x] Export and import ProjectHub project definitions.
- [x] Skip duplicate imported project paths instead of overwriting silently.

### Phase 3: Workflow Upgrades

- [x] Add lightweight workspaces through project groups.
- [x] Add favorites.
- [x] Filter by group and favorites.
- [x] Run all / stop all for the active group.
- [x] Show group and favorite summaries.
- [x] Add optional URL or port health checks.
- [x] Detect common local URLs from process output.
- [x] Show health state on project cards and output details.
- [x] Open health targets in the browser.
- [x] Improve search to include group and command text.
- [x] Add recent-project ranking.
- [x] Add keyboard shortcuts for search and launching the first visible project.

### Phase 4: Developer Experience

- [x] Add persisted settings for default terminal shell.
- [x] Add persisted log-retention setting.
- [x] Add persisted startup view setting.
- [x] Add terminal context discovery for docs, runbooks, prompt files, and common agent context files.
- [x] Detect common agent CLIs on PATH and offer quick presets during project auto-detect.

## Remaining / Deferred

These are intentionally left as future slices because they either require native dependencies or a larger UX decision.

- Real PTY terminal emulation with `node-pty` and `xterm.js`.
- Terminal resize events and full-screen terminal program support.
- Per-command log partitioning instead of project-level logs.
- Theme preference and default projects folder settings.
- Custom agent preset templates beyond detected CLIs.
- Richer saved filter sets beyond the current type, tag, group, favorite, and search filters.
- Build/package verification on Windows, macOS, and Linux.

## Suggested Next Slice

Evaluate PTY support in a branch before replacing the current pipe-based terminal. The current terminal is useful for basic commands, but a professional terminal experience needs native PTY behavior.
