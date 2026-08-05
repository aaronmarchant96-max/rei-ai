# Claim Ledger

Every published claim maps to the command that produces it. If a claim has no command, it is retired or marked self-reported.

## Accuracy

| Claim | Producing command | Verified result (2026-08-05) |
|-------|-------------------|-------------------------------|
| Router accuracy ≥ 60% (basic) | `npm test -- --runInBand src/__eval__/routingEval.test.js` | 60% (27/45) |
| Router accuracy ≥ 60% (ML holdout) | `npm test -- --runInBand src/__eval__/routingEvalML.test.js` | 66.7% (18/27) |
| Router accuracy (blind) | `npm test -- --runInBand src/__eval__/routingEvalBlind.test.js` | 67% (18/27) |
| Router accuracy (V3) | `npm test -- --runInBand src/__eval__/routingEvalBlindV3.test.js` | 80% (24/30) |
| Semantic-blind accuracy | `npm test -- --runInBand src/__eval__/routingEvalBlindSemantic.test.js` | 73% (22/30) |
| Semantic accuracy (v4, real ONNX) | `npm test -- --runInBand src/__eval__/routingEvalBlindV2.test.js` **with** `@xenova/transformers` + HF access | ⛔ NOT valid in CI (hash-noise 12%) |
| ~~"92% zero-shot accuracy"~~ | — | **Retired**: no benchmark produced it |
| ~~"~90% router accuracy"~~ | — | **Retired**: contradicted by 60–80% measured range |

## Cost savings

| Claim | Producing command | Verified result (2026-08-05) |
|-------|-------------------|-------------------------------|
| ~98% savings vs gpt-4o baseline (ceiling-based) | `npm test -- --runInBand --testPathPatterns=routingEval` | 98% across all suites |
| Production telemetry savings | N/A — self-reported | Not independently verifiable |

## Other claims

| Claim | Producing command | Verified |
|-------|-------------------|----------|
| 539 tests / 41 suites | `npm test -- --runInBand` | ✅ |
| Build succeeds | `npm run build` | ✅ |
| Lint 0 errors / 195 warnings | `npm run lint` | ✅ (warnings: intentional no-console + legacy no-unused-vars) |
| Live API HTTP 200 | `curl https://debate-furnace.vercel.app/api/cfai` | ✅ (2026-07-01, 2026-08-05) |
| 200-entry decision store ring buffer | `npm test -- --runInBand src/lib/decisionStore.test.ts` | ✅ 8 tests |
| FEYNMAN_GATE verifies embedded copies | `npm test -- --runInBand src/__eval__/feynmanGate.test.js` | ✅ 10 tests |
| BackendUnavailablePanel (11 tests) | `npm test -- --runInBand src/modules/rei/components/BackendUnavailablePanel.test.jsx` | ✅ |
| HingeScore calibration infra (14 tests) | `npm test -- --runInBand src/__eval__/hingeCalibrationDebate.test.js` | ✅ |

## Rule

1. Every claim in README.md, docs/TESTING.md, docs/fortis-et-liber.md must appear here or be struck.
2. A claim is "verified" only if the command runs green **and** the output contains the number.
3. When numbers drift (maxTokens bumps, model changes), re-run and update both the ledger and the docs — never edit docs alone.

*Ledger created 2026-08-05. Re-run before any public claim.*
