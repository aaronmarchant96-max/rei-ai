# Workflow Quick-ref (current, verified 2026-08-13)

Consolidated from `AGENTS.md`, `TOKEN_SAVERS.md`, `CLI_ENTRY.md`. Use this as the
first-stop operational memory for agent sessions on this repo.

---

## 1. Task Triage Gate (runs before every task)

```
research/plan OR touches 5+ files OR involves reasoning
        │
        ├── YES → AGY path (full plan)
        └── NO  → Fast Lane (mechanical, <5 files, reversible by git checkout)
```

## 2. AGY path

- Plan must carry a YAML header: `plan_id`, `plan_valid_as_of`, `git_commit`,
  `files_affected`, `reversible`, `blast_radius`.
- **Pre-execution gate:** if current `git rev-parse HEAD` != plan's `git_commit`
  → **STALE PLAN**, stop and re-route to AGY.
- Execute steps in order; on any failure stop (don't skip ahead); report via the
  structured Error Report template.

## 3. Token discipline (Tactics 8-10 in TOKEN_SAVERS.md)

| Path | Budget | Rule |
|------|--------|------|
| Fast Lane | < 5K | one commit, one verify |
| AGY plan | < 12K | pin line numbers, list WHY not HOW |
| AGY + EXEC | < 25K | compress closed ranges at budget; never silently exceed |

**Tactic 8 — budget is the compress trigger:** hit budget → `compress` closed
ranges + a handoff note → continue. Size of the visible conversation is NOT the
signal; the budget is.

**Tactic 9 — write acceptance tests first:** Any non-trivial / reasoning change
pins its experimental-isolation contract as assertions *before* implementing:

- controls stay unchanged (e.g. `cacheModeledEntries === 0`, cache fields null)
- the effect case carries the result (`> 0`, savings non-null)
- the frozen surface is identical (routing / escalation / exclusion equal)
- then assert control-vs-effect actually differ

**Tactic 10 — full suite + `gen-claims` are commit-time only:**

```bash
# iterate (targeted):
npm test -- --runInBand src/lib/<module>.test.ts

# commit gate (silent extraction, don't dump output):
npm test -- --runInBand 2>&1 | rg "Tests:|Test Suites:"
npm run build
node scripts/gen-claims.mjs            # re-runs full suite — run ONCE, right before commit
```

## 4. Verification gate (before claiming done)

1. `npm test -- --runInBand` — all suites pass (or document pre-existing fails)
2. `npm run build` — succeeds
3. `git diff --stat` — only intended files changed
4. `gen-claims` — claims.json test count matches (or regenerate)
5. `git status --short` — confirm scope

## 5. Commit discipline

- One commit per task. Don't push until the user asks.
- Tag error-origin in the message: `[caught: manual|ai-cross-check|test|claim-gate|review]`.
- Keep unrelated changes separate (e.g. `api/package-lock.json` stayed out of the
  cache-economics commit).

## 6. Standing constraints (do NOT break)

- **NEVER** create/init Vercel projects, **NEVER** run `vercel link`/`vercel init`,
  **NEVER** clone to "fix" git. Ask the user on any deploy/config issue.
- Two Git remotes (GitHub + GitLab) both push `main`; Vercel auto-deploys on
  push via both webhooks → **one** production site, two builds of the same commit.
- Semantic eval is NOT valid in CI (synthetic-hash fallback when ONNX/`fetch` is
  undefined). Document, don't treat as a real semantic measurement.

---

## One-line memory

> Triage → (AGY plan with git_commit gate | Fast Lane) → acceptance tests first →
> targeted tests while iterating → budget-triggered compress → full suite + build
> + gen-claims at the commit gate → one commit, `[caught: …]`, push only on request.

*Last updated: 2026-08-13.*
