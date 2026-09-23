# Video Review 001 — Windows Desktop Capture

**Source:** user-supplied Windows screen recording  
**Duration reviewed:** approximately 27.6 seconds  
**Purpose:** evaluate mechanical readability rather than static appearance.

## What the recording proved

The persistent-part renderer is working well enough to expose real motion issues. Branch transitions are now visible as temporal events rather than simple state replacement, which means the next decisions can be based on actual motion instead of screenshots.

## Findings

### 1. Wake choreography is being hidden by host expansion

In the recording the desktop changes from VS Code to an almost fully deployed launcher within roughly one captured frame interval. The intended collar/rotor/plate wake sequence is therefore not readable.

Likely cause: the animation begins while Electron/Windows is still resizing and compositing the dormant window into the expanded window.

**Action:** expand the host first, wait for a compositor beat, then begin the mechanical wake choreography.

### 2. Branch deployment is visible, but still reads as a global ring appearing

Around branch transitions the next carrier becomes visible and its modules populate over several frames. This is better than instantaneous replacement, but the child ring still appears as a universal concentric layer.

The selected parent does not yet feel like the physical source of the new assembly.

**Action:** use the selected parent angle as the origin of deployment. Child modules should initially occupy/cluster near that sector and fan around the carrier from it.

### 3. Parent selection is readable

The amber selected plate remains visually legible while the next level arrives. This should be retained and strengthened as the physical gate/lock that releases the child mechanism.

### 4. Retraction is more readable than wake

The collapse sequence is visible because structural pieces disappear before the host shrinks back to the dormant widget. The same staging principle should be mirrored for wake: host geometry first, mechanism second.

### 5. The rotor is present but causal motion remains subtle

The center participates visually, but in the recording it is still easier to read as an animated core than as the mechanism driving branch reconfiguration.

**Action:** make rotor/collar indexing precede carrier movement by a short readable interval.

### 6. Full-ring geometry remains the major conceptual limitation

The current implementation can now animate convincingly enough to test geometry. The next question is no longer whether animation exists. It is whether the child structure should remain a complete ring.

The first experiment after parent-origin fan deployment should compare:
- full ring fed from selected parent;
- partial child arc centered around selected parent.

No geometry decision is final yet.

## Changes made from this review

- synchronized wake with Electron host composition;
- removed automatic summon from host-mode notification;
- introduced selected-parent source angles;
- added parent-origin carrier unspooling;
- child plates now fan from the selected parent sector toward final positions;
- retained explicit connector illumination between parent and child.

## Next capture

Record:

```text
dormant
→ summon
→ Development
→ MoneyControl
→ Terminal
→ back
→ back
→ collapse
```

The next review should focus on whether the machine now communicates causality without relying on labels.
