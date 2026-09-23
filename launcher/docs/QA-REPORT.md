# Radial launcher QA report

## Controller verification

Executed with Electron 36.3.1's embedded Node runtime (reported Node runtime: v22.15.1):

```text
ELECTRON_RUN_AS_NODE=1 electron.exe --test tests/tree.test.js
1..6
# tests 6
# pass 6
# fail 0
```

The six tests cover root open/reset, a five-level branch, dynamic levels, switching to an ancestor sibling, invalid/non-visible IDs, back/collapse, and snapshot/input mutation isolation.

A bounded hidden-`BrowserWindow` smoke harness is present at `launcher/tests/smoke.js` (with its minimal app manifest and bridge stub under `launcher/tests/smoke-app` / `smoke-preload.js`). It loads the production `index.html`, drives the real wedge and breadcrumb selectors, checks the deep branch and leaf rendering, switches to Capture, verifies desktop-host transparency and dormant core sizing, checks mode-call transitions, and collapses with a timeout guard. After fixing the test harness, this test executed successfully; see the renderer smoke results below. Test-only sandbox/GPU switches were needed in this environment and are not normal launch defaults.

The mock tree includes branches with 2, 3, and 4 children. It is mock-only and performs no process, shell, filesystem, or external-service actions.

## Integration review (not a desktop acceptance test)

The controller API is browser-compatible and the current renderer uses its `levels`, `selectedId`, `path`, and `leaf` fields. The renderer also has a fallback tree for a standalone page.

Current desktop/host behavior still requires verification for click-through and focus, global shortcut registration, multi-monitor/work-area placement, DPI scaling, reduced-motion, and screen-reader output. These are not claimed by the renderer smoke test.

The prior script-path, capture-selector, and breadcrumb-loop findings are resolved in the current files.

## Renderer smoke execution

Executed successfully with Electron 36.3.1 using `--no-sandbox --disable-gpu --in-process-gpu`:

```text
launcher renderer smoke: PASS
smoke-result.json: {"pass":true}
checks: scripts, deep-path, leaf, breadcrumb, capture-branch, transparency,
        dormant-size, mode-transitions, collapse
```

## Readiness

Controller tests and renderer smoke: **passing**. Four host captures were generated; the final capture asserts hover and branch navigation. Native click-through, hotkey/focus behavior, desktop accessibility and performance remain **unverified**. Visual fidelity is not approved; see MILESTONE-REVIEW.md.

