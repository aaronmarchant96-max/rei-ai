# Workflow Quick-ref (verified 2026-08-22)

One-page operational memory. Rationale lives in `AGENTS.md` / `docs/WORKFLOW_DETAILED.md` / `TOKEN_SAVERS.md`.

---

## The 5-Layer Workflow Architecture

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

## Step-by-Step Operating Grammar

1. **Triage:** research/plan OR 5+ files OR **critical primitive touched** OR reasoning → **AGY** (plan w/ YAML `git_commit`, `reversible`, `stop_conditions`) · else **Fast Lane** (<5 files, no primitives, mechanical, reversible). See canonical primitive list in `AGENTS.md § Critical Primitive Files`.
2. **Pre-Execution Gates:**
   - *HEAD gate:* `git rev-parse HEAD` must match the plan's pinned `git_commit`
   - *Worktree gate:* `git status --short && git diff --stat` — unrelated dirty files are OUT-OF-SCOPE; never modify/stage/reset/commit them; if scope overlaps a dirty file → STOP
   - *Scope gate:* unplanned expansion → STOP. Record WHY / BLAST_RADIUS / ALTERNATIVES / REPLAN_REQUIRED
3. **Build:** acceptance ("experimental-isolation") tests FIRST → iterate w/ targeted tests.
4. **Verification (commit gate only, not per-edit):**
   ```bash
   npm test -- --runInBand 2>&1 | rg "Tests:|Test Suites:"
   npm run build
   node scripts/gen-claims.mjs   # once, right before commit
   git diff --stat               # intended files only
   ```
5. **Stop conditions (AGY):** tests_regress · scope_drift · measurement_contract_break · unexpected_runtime_behavior. On stop → preserve worktree for diagnosis (no auto-revert unless rollback declared safe).
6. **Commit:** one per task · `[caught: manual|ai-cross-check|test|claim-gate|review]` · push only when asked.

---

## Evidence Ladder

| Class | Label | Meaning |
| :--- | :--- | :--- |
| 🟢 | Primary Source | Original document/scan |
| 🔵 | Strong Evidence | Corroborated by multiple sources |
| 🟠 | Needs Review | Unresolved conflict or missing link |
| 🟡 | Family Memory | Oral tradition, kept separate from facts |
| 🟣 | Corroborated Compilation | Synthesized from multiple primary sources |

*Rule:* Never promote a weaker evidence class into a stronger one.

---

## Provenance + Measurement Discipline (standing)

Every externally visible metric identifies: numerator · denominator · baseline · corpus · mode (`measured`|`replayed`|`estimated`|`modeled`) · assumptions · exclusions · timestamp/version. *"Claim before code":* if a change touches claims/economics/accuracy/security, state the claim → measurement definition → fixture → acceptance test → implement → verify. **Counterfactual isolation:** freeze all non-tested variables (corpus, routing, exclusions, criteria); prove CONTROL==CONTROL and EFFECT!=CONTROL.

---

## Token Budgets & Optimization

| Path | Budget | Rule |
| :--- | :--- | :--- |
| **Fast Lane** | < 5K | one commit, one verify |
| **AGY plan** | < 12K | pin line numbers, list WHY not HOW |
| **AGY + EXEC** | < 25K | compress closed ranges at budget; never silently exceed |

**Budget = compress trigger:** hit budget → `compress` closed ranges + a handoff note → continue.

---

## The One-Liner

> **Triage → gates → CARDO → claim/acceptance contract → implement → observe → CARDO → commit gate → one commit → push only on request.**

---

## Deploy Reminder

> [!IMPORTANT]
> **Two remotes. Both must be pushed for changes to reach production.**
>
> ```bash
> git push origin main && git push bitbucket main
> ```
>
> Vercel deploys from **`bitbucket` only**. Pushing to `origin` (GitHub) alone does not update the live site.
> See `AGENTS.md § Repository & Deploy Configuration` for the full rule.
