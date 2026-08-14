# Workflow — Detailed Reference

The full, deliberate version of the workflow. For the one-page operational memory
use `WORKFLOW_QUICKREF.md`; this file carries the rationale and the fine print so
the quick-ref can stay high-leverage. Source of authority: `AGENTS.md`.

---

## The Complete 5-Layer Workflow Architecture

Aaron's system is **five layers deep**, each with a specific purpose:

```
L0 — HARD STOPS (never overridden)
  ├── HEAD mismatch
  ├── Scope collision
  ├── Dirty-file collision
  ├── Deploy / Vercel
  ├── Unsafe git
  └── Unverified measurement

L1 — GOVERNANCE (Triage → Plan → Scope → Claims → Verification → Commit)
  ├── Task Triage Gate (AGY vs Fast Lane)
  ├── AGY Plan Format (YAML header)
  ├── Pre-execution Gates (HEAD, worktree, scope)
  ├── Acceptance Tests First
  ├── Implementation (in order)
  ├── Stop Conditions
  ├── Verification Gate
  └── Commit Discipline

L2 — CARDO LOOP (cognitive reasoning)
  ├── Collect (facts/context)
  ├── Analyze (constraints, alternatives, blast radius)
  ├── Record (assumptions, evidence, decisions)
  ├── Distinguish (fact vs assumption, measured vs estimated)
  ├── Operate (smallest safe increment)
  └── (loop back to Collect)

L3 — EXECUTION (implementation, tests, verification)
  ├── Implement
  ├── Test (targeted)
  ├── Observe
  ├── Preserve evidence
  └── Feed result back into CARDO

L4 — OPTIMIZATION (token economy, tooling tactics)
  ├── Budget = compress trigger (5K/12K/25K)
  ├── Pin, don't wander (grep, line offsets)
  ├── Targeted tests (module only)
  ├── Single-shot tool calls
  └── Concurrent work (verify HEAD/branch/worktree)
```

---

## Layer 0 — Hard Stops

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

## Layer 1 — Governance (The Operating Loop)

### 1. Task Triage Gate

```
research/plan task? OR touches 5+ files? OR involves reasoning?
        │
        ├── YES → AGY path (write a plan)
        └── NO  → Fast Lane (<5 files, mechanical, reversible)
```

- **AGY** — analysis, cross-file, or judgment work.
- **Fast Lane** — all three must hold: fewer than 5 files, mechanical change, reversible with a single `git checkout`.

### 2a. AGY Plan Format

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

### 2b. Pre-Execution Gates — Run Before Modifying Anything

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
- Pre-existing modifications are **OUT-OF-SCOPE**: never modify, stage, reset, stash, or commit them.
- If the task's scope overlaps a dirty file → STOP and re-plan.
- Record unrelated dirty paths in the handoff so the next agent knows they aren't yours.

**Scope gate**
If the implementation demands an unplanned file / arch change / dependency / contract / runtime / service → STOP. Record:
- WHY discovered
- BLAST_RADIUS
- ALTERNATIVES
- REPLAN_REQUIRED: yes/no

### 3. Claim Before Code (Acceptance Tests First)

For anything touching claims, economics, analytics, accuracy, or security:

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

Answer first: *"What claim will this change allow us to make?"* If unclear → STOP and define the measurement.
**Counterfactual isolation:** prove both `CONTROL == CONTROL` and `EFFECT != CONTROL`.

---

## Layer 2 — The CARDO Loop (Cognitive Reasoning)

```
COLLECT → ANALYZE → RECORD → DISTINGUISH → OPERATE → (loop)
```

- **COLLECT**: git state, plan, source, tests, fixtures, claims, runtime behavior, external docs, prior measurements.
- **ANALYZE**: what's happening, why, alternatives, dependencies, blast radius, reversibility.
- **RECORD**: facts, assumptions, unknowns, decision, why, expected effect, stop conditions.
- **DISTINGUISH**: classify evidence using the Evidence Ladder.
- **OPERATE**: implement smallest safe increment → test → observe → preserve evidence → feed result back into CARDO.

### The Evidence Ladder

| Class | Label | Meaning |
| :--- | :--- | :--- |
| 🟢 | Primary Source | Original document/scan |
| 🔵 | Strong Evidence | Corroborated by multiple sources |
| 🟠 | Needs Review | Unresolved conflict or missing link |
| 🟡 | Family Memory | Oral tradition, kept separate from facts |
| 🟣 | Corroborated Compilation | Synthesized from multiple primary sources |

*Rule:* Never promote a weaker evidence class into a stronger one.

---

## Layer 3 — Execution & Verification Gate

### Implementation Rules
- Execute the plan in order; do not skip steps.
- If a step fails, **stop** — do not continue to the next step.

### Stop Conditions
`tests_regress` · `scope_drift` · `measurement_contract_break` · `unexpected_runtime_behavior`

On a stop condition:
- **Preserve the worktree for diagnosis.**
- Do NOT auto-revert unless the plan explicitly declared the rollback safe.
- Report via the structured Error Report template (AGENTS.md).

### Verification Gate (Commit-Time Only)

```bash
# full suite → silent count
npm test -- --runInBand 2>&1 | rg "Tests:|Test Suites:"
npm run build
node scripts/gen-claims.mjs   # re-runs full suite — run ONCE, right before commit
git diff --stat               # intended files only
git status --short            # confirm scope
```

### Commit Discipline
- One commit per task.
- Tag error-origin in commit message: `[caught: manual|ai-cross-check|test|claim-gate|review]`
- Keep unrelated changes separate (e.g. `api/package-lock.json` stays separate).
- Do **not** push until the user asks.

---

## Layer 4 — Optimization (Token Economy)

| Path | Budget | Rule |
| :--- | :--- | :--- |
| **Fast Lane** | < 5K | one commit, one verify |
| **AGY plan** | < 12K | pin line numbers, list WHY not HOW |
| **AGY + EXEC** | < 25K | compress closed ranges at budget; never silently exceed |

- **Budget = compress trigger:** hit budget → `compress` closed ranges + a handoff note → continue.
- **Pin, don't wander:** grep tight, read at line offset, delegate discovery.
- **Targeted tests:** `npm test -- --runInBand src/lib/<module>.test.ts` while iterating; full suite at commit gate only.
- **Single-shot tool calls:** one `vercel ls`, one `gen-claims`, batch git reads.
- **Concurrent work:** verify HEAD, branch, worktree, and recent commits before editing.

---

## The Engelbart Connection (C-Work)

This workflow represents pure Engelbartian C-Work:
- **A-Work:** REI.ai (the product)
- **B-Work:** The code, tests, and deployments (the tools)
- **C-Work:** The workflow itself—Hard Stops, CARDO, Evidence Ladder, Token Budgets (the system that improves the tools)

---

## The One-Liner

> **Triage → gates → CARDO → claim/acceptance contract → implement → observe → CARDO → commit gate → one commit → push only on request.**

---

*Last updated: 2026-08-14. Correlates to `WORKFLOW_QUICKREF.md` and `AGENTS.md`.*
