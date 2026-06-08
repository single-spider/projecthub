# ProjectHub Env and Preset Test

This fixture tests ProjectHub launch behavior for `.env`, per-project env vars,
`node_modules/.bin` PATH prepending, command preset detection, preset launching,
failure state, and stopping long-running commands.

## ProjectHub Setup

Use this project path:

```text
c:\Users\admis\Downloads\projecthub\projecthub\tests\projecthub-env-test
```

In ProjectHub:

1. Add or edit the project.
2. Set `Run Command` to:

```text
npm start
```

3. Click `Auto-detect`.
4. Confirm `Command Presets` includes at least:

```text
dev=npm run dev
start=npm start
test=npm test
build=npm run build
agent=npm run agent
fail=npm run fail
long=npm run long
```

5. Set `Environment Variables` to:

```text
FROM_PROJECT_ENV=loaded-from-projecthub
OVERRIDE_ME=projecthub-value
```

6. Save the project.

If this project was already saved before command presets existed, restart
ProjectHub. Existing projects without presets should be backfilled from
`package.json` automatically.

## Manual Tests

### Default Run

Click `Run`.

Expected output contains:

```text
MODE=start
NPM_LIFECYCLE_EVENT=start
FROM_DOTENV=loaded-from-dotenv
FROM_PROJECT_ENV=loaded-from-projecthub
OVERRIDE_ME=projecthub-value
QUOTED_DOTENV=quoted value from dotenv
PATH_HAS_NODE_BIN=true
```

### Preset Run

Choose `dev` from the card `Presets` dropdown.

Expected output contains:

```text
MODE=dev
NPM_LIFECYCLE_EVENT=dev
```

Repeat with `test`, `build`, and `agent`. The `MODE` and
`NPM_LIFECYCLE_EVENT` values should match the selected preset.

### Failed Command

Choose `fail` from the card `Presets` dropdown.

Expected behavior:

```text
INTENTIONAL_FAILURE=true
```

The card should move to a failed state after the process exits with a non-zero code.

### Stop Long-Running Command

Choose `long` from the card `Presets` dropdown.

Expected output starts with:

```text
MODE=long
LONG_RUNNING=true
TICK=1
```

Click `Stop`. The card should return to idle/stopped and ticks should stop.

### Validation Edges

Edit the project and try this invalid environment value:

```text
BAD LINE
```

Expected: ProjectHub refuses to save and shows an env validation error.

Try duplicate presets:

```text
dev=npm run dev
dev=npm start
```

Expected: ProjectHub refuses to save and shows a duplicate preset error.
