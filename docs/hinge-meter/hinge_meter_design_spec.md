<!--
CARDO REI methodology applied to this document.
Reference: [CARDO REI Methodology](PROMPTHOUND-DOCS/CARDO-REI.md)
-->

# Hinge Meter — Design Spec (v0.2)

**Purpose:** Create a visceral yet technically serious visualization that makes the decision *hinge* feel physically real and emotionally immediate.

**Core Principle:** "The user should feel the tradeoff in their gut before they fully understand it intellectually."

**Design Target:** Feels like it belongs in a serious engineering manual or technical decision document — precise, understated, and high-signal.

---

## Design Decisions (Locked from User Input)

### 1. Physical Metaphor
- **Style:** Semi-abstract force diagram
- **Implementation:** Clean bars or vectors pulling on a central pivot
- **Feel:** Well-engineered mechanism (not a cartoon or literal physics toy)
- **Avoid:** Literal weights, chains, gravity, or playful illustrations

### 2. Uncertainty Visualization
- **Primary:** Shaded / gradient zone on the needle’s landing axis
  - Shows "the true hinge could be anywhere in this range"
  - This directly visualizes decision risk / proximity to flip
- **Secondary (optional, subtle):** Ghosted / dashed outline behind each weight showing its potential range
- **Avoid:** Wrapping uncertainty around the weights themselves (this explains input noise, not decision risk)

### 3. Snap / Decision Flip Feedback
- **Visual:** Needle snaps to the new side with a sharp color inversion
- **Additional cue:** The hinge pivot pulses once (single, clean pulse)
- **Rules:**
  - No sound
  - No looping animations
  - One clean, elegant transition
  - "Elegant, not flashy"

### 4. Weight Visualization
- **Primary:** Fixed-width bars that grow and shrink in height only
- **Fill:** Subtle gradient from neutral base color toward the side color (GO or NO-GO)
- **Secondary:** Very faint ghosted outline (dashed or low opacity) showing the weight’s uncertainty range
- **Avoid:** Scaling in both dimensions (would feel unstable and childish)

---

## Static Layout (Wireframe)

```
┌────────────────────────────────────────────────────────────────────┐
│  [Scenario Title]                              [Margin Gauge]      │
│                                                                    │
│  ┌──────────────────────────────┬──────────────────────────────┐  │
│  │          RISKS / COSTS       │         BENEFITS / UPSIDE    │  │
│  │                              │                              │  │
│  │  [Bar 1 - Variable Height]   │   [Bar 1 - Variable Height]  │  │
│  │  [Bar 2 - Variable Height]   │   [Bar 2 - Variable Height]  │  │
│  │  [Bar 3 - Variable Height]   │   [Bar 3 - Variable Height]  │  │
│  │                              │                              │  │
│  └──────────────┬───────────────┴──────────────┬───────────────┘  │
│                 │                              │                    │
│                 │          HINGE PIVOT         │                    │
│                 │              │               │                    │
│                 │              ▼               │                    │
│                 │      ◄───── NEEDLE ─────►    │                    │
│                 │                              │                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │           UNCERTAINTY ZONE (gradient / shaded)             │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  Decision: ACT / DO NOT ACT     Margin: 27.1× (Very Strong)       │
└────────────────────────────────────────────────────────────────────┘
```

**Key Elements:**
- Central vertical line = the immovable hinge
- Left side pulls toward "DO NOT ACT"
- Right side pulls toward "ACT"
- Needle shows current balance point
- Uncertainty zone sits directly under the needle path

---

## Interaction Model

- **Sliders** (primary input): Standard controls for Confidence, Cost to Act, Cost to Miss
- **Direct manipulation (advanced)**: Click and drag on the weight bars
  - Vertical drag = change magnitude
  - Horizontal drag (deliberate) = move weight to the other side
- **Hover**: Needle thickens, uncertainty zone brightens, weights highlight
- **Decision flip**: Needle snaps across the hinge with color inversion + single hinge pulse

---

## Open Questions (Need Your Input)

1. Should the weights be draggable by default, or only when user enables "Advanced Manipulation" mode?
2. How prominent should the ghosted uncertainty outlines on the weights be? (Always visible at low opacity, or only on hover?)
3. Do you want a small "Reset to Defaults" button directly on the visualization?
4. Any specific scenarios you want to prioritize for initial testing of this visualization?

---

**Status:** Ready for your review and iteration.  
**Next:** Once you approve the direction, we can move to implementation planning (React/SVG component structure, animation approach, data binding, etc.).

*Spec version: 0.2*  
*Incorporates user's detailed feedback on metaphor, uncertainty, snap, and weight design*