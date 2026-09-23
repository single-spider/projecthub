# Next Milestone — Mechanical Unfolding Pass

**Branch:** `launcher-v02`  
**Scope:** launcher visual/mechanical behavior only  
**Dependency:** `MOTION-SPEC.md`

This milestone should improve the existing radial prototype without adding real ProjectHub integrations.

The milestone is intentionally visual-first. Terminal, editor, Git, AI, project management, documentation management, and other eventual actions remain mocked.

---

## Objective

Convert the current textured radial interface into a visibly connected mechanical assembly.

The current prototype has useful structural pieces:

- shared chassis;
- rotor;
- radial hierarchy;
- mock branch data;
- hit testing;
- active-path state;
- desktop host.

The next pass should focus on how those pieces move and connect.

---

## Stage A — Persistent part model

### Goal

Stop treating structural transitions as wholesale re-render events.

### Work

- give every visible mechanical part a stable identity;
- retain plates across state changes where possible;
- separate plate face, under-plate, trim/light channel, and mount;
- expose transform targets for each subpart;
- create a transition coordinator rather than relying on incidental CSS animation.

### Gate

A root plate can move from rest → hover → selected → rest without being destroyed/recreated.

---

## Stage B — Mechanical wake sequence

### Goal

Replace "menu appears" behavior with a convincing deployment.

### Work

- rotor idle should become slow/intermittent rather than continuous decorative spin;
- add a collar/lock movement around the core;
- delay plate deployment until the core/collar visibly releases them;
- primary modules should lift/separate from the chassis;
- amber traces should propagate outward;
- stagger plate movement slightly;
- settle to a stable ready state.

### Gate

A screen recording of summon should read as a machine opening even with labels/icons hidden.

---

## Stage C — Physically correct module hover

### Goal

Make targeting feel local and radial.

### Work

- calculate the outward normal of each module;
- lift/translate along that normal;
- move plate and shadow separately;
- brighten local trim only;
- add optional 1–2 px latch/retainer response;
- keep siblings stationary.

### Gate

Every wedge moves away from the center of the machine rather than in a global screen direction.

---

## Stage D — Branch-causal deployment

### Goal

Make parent selection visibly produce the child structure.

### Work

- selected parent enters a locked/raised state;
- amber seam travels around the parent;
- a connector rail emerges or unlocks from that region;
- next carrier deploys from the selected branch;
- child modules populate after carrier motion begins;
- siblings remain physically present but visually subordinate;
- core identity changes during the same causal sequence.

### Gate

With labels hidden, an observer can still tell which parent module caused the newly deployed child assembly.

---

## Stage E — Branch-local geometry experiment

### Goal

Test whether complete universal rings should be replaced by directional mechanical assemblies.

### Variants to prototype

- full ring with parent-aligned connector;
- partial child arc centered on parent;
- telescoping branch carrier;
- nested rail that rotates into the parent's radial sector.

At least two variants should be captured side by side before choosing one.

### Gate

Choose the variant that best preserves hierarchy while looking physically plausible.

The decision is explicitly reversible.

---

## Stage F — Back/retraction choreography

### Goal

Make returning one level feel like the same machine retracting.

### Work

- disengage child modules;
- retract carrier;
- drain amber trace inward;
- parent plate returns to primary focus;
- center mechanism responds;
- restore siblings.

### Gate

Back navigation is immediately understandable without relying on breadcrumb text.

---

## Stage G — Leaf engagement

### Goal

Make a terminal/VS Code/etc. leaf feel like a module activation.

### Work

- active plate depresses or locks;
- short amber pulse;
- context panel engages;
- optional single mechanical click hook;
- leaf remains mocked.

### Gate

Leaf activation is visibly different from descending into another branch.

---

## Stage H — Context panel docking

### Goal

Make the readout feel physically related to the machine.

### Work

Explore:

- telescoping arm;
- rigid connector;
- illuminated trace;
- anchored HUD projection.

The panel itself may remain rectangular.

### Gate

The panel should no longer feel like a generic application card floating next to the radial menu.

---

## Stage I — Desktop-object pass

### Goal

Reduce the sense that the launcher is an ordinary rectangular application window.

This may happen after the core motion work if platform constraints make it slower to iterate.

### Work

- evaluate transparent-window clipping;
- evaluate only-widget hit regions;
- reduce full-background dependency in production mode;
- test dormant positioning at desktop edge/corner;
- keep a debug/showcase window mode for visual development.

### Gate

In normal mode, only the launcher object and any active docked readout should visually occupy the desktop.

---

## Stage J — Motion review

Capture at least these sequences:

```text
Dormant → Root
Root → Development
Development → MoneyControl
MoneyControl → Terminal
Terminal → Back
Deep branch → Dormant
Root hover sweep
```

Review each sequence with labels mentally removed.

Questions:

- does every move have a mechanical cause?
- can the active branch be identified from motion alone?
- do large parts feel heavier than small parts?
- does the core participate?
- do light channels communicate energy/state?
- is anything simply fading in because it was easier?
- do any movements contradict how the machine appears to be assembled?

---

## Out of scope

Do not add:

- real terminal launching;
- real VS Code launching;
- Git actions;
- AI integrations;
- project database integration;
- backlog/roadmap behavior;
- documentation management;
- plugin architecture;
- production menu taxonomy.

Mock data exists only to exercise the motion system.

---

## Recommended implementation order

```text
persistent parts
  ↓
wake
  ↓
hover
  ↓
branch deployment
  ↓
branch geometry experiment
  ↓
back
  ↓
leaf engagement
  ↓
context docking
  ↓
desktop-object pass
```

Do not proceed deeper when an earlier stage still visibly reads as ordinary UI animation.

---

## Milestone acceptance

This milestone is ready for review when one deep path can be navigated:

```text
ProjectHub
→ Development
→ MoneyControl
→ Terminal
```

and every transition in that path has a coherent mechanical explanation.

The path does not need final art quality.

It does need a convincing physical motion language that can be reused across the rest of the launcher.
