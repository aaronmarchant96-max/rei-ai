# Error-Gap Catalogue

> Auto-generated from git commit history.
> Last updated: 2026-08-10T20:38:39.384Z
> Span: 2026-08-08 → 2026-08-10 (9 tagged commits, 12 total tags)

## Tag Taxonomy

| Tag | Meaning | Question this tag answers |
|---|---|---|
| `manual` | Caught by a human reviewing output / dashboard / diff | What does the human see that automation doesn't? |
| `ai-cross-check` | Caught by comparing two AI-generated proposals | Where do models disagree productively? |
| `test` | Caught by an automated test suite | Which failures did tests prevent from reaching production? |
| `claim-gate` | Caught by a verifyAll() claim failing in the FEYNMAN GATE | Which claim drifted from reality, and which metric caught it? |

## Summary

| Tag | Count |
|---|---|
| `manual` | 5 |
| `claim-gate` | 5 |
| `ai-cross-check` | 1 |
| `test` | 1 |

## Timeline (newest first)

| Commit | Date | Subject | Tags & Context |
|---|---|---|---|
| `f08c916` | 2026-08-10 | feat(eval): red team corpus → scanner → router → routeCorrect regression suite | `claim-gate` — the scanner escalation gate fix (ab7856f) is |
| `edeece1` | 2026-08-10 | fix(landing): add Red Team card to ecosystem grid | `manual` — Red Team was invisible from desktop because no card existed |
| `0327f40` | 2026-08-10 | fix(story): HARD STOP now honors explicit "just make the story" overrides | `manual` |
| `ce40543` | 2026-08-09 | fix(ci): cross-reference modelRates.json against fingerprints.json in prebuild g... | `manual` |
| `b300358` | 2026-08-09 | feat(red-team): add Red Team tab with D1 adversarial prompt scanner | `manual` — dimensionsTriggered was showing D1 on clean scans — fixed |
| `ab7856f` | 2026-08-09 | fix(router): align adversarial detection with scanner taxonomy — before/after | `claim-gate` — escalation by the live eval loop. |
| `423a961` | 2026-08-09 | feat(eval): live evaluation loop — requestId correlation, eval event store, dete... | `claim-gate` — Preserved finding : "ignore previous instructions and |
| `2b0fbbf` | 2026-08-09 | chore(claims): sync claims.json (649/55) + ledger rows for replay harnesses and ... | `claim-gate` — eval loop added 21 tests; claims.json badge drifted 606/50 -> 649/55. Regenerated and pinned new adversarial-route-adherence + replay claims in the ledger. |
| `02a0076` | 2026-08-08 | docs(agents): add error-gap tagging practice + refresh stale date | `manual` `ai-cross-check` `test` `claim-gate` — what caught them |

## Analytics

> Populated as the dataset grows. Currently 9 entries — threshold for meaningful pattern analysis is ~30+ entries across 2+ months.

### Current observations

- **9 tagged commits** across 1 month(s).
- No pattern analysis yet — dataset is too small for statistical significance.
- The first four tags appeared in the same commit (`02a0076`, the AGENTS.md doc that established the practice).

### Questions this dataset will eventually answer

1. What kinds of failures does REI catch?
2. Which defense catches them?
3. Which failures escape all defenses?
4. How often does deterministic evaluation outperform an LLM judge?
5. Where does the router drift from the evaluator?

### How to contribute

Add a `[caught: <tag>]` line to your commit body when a commit fixes or documents an error caught by a specific defense. Valid tags: `manual`, `ai-cross-check`, `test`, `claim-gate`.

Run `node scripts/extract-error-gaps.mjs` to regenerate this catalogue. CI runs `--check` to flag drift.
