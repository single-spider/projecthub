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

Phase 2 has started lightly:

- Python virtual environments are auto-detected from `.venv`, `venv`, and `env`.
- `node_modules/.bin` is prepended to `PATH` for launched projects and project terminals.

## Important Files

- `src/main.js` - Electron main process, project persistence, process spawning, Windows cleanup, terminal spawning, process log persistence.
- `src/preload.js` - IPC bridge exposed as `window.api`.
- `src/index.html` - single-file renderer UI, CSS, and frontend state management.
- `src/launch.js` - development launcher wrapper.
- `docs/ROADMAP.md` - phased implementation plan.
- `docs/FEATURE_GAPS.md` - product checklist and rationale.

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

## Next Best Work

Recommended next slice: Phase 2 environment depth.

Good order:

1. Load `.env` from the project folder and merge it into launch env.
2. Add per-project environment variable fields in the edit modal.
3. Detect useful `package.json` scripts beyond `start`, such as `dev`, `test`, and `build`.
4. Add command presets so a project can run more than one command.

Product rationale: this directly answers the reviewer's concern that ProjectHub must handle environments and workflow context, not just execute commands.

## Manual Test Checklist

After lifecycle/log changes, test:

- Add or load a Python project.
- Run it and confirm output appears.
- Restart it and confirm state changes from running to stopping to starting/running.
- Stop it and confirm child processes are gone on Windows.
- Close and reopen ProjectHub and confirm output history remains.
- Clear output and confirm it does not return after restart.
- Trigger a failing command and confirm the card shows failed status and last run failure.
