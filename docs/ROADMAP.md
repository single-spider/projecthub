# ProjectHub Roadmap

This roadmap tracks the missing features we want to tackle one by one. It is organized by priority rather than strict dates so we can pick the next useful slice without losing the larger direction.

## Current Focus

Make ProjectHub reliable as a daily local project launcher:

- [x] Save project definitions safely.
- [x] Validate paths and commands before launch.
- [ ] Start, stop, and restart processes predictably.
- [ ] Preserve enough output and history to debug failed runs.

## Implemented Features

- [x] Project cards with status indicators, icons, color accents, and grid/list layout.
- [x] One-click run and stop for a configured project command.
- [x] Live stdout/stderr output panel for running projects.
- [x] Built-in multi-tab terminal with command history and project CWD selection.
- [x] Basic project auto-detection for Node, Python, and web folders.
- [x] Type filters, tag filters, and project search.
- [x] Right-click project actions: run, view output, open folder, open terminal, edit, and delete.
- [x] Project persistence in the Electron user-data folder.
- [x] Development launcher that works even when `ELECTRON_RUN_AS_NODE` is set.

## Phase 1: Reliability

### 1. Project Validation

Goal: prevent broken project entries and explain what is wrong before launch.

Planned work:

- [x] Check that the project path exists.
- [x] Warn when the run command is empty.
- [x] Validate that the configured working directory is accessible.
- [x] Show clear inline errors in the add/edit modal.
- [x] Add a lightweight pre-run validation step.

Acceptance criteria:

- A project with a missing folder cannot be launched silently.
- Save and run errors are shown in the UI.
- Existing valid projects keep working.

### 2. Process Lifecycle

Goal: make run, stop, restart, and exit behavior predictable across platforms.

Implementation notes:

- On Windows, Node's `child.kill()` often stops only the shell or parent process. Use native process-tree cleanup, such as `taskkill /F /T /PID`, when stopping launched projects and terminal sessions.
- Apply the same cleanup path when the window closes so background Python, Node, or shell processes do not keep ports locked.

Planned work:

- [x] Add a restart command.
- [x] Track process state as `starting`, `running`, `stopping`, `stopped`, or `failed`.
- [x] Improve Windows process tree cleanup.
- Handle launch failures and non-zero exits consistently.
- Prevent duplicate launches for the same project.

Acceptance criteria:

- Stop reliably terminates child processes.
- Failed launches produce readable output.
- UI state matches the real process state.

### 3. Persistent Logs

Goal: keep useful run history after switching views or restarting the app.

Planned work:

- Save recent process output per project.
- Add a maximum log size per project.
- Add clear/export output actions.
- Show last run status and timestamp.

Acceptance criteria:

- Recent output survives app restart.
- Logs do not grow without limit.
- Users can clear logs intentionally.

## Phase 2: Project Configuration

### 4. Environment Variables

Goal: support real projects that need ports, tokens, mode flags, or custom config.

Implementation notes:

- Auto-detect a local Python virtual environment from common folders such as `.venv`, `venv`, and `env`.
- Auto-detect `node_modules/.bin` and prepend it to the launched process `PATH` so local project CLIs are preferred.
- When a Python virtual environment is detected, launch Python commands through that environment and expose `VIRTUAL_ENV`.

Planned work:

- Add per-project environment variables.
- Support loading a `.env` file from the project folder.
- Allow variables to override inherited shell environment.
- Mask sensitive values in the UI.

Acceptance criteria:

- Projects can launch with custom env values.
- Sensitive values are not casually exposed.
- Existing projects without env config behave the same.

### 5. Command Presets

Goal: let each project have multiple useful commands.

Planned work:

- Support commands such as `dev`, `test`, `build`, `start`, and custom presets.
- Add a primary/default command.
- Add a command picker on project cards.
- Persist output by command where useful.

Acceptance criteria:

- A project can store more than one command.
- The default run button remains simple.
- Users can choose another command without editing the project.

### 6. Import and Export

Goal: make project data portable and recoverable.

Planned work:

- Export all project definitions to JSON.
- Import from a ProjectHub JSON file.
- Detect duplicate project IDs or paths.
- Add a backup reminder or simple manual backup action.

Acceptance criteria:

- Exported data can be imported on another machine.
- Import handles duplicates without overwriting silently.

## Phase 3: Workflow Upgrades

### 7. Workspaces and Groups

Goal: organize related projects and run them together.

Planned work:

- Add project groups or workspaces.
- Add favorites.
- Add workspace-level `Run all` and `Stop all`.
- Show workspace status summaries.

Acceptance criteria:

- Users can group projects without losing tag filtering.
- A workspace can start multiple projects intentionally.

### 8. Health Checks

Goal: show whether running services are actually available.

Planned work:

- Add optional port or URL health checks.
- Detect common local URLs from project output.
- Show live, starting, failed, or unknown service status.
- Add open-in-browser action for web services.

Acceptance criteria:

- A web project can show whether its local URL responds.
- Health checks are optional and non-blocking.

### 9. Search and Navigation

Goal: make large project lists fast to use.

Planned work:

- Improve fuzzy search ranking.
- Add keyboard navigation.
- Add recent projects.
- Add saved filters or quick filter chips.

Acceptance criteria:

- Users can find and launch a project quickly without the mouse.

## Phase 4: Terminal and Developer Experience

### 10. Real Terminal Emulation

Goal: support interactive terminal programs more accurately.

Implementation notes:

- Standard Node `child_process.spawn` pipes are not a real terminal. Interactive prompts, password entry, curses-style UIs, and resize-sensitive commands need PTY support.
- A future implementation should evaluate `node-pty` with `xterm.js`, including cross-platform build reliability, before replacing the current lightweight terminal.

Planned work:

- Evaluate adding a PTY library.
- Support resize events.
- Preserve terminal sessions per tab.
- Improve shell selection on Windows, macOS, and Linux.

Acceptance criteria:

- Interactive commands behave like they do in a normal terminal.
- Terminal output formatting is stable.

### 11. Settings

Goal: expose app-level preferences.

Planned work:

- Default shell.
- Default projects folder.
- Theme preference.
- Log retention settings.
- Startup behavior.

Acceptance criteria:

- Settings persist across restarts.
- Defaults are sensible when no settings file exists.

## Backlog

- Project templates.
- Dependency checks such as missing `node_modules` or Python virtual environments.
- Notifications when a project exits.
- Safer command preview before launch.
- Project icons from detected framework.
- Drag-and-drop project folder import.
- Build/package verification for Windows, macOS, and Linux.

## Suggested Build Order

1. Project validation.
2. Process lifecycle.
3. Persistent logs.
4. Environment variables.
5. Command presets.
6. Import/export.
7. Workspaces.
8. Health checks.
9. Search/navigation.
10. Terminal emulation.
11. Settings.
