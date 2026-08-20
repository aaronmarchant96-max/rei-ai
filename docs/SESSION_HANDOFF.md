---
status: historical
authority_scope: none
owner: Aaron Marchant
last_verified: null
verified_against_commit: null
claims_source: docs/CLAIM_LEDGER.md
supersedes: []
superseded_by: docs/PORTFOLIO_OVERVIEW.md
archived_at: 2026-08-20
---

> ⚠️ **HISTORICAL DOCUMENT — POINT-IN-TIME SESSION SNAPSHOT (August 14, 2026)**  
> *This document preserves intermediate session state (684 tests). For current canonical architecture, testing strategy, and verified metrics, see [`docs/PORTFOLIO_OVERVIEW.md`](PORTFOLIO_OVERVIEW.md) and [`src/data/claims.json`](../src/data/claims.json).*

# Archived Session Handoff — 2026-08-14

- **Branch:** `main` at `725c71f`
- **Repo (GitHub):** https://github.com/aaronmarchant96-max/rei-ai
- **Repo (GitLab Mirror):** https://gitlab.com/prompthound-labs-group/rei-ai
- **Directory:** `/home/potatoking/rei-ai`
- **Production URL:** `https://prompthound-labs.vercel.app`

## Verification & Claim Baseline

- **Tests:** 684 unit tests / 58 suites passing 100% green (`npm test`)
- **Claims Verification:** `node scripts/gen-claims.mjs --check` (Synced & passing)
- **Cache Hit Rate:** 97.35% measured (Jul 16–Aug 14) / 97.67% (Jul 12–Aug 10)
- **Total Build Cost:** ~$22–$23 across 684 tests & 22k lines of code
- **Build:** `npm run build` passing cleanly
- **TypeScript:** `npx tsc --noEmit` clean

## Recent Milestone Achievements

1. **Phase 1 Pilot Evaluator Engine (`pilotEval.ts`, `run-pilot.mjs`):**
   - Replays customer transaction logs against REI router.
   - Outputs honest cost/quality report (+92.9% cheap route savings, 83.1% pooled savings, -19% quality-preservation escalation).
2. **Red Team Security UI & Corpus (`f08c916`):**
   - In-browser D1 security firewall with Base64 auto-decode and educational-framing mitigation.
   - 10-case regression suite (17 tests).
3. **Measurement Contamination Resolution (Incident #001):**
   - Fixed phantom Fact Check route & stale label maps (`evalLabelMap.js`, `validate-eval-integrity.mjs`).
   - Accuracy verified at 90-96% with auditable denominator.
4. **Token Economics & Caching Thesis (`TOKEN_SAVERS.md`):**
   - "The model is cheap; context is what you pay for."
   - 4-habit model: Freeze prefix, compress history, grep symbol lines, machine verification ($0 tests).

## Key System Architecture

```text
Incoming Prompt ──> [ Layer 1: Hinge Classifier ] ──> [ Layer 2: Decision Cascade ] ──> Target Route
                        ├── ECS (Text Complexity)          ├── 1. empty / greeting
                        ├── DAS (Shannon Entropy)          ├── 2. meta-query
                        └── APS (Adversarial Scanner)      ├── 3. self-evaluation / adversarial
                                                           └── 4. domain match / fallback
```

* **Fast Path Model:** `deepseek-v4-flash`
* **Reasoning Model:** `openrouter/deepseek/deepseek-r1` / `deepseek/deepseek-r1`

---

## Instructions for Fresh Session Resume

1. **Start fresh sessions frequently** — long conversations (3,000+ messages) cause browser DOM and Bun event loop freeze (`MaxListenersExceededWarning`).
2. **The instruction prefix is frozen:** OpenCode automatically loads `AGENTS.md`, `TOKEN_SAVERS.md`, and `SESSION_HANDOFF.md`, so 97%+ of input tokens hit DeepSeek's prompt cache instantly.
3. **Verify state locally:** Run `npm test` and `node scripts/gen-claims.mjs --check`.
