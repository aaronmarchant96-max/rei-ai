# Claim Ledger

Every published claim maps to the command that produces it. If a claim has no command, it is retired or marked self-reported.

## Independent audit path (tests themselves)

Use this when you want to verify the **test system integrity**, not just one claim:

1. Capture an objective Jest summary:

```bash
mkdir -p .artifacts
npm test -- --runInBand --json --outputFile=.artifacts/jest-summary.json
jq '{ totalSuites: .numTotalTestSuites, passedSuites: .numPassedTestSuites, totalTests: .numTotalTests, passedTests: .numPassedTests }' .artifacts/jest-summary.json
```

2. Run the anti-self-deception gate:

```bash
npm test -- --runInBand src/__eval__/feynmanGate.test.js
```

3. Verify calibration pool integrity:

```bash
npm test -- --runInBand src/__eval__/hingeCalibrationDebate.test.js
```

4. Reproduce benchmark claims:

```bash
npm test -- --runInBand --testPathPatterns=routingEval
```

5. Update this ledger and any public docs **only** from command output (never from memory).

## Accuracy

> **Measurement correction (2026-08-10) [caught: test]**
> The previous 60–80% routing accuracy figures were contaminated by stale labels and fixtures for an unimplemented route. The `Coding Hinge` display label was renamed to `The Engineer` (data/fingerprints.json), but every eval `normalizeLabel()` map still keyed on the old name — the router correctly chose `coding-hinge`, yet the harness scored it wrong. Separately, eval fixtures for a `Fact Check` route scored as failures even though no such fingerprint exists in the catalog (status: excluded, reason: route_not_implemented). After excluding those measurement artifacts, the corrected numbers below reflect implemented-route accuracy only, with genuine routing failures listed explicitly. This measures the evaluator's correctness as much as the router's.

| Claim | Producing command | Verified result (2026-08-10) |
|-------|-------------------|-------------------------------|
| Router accuracy (basic, implemented routes) | `npm test -- --runInBand src/__eval__/routingEval.test.js` | **90%** (35 correct, 4 incorrect) — 6 excluded (factCheck) |
| Router accuracy (ML holdout, implemented routes) | `npm test -- --runInBand src/__eval__/routingEvalML.test.js` | **95.7%** (22/23) — 4 excluded (factCheck) |
| Router accuracy (blind, implemented routes) | `npm test -- --runInBand src/__eval__/routingEvalBlind.test.js` | **96%** (22 correct, 1 incorrect) — 4 excluded (factCheck) |
| Router accuracy (V3 single-author holdout) | `npm test -- --runInBand src/__eval__/routingEvalBlindV3.test.js` | **90%** (27/30) |
| Router accuracy (v3 Final holdout) | `npm test -- --runInBand src/__eval__/routingEvalFinal.test.js` | **93%** (28/30) |
| Semantic-blind accuracy | `npm test -- --runInBand src/__eval__/routingEvalBlindSemantic.test.js` | 73% (22/30) — NOT CI-measurable, ONNX-only |
| Semantic accuracy (v4, real ONNX) | `npm test -- --runInBand src/__eval__/routingEvalBlindV2.test.js` **with** `@xenova/transformers` + HF access | ⛔ NOT valid in CI (hash-noise 12%) |
| ~~"92% zero-shot accuracy"~~ | — | **Retired**: no benchmark produced it |
| ~~"~90% router accuracy"~~ | — | **Retired**: contradicted by measured range |

**Known genuine routing failures** (outside the harness, listed for PR 2):
1. `"what's up"` → routed to Structured Reasoning, not Simple Greeting (not in `GREETING_TERMS`).
2. `"verify the ancestry transcript for Charles Dyer"` → routed to The Engineer (coding); should be genealogy.
3. `"what evidence supports Josiah Ramsey's pay voucher"` → routed to Structured Reasoning; should be genealogy.
4. `"validate this source about climate change statistics"` → routed to genealogy because `"source"` is in genealogy matchTerms; should be fact-check/reasoning (generic term collision).

## Cost savings

| Claim | Producing command | Verified result (2026-08-06) |
|-------|-------------------|-------------------------------|
| ~92% savings vs gpt-4o baseline (ceiling-based) | `npm test -- --runInBand --testPathPatterns=routingEval` | 92.3% (routingEval 57), 92.5% (ML 27) — after honest 70B pricing fix |
| Production telemetry savings | N/A — self-reported | Not independently verifiable |

## Other claims

| Claim | Producing command | Verified |
|-------|-------------------|----------|
| 649 tests / 55 suites | `npm test -- --runInBand` | ✅ (auto-verified: `node scripts/gen-claims.mjs --check` in CI) |
| Build succeeds | `npm run build` | ✅ |
| Lint 0 errors / 199 warnings | `npm run lint` | ✅ (warnings: intentional no-console + legacy no-unused-vars) |
| Live API HTTP 200 | `curl https://debate-furnace.vercel.app/api/cfai` | ✅ (2026-07-01, 2026-08-05) |
| 200-entry decision store ring buffer | `npm test -- --runInBand src/lib/decisionStore.test.ts` | ✅ 8 tests |
| FEYNMAN_GATE verifies embedded copies | `npm test -- --runInBand src/__eval__/feynmanGate.test.js` | ✅ 10 tests |
| BackendUnavailablePanel (11 tests) | `npm test -- --runInBand src/modules/rei/components/BackendUnavailablePanel.test.jsx` | ✅ |
| HingeScore calibration infra (15 tests) | `npm test -- --runInBand src/__eval__/hingeCalibrationDebate.test.js` | ✅ |
| Pooled accuracy in claimed 60–80% range | `npm test -- --runInBand src/__eval__/claimsSync.test.js` | ✅ 72.8% (99/136) |
| Test-count badge auto-generated | `node scripts/gen-claims.mjs` + CI `--check` | ✅ never hand-edited again |
| Cost replay (per-category, real corpus) | `npm test -- --runInBand src/__eval__/costSavingsReplay.test.js` | ✅ pooled 79% on 10-entry fixture (stratified by category) |
| Route-adherence replay (eval corpus) | `npm test -- --runInBand src/__eval__/evalReplay.test.js` | ✅ pooled 75% (4 escalated / 3 hits / 1 miss) on 5-entry fixture |
| Adversarial-route adherence ≥ 80% | live — claimRegistry `adversarial-route-accuracy` from `rei_eval_log` | ⏳ self-reported telemetry until real 500-entry post-fix corpus replayed |

## Rule

1. Every claim in README.md, docs/TESTING.md, docs/fortis-et-liber.md must appear here or be struck.
2. A claim is "verified" only if the command runs green **and** the output contains the number.
3. When numbers drift (maxTokens bumps, model changes), re-run and update both the ledger and the docs — never edit docs alone.

*Ledger created 2026-08-05. Re-run before any public claim.*
