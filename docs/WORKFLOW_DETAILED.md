# Workflow — Detailed Reference

The full, deliberate version of the workflow. For the one-page operational memory
use `WORKFLOW_QUICKREF.md`; this file carries the rationale and the fine print so
the quick-ref can stay high-leverage. Source of authority: `AGENTS.md`.

---

## The control-system view

The workflow is three stacked layers. Layer 0 things an agent can **never** do on
its own. Layer 1 is the normal operating loop. Layer 2 is how we keep the loop
cheap enough to run.

```
Layer 0  Hard stops      (never override — always a human decision)
Layer 1  Workflow        (triage → gates → build → verify → commit)
Layer 2  Optimization    (token budget, pinning, targeted tests, single-shot)
```

---

## Layer 0 — Hard stops

| Stop | Rule |
|------|------|
| **HEAD mismatch** | running `HEAD` ≠ plan's `git_commit` → revalidate the tagged context (re-plan or explicitly confirm). |
| **Scope collision** | implementation needs anything unplanned: a file, arch change, new dependency, changed public contract, changed runtime behavior, or new external API/service. |
| **Dirty-file collision** | the task's scope overlaps a file with pre-existing uncommitted edits. |
| **Deploy / Vercel** | never create/init/link Vercel projects, never `vercel link`/`vercel init`, never clone to "fix" git; ask on any deploy/config problem. |
| **Unsafe git** | no reset/stash/checkout of another agent's work; no blind rollback. |
| **Unverified measurement** | never place an estimated/modelled value in a measured-value field. |

On any hard stop: **STOP and ask the user.** Do not silently proceed.

---

## Layer 1 — The operating loop

### 1. Task triage gate

```
research/plan  OR  5+ files  OR  reasoning
   │
   ├── YES → AGY (produce a plan)
   └── NO  → Fast Lane (skip planning)
```

- **AGY** — analysis, cross-file, or judgment work.
- **Fast Lane** — all three must hold: fewer than 5 files, mechanical change
  (pure sed/replace), reversible with a single `git checkout`.

### 2a. AGY plan

```yaml
---
plan_id: <short-descriptor>
plan_valid_as_of: <ISO timestamp>
git_commit: <HEAD commit hash>
files_affected: <count>
reversible: yes | no | partial
blast_radius: <what breaks if this fails>
stop_conditions:
  - tests_regress
  - scope_drift
  - measurement_contract_break
  - unexpected_runtime_behavior
---
```

- Under 4K tokens.
- Exact `file:line` references.
- State WHY each file changes (not how, not prose).

### 2b. Pre-execution gates — run before modifying anything

**HEAD gate**
```bash
# must match the plan's git_commit
git rev-parse HEAD
```
Mismatch → stale plan → re-route to AGY.

**Worktree gate**
```bash
git status --short
git diff --stat
git diff --name-only
```
- Pre-existing modifications are **OUT-OF-SCOPE**: never modify, stage, reset,
  stash, or commit them.
- If the task's scope overlaps a dirty file → STOP and re-plan.
- Record unrelated dirty paths in the handoff so the next agent knows they aren't yours.

**Scope gate**
If the implementation demands an unplanned file / arch change / dependency /
contract / runtime / service → STOP. Record:
- WHY discovered
- BLAST_RADIUS
- ALTERNATIVES
- REPLAN_REQUIRED: yes/no

The plan can stay on the same commit while scope drifts — the scope gate catches
that regardless of HEAD.

### 3. Claim before code (measurement-driven)

For claims, economics, analytics, accuracy, or security:

```
claim
 ↓
measurement definition
 ↓
fixture
 ↓
acceptance test
 ↓
implementation
 ↓
claim verification
```

Answer first: *"What claim will this change allow us to make?"*
If unclear → STOP and define the measurement.

Write **experimental-isolation** assertions before code:
- controls stay unchanged (e.g. `cacheModeledEntries === 0`, cache fields null)
- the effect case carries the result (e.g. `cacheModeledEntries > 0`, savings non-null)
- the frozen surface is identical (routing / escalation / exclusion)
- prove `CONTROL == CONTROL` **and** `EFFECT != CONTROL`

This is what turns the claims ledger into engineering control rather than documentation.

### 4. Implement

- Execute the plan in order; do not skip steps.
- If a step fails, **stop** — do not continue to the next step.

### 5. Stop conditions

`tests_regress` · `scope_drift` · `measurement_contract_break` · `unexpected_runtime_behavior`

On a stop condition:
- **Preserve the worktree for diagnosis.**
- Do NOT auto-revert unless the plan explicitly declared the rollback safe.
- Report via the structured Error Report template (AGENTS.md).

Blind rollback can destroy evidence you need to understand the failure.

### 6. Verification gate (commit-time only)

```bash
# full suite → silent count (don't dump the output)
npm test -- --runInBand 2>&1 | rg "Tests:|Test Suites:"
npm run build
node scripts/gen-claims.mjs   # re-runs the whole suite — run ONCE, right before commit
git diff --stat               # intended files only
git status --short            # confirm scope
```

`gen-claims` re-runs the full Jest suite by design (it counts tests). Run it a
single time at the commit gate, not during iteration.

### 7. Commit discipline

- One commit per task.
- Do **not** push until the user asks.
- Tag error-origin in the message: `[caught: manual|ai-cross-check|test|claim-gate|review]`
- Keep unrelated changes out (e.g. `api/package-lock.json` stays separate).

**Measurement provenance** (standing): every externally visible metric identifies
numerator · denominator · baseline · corpus · mode (`measured|replayed|estimated|modeled`)
· assumptions · exclusions · timestamp/version.

---

## Layer 2 — Optimization

| Tactic | Rule |
|--------|------|
| **Budget is the compress trigger** | Fast <5K / plan <12K / AGY+EXEC <25K. Hit budget → `compress` closed ranges + a handoff note → continue. Never silently exceed the cap. |
| **Pin, don't wander** | grep tight, read at line offset, delegate discovery to a subagent so it returns one paragraph. |
| **Targeted tests** | `npm test -- --runInBand src/lib/<module>.test.ts` while iterating; full suite only at the commit gate. |
| **Single-shot tool calls** | one `vercel ls`, one `gen-claims`, batch independent git reads. |
| **Concurrent work** | verify HEAD, branch, worktree, and recent commits before editing. Never assume another session's changes are yours; do not reset/stash/checkout its work; a commit appearing after plan creation does **not** auto-stale the plan, but a changed HEAD means the pinned context must be revalidated. |

---

## Standing constraints (not Layer 0, but never broken)

- Two Git remotes (GitHub + GitLab) both push `main`; Vercel auto-deploys on push
  via both webhooks → **one** production site, two builds of the same commit.
- Semantic eval is NOT valid in CI (synthetic-hash fallback when ONNX/`fetch` is
  undefined). Document it, don't treat it as a real semantic measurement.

---

## Workflow grammar (one line)

> Triage → (AGY plan w/ `git_commit`+`stop_conditions` | Fast Lane) → HEAD /
> worktree / scope gates → claim-before-code + acceptance tests → implement →
> stop-condition check → targeted tests → budget-compress → commit gate (full
> suite + build + gen-claims once) → one commit `[caught: …]` → push only on request.

---

*Last updated: 2026-08-13. Correlates to `WORKFLOW_QUICKREF.md` and `AGENTS.md`.*
