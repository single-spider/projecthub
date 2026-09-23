# Build notes

## What changed from the supplied launcher

The previous implementation treated each depth as one replacement SVG ring and simulated metal almost entirely with flat gradients. This build keeps the existing lightweight tree-controller idea but replaces the visual layer.

The new renderer:

- consumes every supplied visual asset directly;
- keeps multiple ancestry rings visible simultaneously;
- uses textured SVG plate faces, deep under-plates, fasteners, bevel lines, cast shadows, and amber emissive selection layers;
- adds active-path traces and radial connectors between selected levels;
- uses the supplied rotor as the live center mechanism;
- uses the supplied chassis as both structural underlay and highlight overlay;
- keeps icons as vector geometry rather than font glyphs;
- adds a mechanically framed contextual panel and breadcrumb;
- supports dormant, root, multi-level branch, leaf, hover/focus, back, Escape, click-outside collapse, and global summon states;
- keeps all current leaf commands deliberately mocked.

## Deliberately unresolved

This is still a visual/interaction milestone rather than a frozen product design. Ring dimensions, material tuning, lighting, animation timing, segment density, branch-local geometry, and desktop placement are expected to change after hands-on evaluation.

The next visual iteration should be driven by screenshots/video from the real Windows desktop host, especially around transparent-window composition and monitor scaling.
