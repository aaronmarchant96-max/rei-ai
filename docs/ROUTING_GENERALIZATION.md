# Routing Generalization — Foreign-Corpus Baseline

## Purpose

Prove the router generalizes to prompts written by **other people** — not just the
author's own eval set. This is the evidence that closes the "single-author benchmark"
critique: routing accuracy must hold on phrasing the author did not write.

## Corpus

- **Fixture:** `src/__eval__/fixtures/foreign-corpus.json`
- **Test:** `src/__eval__/routingEvalForeign.test.js`
- **Provenance:** `independent_style_generation` (NOT real production telemetry).
  Prompts written in the distinct voice/domain vocabulary of 5 non-author personas:
  a civil historian, a JavaScript engineer, a fiction novelist, a law student, and a
  product manager. Each persona's vocabulary is deliberately disjoint from the
  author's own coding-/genealogy-heavy eval set.

## Baseline (measured 2026-08-14)

| Metric | Value |
|---|---|
| Scored cases | 34 |
| Correct | 20 |
| Incorrect | 14 |
| **Accuracy** | **20/34 = 58.82% ≈ 59%** |
| Excluded | 2 (factCheck → reasoning; route not implemented) |
| Gate | `correct >= 20` (integer, no float-rounding ambiguity) |

### Excluded cases (explicit, kept OUT of the denominator)

- `factCheck` "is it actually true that the Colosseum could be flooded…" → reasoning
- `factCheck` "verify the often-repeated claim that Napoleon was short…" → reasoning

Reason: the Fact Check route is not implemented in `data/fingerprints.json`
(`route_not_implemented`), per the `evalLabelMap` contract. Counting them as
failures would produce a systematically false denominator.

## Failure Taxonomy (the finding, not just the number)

14 misses decompose into 4 boundary-failure classes:

| Class | Count | Expected → Actual (representative) |
|---|---|---|
| **1. Sentence-form greetings** | 4 | "good morning, archivist" → reasoning |
| **2. Foreign domain vocabulary** | 6 | "debounce my save handler" → reasoning |
| **3. Comparison/argument framing** | 3 | "usage pricing vs seat license" → adversarial |
| **4. Legal/genealogy collision** | 1 | "standing question… record diverges" → genealogy |

### Class 1 — Sentence-form greetings (4)

`isSimpleGreeting` matches short standalone greetings, not sentence-form ones.

| Persona | Prompt | Actual |
|---|---|---|
| product_manager | "hey, you around for a sec?" | reasoning |
| historian | "good morning, archivist" | reasoning |
| novelist | "hello, muse" | reasoning |
| product_manager | "afternoon folks" | reasoning |

### Class 2 — Foreign domain vocabulary (6)

Domain `matchTerms` lack foreign phrasing for coding/genealogy/story.

| Persona | Prompt | Actual |
|---|---|---|
| js_engineer | "my useMemo deps are firing every render…" | reasoning |
| js_engineer | "debounce my save handler so rapid keystrokes…" | reasoning |
| js_engineer | "…infinite loop in a useEffect… how do I break the cycle cleanly?" | adversarial |
| historian | "trace the land conveyance for a 1798 Upper Canada lot grant…" | reasoning |
| historian | "compare the muster rolls and the pension application…" | reasoning |
| novelist | "give me a beat sheet for a second-act betrayal…" | reasoning |

### Class 3 — Comparison/argument framing (3)

Comparison/argument verbs over-fire into adversarial or coding, or under-fire
("rip apart" misses the adversarial lane).

| Persona | Prompt | Actual |
|---|---|---|
| product_manager | "we're choosing between a usage-based pricing model and a flat seat license…" | adversarial |
| product_manager | "pressure-test whether rolling a custom LLM gateway now beats renting…" | coding |
| product_manager | "rip apart this GTM motion: founder-led sales… Find the fatal flaw…" | reasoning |

### Class 4 — Legal/genealogy collision (1)

The genealogy lane (fires before legal) grabs legal prompts via "record"/"standing".

| Persona | Prompt | Actual |
|---|---|---|
| law_student | "compare how the trial and appellate courts treated the standing question… record diverges" | genealogy |

## Root Cause

The decision cascade in `src/lib/nightShiftRouter.ts`:

1. `isSimpleGreeting` (`src/lib/routingConstants.js`) only catches short standalone greetings.
2. Domain `matchTerms` are tuned to the author's corpus, missing foreign vocabulary.
3. Only the **coding** lane (line 386) applies `hasComparisonFraming`/`hasNarrativeFraming`
   guards; genealogy/story/legal lanes (401/416/431) lack them.
4. The **genealogy** lane (401) fires **before** the legal lane (431), so "record"/"standing"
   greedily claim legal prompts.
5. The adversarial scanner fires on "break the cycle" but misses "rip apart".

## Status

**FIX PENDING.** This is the immutable experimental control: exactly what REI knew
about its generalization performance *before* the router was changed.
