# Feature Gaps

This document captures what ProjectHub is missing today and why each feature matters. Use it as a product checklist when choosing the next implementation task.

## Implemented Capabilities

- [x] Project cards.
- [x] One-click run and stop.
- [x] Live output panel.
- [x] Built-in terminal tabs.
- [x] Project auto-detection.
- [x] Type and tag filters.
- [x] Project search.
- [x] Right-click project context menu.
- [x] Local project persistence.
- [x] Grid and list layouts.
- [x] Project path and command validation.

## Reliability Gaps

### Project Validation

Current state: implemented. ProjectHub validates required name, folder, and command fields, checks folder accessibility through the main process, and repeats the folder check before launch.

Why it matters: users get immediate feedback before a launch fails in the output panel.

### Process Lifecycle

Current state: ProjectHub can start and stop a process, but it needs stronger state tracking and more reliable child-process cleanup.

Windows risk: plain Node process termination can leave spawned Python, Node, or shell children alive. ProjectHub should use process-tree cleanup on Windows, especially `taskkill /F /T /PID`, for project stops, terminal stops, and app shutdown.

Why it matters: a launcher is only trustworthy if the UI reflects what is actually running.

### Persistent Logs

Current state: recent process output is saved per project in the Electron user-data folder, capped to a fixed number of entries, and project cards show last run status and timestamp. Export is still missing.

Why it matters: failed runs are often diagnosed after the fact, and users should not lose output when restarting the app.

## Configuration Gaps

### Environment Variables

Current state: launched processes inherit the app environment, with no per-project overrides.

Auto-detection opportunity: ProjectHub can reduce setup friction by discovering `.venv`, `venv`, `env`, and `node_modules/.bin` inside a project folder, then launching with the correct `PATH`, `VIRTUAL_ENV`, and Python executable.

Why it matters: real projects often need `NODE_ENV`, ports, API keys, local paths, or feature flags.

### Command Presets

Current state: each project has one command.

Why it matters: most projects have several common commands, such as development, tests, builds, and migrations.

### Import and Export

Current state: project data is stored locally but there is no first-class backup or transfer flow.

Why it matters: users should be able to move their launcher setup between machines.

## Workflow Gaps

### Workspaces and Groups

Current state: projects can have tags and filters, but not durable workspaces with group actions.

Why it matters: many local development flows require several services to run together.

### Health Checks

Current state: ProjectHub can show that a process is running, but not whether a web service is responding.

Why it matters: a process can be alive while the app is still unavailable or failed internally.

### Search and Keyboard Navigation

Current state: search and filters exist, but they can become clumsy as the project list grows.

Why it matters: a launcher should stay fast when users have many projects.

## Terminal Gaps

### Real Terminal Emulation

Current state: terminal tabs use standard process pipes.

PTY note: a professional terminal experience needs a real pseudoterminal. `node-pty` plus `xterm.js` is the likely direction, but it should be treated as a dedicated phase because native builds are harder to support cross-platform.

Why it matters: interactive terminal programs often need a real PTY for prompts, colors, full-screen apps, and resize behavior.

### Settings

Current state: app-level preferences are mostly hard-coded.

Why it matters: users need control over shell, theme, default folders, startup behavior, and log retention.

## Decision Notes

- Prioritize reliability before adding larger workflow features.
- Keep each roadmap item small enough to ship and verify independently.
- Prefer visible UI feedback for every validation or runtime failure.
- Avoid changing the storage format casually; when it changes, include migration logic.
