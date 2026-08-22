---
verified: true
last_reviewed: 2026-08-22
stale_after_hours: 24
---

# Multi-Agent Workflow Specification

**IMPORTANT: This document governs how CLI agents collaborate. Every agent session MUST follow the task triage and execution rules below.**

This file defines the two-agent model (AGY = analysis/plan, EXEC = execution) plus the fast-lane bypass for simple tasks. It exists to save tokens, prevent stale-plan execution, and standardize error reporting.

---

## Task Triage Gate (runs before every task)

Before AGY is invoked, classify the task:

```
┌─────────────────────────────────┐
│  Is this a research/plan task?  │
│  OR                             │
│  Does it touch 5+ files?        │
│  OR                             │
│  Does it involve reasoning?     │
│      │                          │
│      ├── YES → Route to AGY     │
│      │         (full CARDO REI) │
│      │                          │
│      └── NO  → Fast Lane        │
│                (skip AGY,        │
│                 execute direct)  │
└─────────────────────────────────┘
```

### Fast Lane Criteria (skip AGY)

All three must be true:

- [ ] Fewer than 5 files affected
- [ ] No reasoning/analysis required (pure mechanical change)
- [ ] Reversible: rollback is a single `git checkout` or equivalent

**Examples:**
- "Add a comment to `src/REI.jsx` line 42" → **Fast Lane**
- "Update all 8 domain prompt files with new disclaimer text" → **AGY** (5+ files)
- "Should we refactor the router or add a new layer?" → **AGY** (reasoning required)

---

## AGY Plan Format

When AGY produces a plan, it MUST include this header:

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

### Required fields

| Field | Why |
|-------|-----|
| `plan_valid_as_of` | Prevents executing against stale state. AGY MUST re-check if HEAD differs from plan's `git_commit`. |
| `blast_radius` | Before any destructive op (git, sync, schema), the agent must estimate what breaks. If "irreversible" → user confirmation required. |
| `reversible` | Fast Lanes are always reversible. AGY plans may not be. Flag it. |
| `stop_conditions` | Explicit conditions at which the plan halts. **On a stop condition, preserve the worktree for diagnosis; do NOT auto-revert unless the plan explicitly declares the rollback safe.** Blind rollback can destroy evidence. |

### Pre-execution gate

Before executing an AGY plan, the execution agent MUST:

1. Run `git status --short` and compare with `git_commit` in the plan
2. If HEAD differs → **stale plan**. Re-route to AGY for re-evaluation.
3. If `blast_radius` includes files not in the plan → **halt and report**.

### Worktree gate

Before *any* modification, run `git status --short` and `git diff --stat`:

- Pre-existing modifications are **OUT-OF-SCOPE**. Do not modify, stage, reset,
  stash, or commit them.
