# CLI Reference for REI workspace

**IMPORTANT: This document is the authoritative reference for all CLI agents working on this project. Every CLI session MUST read and follow this document first.**

This file is a compact handoff document for future CLI sessions. It gathers the most important repo context, entry points, and verification steps in one place so you do not need to read many files first.

## For CLI Agents

1. **READ THIS FIRST**: Before making any changes or exploring the codebase, read this entire document
2. **FOLLOW THE STRUCTURE**: Use the entry points and patterns described here
3. **UPDATE RESPONSIBLY**: Keep this document current with important architectural changes
4. **VERIFY BEFORE CLAIMING COMPLETION**: Always run the verification commands listed below

### Efficiency Notes

**Token Efficiency Goal:**
- **Documented target**: reduce the cost of becoming productive from roughly 100K tokens to roughly 12K tokens
- **Result**: about 88% less token usage for onboarding and early task execution
- **Context**: the goal is to keep this work near 12% of the conversation cap so more room stays available for real implementation

**Why this matters:**
- It shortens the time spent getting oriented before making changes
- It leaves more room for actual work instead of repeated context gathering
- It creates a more reliable workflow because the same paths and checks are reused
- It keeps the project cost-conscious and easier to maintain over time

**How this is achieved:**
- The CLI reference gives one place to start instead of forcing repeated file reading
- The entry points and patterns are explicit, which reduces redundant exploration
- Verification steps are documented, which reduces wasted test cycles and backtracking
- The mistake-handling section gives a clean recovery path instead of expensive trial-and-error loops

**Maintain this efficiency by:**
- Reading this document first before making changes or exploring the repo
- Following the documented entry points and verification steps
- Updating this document when the architecture or workflow materially changes
- Keeping changes focused and disciplined so the reference stays useful

## Repo purpose

REI.ai is a reasoning-first web app for structured decision support. The repo includes a live UI, a routing layer, a cost-aware decision gate, and a test suite that treats behavior as something to verify rather than simply observe.

Live demo: https://debate-furnace.vercel.app/#rei
- **Status**: ✅ Verified accessible (2026-07-01)
- **Purpose**: Production deployment of REI.ai reasoning interface

Repository: https://github.com/aaronmarchant96-max/rei-ai

## Repository Portfolio

**Total: 579+ commits across 9 repositories** (verified via Git history)

| Repository | Commits | Focus | Status |
|------------|---------|-------|--------|
| **codium-code-examples** | 186 | Code examples, Codium AI integration, development patterns | Active |
| **debate-furnace** | 176 | Production AI platform: REI.ai, NightShift router, CARDO GUARD, 6 specialized tools | Active / Deployed |
| **llm-adversarial-testing** | 107 | Adversarial testing framework: dual-axis judging, case studies, CI/CD pipeline | Active |
| **family-archive** | 73 | Genealogy archive: 132 people, 86 documents, evidence-tiered reasoning | Active / Deployed |
| **uap-footage-analyzer** | 24 | UAP footage analysis system | Active |
| **aaronmarchant96-max** | 11 | Personal profile and configuration | Active |
| **local-video-motion-zone-detector** | 3 | Motion detection prototype | Active |

**All repositories built on commodity hardware (Intel Celeron J4105, 8GB RAM) with a $25/month budget.**

**Cross-repo patterns:**
- Consistent documentation discipline (Fortis et Liber methodology)
- Token-efficient development workflows
- Production-grade testing and deployment
- Cost-aware architecture ( NightShift + CARDO GUARD routing)

## Main entry points

- src/REI.jsx: main REI experience and reasoning shell
- src/AppShell.jsx: top-level app shell and tool router
- api/cfai.js: backend route and prompt scaffolding
- src/lib/nightShiftRouter.js: Night Shift routing logic
- data/fingerprints.json: routing catalog and cost model
- src/lib/cardoGuard.js: deterministic decision gate
- src/lib/persistentContextEngine.js: Hierarchical Context Memory (HCM) engine
- src/lib/nightShiftRouter.test.js: routing tests
- src/lib/cardoGuard.test.js: CARDO GUARD tests
- src/lib/persistentContextEngine.test.js: HCM unit tests

## Important architecture notes

The Night Shift router is rule-based and explicit. It uses a catalog of fingerprints to choose a path before the model call. The routing decisions are testable and inspectable.

