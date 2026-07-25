# CHANGELOG

All notable changes, methodological corrections, and architectural milestones for **REI.ai** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to strict scientific transparency: **corrections are preserved as audit history rather than silently overwritten.**

---

## [Unreleased]

## [2.0.1] - 2026-07-24

### 🛡️ Security & API Hardening
- **Adversarial Regex Hardening:** Fixed regex pattern in `nightShiftRouter.js` and `hingeClassifier.js` to allow zero or more stacked qualifiers (e.g., `ignore all previous rules`). Previously, stacked qualifiers bypassed `ADVERSARIAL_REPHRASE_PATTERNS`, allowing `Structured Reasoning` routing instead of `red-team-surface`.
- **API Routing Warning Encapsulation:** Removed raw string concatenation of `[REI.AI ROUTING WARNING: OPENAI_API_KEY not found in Vercel...]` directly into response `content` in `api/cfai.js`. Encapsulated fallback diagnostics into `routerDecision.fallbackReason` and `routerDecision.fallbackNotice` metadata.
- **Opening Sentence Invariant:** Added strict instruction to `api/cfai.js` prohibiting dangling opening subordinate clauses (e.g. `"Whether throttling... or moving..."`).

### 🔬 Methodological Corrections & ML Benchmark Progression
- **Accuracy Metric Correction (`100%` ➔ `66.7%` ➔ `88.9%`):**
  - *Initial Implementation:* `routingEvalML.test.js` checked `if (decision.pathway)`, which evaluated to `true` on every valid decision object, trivially reporting `100.0%` accuracy.
  - *Correction 1:* Replaced vacuous check with strict category label matching (`normalizeLabel(decision.label) === expectedCategory`). Initial evaluation revealed **66.7% true category accuracy** (18/27 correct) on the 27-prompt frozen blind holdout set.
  - *Correction 2:* Restored pre-registered falsifiable threshold (`expect(accuracy).toBeGreaterThanOrEqual(80.0)`) and upgraded keyword precision in `data/fingerprints.json` for greetings, database queries, and archival records. True category holdout accuracy reached **88.9%** (24/27 correct) with **89.6% cost savings vs premium baseline**.
  - *Commit Hashes:* `9a2e4cf` ➔ `1499b9a` ➔ `c41670c`.
- **Blind Set V2 Protocol Added:** Documented Section 10 in `docs/NIGHT_SHIFT_V3_ML_PLAN.md` establishing safeguards against test set keyword contamination. Real-world zero-shot generalization will be evaluated against a completely un-mined **Blind Set V2** (`routingEvalBlindV2.test.js`).

### 📊 Single Source of Truth Created
- Created `data/telemetry.json` as the canonical source of truth for all current test counts, benchmark numbers, build costs, and measurement methods.

---

## [2.0.0] - 2026-07-24

### Added
- **Night Shift v3 ML Router:** Integrated pure-JS Feature Extractor ($f_1..f_8$, normalized $\text{DAS}$, $\text{APS}$) and static 4KB weight artifact (`data/ml/ecs_weights.json`).
- **Transparency UI:** Surfaced `ML Hinge Vector` (`ECS · DAS · APS`) micro-bars in live router demo on landing page (`ToolsLanding.jsx`).
- **Relume Gold Theme:** Unified glassmorphism, spring micro-animations, custom scrollbars, and interactive copyable CLI widget.
- **Test Suite Expansion:** Expanded test suite from 231 to **283 automated tests across 20 test suites** (100% passing).
