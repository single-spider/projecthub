# ProjectHub Radial Launcher

A focused visual prototype for ProjectHub's mechanical, recursively branching desktop radial launcher.

This repository deliberately contains **only the launcher shell**. Project-management, documentation, terminal, AI, Git, search, and other eventual ProjectHub capabilities are represented by mock menu nodes only.

## Current visual milestone

The renderer uses the shared visual assets from the repository root directly:

- `../assets/chassis.png` as the layered mechanical chassis
- `../assets/core-rotor.png` as the animated aperture/rotor
- `../assets/steel-silver.webp` and `../assets/steel-dark.webp` as plate material textures
- `../assets/workshop-background.webp` as the expanded-state environment

The SVG renderer preserves up to three visible hierarchy levels at once, highlights the active ancestry path, adds physical plate gaps/fasteners/shadows, and keeps the center as the current navigation identity.

This is still a structural visual prototype. The next milestone is specifically about converting the current animated radial UI into a mechanically causal object that visibly unlocks, deploys, connects, retracts, and settles.

## Motion rule

The governing visual rule from this point forward is:

> Major movement should look like a physical mechanism changing configuration, not like ordinary UI elements animating.

See:

- [Mechanical motion specification](docs/MOTION-SPEC.md)
- [Mechanical unfolding milestone](docs/NEXT-MILESTONE.md)
- [Visual scope](docs/VISUAL-SCOPE.md)
- [Build notes](docs/BUILD-NOTES.md)

## Run

```bash
npm install
npm start
```

Default desktop summon shortcut:

```text
Ctrl + Alt + Space
```

Override it before launch with `LAUNCHER_HOTKEY`.

## Browser visual review

`index.html` can also be opened directly in Chromium. To force the expanded state:

```text
index.html?open=1
```

To open a branch for visual inspection:

```text
index.html?open=1&path=development/development-moneycontrol
```

## Tests

```bash
npm test
```

## Scope boundary

The leaf commands are mocks. The current work is about geometry, materials, mechanical hierarchy, motion, hover/selection feedback, deep navigation, and desktop presence. Functional integrations come later.
