# CLI Reference for REI workspace

> **UPDATED FOR TOKEN EFFICIENCY:** See `CLI_ENTRY.md` as your first read. Use this file for detailed reference after you've read the entry point.

**IMPORTANT: This document is the authoritative reference for all CLI agents working on this project. Every CLI session MUST read and follow this document first.**

This file is a compact handoff document for future CLI sessions. It gathers the repo context, entry points, and verification steps in one place so you do not need to read many files first.

## For CLI Agents

1. **READ THIS FIRST**: Before making changes or exploring the codebase, read this entire document.
2. **FOLLOW THE STRUCTURE**: Use the documented entry points and patterns instead of inventing a new flow.
3. **UPDATE RESPONSIBLY**: Keep this document current when the architecture or workflow materially changes.
4. **VERIFY BEFORE CLAIMING COMPLETION**: Run the verification commands listed below before you call work done.

### Efficiency Notes

- The goal is to reduce onboarding cost and keep agent sessions focused on implementation rather than rediscovery.
- The repo already has a structured shell, explicit router logic, and deterministic guardrails; use them rather than adding ad hoc behavior.
- Keep changes small, testable, and aligned with the existing architecture.

## Repo purpose

REI.ai is a reasoning-first web app for structured decision support. The repo combines a flagship REI experience with a broader multi-tool platform that includes Debate Furnace, Story Forge, Storm Replay, CARDO GUARD, and Tracepoint.

Live demo: https://debate-furnace.vercel.app/#rei
- **Status**: ✅ Verified accessible (2026-07-01)
- **Purpose**: Production deployment of the REI.ai reasoning platform

Repository: https://github.com/aaronmarchant96-max/rei-ai-platform

Current local state in this session:
- Branch: `main`
- Test count: **72 tests, 12 suites** (all passing)
- Build: `npm run build` produces `dist/`

## Main entry points

- `src/AppShell.jsx`: top-level app shell, tool routing, and navigation state
- `src/REI.jsx`: flagship REI reasoning experience
- `src/CardoGuard.jsx`: CARDO GUARD UI and explanation rendering
- `src/DebateFurnace.jsx`, `src/CreativeEngine.jsx`, `src/StormReplay.jsx`, `src/Tracepoint.jsx`: additional tools in the shell
- `api/cfai.js`: backend route, **domain prompt resolution** (prompts live here, not in frontend), and Groq/OpenAI routing
- `api/lib/logger.js`: structured JSON logger (debug/info/warn/error, controlled by `LOG_LEVEL`)
- `src/lib/nightShiftRouter.js`: Night Shift routing logic, word-boundary matching, null-safe catalog lookups
- `src/lib/cardoGuard.js`: deterministic cost/risk decision logic
- `data/fingerprints.json`: routing catalog and model-selection metadata
- `scripts/validate-app-shell.mjs`, `scripts/validate-inspiration-seeds.mjs`: local validation helpers

## Important architecture notes

- The Night Shift router is explicit and deterministic. It routes before the model call using a fingerprint catalog and small lexical heuristics. Catalog lookups return `null` on miss (no silent fallback). Lexical matching uses word boundaries — `"uncertain"` does not match `"uncertainty"`.
- All four domain prompts (assistant, coding, genealogy, story) live in `api/cfai.js` under `DOMAIN_SYSTEM_PROMPTS`. The frontend sends only the domain ID. To change a prompt, edit `DOMAIN_SYSTEM_PROMPTS` in `api/cfai.js` — not in `src/REI.jsx`.
- The backend prompt scaffolding in `api/cfai.js` uses a hard-stop rule for underspecified requests. Instead of guessing, it asks for the missing context. Retry logic handles transient Groq rate limits (429/5xx) with up to 2 retries.
- CARDO GUARD evaluates whether acting is worth the cost by comparing expected action waste against expected miss loss, using confidence and false-alarm assumptions.
- The app shell keeps the experience structured and reviewable rather than burying everything inside one chat flow. REI persists chat history per domain in localStorage.
- Error fallbacks categorize failures as "Network error" or "Server error" with a Retry button that restores the user's original input.
- The repo is built around testable behavior: routing, shell flow, and decision logic all have explicit checks. CI pipeline (`.github/workflows/ci.yml`) runs tests and build on push/PR.

## Evidence and testing

Use Jest for behavioral verification and Vite for the build.

Common commands:
- `npm test` - run the full Jest suite
- `npm run build` - production build
- `npm run lint` - ESLint pass over the JS/JSX code
- `npm run app:validate` - validate the app-shell wiring
- `npm run seeds:validate` - validate inspiration-seed data
- `npm run dev:full` - run the local server and Vite dev server together

Key test coverage areas:
- `src/lib/nightShiftRouter.test.js` - routing decisions, fallback logic, edge cases (empty input, null domain, keyword boundaries, stored preference)
- `src/lib/cardoGuard.test.js` - core decision-gate logic, boundary bands, zero-cost edge cases
- `src/CardoGuard.test.jsx` - UI rendering and confidence-band behavior
- `api/cfai.test.js` - integration tests for domain prompt resolution, input validation, Groq retry, GET/POST routing

## Useful supporting docs

- `README.md`
- `CASE_STUDY.md`
- `TOKEN_SAVERS.md`
- `DEVELOPMENT_SETUP.md`
- `docs/REI_VIBE_MASTER_INDEX_TEMPLATE.md`

## Quick read order

1. Read this file first.
2. Open `src/AppShell.jsx` for the tool-router shell.
3. Open `src/REI.jsx` for the flagship REI experience.
4. Open `api/cfai.js` for backend prompt and routing behavior.
5. Open `src/lib/nightShiftRouter.js` and `src/lib/cardoGuard.js` for the decision core.
6. Run verification commands before claiming the work is complete.

## Update Policy

**When to update this document:**
- New major components or tools are added
- Architecture changes affect routing, prompts, or app-shell behavior
- New verification workflows or entry points are introduced
- Important dependency or deployment changes occur

**When NOT to update:**
- Minor bug fixes
- Small refactors
- Documentation-only changes that do not affect workflow

## Handling Mistakes

**Common mistakes to avoid:**
- Skipping verification (`npm test`, `npm run build`, or relevant validation commands)
- Making changes without reading this document first
- Adding behavior that bypasses the existing router or guard logic
- Assuming API or file structure details without checking the source

**When you make a mistake:**
1. Acknowledge it immediately.
2. Revert or cleanly undo the problematic change.
3. Read the relevant source again to find the root cause.
4. Fix it using the established patterns.
5. Re-run verification.
6. Update this reference if the mistake reveals a workflow gap.