- If the task scope overlaps a dirty file → **STOP and ask / re-plan** (don't
  silently touch someone else's in-flight work).
- Record unrelated dirty paths in the execution handoff so a later agent knows
  they are not yours.

This prevents the "unrelated file bundled into a commit" incident class.

### Scope gate (scope drift)

The plan may stay on the same commit while implementation discovers the planned
scope is insufficient. If a change requires an **unplanned** file, architecture
change, new dependency, changed public contract, changed runtime behavior, or
new external service/API → **STOP**.

Do not silently expand the plan. Record:
- WHY discovered
- BLAST RADIUS
- ALTERNATIVES
- REPLAN_REQUIRED: yes/no

---

## Execution Rules

### Fast Lane

```yaml
agent: EXEC
constraints:
  - Read target file before editing
  - One commit per task
  - Run verification command (npm test, npm run build, etc.)
  - If verification fails → escalate to AGY
```

### AGY-Guided

```yaml
agent: EXEC (following AGY plan)
constraints:
  - Execute steps in order — do not skip
  - If any step fails → stop, do not continue to next step
  - Report errors in structured format (see below)
  - Preserve prompt-freeze prefix order in opencode.json
  - After all steps complete → run full verification suite
```

---

## Prompt-Freeze & Deterministic Caching Protocol

To sustain a 90%+ prompt cache hit rate across LLM providers (e.g. Gemini 70-90% caching discount, DeepSeek prompt caching):

1. **Frozen Prefix Order:** The file ordering in `opencode.json` under `instructions` must remain frozen. Changes to instruction ordering or `REI_SYSTEM_PROMPT` invalidate the cached prefix.
2. **Deterministic Keys:** Cache keys are derived from SHA256 of the normalized prompt prefix, system prompt, user query, domain, and static routing signals. Dynamic tokens (e.g. client timestamps, random seeds, volatile session IDs) must never contaminate the cache key.
3. **Safety Bypass:** All requests flagged for `adversarial-validation` or escalated by security scanners must explicitly bypass the cache.
4. **Summary Compression:** Compress closed conversational context into HCM summaries (<=500 tokens) via `saveChatHistoryHCM()` on key decision hinges rather than every turn. See `memories/repo/caching_rules.md` for full policy.

---

## Error Reporting Template

When any agent hits an unrecoverable error, the report MUST use this format:

```
## Error Report

**Command:** <exact command that failed>
**Error:** <exact error message>
**Affected files:** <paths, comma-separated>
**Plan step:** <which step of the AGY plan, or "fast lane">
**Rollback status:**
  - [ ] Files reverted via git checkout
  - [ ] Working tree clean
  - [ ] Manual intervention needed: <details>
**Next action:**
  - [ ] Retry with adjustment: <what changed>
  - [ ] Escalate to AGY for re-plan
  - [ ] Await user input
```

This format is searchable (`grep "Error Report"`), diffable across sessions, and machine-parseable.

---

## Staleness Checks

### Plan staleness

Every AGY plan carries `plan_valid_as_of`. Before execution, run:

```bash
# Compare plan's git_commit with current HEAD
PLAN_COMMIT="<from plan header>"
HEAD_COMMIT=$(git rev-parse HEAD)

if [ "$PLAN_COMMIT" != "$HEAD_COMMIT" ]; then
  echo "STALE PLAN: plan at $PLAN_COMMIT, HEAD at $HEAD_COMMIT"
  exit 1
fi
```

### Document staleness

This document carries `stale_after_hours: 24` in its frontmatter. Any agent reading it after 24 hours should flag it as potentially stale and re-verify the workflow rules against current practice.

---

## Verification Gate

Before any agent claims a task is complete:

1. `npm test` — all suites must pass (or pre-existing failures are documented)
2. `npm run build` — must succeed
3. `git diff --stat` — confirm only intended files changed
4. If AGY plan: confirm all steps marked complete
5. If Fast Lane: confirm fewer than 5 files touched

**DO NOT claim completion without passing the verification gate.**

---

## Error-Gap Tagging

When documenting an error in a commit message, tag it with what caught it — short suffix, no ceremony:

| Tag | Meaning |
|-----|---------|
| `[caught: manual]` | Spotted by a human reading output / dashboard / dashboard. |
| `[caught: ai-cross-check]` | Caught by one model family cross-checking another's output. |
| `[caught: test]` | Caught by the test suite (ci or local). |
| `[caught: claim-gate]` | Caught by the FEYNMAN GATE / claimRegistry `verifyAll()`. |

This adds almost no cost at commit time and over months produces a dataset showing which class of errors the test suite actually catches vs. which require human or multi-model intervention.

---

## Measurement & Evidence Discipline

Standing rules for anything touching claims, economics, analytics, accuracy, or security:

**Anti-Fabrication & Empirical Invariant.** Never fabricate, extrapolate, or retroactively rationalize test counts, file counts, or performance metrics. When citing any test suite results or file counts:
1. Always cite only the exact, literal stdout numbers returned by the executed command in the current turn.
2. Never synthesize or layer arithmetic justifications when challenged on a discrepancy. If challenged or uncertain, run the literal measurement command immediately and report only what the machine prints.
3. Never substitute an estimate into a verification claim.

**Claim before code.** Before implementing, answer: *"What claim will this change allow us to make?"*
If the answer is unclear → STOP, define the measurement first. Then the order is:

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

**Provenance.** Every externally visible metric must identify: numerator · denominator ·
baseline · corpus · measurement mode · assumptions · exclusions · timestamp/version ·
whether `measured`, `replayed`, `estimated`, or `modeled`.
**Never let an estimated/modelled value occupy a measured-value field.**

**Counterfactual isolation.** Any economic/quality/security counterfactual must freeze
the variables not under test — same corpus, same routing decisions (unless routing
adaptation is itself the test), same exclusions, same evaluation criteria; only declared
scenario variables change. The test must prove both `CONTROL == CONTROL` and
`EFFECT != CONTROL`.

---

## Concurrent Work

Before editing: verify HEAD, branch, worktree, and recent commits. If another agent or
session may be working in this repo:

- Do not assume its changes are yours
- Do not reset, stash, or checkout its work
- Rebase/re-plan only with explicit authority

A commit appearing after plan creation does **not** automatically make the plan stale —
but if HEAD changed, the plan's pinned execution context must be **revalidated**.

---

## Token Budget

| Path | Budget | When |
|------|--------|------|
| Fast Lane | < 5K tokens | Simple edits |
| AGY plan | < 12K tokens | Research/design |
| AGY + EXEC combined | < 25K tokens | Full implementation |

If a task reaches its budget with work remaining, **compress the closed ranges and continue — do not power past the cap silently.** Budget overrun that is absorbed without compression actively costs tokens. Also see TOKEN_SAVERS.md Tactics 8-10:
- **Budget is the compress trigger, not size.**
- **Write acceptance/experimental-isolation tests first** to avoid the implement→review→re-plan loop.
- **Full suite + `gen-claims` are commit-time-only**; extract gate numbers via `npm test -- --runInBand 2>&1 | rg "Tests:|Test Suites:"`. `gen-claims` re-runs the full suite — run it once, right before commit, not during iteration.

---

## File Map

| File | Purpose |
|------|---------|
| `AGENTS.md` | This file — workflow rules |
| `WORKFLOW_QUICKREF.md` | One-page operational memory (3-layer) |
| `docs/WORKFLOW_DETAILED.md` | Detailed workflow reference (full rationale) |
| `docs/fortis-et-liber.md` | REI codebase reference (project-specific) |
| `docs/REI_CODE_PATTERNS.md` | Code patterns to follow |
| `TOKEN_SAVERS.md` | Token efficiency tactics |
| `docs/CACHE_PRICING_LANDSCAPE.md` | External LLM cache pricing and provider benchmarks |
| `memories/repo/caching_rules.md` | Core prompt-freeze and cache invalidation rules |

---

*Last reviewed: 2026-08-22 (added gateway contract battery tests, serverRouter boundary, unified auth engine, delivery-gated economics, and canonical business plan). Stale after: 2026-08-23. Verify rules before executing.*
