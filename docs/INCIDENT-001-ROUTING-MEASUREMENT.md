# Evaluation-Integrity Incident #001 — Routing Measurement

**Lab:** PromptHound Labs — Applied AI Engineering
**Date:** 2026-08-10
**Status:** Closed — instrumentation fixed, behavior change deferred to PR-2

---

## Executive Summary

> **Original claim:** 69.1% pooled routing accuracy (94/136)
> **Finding:** The measurement was contaminated.
> **Root causes:** stale label + phantom route + genuine router failures
> **Corrected evaluation:** implemented routes only; exclusions explicit
> **Outcome:** integrity gate + regression coverage + five-rule engineering policy

|                      |           Original |   Corrected |
| -------------------- | -----------------: | ----------: |
| Pooled routing claim | **69.1% (94/136)** | **Retired** |
| Basic                |                  — |     **90%** |
| ML                   |                  — |   **95.7%** |
| Blind                |                  — |     **96%** |
| V3                   |                  — |     **90%** |
| Final                |                  — |     **93%** |

The old pooled number is **RETIRED**, not relabeled. Claim governance means a
number that measured the wrong thing is struck, with the corrected measurement
carrying an auditable denominator.

---

## 1. Original claim

The router's accuracy was published as "60–80%," pooled at **69.1% (94/136)**
across the eval suite. The number was stable — it reproduced on every run.

## 2. Why the claim looked plausible

Six eval suites with frozen fixtures. Hard pass/fail gates (`≥ 60%`). A claim
ledger pinning every published figure to a producing command. Stability looked
like validity: the same harness, the same prompts, the same 69%.

## 3. What made me question it

The "why is it so low?" question. A system this deterministic — keyword routes,
explicit fingerprint catalog, trained hinge weights — should not miss on a third
of queries. And the stability itself was the tell: **a stable number only proves
reproducibility, never correctness.**

## 4. The measurement defect

The original measurement conflated three different categories:

> correctly routed cases scored against stale labels, fixtures asserting an
> unimplemented route, and genuine router misses.

Specifically:

- **Stale label.** The `Coding Hinge` display label was renamed to
  `The Engineer` (data/fingerprints.json), but every eval `normalizeLabel()`
  map still keyed on the old name. The router chose `coding-hinge` correctly;
  the harness scored it wrong. ~8 cases.
- **Phantom route.** Eval fixtures asserted a `Fact Check` route that does not
  exist in the 7-fingerprint catalog. Those cases could never score correct.
  ~6 cases.
- **Genuine router misses.** A real set of routing failures underneath — hidden
  by the noise above.

## 5. The genuine failures hidden underneath

After stripping the measurement artifacts, four real router failures remained
(scoped for PR-2, each with its own test):

1. `"what's up"` → routed to Structured Reasoning, not Simple Greeting.
2. `"verify the ancestry transcript for Charles Dyer"` → routed to The Engineer
   (coding); should be genealogy.
3. `"what evidence supports Josiah Ramsey's pay voucher"` → routed to Structured
   Reasoning; should be genealogy.
4. `"validate this source about climate change statistics"` → routed to genealogy
   because `"source"` is a genealogy matchTerm — a generic-term collision.

## 6. How I separated the two

Measurement problems and behavior problems sit next to each other but are
different hypotheses. Bundling them into one changeset makes future evaluation
ambiguous — you can no longer tell which hypothesis changed.

```
PR-1
Fix the instrument          →   ship independently
     ↓
PR-2
Fix the behavior            →   separate tests, separate scope, separate decision
```

PR-1 is this incident. PR-2 (the four failures above) stays cleanly scoped and
deferred with its own router-level tests.

## 7. The fix

- Corrected every eval label map to normalize `"The Engineer"` → `coding`,
  keeping `"Coding Hinge"` as an explicit backwards-compatible alias.
- Marked the unimplemented `Fact Check` fixtures **explicitly**: `status:
  excluded / reason: route_not_implemented` — counted outside numerator and
  denominator, never silently dropped.
- Reported three numbers instead of one: implemented-route accuracy, excluded
  fixtures, genuine failures.

## 8. Regression test

`src/__eval__/evalLabelMap.js` centralizes the label→category→route chain as a
single canonical registry. `src/__eval__/evalLabelMap.test.js` (8 tests) locks
the chain against the real `fingerprints.json` and proves the gate catches the
exact historical failures:

- a phantom route (category mapping to no fingerprint) fails the gate unless
  declared excluded;
- a renamed label missing from the registry fails the gate;
- a legacy alias drifting to a different category fails the gate.

The tests carry `[caught: test]` — documenting the *class* of failure they
exist to catch, not just that something fails.

## 9. CI enforcement

`scripts/validate-eval-integrity.mjs` runs in the prebuild chain. Any eval whose
label chain does not terminate at a real fingerprint route is a **hard CI
failure**, not a warning — with an actionable message telling you to add the
route, declare the exclusion, or restore the alias.

The rule is now a standing one in `docs/ENGINEERING_POLICY.md`:

> **Rule 2 — Validate the measuring instrument before diagnosing the system.**

## 10. What this changed about my methodology

- Numbers that reproduce are not automatically numbers that are true.
- Never silently exclude eval cases — mark them with a reason.
- Separate measurement corrections from behavior changes.
- Verify quoted metrics against source artifacts, never memory.
- Inspect the dirty worktree before committing.

The system didn't become "90% accurate" because the number changed. It became
**measurable** — the original benchmark was measuring the wrong thing, and the
evidence for that is now reproducible by anyone who runs the gate.

---

### References

- Corrected measurement: `docs/CLAIM_LEDGER.md` — Accuracy table (2026-08-10)
- Canonical registry: `src/__eval__/evalLabelMap.js`
- CI gate: `scripts/validate-eval-integrity.mjs`
- Regression tests: `src/__eval__/evalLabelMap.test.js`
- Engineering policy: `docs/ENGINEERING_POLICY.md`
- Fix commit: `b2ed578` · Gate commit: `7928245`

---

*PromptHound Labs — Applied AI Engineering*
*"How should AI-assisted work be done well?"*
