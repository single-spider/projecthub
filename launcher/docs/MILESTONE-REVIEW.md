# Checkpoint 1: isolated interaction scaffold

## Accepted
- Separate Electron entry point; existing ProjectHub source and working-tree edits preserved.
- Pure recursive controller with variable children, deep branches, ancestor switching, reset-on-summon and back/collapse: six automated tests pass.
- Production renderer smoke passes for deep navigation, mock leaf, breadcrumb return, branch switching, transparency, dormant size, mode transitions and collapse.
- Desktop-host capture produces visual evidence. Captures use a restricted-environment workaround (GPU disabled and test process sandbox disabled); these are not evidence of normal GPU performance or native desktop acceptance.

## Not accepted as finished
The current SVG/CSS renderer is an interaction scaffold, not the requested high-fidelity visual result. It remains too flat and pie-menu-like compared with the concept image. It displays one active ring with generic recessed ancestry, placeholder material gradients and a simple core. Mechanical unfolding, convincing material response and a richly constructed mechanism remain unsolved. The screenshot does not establish these qualities merely because gradients and hover translation exist.

Native global-shortcut behavior over another app, focus recovery, transparent hit-testing, multiple monitors/DPI, fullscreen behavior and idle performance remain manual Windows acceptance checks. A synthetic bridge smoke test cannot prove them.

## Next architectural gate
Retain the tested tree and host boundary. Before extending the present CSS styling, commission a bounded renderer feasibility study: one mechanically constructed core and one beveled wedge, with actual layered/extruded geometry, visible elevation, lighting and readable text. Compare against the reference image and measure the real renderer. Do not commission the final material pack until that representative slice passes visual review.

The consolidated Gemini production brief remains intentionally pending that gate. This avoids manufacturing assets for an unapproved renderer and avoids asking the user to generate repeated speculative packs.

## Division of work used
Luna agents performed repository reconnaissance, controller implementation, host and renderer implementation, captures, integration fixes and independent smoke testing. The primary agent defined interfaces, reviewed milestones, identified cross-module defects and made the visual acceptance decision.
