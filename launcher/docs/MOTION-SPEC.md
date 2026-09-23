# ProjectHub Radial Launcher — Mechanical Motion Specification

**Status:** Working design specification  
**Scope:** Radial launcher visual/interaction layer only  
**Maturity:** Exploratory. This document defines the intended motion language and evaluation criteria, not a frozen implementation contract.

The launcher should read as a physical mechanism that reconfigures itself to expose navigation. The user should feel that they are operating a constructed object with linked moving parts, rather than watching conventional UI elements animate.

This document is intentionally permissive about exact geometry, timing, rendering technique, and choreography. A later implementation may depart from any individual sequence below if it produces a clearer, more convincing, more usable mechanical result.

---

## 1. Primary Motion Principle

Every major visible transition should have an understandable physical cause.

A movement should be explainable in terms such as:

- a plate unlocks;
- a collar rotates;
- a rail extends;
- a latch releases;
- a carrier ring advances;
- an aperture opens;
- a child assembly deploys;
- a retaining plate settles;
- a connector channel energizes.

Avoid transitions whose only explanation is that "the UI changed state."

Opacity, scale, blur, and generic transforms may support a transition, but structural elements should not primarily appear or disappear through ordinary web-animation effects.

---

## 2. Mechanical Causality

Motion should propagate through the object.

A child branch should look as though the selected parent caused it to become mechanically available.

Preferred causal chain:

```text
selection
  ↓
local acknowledgement
  ↓
unlock / release
  ↓
structural motion
  ↓
child carrier becomes available
  ↓
child modules deploy
  ↓
settle / lock
```

The visual design does not need to literally simulate real-world engineering. It does need internal consistency.

If one motion implies that a ring is physically attached to another, later animation should respect that relationship.

---

## 3. Structural Hierarchy

The visual system should distinguish at least these conceptual mechanical roles:

### Core

The central mechanism represents ProjectHub itself and the current navigation identity.

It may act as:

- power source;
- navigation origin;
- back control;
- state indicator;
- motion initiator.

The core should not behave like a decorative spinner.

### Carrier / structural rings

These are the mechanical tracks that carry active modules.

They may contain:

- rails;
- guide channels;
- retainers;
- locks;
- bearing-like structures;
- illuminated traces;
- braces.

They should make the radial hierarchy feel physically supported.

### Modules / plates

Interactive wedges are deployable modules mounted on a carrier.

Each module should ideally have multiple perceived layers:

```text
top plate
trim / bevel
light channel
mount / hinge / carriage
recessed base
carrier
```

The selected state should affect these sublayers differently rather than simply recoloring one flat polygon.

### Connectors

A child level should have a visible relationship to its parent.

Possible connector language:

- track extension;
- mechanical arm;
- radial bridge;
- energized seam;
- sliding carriage;
- nested retaining ring;
- linked arc.

### Readout / context panel

The context panel should behave as an instrument readout docked to the object, not as an unrelated floating web card.

Possible treatments:

- telescoping arm;
- hardline connector;
- projected trace;
- mounted display;
- physically aligned edge.

---

## 4. Motion Categories

The launcher should use four broad motion categories.

### Ambient motion

Purpose: communicate that the dormant object is powered and available.

Characteristics:

- very low amplitude;
- slow;
- non-distracting;
- no major geometry changes;
- reduced or paused when appropriate.

Examples:

- rotor drifting a few degrees;
- an aperture blade making a tiny corrective adjustment;
- a reflection traveling across a metal surface;
- a faint amber pulse moving through one internal seam.

### Reactive motion

Purpose: acknowledge hover, focus, or targeting.

Characteristics:

- local;
- quick;
- reversible;
- no major hierarchy change.

Examples:

- module lifts 2–6 px along its radial normal;
- local trim brightens;
- shadow deepens beneath the plate;
- one nearby retaining element shifts slightly.

### Structural motion

Purpose: change navigation depth or machine configuration.

Characteristics:

- slower than hover;
- visibly linked to neighboring parts;
- should suggest weight;
- should settle into a stable final configuration.

Examples:

- ring rotation;
- plate release;
- track extension;
- carrier deployment;
- branch retraction;
- aperture transition.

### Confirmation motion

Purpose: acknowledge a leaf action.

Characteristics:

- brief;
- decisive;
- should not imply another navigation level unless one actually exists.

Examples:

- active module locks into place;
- a local amber pulse travels toward the core;
- context display engages;
- center emits one restrained pulse.

---

## 5. Dormant State

The dormant state should feel like a compact physical object in standby.

The object may show:

- slow internal rotor drift;
- subtle internal amber movement;
- occasional aperture micro-adjustment;
- faint environmental reflection changes;
- minimal mechanical breathing.

The dormant state should not constantly spin every visible layer.

A preferred behavior is intermittent or very slow motion that implies a mechanism at rest.

### Dormant success test

The launcher should remain visually interesting while being tolerable to leave on-screen for hours.

---

## 6. Wake / Summon Sequence

The summon animation is one of the defining moments of the launcher.

A starting choreography:

