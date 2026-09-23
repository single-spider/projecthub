# Radial launcher: prototype contract

## Authority and scope
The handoff specification and the user's clarification govern this isolated prototype. Every reference to a missing spreadsheet means the supplied handoff documents; no spreadsheet is pending. The concept image is a visual direction, not fixed geometry. Existing ProjectHub functionality and user data must remain untouched. All leaf actions are mocked.

## Decision 1: isolate the experiment
Use `launcher/` as a separate Electron entry point, reusing the installed runtime without changing the existing application's entry point or package scripts. The first renderer is a dependency-free SVG/CSS depth study. This is a reversible feasibility choice, not approval of flat visuals or a final renderer decision. Test material/depth quality before committing to a production asset pipeline or GPU dependencies.

## Interfaces
* `tree.js`: pure, browser/CommonJS navigation controller. No Electron, DOM, geometry, or real actions.
* `mock-data.js`: sample recursive nodes; variable child counts and depth.
* `renderer.js`, `styles.css`, `index.html`: geometry, visual states, accessible controls, keyboard input, context, and ancestry.
* `main.js`, `preload.js`, `launch.js`: isolated desktop host, hotkey, usable display placement, lifecycle, and narrow IPC.

`LauncherTree.createController(root)` exposes `getState`, `open`, `collapse`, `select(id)`, `back`, `reset`. Snapshots have `isOpen`, `path` (root-inclusive IDs), `current`, `levels` (`parentId`, `children`, `selectedId`), and `leaf`. Selecting a visible sibling clears descendants. Hover never commits. Opening resets to root. Back ascends, then collapses from root.

Optional browser bridge `window.launcherHost`: `ready()`, `setMode('dormant'|'expanded')`, `setPointerInteractive(boolean)`, `onSummon(callback)`, `quit()`, `getConfig()` returning a promise with `hotkey` and `platform`. Renderer works without the bridge for visual testing. Main process validates IPC inputs and isolates renderer privileges.

## Ownership and acceptance
Luna owns implementation, integration, routine fixes, and evidence collection. Primary agent owns contracts, milestone review, and cross-module decisions. Assign disjoint files. Independent QA verifies integration after implementation.

1. Functional gate: dormant/open, variable branches, deep leaf, ancestor switch, back/collapse, reset-on-summon, no real execution; automated state tests.
2. Host gate: runnable isolated Electron entry, shortcut handling, display work area positioning, transparent-space input behavior, clear exit path. Separate automated evidence from actual desktop checks.
3. Visual gate: obvious hover lift, physical separation/bevel/shadow, selective amber path, readable text and ancestry, attached context, mechanical transitions, reduced motion.
4. Delivery gate: commands, screenshots where available, test results and explicit unverified Windows scenarios. Never claim manual desktop QA from source inspection or synthetic events alone.

## Art production gate
Do not generate production textures yet. After a representative wedge/core and lighting slice is reviewed, define channel conventions, dimensions, tiling, color space, filenames and validation scenes in one Gemini brief. Gemini handles iteration and submits final assets plus evidence. Assets must not bake labels, menu topology, or fixed ring counts. Validate final artwork in the real renderer, not just a beauty render.
