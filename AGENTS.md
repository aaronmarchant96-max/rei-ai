---
verified: true
last_reviewed: 2026-07-31
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
---
```

### Required fields

| Field | Why |
|-------|-----|
| `plan_valid_as_of` | Prevents executing against stale state. AGY MUST re-check if HEAD differs from plan's `git_commit`. |
| `blast_radius` | Before any destructive op (git, sync, schema), the agent must estimate what breaks. If "irreversible" → user confirmation required. |
| `reversible` | Fast Lanes are always reversible. AGY plans may not be. Flag it. |

### Pre-execution gate

Before executing an AGY plan, the execution agent MUST:

1. Run `git status --short` and compare with `git_commit` in the plan
2. If HEAD differs → **stale plan**. Re-route to AGY for re-evaluation.
3. If `blast_radius` includes files not in the plan → **halt and report**.

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
  - After all steps complete → run full verification suite
```

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

## Token Budget

| Path | Budget | When |
|------|--------|------|
| Fast Lane | < 5K tokens | Simple edits |
| AGY plan | < 12K tokens | Research/design |
| AGY + EXEC combined | < 25K tokens | Full implementation |

If a task exceeds its budget, compress the conversation and continue.

---

## File Map

| File | Purpose |
|------|---------|
| `AGENTS.md` | This file — workflow rules |
| `docs/fortis-et-liber.md` | REI codebase reference (project-specific) |
| `docs/REI_CODE_PATTERNS.md` | Code patterns to follow |
| `TOKEN_SAVERS.md` | Token efficiency tactics |

---

*Last reviewed: 2026-08-08. Stale after: 2026-08-09. Verify rules before executing.*
