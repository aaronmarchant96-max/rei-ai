# Workflow Quick-ref (verified 2026-08-13)

One-page operational memory. Rationale lives in `AGENTS.md` / `docs/WORKFLOW_DETAILED.md` / `TOKEN_SAVERS.md`.

---

## Layer 0 — Hard stops (never override; on hit → STOP & ask)

- **HEAD mismatch** — running HEAD != plan's pinned `git_commit` → revalidate tagged context
- **Scope collision** — implementation needs an unplanned file / arch change / new dep / contract / runtime / service
- **Dirty-file collision** — task scope overlaps a pre-existing dirty file
- **Deploy / Vercel** — never create/init/link projects, never clone-to-fix; ask on any deploy issue
- **Unsafe git** — no reset/stash/checkout of another agent's work; no blind rollback
- **Unverified measurement** — never put an estimated/modelled value in a measured-value field

## Layer 1 — Workflow

**Triage:** research/plan OR 5+ files OR reasoning → **AGY** (plan w/ YAML `git_commit`, `reversible`, `stop_conditions`) · else **Fast Lane** (<5 files, mechanical, reversible)

**Gates before modifying:**
- *Worktree gate:* `git status --short && git diff --stat` — unrelated dirty files are OUT-OF-SCOPE; never modify/stage/reset/commit them; if scope overlaps a dirty file → STOP
- *Scope gate:* unplanned expansion → STOP. Record WHY / BLAST_RADIUS / ALTERNATIVES / REPLAN_REQUIRED

**Build:** acceptance ("experimental-isolation") tests FIRST → iterate w/ targeted tests.

**Verification (commit gate only, not per-edit):**
```bash
npm test -- --runInBand 2>&1 | rg "Tests:|Test Suites:"
npm run build
node scripts/gen-claims.mjs   # once, right before commit
git diff --stat               # intended files only
```

**Stop conditions (AGY):** tests_regress · scope_drift · measurement_contract_break · unexpected_runtime_behavior. On stop → preserve worktree for diagnosis (no auto-revert unless rollback declared safe).

**Commit:** one per task · `[caught: manual|ai-cross-check|test|claim-gate|review]` · push only when asked.

## Layer 2 — Optimization

- **Budget = compress trigger** — reduce closed ranges at Fast<5K / plan<12K / AGY+EXEC<25K; never silently exceed
- **Pin, don't wander** — grep tight, read at line offset, delegate discovery
- **Targeted tests** — `npm test -- --runInBand src/lib/<module>.test.ts` while iterating; full suite at commit only
- **Single-shot tool calls** — one `vercel ls`, one `gen-claims`, batch git reads

---

## Provenance + measurement discipline (standing)

Every externally visible metric identifies: numerator · denominator · baseline · corpus · mode (`measured`|`replayed`|`estimated`|`modeled`) · assumptions · exclusions · timestamp/version. *"Claim before code":* if a change touches claims/economics/accuracy/security, state the claim → measurement definition → fixture → acceptance test → implement → verify. **Counterfactual isolation:** freeze all non-tested variables (corpus, routing, exclusions, criteria); prove CONTROL==CONTROL and EFFECT!=CONTROL.

## Concurrent work

Verify HEAD · branch · worktree · recent commits before editing. Do not assume another session's changes are yours; a post-plan commit means the plan's pinned context must be **revalidated** (≠ auto-stale).

---

*One line: tag → plan-gate → worktree/scope gates → acceptance tests → targeted tests → budget-compress → commit-gate (full suite + build + gen-claims once) → one commit `[caught: …]`, push only on request.*
