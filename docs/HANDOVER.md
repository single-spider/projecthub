# ProjectHub Handover

## Snapshot

ProjectHub is an Electron desktop app that turns local projects into launchable cards with output, terminal access, validation, process lifecycle controls, and recent logs. The product direction is to become a lightweight local development command center rather than only a prettier `cd project && npm start`.

## Current Status

Phase 1 reliability is mostly complete:

- Project path and command validation are implemented.
- Running projects can be started, stopped, and restarted.
- Windows process-tree cleanup uses `taskkill /F /T /PID` so spawned child processes are not left behind.
- Project state is tracked as `starting`, `running`, `stopping`, `stopped`, or `failed`.
- Recent output persists in Electron user-data via `process-logs.json`.
- Project cards show last run status and timestamp.

Phase 2 project configuration is now underway:

- Python virtual environments are auto-detected from `.venv`, `venv`, and `env`.
- `node_modules/.bin` is prepended to `PATH` for launched projects and project terminals.
- Project `.env` files are loaded from the project folder and merged into launch env.
- Per-project environment variables can be edited in the Add/Edit modal and override `.env` and inherited values.
- Node `package.json` scripts are detected as command presets during auto-detect.
- Projects can store command presets as `Name=command` lines.
- Cards show a `Presets` dropdown for saved presets; selecting one launches that command through the normal project launch path.
- Existing saved projects with no presets are hydrated from `package.json` on app startup when possible.

## Important Files

- `src/main.js` - Electron main process, project persistence, process spawning, Windows cleanup, terminal spawning, process log persistence.
- `src/preload.js` - IPC bridge exposed as `window.api`.
- `src/index.html` - single-file renderer UI, CSS, and frontend state management.
- `src/launch.js` - development launcher wrapper.
- `docs/ROADMAP.md` - phased implementation plan.
- `docs/FEATURE_GAPS.md` - product checklist and rationale.
- `tests/projecthub-env-test` - manual fixture for env, preset, failure, and long-running process checks.

## Data Storage

ProjectHub stores user data in Electron's `app.getPath('userData')`.

On this Windows machine, observed path:

```text
C:\Users\admis\AppData\Roaming\projecthub
```

Current data files:

- `projects.json` - project definitions.
- `process-logs.json` - persisted recent output and last run metadata.

The renderer expects `projects.json` to be an array.

Project records may now include:

- `env` - object of per-project environment variables.
- `presets` - array of `{ name, command }` command presets.

Existing records without these fields remain valid.

## Recently Added Registry Entry

The app registry currently includes:

```text
Name: Star Wars Rebel Prompt
Path: A:\Star wars rebel\prompt
Command: C:\Users\admis\AppData\Local\Programs\Python\Python311\python.exe "A:\Star wars rebel\prompt\main.py"
Type: python
```

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

- `src/index.html` contains mojibake/encoding artifacts in visible labels and comments. Be careful with large patches around icon text. Prefer tight anchors around plain JavaScript tokens.
- `child_process.spawn` is not a PTY. The built-in terminal is useful, but interactive prompts and full-screen terminal apps may behave poorly until Phase 4 adds PTY support.
- On Windows, do not rely on `child.kill()` for project processes. Use the centralized process-tree cleanup path in `src/main.js`.
- Project logs are capped by entry count, not byte size. Large single output chunks can still make `process-logs.json` bulky.
- Some card action markup is updated dynamically by `updateProjectCardStatus`; when changing buttons, check both initial render and dynamic update paths.
- The modal must remain focusable in Electron. `src/index.html` marks modal controls as `-webkit-app-region: no-drag`; if inputs stop accepting typing, check drag-region CSS and overlays first.
- Raw `npm start` from a shell does not load fixture `.env`; ProjectHub's main process is responsible for loading `.env` into launched projects.

## Next Best Work

Recommended next slice: make command presets more ergonomic and update docs/roadmap.

Good order:

1. Improve the preset dropdown UI and make it easier to run/stop specific presets.
2. Persist output metadata by command/preset where useful.
3. Add AI-agent-oriented presets as a generic command type, likely after PTY work.
4. Mask sensitive env values in the UI.
5. Update `docs/ROADMAP.md` and `docs/FEATURE_GAPS.md` to mark env/preset pieces implemented and add AI agent launch presets as a future item.

Product rationale: ProjectHub now handles env and multiple commands; the next value is making those commands first-class workflow actions instead of just text fields.

## Test Fixture

Use `tests/projecthub-env-test` to manually test:

- `.env` loading.
- Per-project env overrides.
- Quoted `.env` values.
- `node_modules/.bin` PATH prepending.
- `package.json` script detection.
- Preset launching from the card dropdown.
- Failed command state via `npm run fail`.
- Stop behavior via `npm run long`.

Detailed steps and expected output are in:

```text
tests\projecthub-env-test\README.md
```

## Manual Test Checklist

After lifecycle/log changes, test:

- Add or load a Python project.
- Run it and confirm output appears.
- Restart it and confirm state changes from running to stopping to starting/running.
- Stop it and confirm child processes are gone on Windows.
- Close and reopen ProjectHub and confirm output history remains.
- Clear output and confirm it does not return after restart.
- Trigger a failing command and confirm the card shows failed status and last run failure.
- For env/preset changes, follow `tests\projecthub-env-test\README.md`.
