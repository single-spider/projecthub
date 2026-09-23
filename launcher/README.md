# ProjectHub radial launcher prototype

This is an isolated Electron visual prototype. It does not read ProjectHub data, launch commands, or modify the existing app.

From the nested `projecthub` directory:

```powershell
node launcher\launch.js
```

The default summon key is **Ctrl+Alt+Space**. Set `LAUNCHER_HOTKEY` before launch to try another Electron accelerator: `$env:LAUNCHER_HOTKEY='Ctrl+Alt+Space'; node launcher\launch.js`.

For non-interactive evidence captures:

```powershell
node launcher\launch.js --capture-test
```

PNG files are written to `launcher\evidence\`. Capture mode is debug-only and exits after four screenshots (dormant, expanded, branch, hover).

## Manual Windows checklist

- Confirm dormant core is visible and ordinary clicks outside its small window reach the foreground app.
- Summon over a normal app; test root choices, branch-dependent children, hover lift, leaf, center/Escape back, and repeated Escape collapse.
- Test the hotkey conflict message, focus recovery, maximized app, monitor edge, DPI scaling, and fullscreen app.
- Verify no real command executes. Reduced-motion behavior and keyboard navigation should remain usable.

Desktop, multi-monitor, fullscreen, and focus behavior require real Windows QA; screenshots from capture mode are not a substitute.
