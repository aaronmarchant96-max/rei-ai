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

Repository: https://github.com/aaronmarchant96-max/rei-ai-platform

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

## Evidence and testing

Use Jest as the main evidence gate.

### Recent Fixes and Updates

**Adaptive Context Persistence / Hierarchical Context Memory (HCM) (2026-07-03):**
- **Issue Found**: Memory/storage constraints and corruption recovery on lightweight hardware.
- **Solution**: Replaced raw chat arrays with Hierarchical Context Memory (HCM). Prioritizes core identity, pinned facts, and summarizes oldest messages when size thresholds are breached.
- **Changes**:
  - `src/lib/persistentContextEngine.js` - Progressive compression, prioritizing pins, and structured summaries.
  - `src/lib/persistentContextEngine.test.js` - Strict testing for compression bounds, ranking, and recovery.
  - `src/REI.jsx` - Integrated HCM loaders and savers into domain-switching effects and message syncs.
  - `src/REI.test.jsx` - Refactored recovery tests to validate the new structured object persistence model.
- **Test coverage**: 67 tests passing (was 58)

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

- **Total tests**: 67 passing (all suites green, +9 from HCM work)
- **Key test files**:
  - `src/lib/persistentContextEngine.test.js` - Hierarchical memory compression and recovery checks (9 tests)
  - `src/lib/cardoGuard.test.js` - Core decision logic tests (16 tests including pump + SaaS scenarios)
  - `src/lib/nightShiftRouter.test.js` - Routing logic tests (11 tests including maintenance + architecture)
  - `src/CardoGuard.test.jsx` - UI component tests
  - `src/REI.test.jsx` - Chat persistence and error recovery
- **Build status**: ✅ Passing with warnings about chunk size
- **Production status**: ✅ Live demo verified accessible
- **Dependency status**: ESLint v8 configured with flat config, all React testing libraries installed

Common commands:

- `npm test` - Run full test suite
- `npm run build` - Production build
- `npm test -- --runInBand [specific-test-files]` - Targeted testing

The repo already contains tests for routing behavior, app-shell flow, and CARDO GUARD decision logic.

## Useful supporting docs

- README.md
- CASE_STUDY.md
- TOKEN_SAVERS.md
- DEVELOPMENT_SETUP.md
- docs/REI_VIBE_MASTER_INDEX_TEMPLATE.md

## Quick read order

1. Read this file first.
2. Open src/REI.jsx for the main experience.
3. Open api/cfai.js for backend prompt and routing behavior.
4. Open src/lib/nightShiftRouter.js for the router logic.
5. Open src/lib/cardoGuard.js for the decision gate.
6. Run npm test and npm run build before claiming the work is verified.

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
