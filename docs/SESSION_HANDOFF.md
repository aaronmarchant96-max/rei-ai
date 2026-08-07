# Session Handoff — 2026-08-07

## Current State

- **Branch:** `agents/continue-previous-discussion` == `main` at `19f7810`
- **Repo:** https://github.com/aaronmarchant96-max/rei-ai
- **Worktree:** `/home/potatoking/debate-furnace.worktrees/agents-continue-previous-discussion/`
- **⚠️ STALE DIR:** `/home/potatoking/debate-furnace` is a dead/stale directory — DON'T USE IT. Use the worktree path above.
- **Production URL:** `https://prompthound-labs.vercel.app`
- **DON'T USE:** `debate-furnace.vercel.app` — that was renamed/deprecated.

## Verification

- **Tests:** 44 suites / 564 passing (`npm test -- --runInBand`)
- **Build:** OK (~30s via `npm run build`)
- **Lint:** 0 errors, ~199 warnings (157 intentional no-console, 42 legacy dead code)
- **TypeScript check:** `tsc --noEmit` passes

## Session PRs Merged to Main

| PR | Content | Merge commit |
|---|---|---|
| #59 | Glassmorphism + animated counters | 25f07ec |
| #60 | Greeting-wrapping injection test (2 tiers) | 2a7c25 |
| #61 | estimateVsActualPct division fix | f9dfc9 |
| #62 | Landing page stale claims purge (92%→60-80%, 443+→558+) | da52516 |
| #63 | Analytics visibility (InstrumentRail link + header copy) | 4891b4d |
| #64 | Genealogy HARD STOP + legal precedent rules | efea0e7 |
| #65 | P0 cost honesty + Phase 0 trust claims + four-philosopher live wiring (12 commits) | 743df3b |
| #66 | HARD STOP 5/5 restoration + cross-domain bleed + structured telemetry | 81a3322 |
| #67 | Dashboard: date-range filter + cumulative savings trend + Model Health | 19f7810 |

## Key Files Changed This Session

| File | What changed |
|---|---|
| `src/lib/nightShiftRouter.ts` | Honest matchedTerms (actualMatchedTerms), temp routing wired, cost fixes (70B $0→0.00138), cross-domain bleed guard, isAdversarialRequest exported |
| `api/cfai.js` | Temperature threading, provider model sent to Groq, 30s provider timeouts |
| `src/lib/cardoGuard.js` | shouldEscalateToRemote wired into REI.jsx (was dead code) |
| `src/REI.jsx` | Escalation call before logRoutingDecision, mapTierToPathway, structured:true/false logging in updateLatestLogEntry, fetchWithTimeout |
| `src/systemPrompts.js` | HARD STOP in all 5 domains (GENERALIST, CODING, GENEALOGY, STORY, CASE_HINGE) — **use `\n` escapes in single-line strings, NOT real newlines** |
| `src/lib/routingLog.ts` | Added escalation, structured fields |
| `src/ToolsLanding.jsx` | Claims badge from claims.json (auto-gen), trust comparison, CTA steps |
| `src/Analytics.jsx` | Date-range filter, Cumulative Savings Trend, Model Health, Evidence section |
| `src/modules/rei/components/ChatBubble.jsx` | Escalation row in telemetry, visible hingeScore chip, rationale |
| `data/fingerprints.json` | 4 routes costPer1kInput=0.00059/0.00079, costPer1k markers removed |
| `scripts/gen-claims.mjs` | Auto-generates test-count badge from jest --json |
| `src/__eval__/claimsSync.test.js` | 136-prompt pooled accuracy gate (60-80% band) |
| `docs/CLAIM_LEDGER.md` | Re-baselined: accuracy 60-80%, savings ~92%, tests 560/44 |
| `docs/fortis-et-liber.md` | Known Limitations: story CARDO, escalation deferral |
| `src/Analytics.test.jsx` | 9 tests (was 5): +date filter, +cost trend, +model health, +empty state |

## Deferred / Open Items

1. **Domain-aware escalation thresholds** — deferred (needs per-domain telemetry, 73-sample training set too small)
2. **Narrative CARDO variant** (Stakes/Reversal for Story domain) — deferred pending user feedback
3. **Light-mode glassmorphism bugs** — MetricCard hardcodes dark glass, never adapts
4. **Chat history wipe on mount** — domain-change effect REI.jsx:271-287 has no first-run guard
5. **#rei deep-link doesn't route** — getInitialTool at AppShell.jsx:66-77 missing #rei
6. **slide-up keyframe defined nowhere** — animations never run
7. **2 known-failing CI jobs on main** — app_build (stale AppShell validator) + Azure Static Web Apps (dead resource)
8. **GitHub Actions billing lock** — intermittent but transient; merge with `--admin` if needed
9. **Stale docs not yet swept:** REI_V4_SEMANTIC_ROUTER_PLAN.md, INFORMATION_THEORETIC_ARCHITECTURE.md (superseded headers added, bodies still carry retired numbers)
10. **CLAIM_LEDGER.md** needs re-running after any router change (rule: re-run within 24h)

## Tips to Avoid This Session's Slowdown

1. **Start fresh sessions** — compressed blocks accumulate; performance degrades after 40+ blocks. A new session starts at zero.
2. **Use the right worktree** — always `/home/potatoking/debate-furnace.worktrees/agents-continue-previous-discussion/`, never `/home/potatoking/debate-furnace`
3. **After `git reset --hard`**, run `npm install` if node_modules are stale
4. **systemPrompts.js uses `\n` escapes** in single-line strings — never use real newlines or the build breaks
5. **Run full verification before pushing:** `npm test -- --runInBand && npm run build && npx tsc --noEmit`
6. **Generating a commit message with backticks?** Use `git commit -F <file>` — shells interpret backticks in `-m`
7. **gh CLI needs `--repo aaronmarchant96-max/rei-ai`**
8. **Compress early, compress often** — don't wait for the emergency warning. Compress after each closed chunk of work.
9. **Limit parallel exploration agents** — each agent's output becomes a compressed block
10. **One PR per domain of work** — separates concerns and keeps commit history clean

## Four Philosophers — Current Live Status

| Philosopher | What | Per-request? |
|---|---|---|
| Shannon | DAS entropy in computeHingeScore | Live |
| Feynman | HARD STOP in all 5 domain prompts | Live (prompt text) |
| Engelbart | CARDO GUARD escalation gate + decision-audit logging | Live (shouldEscalateToRemote wired) |
| Kaku | Post-response actuals (updateLatestLogEntry) | Live |

Note: CARDO GUARD's act/wait math (CardoGuard.jsx) is a standalone tab, NOT in REI.jsx's request path. Only shouldEscalateToRemote (routing-cost gate) is per-request.

## Quick Re-Grounding Commands

```bash
# Check branch state
git -C /home/potatoking/rei-ai fetch origin
git -C /home/potatoking/rei-ai log --oneline origin/main -5

# Verify build
cd /home/potatoking/debate-furnace.worktrees/agents-continue-previous-discussion
npm run build

# Run tests
npm test -- --runInBand 2>&1 | tail -5

# Regenerate claims badge
node scripts/gen-claims.mjs
```