The backend prompt scaffolding in api/cfai.js uses a hard-stop rule for underspecified requests. Instead of guessing, it asks for the missing context.

CARDO GUARD is deterministic and cost-aware. It evaluates whether acting is worth the cost based on confidence and expected loss.

The app shell keeps the experience structured and reviewable rather than leaving everything inside a single chat flow.

### Known limitations

- **CARDO schema is decision-analysis-shaped.** The Hinge/Facts/Assumptions/Evaluation/ChangeMind/Move structure is designed for decisions that can be graded before they are made. The Story domain (story-architect) stretches this: the Evaluation and What Would Change The Outcome sections are semantically awkward for fiction — you grade a narrative before it is finished. The hinge concept still works for stories (the pivot where the character's trajectory changes), and STORY_PROMPT's Phase 0 (genre/tone, character driver want+fear, setting) narrows the space, but a narrative-specific CARDO variant (e.g. Stakes/Reversal replacing Evaluation/ChangeMind) is explicitly deferred until user feedback demonstrates the need.
- **Domain-aware escalation thresholds deferred.** shouldEscalateToRemote (cardoGuard.js) currently uses confidence thresholds (cheap <0.5, medium <0.3, +0.2 under moderate suspicion) that are not tuned per domain. A Story request and a Legal request have different risk profiles, but per-domain thresholds cannot be calibrated until per-domain telemetry volume exists (training set is 73 samples). Logging `structured: true/false` per routing entry is the first step toward that calibration data.

## Evidence and testing

Use Jest as the main evidence gate.

### Recent Fixes and Updates

**Evidence audit — claims aligned to measured reality (2026-08-05):**
- **Retired the "92%" and "~90%" accuracy claims**: no benchmark produced them. Verified via `npm test -- --runInBand --testPathPatterns=routingEval`: deterministic router accuracy is **60–80%** (basic 60%, blind 67%, ML 66.7%, V3 80%, semantic-blind 73%).
- **Semantic eval is NOT valid in CI**: `routingEvalBlindV2` requires ONNX + model download; without it, it measures hash-noise (12%) and the test itself prints "⛔ THIS RESULT DOES NOT VALIDATE SEMANTIC ACCURACY." Real semantic accuracy requires an environment with `@xenova/transformers` + HuggingFace access.
- **Savings corrected to ~98%** (ceiling-based lab benchmark) — the ~68% figure predates the maxTokens bumps and is stale.
- **`routingEvalML.test.js` name/assertion mismatch fixed**: test was *named* "accuracy >= 80%" but *asserted* ≥60% — actual 66.7% passed the assertion but contradicted the name. Renamed to match the real 60% gate.
- All accuracy claims in `README.md`, `docs/TESTING.md` updated to the measured range. New `docs/CLAIM_LEDGER.md` maps every claim to the command that produces it.



**Client-side fetch timeout — no more infinite spinner (2026-08-05):**
- **Issue**: `fetch('/api/cfai')` had no timeout — a hung Vercel cold-start or stalled provider left the typing spinner running forever with no error and no retry affordance (same symptom class as the silent-failure bug below).
- **Fix**: New `fetchWithTimeout(url, options, timeoutMs=120000)` helper (`src/REI.jsx`) using `AbortController` + timer cleared in `finally`. 120s ceiling is deliberately generous so legitimate slow LLM completions pass through. `AbortError` surfaces as "Request timed out after 120s…" into the existing BackendUnavailablePanel (Retry/Copy/Dismiss).
- **Files changed**: `src/REI.jsx` (helper + both call sites: handleSendMessage, handleRetry), `src/REI.test.jsx` (+2 tests: hang → timeout message, fast resolve → passthrough)
- **Test coverage**: 38 suites, 508 passing.

**BackendUnavailablePanel — honest fallback when all backends are down (2026-08-05):**
- **Issue**: When every provider failed, the fallback was a template-string message with no diagnostics and no recovery path. Earlier versions fabricated confidence scores ("Confidence Score: 75%", "Running simulated local evaluation") — purged in commit `ea0ec13`.
- **Fix**: New `src/modules/rei/components/BackendUnavailablePanel.jsx` showing only real client-side data: route name/model/matched terms/hinge score (all computed by `buildRouterDecision` before the API call), collapsed error details, and Retry / Copy diagnostic / Dismiss buttons. No auto-retry loop. **No CARDO Guard math** — scenario classification requires an LLM, so applying hardcoded scenario parameters would be fabrication. REI.jsx refactored: `processApiResponse()` extracted from `handleSendMessage`; catch block now sets `backendError` state instead of pushing a fake message; `handleRetry()` re-fires the saved `retryPayloadRef`.
- **Files changed**: `src/modules/rei/components/BackendUnavailablePanel.jsx` (+11 tests), `src/REI.jsx`, `src/REI.test.jsx`
- **Test coverage**: 38 suites, 508 passing.

**Three critical production patches (2026-08-04, PR #43 → main):**
1. **API import crash — HTTP 500 on every request** (`2c02bb7`): `api/cfai.js` imported `buildRouterDecision, resolveRoutingModel` from `../src/lib/nightShiftRouter`, but the file was renamed to `.ts` in the TypeScript migration (`04ce867`). Vercel's Node runtime can't resolve `.ts` imports → `FUNCTION_INVOCATION_FAILED` on every request (live site returned 500). Import, `selectGroqModel`, and orphaned `DEFAULT_MODEL` were dead code (routerDecision always arrives in the POST body) — removed, 6 lines deleted.
2. **Catch-block scoping — silent failure** (`875ef22`): `ea0ec13` introduced `${routerDecision.id}`/`${routerDecision.model}` in the catch block, but `routerDecision` was `const` inside the `try` block → `ReferenceError` on any API error killed the catch before `setMessages` ran. User saw the typing indicator flash then nothing — 0 tokens, 0 messages. Fix: hoisted `let routerDecision;` above `try`, optional chaining in the template.
3. **CARDO export API mismatch — empty reports** (`1be20fa`): `handleExport` called `buildDecisionReport(exportData.sections, {...})` (two args) but the module signature is a single `{ sections, routerDecision, domainLabel, sourceText, createdAt }` object — the destructured `sections` defaulted to `{}`, producing empty reports. Fixed caller to normalize both call-site payload shapes (`createdAt`/`timestamp`), added print-window fallback via `report.html`, +9 unit tests.

**Test repairs (2026-08-04):**
- Un-skipped `it.skip("shows fallback text when the API call fails")` in `src/REI.test.jsx` — the "flakiness" that got it skipped in `3073138` was the scoping ReferenceError above manifesting inconsistently; also fixed `global.fetch` mock pollution with try/finally restore.
- Fixed pre-existing flaky "pre-fills legal" test: `setTimeout` → `await waitFor`, stale textarea assertion → checks message appears in chat.
- Added `src/lib/buildDecisionReport.test.js` (9 tests).

**Adaptive Context Persistence / Hierarchical Context Memory (HCM) - Code Quality Improvements (2026-07-03):**

**maxTokens bump across fingerprints (2026-08-04):**
- **Issue**: CARDO-structured responses (Phase 0 + Hinge + multi-section analysis) routinely exceeded old token caps (800-2000), showing "⚠️ Truncated" and cutting off mid-content in coding, story, genealogy, adversarial, and legal domains.
- **Fix**: Bumped 5 fingerprint maxTokens: structured-reasoning (800→1500), genealogy-deep-dive (1500→4000), story-architect (2000→4000), adversarial-validation (1500→3000), legal-hinge (1500→3000). Coding-hinge already bumped to 4000 in prior fix (ea0ec13).
- **Files changed**: data/fingerprints.json (5 values)
- **Test coverage**: 40 suites, 529 passing. No test changes needed (only one maxTokens assertion, coding-hinge, already at 4000).

- **Previous issue**: HCM implementation had critical bugs and code quality issues preventing commit.
- **Bugs fixed**:
  1. **Unsafe object cloning** (line 93): Replaced `JSON.parse(JSON.stringify())` with `structuredClone()` fallback to preserve object types
  2. **Broken array filtering** (line 109): Fixed reference equality bug in `compressHCM()` - now uses index-based comparison for filtering pinned messages
  3. **Brittle message detection** (line 182-183): Added explicit type validation for message filtering instead of fragile exclusion pattern
- **Improvements**:
  - Extracted 4 repeated regex patterns into `DOMAIN_KEYWORDS` constant (architecture, genealogy, maintenance, decision)
  - Added `getTimestamp()` helper to eliminate timestamp formatting duplication
  - Fixed `summarizeMessages()` to include decision counts even when no topics matched
  - Added null/undefined safety checks to `scoreMessage()`
  - Added HCM structure validation with explicit error messages
- **Test coverage expanded**: 78 tests passing (was 67, +11 from edge cases)
  - New edge case tests: empty arrays, null text, cascade compression, hard limit repeats
  - All new tests validate preservation of facts across compression cycles
  - All localStorage integration tests passing
- **ESLint**: No errors, 4 console warnings in error recovery (acceptable)
- **Verification**: `npm test` (78/78 passing), `npm run build` (succeeds), `npm run lint` (no errors)

**Architecture/Technical-Debt Routing Extension (2026-07-02):**
- **Issue Found**: SaaS monolith rewrite scenario was being routed to Genealogy Deep Dive (wrong)
- **Root Cause**: Initial pump maintenance fix added operational keywords but not software architecture terms
- **Solution**: Extended structured-reasoning fingerprint with architecture keywords (monolith, microservices, rewrite, technical debt, breach, cost-benefit analysis, etc.)
- **Changes**:
  - `data/fingerprints.json` - Added 9 architecture/infrastructure keywords
  - `src/lib/nightShiftRouter.test.js` - Added test for architecture decision routing (SaaS scenario)
  - `src/lib/cardoGuard.test.js` - Added cost-benefit test validating monolith rewrite recommendation
- **Test coverage**: 58 tests passing (was 56)
- **Key insight**: Routing fingerprints need to be continuously expanded as new decision domains emerge

**Pump Maintenance Scenario: All 4 Flaws Fixed (2026-07-01):**
- **FLAW #1 - Wrong Routing**: Added operational keywords to `data/fingerprints.json` (pump, vibration, sensor, shutdown, maintenance, equipment). Now routes maintenance decisions to Structured Reasoning (Generalist) instead of Genealogy.
- **FLAW #2 - Hard-Stop Rule Not Triggered**: System prompt enforces cost/context gathering. HARD_STOP_RULE validates Phase 0 questions before proceeding.
- **FLAW #3 - CARDO GUARD Not Applied**: Added comprehensive test validating pump scenario (23% confidence, $50k to act, $500k to miss). Confirms decision strength "Very Strong" and recommendation "ACT".
- **FLAW #4 - Non-Committal Response**: Updated Generalist system prompt with explicit CARDO GUARD decision logic. Response now includes cost comparison, false alarm rate, and deterministic ACT/WAIT recommendations.
- **Changes to files**:
  - `data/fingerprints.json` - Added operational keywords to structured-reasoning fingerprint
  - `src/REI.jsx` - Added CARDO GUARD guidance to Generalist system prompt (lines 1045-1055)
  - `src/lib/nightShiftRouter.test.js` - Added test for maintenance question routing
  - `src/lib/cardoGuard.test.js` - Added pump scenario validation test
  - `package.json` - Updated lint scripts for ESLint 9 compatibility
  - `eslint.config.js` - Simplified config, removed invalid rule spreads
- **Test coverage**: 56 tests passing (was 55)
- **Verification**: All tests pass, build succeeds, production demo verified

**REI Chat History Refactoring (2026-07-01):**
- **What changed**: Refactored chat persistence and domain system messages
- **New functions**:
  - `buildDomainSystemMessage()` - Centralized domain-specific welcome message generation
  - `readStoredMessages()` - Safe localStorage reading with error recovery
- **Why it matters**: Improves chat history reliability, adds error handling for corrupted localStorage data
- **Test coverage**: New `src/REI.test.jsx` tests recovery from corrupted chat history (1 test passing)
- **Verification**: All 56 tests passing, build succeeds

**CardoGuard Test Fix (2026-07-01):**
- **Problem**: Test "shows the cautious synthetic band for low-confidence scenarios" was failing
- **Root Cause**: UI wasn't rendering "cautious synthetic band" text for low confidence scenarios
- **Fix**: Updated `src/CardoGuard.jsx` to render both low and very low confidence bands as "cautious synthetic band"
- **Verification**: `npm test -- --runInBand src/lib/cardoGuard.test.js src/CardoGuard.test.jsx` (17/17 tests now passing)
- **Impact**: CARDO GUARD confidence labeling is now consistent across low confidence scenarios

### Current Test Status

- **Total tests**: 508 passing across 38 suites (was 78; +430 from session 2026-08-04/05 fixes and coverage)
- **Key test files**:
  - `src/lib/persistentContextEngine.test.js` - Hierarchical memory compression and recovery checks
  - `src/lib/cardoGuard.test.js` - Core decision logic tests (pump + SaaS scenarios)
  - `src/lib/nightShiftRouter.test.js` - Routing logic tests (maintenance + architecture)
  - `src/lib/buildDecisionReport.test.js` - CARDO report generation (9 tests)
  - `src/modules/rei/components/BackendUnavailablePanel.test.jsx` - Fallback UI states (11 tests)
  - `src/REI.test.jsx` - Chat persistence, error recovery, fallback text, fetch timeout
- **Build status**: ✅ Passing
- **Production status**: ✅ Live API responds (HTTP 200), live demo verified accessible
- **Lint status**: ✅ Passing — `npm run lint` returns 0 errors (195 warnings: intentional `no-console` in error paths + legacy `no-unused-vars` dead code). Repaired in commit `8d74215` (PR #50): installed `@eslint/js`, added `dist/**` + `build/**` + `coverage/**` + `.vercel/**` + `node_modules/**` to eslint ignores.

Common commands:

- `npm test` - Run full test suite
- `npm run build` - Production build
- `npm test -- --runInBand [specific-test-files]` - Targeted testing

The repo already contains tests for routing behavior, app-shell flow, and CARDO GUARD decision logic.

## Useful supporting docs

- README.md
- docs/CASE_STUDY.md
- TOKEN_SAVERS.md
- DEVELOPMENT_SETUP.md
- docs/REI_VIBE_MASTER_INDEX_TEMPLATE.md

## Session Handoff — 2026-08-05 (pick up cold from here)

**State:** Feature branch = `agents/continue-previous-discussion` (Evidence Loop + decision-audit platform + HingeScore calibration), PR #54 open. Working tree clean. Tests 548/548 (42 suites), build passes, lint 0 errors.

**This session shipped (Aug 5, part 2):**
- **Cost claims audit** (`0744639`): 68–84% → "~68% lab benchmark", untraceable 84% removed
- **HingeScore calibration Steps 0-4** (`7306e0f`): pool builder (136 prompts), router scorer, bucketing, Markdown reporter — 14 tests, zero live changes
- **Pool sync + FEYNMAN_GATE** (`57b334d`): 3 embedded copies (BLIND_CATEGORIES/V3_PROMPTS/SEMANTIC_PROMPTS) were out of sync with source files — fixed; FEYNMAN_GATE (10 tests) verifies every comment claim against computed reality
- **Decision-audit platform Steps 1-3** (`872030e`, `87e5463`, `07ce889`):
  - **Step 1:** `decisionStore.ts` — localStorage ring buffer capturing full CARDO trace per decision (single-write design with pendingDecision held in memory)
  - **Step 2:** `DecisionDetail.jsx` — presentational component rendering DecisionEntry as standalone CARDO audit report (167L, 13 tests)
  - **Step 3:** `DecisionFeed.jsx` — list/filter/export UI with domain dropdown, expandable detail, CSV/JSON export, integrated into Analytics.jsx tab bar (278L, 10 tests)

**Previous session shipped (Aug 5, part 1):** scoping fix (`875ef22`), export fix (`1be20fa`), API import crash (`2c02bb7`), maxTokens bumps (`f258fd1`), BackendUnavailablePanel (`20f0faa`, PR #47), fetch timeout (`6732517`, PR #48), docs (`2cf3b4a`, PR #49), lint repair (`8d74215`, PR #50), doc reconciliation (PR #52).

**Open items for next session:**
1. **`GEMINI_API_KEY` prefix in Vercel env vars — USER action, not code.** `api/cfai.js:48` checks `key.startsWith("AQ.")`. If the stored key starts with `AIza` (old format), Gemini is silently dead — regenerate in AI Studio. If `AQ.`, it's fine. No code change needed either way.
2. **Push branch to origin + create PR to main** (7 commits ahead, not yet merged)

**Known caveats:** `docs/TESTING.md` category table is approximate — headline count (42/548) is authoritative. domainLabel in decisionStore uses display labels (e.g. "The Generalist") not raw IDs — feed filter is aware and uses them for grouping. Duplicate-root docs reconciled in PR #52 — root copies of `CLI_ENTRY.md`/`TOKEN_SAVERS.md` are canonical.

## Quick read order

1. Read this file first.
2. Open src/REI.jsx for the main experience.
3. Open api/cfai.js for backend prompt and routing behavior.
4. Open src/lib/nightShiftRouter.ts for the router logic.
5. Open src/lib/cardoGuard.js for the decision gate.
6. Open src/lib/decisionStore.ts for the persistent CARDO trace store.
7. Open src/modules/rei/components/DecisionDetail.jsx for the audit report renderer.
8. Open src/modules/rei/components/DecisionFeed.jsx for the list/filter/export UI.
8. Run npm test and npm run build before claiming the work is verified.

## Update Policy

**When to update this document:**
- New major components added
- Architecture changes
- New entry points or workflows
- Changes to testing/verification approach
- Important dependency updates

**When NOT to update:**
- Minor bug fixes
- Small refactoring
- Documentation-only changes
- Routine maintenance

**Update format:** Keep it concise, organized, and focused on what future CLI agents need to know.

## Handling Mistakes

**Common mistakes to avoid:**
- Skipping the verification step (`npm test` and `npm run build`)
- Making changes without reading this document first
- Updating this document for trivial changes
- Not following the existing code patterns and entry points

**When you make a mistake:**
1. **Acknowledge it immediately** - Don't try to hide or work around errors
2. **Revert cleanly** - Use `git reset` or `git checkout` to undo problematic changes
3. **Understand the root cause** - Read the relevant code sections again
4. **Fix properly** - Make the correction following established patterns
5. **Re-verify** - Run the full test suite again
6. **Document if significant** - Update this reference if the mistake reveals a gap

**Example recovery workflow:**
```bash
# Oops, made a bad change
git status  # See what changed
git checkout -- path/to/problematic/file  # Revert the file
git reset  # If needed, reset staging

# Now do it right
# ... make proper changes ...
npm test  # Verify
npm run build  # Build check
```

**Remember:** Mistakes are expected. What matters is catching them early and fixing them properly.

## CLI Guidelines for This Session and Future Sessions

### Pre-work Checklist

Before starting ANY task:
1. ✅ Read this document (`docs/fortis-et-liber.md`) completely
2. ✅ Check `git log --oneline -10` to see recent work
3. ✅ Run `git status` to understand current state
4. ✅ Review `CLI_ENTRY.md` for quick reference and token goals
5. ✅ Read relevant entry point files (REI.jsx, api/cfai.js, etc.)

### During Work

**During Work**

**Code changes:**
- Follow existing patterns (no new architectures without discussion)
- Extract repeated logic into helper functions (like `buildDomainSystemMessage()`)
- Add error handling for user-facing features (like localStorage recovery)
- Use double quotes for strings (ESLint rule)
- Use 2-space indentation (ESLint rule)
- Update data catalogs (e.g., `data/fingerprints.json`) when routing behavior changes
- Update system prompts when decision logic is enhanced (with explicit guidance sections)

**Testing:**
- Write tests for new behavior (especially error cases and edge cases)
- Always run `npm test` before committing
- Target specific tests with `npm test -- --testPathPatterns="pattern"` for faster feedback
- Verify build passes: `npm run build`
- For routing changes, add integration tests in `nightShiftRouter.test.js`
- For decision logic changes, add scenario-based tests in `cardoGuard.test.js`

**Git hygiene:**
- Keep commits focused and descriptive
- Include what was changed and why (use clear bullet points in commit message)
- Reference specific files changed and lines affected
- Add `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>` trailer
- Example: "Fix all 4 flaws in pump maintenance scenario" with 4 detailed bullet points per flaw

### Updating This Document

Update `docs/fortis-et-liber.md` when:
- ✅ New major components or refactors are completed
- ✅ New test files or entry points are added
- ✅ Important dependency changes (e.g., ESLint downgrade)
- ✅ Architecture or workflow materially changes
- ✅ Verification steps or build process changes

Do NOT update when:
- ❌ Making minor bug fixes
- ❌ Small refactoring without architectural impact
- ❌ Adding documentation-only changes
- ❌ Fixing style or formatting

### Token Efficiency Discipline

**Goal: Keep onboarding under 12K tokens (88% savings from baseline 100K)**

To maintain this:
- Use the documented entry points, not exploratory search
- Follow the existing patterns instead of inventing new ones
- Verify with provided commands instead of running custom diagnostics
- Keep this document updated so next session doesn't need repeated exploration

**What this enables:**
- Faster handoffs between sessions
- More tokens for actual feature work
- Lower context switching overhead
- Better predictability for time estimates