```text
1. Core wakes
   - internal amber intensity rises
   - rotor accelerates slightly

2. Inner lock releases
   - a retaining collar rotates a few degrees
   - one or more seams illuminate

3. Primary carrier deploys
   - structural ring separates from dormant housing
   - visible depth between layers increases

4. Primary modules unlock
   - plates rise or translate radially
   - gaps become visible
   - labels/icons become readable

5. Illumination propagates
   - amber traces travel through selected structural paths
   - nonactive hardware remains dark

6. Settle
   - rotor decelerates
   - modules settle into operational position
   - small inertial correction completes the move
```

This sequence is illustrative rather than mandatory.

The essential requirement is that opening the launcher feels like deployment rather than a radial menu fading in.

### Target duration

Rough exploratory range:

- 500–900 ms total;
- major moving mass should not feel instantaneous;
- interaction may become available before every micro-animation finishes if doing so improves responsiveness.

---

## 7. Hover / Focus Sequence

Hover should communicate that a specific module is being targeted.

Recommended behavior:

- move along the module's own radial normal;
- increase perceived Z-height slightly;
- deepen its cast shadow;
- sharpen one or two highlights;
- energize its local amber trim;
- optionally move a nearby latch or retainer by a very small amount.

Avoid:

- moving every segment upward in screen coordinates;
- rearranging child structure on accidental hover;
- large displacement;
- heavy bloom;
- unrelated whole-machine motion.

### Target duration

Approximately 100–190 ms.

Hover-out should generally be slightly quicker or equal in duration.

---

## 8. Select / Descend Sequence

Descending into a branch is the most important structural transition.

A preferred sequence:

```text
1. Target confirmation
   selected plate lifts and brightens

2. Local lock event
   edge illumination travels around the module
   nearby retaining seam unlocks

3. Sibling settle
   unselected modules reduce prominence
   their physical position remains understandable

4. Parent-to-child connection
   connector rail / carriage / illuminated track becomes visible

5. Child carrier deployment
   next structural layer rotates, telescopes, slides, or unfolds from the selected branch

6. Child module deployment
   child plates move into their usable positions
   stagger may be used to imply assembly

7. Core identity update
   central mechanism changes icon/label/state

8. Mechanical settle
   moving parts stop
   amber state stabilizes
```

A new level should not simply replace the old ring.

The parent-child relationship should remain readable through geometry, lighting, ancestry, or compression.

### Target duration

Approximately 350–650 ms depending on the amount of physical reconfiguration.

---

## 9. Branch Geometry

The long-term target should move away from treating every level as another universal complete ring.

Preferred exploration direction:

- root may be a complete carrier ring;
- selected branch may unlock a partial or directional outer assembly;
- child groups may occupy only the mechanical region associated with that parent;
- dormant child channels may remain visible as structural hints;
- deep navigation may compress older levels rather than grow indefinitely.

This is an area for experimentation.

A full ring is acceptable when it produces the clearest geometry, but it should feel like a physical carrier, not an SVG donut created because circles are easy to calculate.

---

## 10. Back / Ascend Sequence

Back navigation should mechanically undo the current branch.

Preferred sequence:

```text
child modules disengage
   ↓
child carrier retracts
   ↓
connector illumination travels inward
   ↓
parent module returns to active focus
   ↓
core identity returns to parent
   ↓
mechanism settles
```

Back should be visually related to descent without necessarily being an exact reversed animation.

The system may use faster timings for back navigation to keep repeated ascent efficient.

### Target duration

Approximately 260–500 ms.

---

## 11. Collapse Sequence

Collapsing to dormant should communicate the machine returning to standby.

Possible sequence:

- deepest child mechanism retracts;
- carrier levels collapse inward;
- primary modules reseat into chassis;
- retaining collar rotates closed;
- edge illumination drains toward center;
- core aperture settles;
- ambient idle returns.

The collapse should be substantially faster than playing every prior navigation transition in reverse individually.

---

## 12. Leaf Action Sequence

Leaf activation should feel like engaging a module.

Possible sequence:

```text
press
 ↓
plate depresses slightly or locks into detent
 ↓
amber pulse runs inward/outward
 ↓
context/readout confirms engagement
 ↓
plate returns to selected resting position
```

If the action launches another application or closes the launcher, the transition should still provide enough acknowledgement that the click does not feel lost.

---

## 13. Rotor / Core Behavior

The current continuous rotor is a temporary prototype behavior.

Preferred long-term behavior:

### Idle

- very slow drift;
- occasional small directional change;
- not a constant high-visibility spin.

### Wake

- brief acceleration;
- associated collar or aperture movement.

### Descend

- short purposeful acceleration or indexed rotation;
- motion should appear to drive the newly deployed structure.

### Settle

- deceleration to slow idle or stillness.

### Back

- small reverse/indexing response;
- no need to literally rewind all accumulated rotation.

The rotor should visually participate in causality.

---

## 14. Mechanical Timing Language

Exact timings remain adjustable.

Suggested starting ranges:

| Motion | Range |
|---|---:|
| hover/focus response | 100–190 ms |
| local plate selection | 180–320 ms |
| branch deployment | 350–650 ms |
| branch retraction | 260–500 ms |
| wake | 500–900 ms |
| collapse | 350–700 ms |
| leaf acknowledgement | 180–360 ms |

Large structural masses should generally move more slowly than small latches, lights, or trim.

This timing relationship matters more than individual numbers.

---

## 15. Easing and Weight

Preferred qualities:

- deliberate acceleration;
- confident travel;
- visible deceleration;
- tiny final mechanical settle;
- little or no bounce.

Avoid:

- playful elastic easing;
- exaggerated overshoot;
- rubbery spring motion;
- generic CSS ease everywhere;
- perfectly constant linear motion for heavy parts.

Different parts may use different easing curves when their perceived mass differs.

---

## 16. Illumination Logic

Amber light should communicate energy, selection, and mechanical connectivity.

It should generally:

- originate from meaningful seams or channels;
- travel along a path rather than appearing everywhere simultaneously;
- spill subtly onto nearby metal;
- brighten only where state requires it.

Inactive structure should remain mostly dark.

The system should avoid becoming a neon ring.

---

## 17. Sound Hooks

Audio is optional and remains deferred, but animation architecture should leave room for synchronized cues.

Potential future sound events:

- wake;
- latch release;
- plate settle;
- child carrier lock;
- leaf engagement.

No visual state should depend on sound.

---

## 18. Reduced Motion

A reduced-motion mode should preserve state comprehension without performing elaborate mechanical choreography.

Possible behavior:

- very short structural translations;
- no continuous rotor drift;
- no long traveling highlights;
- immediate but still spatially consistent hierarchy changes.

Reduced motion is not equivalent to removing all feedback.

---

## 19. Implementation Guidance

The present SVG/CSS renderer may continue to be used during the motion study if it can convincingly model connected parts.

However, the renderer should be reconsidered if implementation starts relying on:

- opacity tricks instead of structural movement;
- one SVG path per "plate" with no substructure;
- complete DOM replacement that prevents persistent part interpolation;
- generic radial transforms that make every segment behave identically;
- decorative motion that has no causal relationship.

A future Three.js or hybrid renderer remains a valid option.

Rendering technology is subordinate to the mechanical result.

---

## 20. Animation Architecture Recommendation

Moving parts should eventually have persistent identities.

A useful conceptual model:

```text
MechanicalAssembly
  id
  role
  parentAssembly
  restPose
  activePose
  transitionState
  children
```

Navigation state should request machine configurations.

The motion system should then transition from the current configuration to the requested one.

This is preferable to rebuilding the entire visual tree and letting CSS animate whatever happens to exist afterward.

---

## 21. Motion State Machine

A starting state model:

```text
DORMANT
  ↓ summon
WAKING
  ↓
READY
  ↓ choose branch
LOCKING_SELECTION
  ↓
DEPLOYING_CHILD
  ↓
READY
  ↓ choose leaf
ENGAGING_ACTION
  ↓
READY

READY
  ↓ back
RETRACTING_CHILD
  ↓
READY

READY
  ↓ collapse
COLLAPSING
  ↓
DORMANT
```

Input may need to be temporarily constrained during destructive configuration transitions.

Hover/focus may remain available during safe portions of structural motion.

---

## 22. Hard Evaluation Rules

A visual implementation should be rejected or reworked if:

- a structural level primarily fades into existence;
- selected plates move in a screen-global direction instead of a mechanically meaningful direction;
- new child structure appears with no visible connection to its parent;
- every ring behaves identically regardless of depth or context;
- the center rotor spins continuously without responding to state;
- the machine loses its visual ancestry during deep navigation;
- large components move with bouncy or weightless easing;
- illumination is used as decoration without indicating mechanical state;
- motion makes the hierarchy harder to understand.

These are stronger requirements than any specific pixel dimensions or exact timing values.

---

## 23. Areas Intentionally Left Open

The following remain design questions:

- full-ring versus branch-local child carriers;
- exact number of simultaneous visible levels;
- how much ancestor compression occurs at deep levels;
- whether some child structures hinge versus telescope versus rotate;
- whether different node categories use different mechanical assemblies;
- exact rotor/aperture choreography;
- exact depth and perspective;
- whether selected modules physically raise, depress, or unlock sideways;
- how context panels deploy mechanically;
- whether dormant state docks to a desktop edge or floats freely.

Prototype evidence should decide these questions.

---

## 24. Motion Milestone Success Criteria

The mechanical motion milestone succeeds when:

1. opening the launcher reads as a machine entering an operational configuration;
2. hovering a module feels like targeting a physical part;
3. selecting a branch visibly causes the next structure to deploy;
4. parent and child assemblies remain mechanically connected;
5. back navigation visibly retracts the current branch;
6. the center mechanism participates in the state change;
7. amber illumination follows meaningful structural paths;
8. no important transition relies primarily on fade/scale;
9. deep navigation remains understandable;
10. an observer can plausibly describe what the machine physically did during each transition.

The target reaction is:

> "The machine unfolded."

That sentence is the visual gate for the next stage.
