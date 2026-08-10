# Engineering Policy — Standing Rules

> **Purpose:** Encode hard-won workflow lessons as permanent invariants, so each one is
> a policy check, not a lesson re-discovered in a future incident.
>
> **Scope:** Applies to every agent session and every PR in this repo.
>
> Each rule records the incident that produced it, the policy, and the enforcement
> mechanism (where one exists). Rules without an automated gate are manual
> checkpoints that must be run before commit.

---

## Rule 1 — Inspect the dirty worktree before modifying or committing

**Origin:** PR 1 (router-accuracy measurement fix, b2ed578). After the commit, a
pre-existing uncommitted `README.md` edit was discovered in the worktree. It was
never staged or committed — but it came within one `git add -A` of being swept
into a PR it didn't belong to.

**Policy:** Before every commit, run `git status -sb` and confirm:
1. Every staged file is intended for this PR.
2. Uncommitted files that are *not* yours are left untouched — never `git add -A`,
   never `git commit -am`.
3. The commit diff (`git show --stat <hash>`) matches exactly the file list you
   intended. Verify after the commit, not just before.

**Enforcement:** Manual — a required pre-commit checklist step. `git add` explicit
paths only.

---

## Rule 2 — Validate the measuring instrument before diagnosing the system

**Origin:** The 60–80% router-accuracy number. It was treated as a router-quality
measurement when 8 of 18 "incorrect" cases were stale labels (`Coding Hinge` →
`The Engineer`) and 6 were fixtures for an unimplemented `Fact Check` route. The
system (router) was fine; the instrument (eval harness) was contaminated.

**Policy:** When a metric looks wrong, first ask *"could the measurement be wrong
before the system is wrong?"* Diagnose the harness, the fixtures, the normalization
maps, and the baseline before attributing the number to the system under test.

**Enforcement:** Automated — `scripts/validate-eval-integrity.mjs` (prebuild gate)
validates every eval label chain against `data/fingerprints.json`. The historical
`Coding Hinge` / `Fact Check` drift is now a permanent regression test in
`src/__eval__/evalLabelMap.test.js`.

---

## Rule 3 — Never silently exclude eval cases; mark exclusion with a reason

**Origin:** The phantom `Fact Check` route. Cases targeting a route that does not
exist were being counted as routing failures, which systematically falsified the
denominator. Deleting them silently would have erased the evidence of the missing
capability.

**Policy:** Excluding a fixture is always explicit and always annotated:
```text
status: excluded
reason: route_not_implemented
```
Excluded cases are counted outside both numerator and denominator, reported as a
separate number, and declared in `EXCLUDED_CATEGORIES` in
`src/__eval__/evalLabelMap.js`. An undeclared exclusion fails the integrity gate.

**Enforcement:** Automated — the gate fails if any category referenced by an eval
maps to no fingerprint route and is not declared excluded with a reason.

---

## Rule 4 — Separate measurement corrections from behavior changes

**Origin:** Two distinct problems were entangled: the evaluator mislabeled correct
routing decisions (a measurement bug) and a few borderline routing decisions were
genuinely wrong (a behavior bug). Fixing both in one PR would have made it
impossible to attribute the accuracy improvement to either.

**Policy:** A PR that corrects a measurement must not also change system behavior.
Ship them as separate PRs with separate tests:
- **Measurement PR:** fix labels, normalization, fixtures, exclusions. Report raw,
  corrected, excluded, and genuine-failure numbers.
- **Behavior PR:** change routing rules (e.g. greeting terms, matchTerms). Each
  behavior change gets its own router-level test.

**Enforcement:** Manual — enforced by review and commit message. The two-commit
split (b2ed578 measurement → deferred behavior PR) is the reference pattern.

---

## Rule 5 — Verify quoted metrics against source artifacts

**Origin:** Two figures were carried in conversation and both were wrong: "~$0.12
per request" (actual: fractions of a cent on DeepSeek/Groq/Gemini) and "~90%
accuracy" (memory-carried from a contaminated measurement). Both would have shipped
in outreach copy if not checked against the data files.

**Policy:** Any number quoted in a commit, a README, a LinkedIn post, or a grant
proposal must trace to a source artifact before it is published:
- test counts → `scripts/gen-claims.mjs` / `src/data/claims.json`
- model rates → `src/data/modelRates.json` + `data/fingerprints.json`
- router accuracy → `src/__eval__/routingEval*.test.js` output
- savings → replay harnesses (`costSavingsReplay`, `evalReplay`) against exports
- cost → provider billing CSV, not memory

If a number has no reproducible source, it is a hypothesis or a memory — label it
as such, or drop it.

**Enforcement:** Manual + the `CLAIM_LEDGER.md` discipline: every published claim
must map to the command that reproduces it. An unverifiable claim is retired.

---

## Reference: where these live

| Rule | Automated gate | Regression test |
|---|---|---|
| 1. Inspect worktree | — (manual pre-commit step) | — |
| 2. Validate instrument | `scripts/validate-eval-integrity.mjs` | `evalLabelMap.test.js` |
| 3. Explicit exclusions | `scripts/validate-eval-integrity.mjs` | `evalLabelMap.test.js` |
| 4. Split measurement/behavior | — (manual) | — |
| 5. Verify metrics | `CLAIM_LEDGER.md` + prebuild `--check` gates | — |

New workflow lessons should be added here as Rule 6+, with the incident that
produced them, so the policy stays the memory of the project.
