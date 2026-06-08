# AGENTS.md

Guidance for coding agents working on ProjectHub.

## Project Overview

ProjectHub is an Electron desktop app for launching, stopping, restarting, and monitoring local development projects. It uses:

- Electron main process in `src/main.js`.
- Preload IPC bridge in `src/preload.js`.
- Vanilla HTML/CSS/JS renderer in `src/index.html`.
- Electron Builder for packaging.

The app is intentionally lightweight. Prefer small, practical changes over framework rewrites.

## Commands

Install dependencies:

```powershell
npm install
```

Run in development:

```powershell
npm start
```

Build:

```powershell
npm run build:win
npm run build:linux
npm run build:mac
```

Syntax checks:

```powershell
node --check src\main.js
node --check src\preload.js
```

For `src/index.html`, extract the inline script and run `node --check` on the temporary file.

## Architecture Notes

- `src/main.js` owns filesystem access, project persistence, process spawning, process cleanup, terminal processes, and persisted logs.
- `src/preload.js` exposes safe IPC methods through `window.api`.
- `src/index.html` owns UI state, rendering, output display, process state labels, cards, filters, modal behavior, and terminal UI.
- Project definitions are stored in `projects.json` under Electron user-data.
- Recent process logs are stored in `process-logs.json` under Electron user-data.

## Windows Process Cleanup

Windows is a first-class target. Do not use plain `child.kill()` for launched project cleanup.

Use the existing centralized process-tree cleanup in `src/main.js`, which calls:

```text
taskkill /PID <pid> /T /F
```

This matters because Python or Node child processes can otherwise survive after their shell parent exits and keep ports locked.

## Environment Detection

Current launch behavior:

- Detects Python virtual environments in `.venv`, `venv`, and `env`.
- Prepends the virtual environment executable folder to `PATH`.
- Rewrites leading `python` / `python3` commands to the detected venv Python.
- Prepends `node_modules/.bin` to `PATH`.

When adding environment features, preserve these behaviors.

## Renderer Editing Caution

`src/index.html` currently contains mojibake/encoding artifacts in comments and UI icon labels. Avoid broad patches around decorative comments or icon text. Prefer small edits anchored to plain ASCII JavaScript identifiers.

When changing project card buttons, update both:

- Initial card render in `renderGrid`.
- Dynamic card updates in `updateProjectCardStatus`.

## Persistent Logs

Logs are intentionally separate from project definitions:

- `projects.json` should remain focused on project config.
- `process-logs.json` stores recent output and `lastRun` metadata.
- The renderer trims output to `MAX_PROCESS_LOG_ENTRIES`.
- The main process normalizes saved logs to avoid unbounded growth.

If adding export or retention settings, keep backwards compatibility with existing `process-logs.json`.

## Product Direction

The main product risk is becoming only a pretty command runner. Prioritize features that make ProjectHub remember and understand projects better than a terminal tab:

- `.env` support.
- Per-project environment variables.
- Command presets from `package.json`.
- Docker Compose detection.
- Git branch/status metadata.
- Health checks.
- AI workflow context: docs, prompt templates, runbooks, context files.

## Testing Expectations

At minimum after code changes:

- Run syntax checks for changed JS.
- If touching `src/index.html`, parse-check the extracted inline script.
- If touching process lifecycle, manually verify Run, Stop, Restart, and failed command behavior.
- If touching persistence, verify app restart behavior and existing user data compatibility.

## Do Not

- Do not replace the app with a frontend framework without explicit direction.
- Do not merge process logs into `projects.json`.
- Do not remove Windows `taskkill` process-tree cleanup.
- Do not assume terminal pipes are equivalent to PTY behavior.
- Do not rewrite unrelated mojibake text unless the task is specifically to clean encoding.
