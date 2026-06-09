# ProjectHub Handover

## Snapshot

ProjectHub is an Electron desktop app that turns local projects into launchable cards with output, terminal access, validation, process lifecycle controls, persisted logs, command presets, health checks, and lightweight project workspaces.

The product direction remains: make ProjectHub remember and understand projects better than a terminal tab, while staying lightweight and framework-free.

## Current Status

Reliability is complete for the current architecture:

- Project path and command validation are implemented.
- Running projects can be started, stopped, and restarted.
- Windows cleanup uses `taskkill /PID <pid> /T /F`.
- App quit waits for project and terminal cleanup.
- Stop/restart failures are surfaced in the UI.
- Project state is tracked as `starting`, `running`, `stopping`, `stopped`, or `failed`.
- Recent output persists in `process-logs.json` and can be exported.

Project configuration is implemented:

- Python virtual environments are auto-detected from `.venv`, `venv`, and `env`.
- `node_modules/.bin` is prepended to `PATH`.
- Project `.env` files are loaded.
- Per-project environment variables override `.env` and inherited values.
- Node `package.json` scripts are detected as presets.
- Custom command presets are stored as project metadata.
- Docker Compose files are detected and compose presets are added.

Workflow upgrades are implemented:

- Projects can be grouped into lightweight workspaces.
- Projects can be favorited.
- Groups and favorites can be filtered.
- Active group filters expose Run Group and Stop Group actions.
- Optional health checks support local URLs, localhost ports, and detected output URLs.
- Health targets can be opened externally.
- Search includes names, descriptions, tags, groups, and commands.
- Recent projects rank higher.
- Keyboard shortcuts focus search and launch the first visible project.

Settings are implemented:

- Default terminal shell.
- Log retention.
- Startup view.

Terminal context is improved:

- Tree, preview, git, and context tabs are available.
- Context discovery includes `AGENTS.md`, agent context files, docs, runbooks, prompts, `package.json`, and `.env`.

## Important Files

- `src/main.js` - Electron main process, persistence, import/export, settings, health checks, process spawning, cleanup, terminal processes, and logs.
- `src/preload.js` - IPC bridge exposed as `window.api`.
- `src/index.html` - renderer UI, state, cards, filters, modals, output, health status, terminal UI, and settings UI.
- `src/launch.js` - development launcher wrapper.
- `docs/ROADMAP.md` - current completed/deferred roadmap.
- `docs/FEATURE_GAPS.md` - remaining gaps and decision notes.
- `tests/projecthub-env-test` - manual fixture for env, preset, failure, and long-running process checks.

## Data Storage

ProjectHub stores user data in Electron's `app.getPath('userData')`.

Current data files:

- `projects.json` - project definitions.
- `process-logs.json` - recent output and last-run metadata.
- `settings.json` - app preferences.

Project records may include:

- `env` - per-project environment variables.
- `presets` - array of `{ name, command }` command presets.
- `group` - lightweight workspace name.
- `favorite` - boolean favorite flag.
- `healthUrl` - URL, `localhost:port`, or port number.

Existing records without these fields remain valid.

## Verification Commands

Use these after JavaScript changes:

```powershell
node --check src\main.js
node --check src\preload.js
```

For the inline script inside `src/index.html`, extract it to a temporary file and parse-check it:

```powershell
$html = Get-Content src\index.html -Raw
$script = [regex]::Match($html, '<script>([\s\S]*)</script>').Groups[1].Value
Set-Content -LiteralPath C:\tmp\projecthub-index-script.js -Value $script -Encoding UTF8
node --check C:\tmp\projecthub-index-script.js
Remove-Item -LiteralPath C:\tmp\projecthub-index-script.js
```

Run the app:

```powershell
npm start
```

## Known Gotchas

- `child_process.spawn` is not a PTY. The built-in terminal is useful, but interactive prompts and full-screen terminal apps may behave poorly until PTY support is added.
- On Windows, do not rely on `child.kill()` for project processes. Use the centralized process-tree cleanup path in `src/main.js`.
- Project logs are still project-scoped, not command-scoped.
- Project logs are separate from project definitions and should remain that way.
- Some older UI text may still contain encoding artifacts. Avoid broad renderer rewrites unless the task is specifically encoding cleanup.

## Recent Commits

- `d8997d4` - Fix process cleanup and Terminal layout.
- `0f721d9` - Add roadmap workflow features.

## Next Best Work

Evaluate real terminal emulation in a branch:

- `node-pty`
- `xterm.js`
- resize events
- packaging impact on Windows, macOS, and Linux

Agent CLI presets should follow PTY evaluation, because tools like Codex CLI, Claude Code, Aider, Gemini CLI, and Goose behave better with real terminal semantics.

## Manual Test Checklist

After lifecycle/log changes:

- Run a Python or Node project.
- Restart it and confirm state transitions.
- Stop it and confirm child processes are gone on Windows.
- Close ProjectHub and confirm launched processes are cleaned up.
- Trigger a failing command and confirm failed state.
- Export logs.

After workflow changes:

- Add/edit a project with env vars, presets, group, favorite, and health target.
- Run a health-checked web project and confirm the badge changes.
- Import/export project definitions.
- Run and stop a group.
- Change settings, restart the app, and confirm they persist.

For env and preset checks, use:

```text
tests\projecthub-env-test\README.md
```
