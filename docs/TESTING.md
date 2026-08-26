---
status: canonical
authority_scope: evaluation-and-test-taxonomy
owner: Aaron Marchant
last_verified: 2026-08-20
verified_against_commit: 7247921
claims_source: docs/CLAIM_LEDGER.md
supersedes: []
superseded_by: null
archived_at: null
---

# Testing Strategy

REI.ai currently has 114 test suites with 1324 tests passing. The generated count is recorded in `src/data/claims.json`. This document explains the testing philosophy, what each category covers, and how to write new tests.

## Philosophy

Tests are evidence gates, not checkbox exercises. Every test asserts a specific, named behavior. We use tests to:

1. **Prevent regressions** — if a change breaks routing, cost calculation, or chat rendering, a test catches it before it ships
2. **Document expected behavior** — tests are executable specifications of how the system should work
3. **Enable fast iteration** — the test suite is the safety net that allows aggressive refactoring

## Test categories

| Category | Suites | Count | What they verify |
|----------|--------|-------|------------------|
| **Router & classification** | 9 | ~250 | Routing decisions, keyword matching, domain classification, cost calculation, adversarial scanning, semantic embeddings, hinge scoring |
| **Chat & context** | 4 | ~95 | Chat history persistence, JSON corruption recovery, message compression, prompt construction, response parsing |
| **Rendering** | 7 | ~42 | Component rendering, navigation, landing page content, chat bubble structure, domain registry |
| **API endpoints** | 2 | 16 | Auth guards, input validation, rate limit handling, method restrictions |
| **Eval benchmarks** | 9 | ~205 | Routing accuracy across holdout sets, cost savings over premium baseline, v4 semantic router validation, pool integrity, replay coverage |

## Key suites

### `src/lib/nightShiftRouter.test.js` (25 tests)
The most critical suite. Tests every routing pathway, domain keyword matching, cross-domain preference isolation, cost differentiation between models, and edge cases like `build`/`trace` false-positive prevention.

### `src/lib/cardoGuard.test.js` (13 tests)
Tests the deterministic decision gate: ACT vs DO NOT ACT recommendations, confidence band boundaries, breakeven calculations, division-by-zero guards, and concrete pricing scenarios (pump maintenance, SaaS monolith rewrite).

### `src/lib/redTeamScanner.test.js` (21 tests)
Tests the adversarial input scanner: jailbreak detection, prompt injection, authority impersonation, social engineering, context poisoning, and false-positive prevention on benign code.

### `src/__eval__/routingEvalFinal.test.js` (31 tests)
The honest blind-holdout eval. 30 fresh prompts across 6 domains, run once, no tuning allowed after seeing results. Reports raw accuracy with no threshold gate.

### `api/cfai.test.js` (9 tests)
Tests the main API handler: placeholder key guard, input length cap, method restrictions, Groq API fallback, rate limit retry, and adversarial escalation.

## Writing new tests

1. **Is it behavior or rendering?** Prefer behavior tests (business logic) over rendering tests (does the button exist)
2. **Name the assertion clearly.** `it("does not route narrative prompts with 'build' to coding")` is better than `it("tests build collision")`
3. **Test the boundary.** If a value must be ≥ 80%, test 80 and 79
4. **Add to the right file.** Router tests go in `nightShiftRouter.test.js`. New component tests get their own file
5. **Run the full suite before pushing.** `npm test` runs all suites and is the canonical final check

## Running tests

```bash
npm test                                    # all suites
npx jest src/lib/nightShiftRouter.test.js   # one suite
npx jest --verbose                          # verbose output
```

Latest verified full-suite result (2026-08-26): **114/114 suites**, **1324/1324 tests**.

## Test Suite Milestones & Historical Progression

| Milestone | Date | Test Suites | Test Count | Key Additions |
| :--- | :--- | :--- | :--- | :--- |
| **v1.0 (Initial MVP)** | June 2026 | 43 suites | 558 tests | Core router cascade, initial debate furnace, cost helpers |
| **v2.0 (FinOps & Provenance)** | July 2026 | 72 suites | 890 tests | OpenAI proxy `/v1`, DKR session caching, claims ledger |
| **v3.0 (Hardened Architecture)** | August 2026 | **83 suites** | **997 tests** | Archivist engine, fallback resilience, schema-validated toolParser, replyParser |

## Auditing the test system itself

When you need to audit test integrity (not just pass/fail), run this sequence:

```bash
mkdir -p .artifacts
npm test -- --runInBand --json --outputFile=.artifacts/jest-summary.json
jq '{ totalSuites: .numTotalTestSuites, passedSuites: .numPassedTestSuites, totalTests: .numTotalTests, passedTests: .numPassedTests }' .artifacts/jest-summary.json
npm test -- --runInBand src/__eval__/feynmanGate.test.js
npm test -- --runInBand src/__eval__/hingeCalibrationDebate.test.js
npm test -- --runInBand --testPathPatterns=routingEval
```

- `feynmanGate.test.js` checks that numeric claims about eval pools match computed reality.
- `hingeCalibrationDebate.test.js` checks calibration pool construction and scoring integrity.
- `routingEval*` reproduces router accuracy and savings claims used in public docs.
- `docs/CLAIM_LEDGER.md` is the only place claims should be recorded as verified.
- In environments without ONNX/HF model access, `routingEvalBlindV2` falls back to synthetic hash mode and cannot be used for semantic-accuracy claims.

## Known limitations

### Adversarial routing ceiling
The v3 keyword router has a structural ceiling for adversarial prompts. Some adversarial queries ("argue against your own position", "find the weakest assumption in this argument") use natural vocabulary that doesn't contain trigger words like "red-team", "poke holes", or "prove wrong". The keyword router cannot catch these — it's a lexical ceiling, not a bug.

**Verified accuracy (2026-08-05, `npm test -- --runInBand --testPathPatterns=routingEval`):**
- routingEval (57 prompts): **60%** (27/45) — 98% savings
- routingEvalBlind (27 prompts): **67%** (18/27) — 98% savings
- routingEvalML (27 prompts): **66.7%** (18/27) — 98% savings
- routingEvalBlindV3 (30 prompts): **80%** (24/30)
- routingEvalBlindSemantic (30 prompts): **73%** (22/30)
- routingEvalBlindV2 semantic (50 prompts): **12%** — ⛔ NOT VALID in CI (ONNX unavailable, hash-noise fallback). No semantic accuracy claim can be drawn from CI runs.

**The router operates at 60–80% accuracy on measured holdouts.** Earlier "~90%" and "92%" figures were not producible by any benchmark and have been retired.

### v4 semantic router (research, not production)
A v4 semantic router exists (`src/lib/semanticHingeClassifier.js`) using 384-dim ONNX embeddings (all-MiniLM-L6-v2 via @xenova/transformers). It was evaluated at 70-73% on fresh 30-prompt holdouts with real embeddings. It is not wired to production at 70% accuracy versus the v3 keyword router's 60-80% measured range. The architecture is documented; the evaluation results are transparent. Shipping it before it beats the v3 baseline would reduce accuracy — it is correctly marked as research-only.
