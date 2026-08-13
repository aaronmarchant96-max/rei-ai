# Copy Tone — Hype for reach, anti-hype for product

> **Purpose:** a decision record + operational guide for how REI writes copy. It
> turns "sound authentic, not AI" from a hope into a hard-stop-adjacent check.

## The boundary (decision)

| Surface | Tone | Why |
|---------|------|-----|
| Landing page, X/Twitter, GitHub, launch CTA | **Hype for awareness/adoption** | Top of funnel — the job is to get someone curious enough to click. A flat, no-claims landing page is invisible. |
| The chat product, dashboard, claims, pricing, savings numbers | **Anti-hype for retention/trust** | This is the trust moat (CLAIM_LEDGER verificationism, "the artifact proposes you dispose"). Hype here actively hurts. |

The split is the brand: **hype lives at the boundary; credibility lives inside
the product.** The sales pitch can be excited; the mechanism behind it must
stay verifiable.

> **Hard invariant:** *no hype in the measurable plane.* Any savings/quality
> figure on the landing page must remain traceable to computed truth
> (measured, never "cache-adjusted = measured spend"). A claim may be framed
> enthusiastically, but never disconnected from the ledger.

## Why a detector

LLMs default to a canned register — value-verb openers ("Unleash", "Discover"),
hollow modal claims ("take your workflow to the next level"), over-stacked
connectives ("seamless, effortless, game-changing"), and low-information
intensifiers ("cutting-edge", "world-class"). That register reads as "written
by a bot." `detectAISlop` flags it so a human/agent can rephrase without
sounding slop.

## The red-flag rubric

| Category | Weight | Example phrases |
|----------|--------|-----------------|
| opener | 2 | Unleash, Dive into, Elevate your, Transform your, Step into a |
| modal | 2 | Take your X to the next level, Utterly transform |
| stacking | 1 | Seamless/seamlessly, Effortless/effortlessly, Powerhouse, Game-changer |
| filler | 1 | Cutting-edge, State-of-the-art, Revolutionary, World-class |
| conversion | 2 | Don't miss out, Act now, Limited time offer |
| hollow | 2 | Unlock the power of, Supercharge your, Harness the power |

Each match adds its weight; the total maps to a graded verdict:
`0 → clean`, `≤2 → minor`, `≤4 → sloppy`, `>4 → slop`.

## The tool

- Detector: `shared/lib/detectAISlop.js` + `src/lib/detectAISlop.js` (identical
  ESM copies, dependency-free, deterministic). Exports `detectAISlop(text)` →
  `{ score, verdict, flags, details }`.
- Guardrail CLI: `npm run copy:tone -- <file...> | --text "..."`
  - Default fails at `sloppy`; use `--strict` to fail at `minor`, or
    `--min clean|minor|sloppy|slop` to set the bar.
  - It is **score + report only** — it never rewrites copy. Rewrite is a human
    or agent judgment call.

## How to use when writing copy

1. Draft the copy in the target tone.
2. Run `node scripts/check-copy-tone.mjs` over it (or a landing source file).
3. Read the `[category]` flags. Prefer cutting the phrase over swapping in a
   synonym that the same category still catches.
4. Aim for `clean` on any claim-bearing copy; allow up to `minor` seasoning on
   non-claim hype.
5. Re-check after editing.

## Runtime path (future)

`deRoboticize` strips leading formulaic openers in the runtime path. The
detector is intentionally a separate function — stripping mid-sentence slop
from live model output is a different (riskier) job. Wire it into the response
pipeline as a separate increment if and only if false positives are measured
and acceptable. Do NOT merge the two tools.
