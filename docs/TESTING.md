# Testing Strategy

REI.ai maintains 30 test suites with 440 tests, all passing. This document explains the testing philosophy, what each category covers, and how to write new tests.

## Philosophy

Tests are evidence gates, not checkbox exercises. Every test asserts a specific, named behavior. We use tests to:

1. **Prevent regressions** — if a change breaks routing, cost calculation, or chat rendering, a test catches it before it ships
2. **Document expected behavior** — tests are executable specifications of how the system should work
3. **Enable fast iteration** — the test suite is the safety net that allows aggressive refactoring

## Test categories

| Category | Suites | Count | What they verify |
|----------|--------|-------|------------------|
| **Router & classification** | 9 | ~220 | Routing decisions, keyword matching, domain classification, cost calculation, adversarial scanning, semantic embeddings, hinge scoring |
| **Chat & context** | 4 | ~80 | Chat history persistence, JSON corruption recovery, message compression, prompt construction, response parsing |
| **Rendering** | 7 | ~35 | Component rendering, navigation, landing page content, chat bubble structure, domain registry |
| **API endpoints** | 2 | 16 | Auth guards, input validation, rate limit handling, method restrictions |
| **Eval benchmarks** | 7 | ~185 | Routing accuracy across holdout sets, cost savings over premium baseline, v4 semantic router validation |

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
5. **Run the full suite before pushing.** `npm test` runs all 30 suites

## Running tests

```bash
npm test                                    # all 30 suites
npx jest src/lib/nightShiftRouter.test.js   # one suite
npx jest --verbose                          # verbose output
```

## Known limitations

### Adversarial routing ceiling (~90%)
The v3 keyword router has a structural ceiling for adversarial prompts. Some adversarial queries ("argue against your own position", "find the weakest assumption in this argument") use natural vocabulary that doesn't contain trigger words like "red-team", "poke holes", or "prove wrong". The keyword router cannot catch these — it's a lexical ceiling, not a bug.

**Two separate layers, two separate accuracy claims:**
- The **router** operates at ~90% accuracy on measured holdouts. That number does not include prompts it structurally can't match.
- A **system prompt clause** directs the model to treat adversarial inquiry as adversarial analysis. This catches some of what the router misses conversationally. It is not part of router accuracy and does not raise the 90% figure. The two layers should not be conflated.

### v4 semantic router (research, not production)
A v4 semantic router exists (`src/lib/semanticHingeClassifier.js`) using 384-dim ONNX embeddings (all-MiniLM-L6-v2 via @xenova/transformers). It was evaluated at 70% on a fresh 30-prompt holdout with real embeddings. It is not wired to production at 70% accuracy versus the v3 keyword router's 90%. The architecture is documented; the evaluation results are transparent. Shipping it before it beats the v3 baseline would reduce accuracy — it is correctly marked as research-only.
