# REI_VIBE_MASTER_INDEX.md — Template Structure
**Purpose:** Single source of truth for all REI.AI, CARDO REI, Vibe handoff, battle arena contexts, and Night Shift / REI Fingerprint Router system. Prevents redundant token spend across sessions.

> **💡 USE THIS FIRST:** Before reading any individual file or starting any session, check this index. If the info is here, reference it instead of re-reading source files.

---

## 🎯 QUICK START (30 Seconds)

**What are you looking for?**

| Need | Go To | Key Files |
|------|-------|-----------|
| CARDO REI methodology | [Methodology](#-methodology) | `PROMPTHOUND-DOCS/CARDO-REI.md` |
| Battle Arena contexts | [Battle Arena](#-battle-arena-contexts) | `PROMPTHOUND-DOCS/PROJECTS/` |
| REI app surface | [REI Source](#-rei-app-surface) | `debate-furnace/src/REI.jsx` |
| Night Shift / Fingerprint Router | [Night Shift](#-night-shift--rei-fingerprint-router) | `debate-furnace/docs/groq_router_v2_plan.md` |
| Handoff from last session | [Handoff](#-handoff-documents) | `PROMPTHOUND-DOCS/AGY_HANDOFF_*.md` |
| Deployment | [Deployment](#-deployment) | `PROMPTHOUND-DOCS/DEPLOYMENT_VERIFICATION.md` |

---

## 🧠 METHODOLOGY *(Core Framework)*

### CARDO REI
- **File:** `PROMPTHOUND-DOCS/CARDO-REI.md`
- **Purpose:** 8-step reasoning framework
- **Steps:** Collect → Analyze → Record → Distinguish → Organize → Review → Evaluate → Iterate
- **Confidence Tiers:** 🟢 Primary Source | 🔵 Strong Evidence | 🟠 Needs Review | 🟡 Family Memory | ⚪ Unverified
- **Key Principle:** Find the hinge — the single point of pivot that changes the answer

### Token Efficiency
- **File:** `docs/TOKEN_SAVERS.md`
- **Purpose:** Minimize token spend across sessions
- **Tools:** `scripts/verify-deploy.sh`, `.git/hooks/pre-commit`
- **Rule:** Always check this index before reading source files

### Token Optimization Tips
| Anti-Pattern | Token Cost | Fix |
|-------------|------------|-----|
| "Explain my codebase" | ~2000 | Reference this index + specific file |
| "How do I deploy?" | ~500 | Run `./scripts/verify-deploy.sh` |
| "Review all my tests" | ~1500 | Run `npm test` locally first |
| "Write a tutorial" | ~3000 | Use existing docs in PROMPTHOUND-DOCS/ |
| Vague requests | ~1000+ | Use CARDO REI: Hinge + Facts + Move |

**Weekly Token Savings Estimate:** 5000-10000 tokens

---

## 🎮 BATTLE ARENA CONTEXTS *(Competitive Testing)*

### Active Arenas
| Arena | Purpose | Status | Key Files |
|-------|---------|--------|-----------|
| **Hinge Finder** | Coding logic, STOP rule enforcement | ✅ Active | `src/REI.jsx:658-` |
| **Generalist** | Everyday reasoning, decision support | ✅ Active | `src/REI.jsx:655-` |
| **Archivist** | Genealogy, evidence-tiered | ✅ Active | `src/REI.jsx:661-` |
| **Storyteller** | Narrative architecture | ✅ Active | `src/REI.jsx:669-` |

### Arena Specifications
| Arena | Input Type | Expected Output | Validation Method | Token Budget |
|-------|------------|----------------|------------------|--------------|
| Hinge Finder | Underspecified coding request | STOP: Request underspecified + questions | No code snippets, questions only | 50-200 |
| Generalist | Any non-greeting query | Hinge + Facts + Assumptions + Move | Contains all 4 elements | 100-400 |
| Archivist | Genealogy record | Tiered evidence (🟢🔵🟠🟡) | All claims have explicit tier | 200-800 |
| Storyteller | Narrative prompt | Character driver hinges | Clear structural timeline | 150-600 |

### Battle Test Cases
**Hinge Finder:**
- Input: "Write a Python function to sort a list"
- Expected: STOP response with 3+ unanswerable questions
- Fail: Any code generation

**Generalist:**
- Input: "Should I switch jobs?"
- Expected: Hinge (career decision) + Facts (current role, market) + Assumptions (financial stability) + Move (list pros/cons)
- Fail: Generic advice without structure

**Archivist:**
- Input: "Charles Dyer served in 12th Virginia Regiment"
- Expected: 🟢 Primary Source citation + cross-reference to verified profile
- Fail: Unverified claim without tier

**Storyteller:**
- Input: "Character wants revenge but fears isolation"
- Expected: Driver hinge (fear of isolation vs. desire for justice) + narrative structure
- Fail: Cliché tropes without driver analysis

### Battle Rules
1. **No Assumptions:** If 2+ Phase 0 questions unanswerable → STOP
2. **No Hedge:** Facts section contains NO "maybe/probably/might"
3. **No Silence:** Every claim has explicit source or uncertainty flag
4. **No Bloat:** Responses ≤ max token budget for arena
5. **No Escape:** All validation methods must pass before response accepted

---

## 📱 MOBILE-FIRST REDESIGN *(Priority: High)*

### Core Philosophy
- **Design for 360-428px width** (most phones)
- **Mobile-first:** Design mobile, then scale up
- **Vertical flow:** Stack elements, avoid side-by-side
- **Breathing room:** Generous padding on mobile

### Global Styles (CSS)
```css
/* globals.css or equivalent */
@layer base {
  html {
    scroll-behavior: smooth;
  }
  
  .mobile-container {
    max-width: 428px;
    margin-left: auto;
    margin-right: auto;
    min-height: 100dvh; /* dynamic viewport height */
    display: flex;
    flex-direction: column;
  }
  
  /* Safe Area Support */
  .safe-area {
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
    padding-left: env(safe-area-inset-left);
    padding-right: env(safe-area-inset-right);
  }
  
  .safe-top { padding-top: env(safe-area-inset-top); }
  .safe-bottom { padding-bottom: env(safe-area-inset-bottom); }
  
  /* Dynamic Viewport Height */
  .h-dvh { height: 100dvh; }
}
```

### Layout Structure
```tsx
// Recommended structure for REI.jsx
<div className="mobile-container bg-[#1a120b] text-white">
  {/* Sticky Header - Safe Top */}
  <header className="safe-top sticky top-0 z-50 bg-[#2c1f14] border-b border-amber-950 px-4 py-3 flex items-center justify-between">
    <button className="p-2 -ml-2">☰</button>
    <div className="text-lg font-medium">PromptHound Labs</div>
    <div></div>
  </header>

  {/* Scrollable Main Content */}
  <main className="flex-1 overflow-y-auto pb-32 px-4 space-y-6">
    {/* Persona Selection */}
    <div className="pt-4">
      <div className="grid grid-cols-1 gap-3">
        {/* Persona cards - full-width on mobile */}
      </div>
    </div>

    {/* Active Voice Section */}
    <div className="bg-[#2c1f14] rounded-3xl p-5 border border-amber-900">
      {/* Mode + Voice cues */}
    </div>

    {/* Process Loop Buttons */}
    <div className="grid grid-cols-3 gap-2.5">
      {["Collect", "Analyze", "Record", "Distinguish", "Organize", "Review", "Evaluate", "Iterate"].map(b => (
        <button key={b} className="bg-[#3a2a1f] hover:bg-[#4a3a2f] active:bg-amber-900 py-4 rounded-2xl text-xs font-medium tracking-wider transition-all">
          {b}
        </button>
      ))}
    </div>

    {/* Chat Messages */}
    <div className="space-y-4">
      {/* Messages */}
    </div>
  </main>

  {/* Fixed Input Area - Safe Bottom */}
  <div className="fixed bottom-0 left-0 right-0 bg-[#1a120b] border-t border-amber-900 safe-bottom">
    <div className="max-w-md mx-auto px-4 py-4">
      <div className="flex gap-2">
        {/* Input + Send */}
      </div>
    </div>
  </div>
</div>
```

### Specific Improvements
| Element | Current | Mobile-First |
|---------|---------|---------------|
| Typography | px units | `text-sm` or `text-[15px]` + `leading-relaxed` |
| Buttons | Various sizes | Minimum 48px tap height (`py-4`) |
| Cards | Varied radius | `rounded-3xl` + soft shadows |
| Colors | Good contrast | Maintain warm brown/orange palette |

### Keyboard Handling
- Use `pb-32` on main content + fixed input
- Prevents messages hiding behind keyboard
- Input auto-focus scrolling implemented

### Quick Wins Implemented
- [x] `.mobile-container` wrapper
- [x] Sticky header with safe area
- [x] Scrollable main with bottom padding
- [x] Fixed input area
- [x] Grid layouts for personas and buttons
- [x] Safe area insets
- [x] Dynamic viewport height (`100dvh`)

### Status
- **Design:** Complete
- **Implementation:** Phase 0-1 complete (foundation + critical)
- **Testing:** Pending mobile device verification
- **Next:** Phase 2 (High Priority) - Polish

---

## 🤖 NIGHT SHIFT / REI FINGERPRINT ROUTER *(Cost-Efficient Routing)*

### Architecture
- **Purpose:** Job-aware, cost-efficient model routing
- **File:** `debate-furnace/docs/groq_router_v2_plan.md`
- **Principle:** Route each job to the optimal model based on complexity, not default

### Model Fingerprints
| Job Type | Model | Token Cost/1K | Quality Gate | Avg Response Tokens |
|----------|-------|---------------|--------------|---------------------|
| Simple greeting | llama-3.1-8b-instant | ~0.3 | Single sentence + invitation | 10-30 |
| Structured reasoning | llama-3.3-70b-versatile | ~1.0 | Hinge + Facts + Move | 100-400 |
| Complex code | llama-3.3-70b-versatile | ~1.0 | Phase 0 + HARD STOP | 200-600 |
| Genealogy deep dive | llama-3.3-70b-versatile | ~1.0 | Evidence tiers + citations | 300-800 |
| Adversarial test | gpt-4o | ~5.0 | Red-team validation | 500-1500 |

### Routing Logic (Pseudocode)
```javascript
function routeJob(job) {
  // Rule 1: Greetings - fast, cheap
  if (isGreeting(job.input)) {
    return { model: "llama-3.1-8b-instant", maxTokens: 50 };
  }
  
  // Rule 2: Coding with underspec - needs HARD STOP enforcement
  if (job.domain === "coding" && !canAnswerPhase0(job.input)) {
    return { model: "llama-3.3-70b-versatile", maxTokens: 200, enforce: "HARD_STOP" };
  }
  
  // Rule 3: Genealogy with claims - needs evidence tiers
  if (job.domain === "genealogy" && hasArchivalClaims(job.input)) {
    return { model: "llama-3.3-70b-versatile", maxTokens: 800, enforce: "EVIDENCE_TIERS" };
  }
  
  // Rule 4: Adversarial - high cost, high value
  if (job.requiresAdversarial) {
    return { model: "gpt-4o", maxTokens: 1500, enforce: "RED_TEAM" };
  }
  
  // Default: Structured reasoning
  return { model: "llama-3.3-70b-versatile", maxTokens: 400 };
}
```

### Fingerprint Database Schema
```typescript
interface Fingerprint {
  jobType: string;           // e.g., "coding_underspecified"
  model: string;             // e.g., "llama-3.3-70b-versatile"
  avgInputTokens: number;
  avgOutputTokens: number;
  successRate: number;       // 0-1, from battle history
  lastUpdated: Date;
  qualityScore: number;      // 0-100, methodology compliance
}
```

### Battle History Integration
- **Fingerprint DB Location:** `debate-furnace/data/fingerprints.json`
- **Learning Loop:** 
  - Run weekly: `npm run update-fingerprints`
  - Pulls last 1000 battles from production
  - Updates successRate and qualityScore per job type
  - Flags fingerprints with qualityScore < 80 for review
- **Fallback Chain:** 
  1. Try primary model
  2. If unavailable → next tier up with `+50% cost warning`
  3. If all unavailable → reject with "Models unavailable, retry later"
- **Cost Tracking:** Logs to `data/token-usage.log` with jobType, model, tokensIn, tokensOut, timestamp

---

## ✅ VALIDATION & TESTING

### Automated Validation Scripts
| Script | Purpose | Run Command |
|--------|---------|-------------|
| `scripts/validate-battle-arena.sh` | Run all battle test cases | `./scripts/validate-battle-arena.sh` |
| `scripts/validate-fingerprints.sh` | Verify fingerprint DB integrity | `./scripts/validate-fingerprints.sh` |
| `scripts/token-audit.sh` | Weekly token usage report | `./scripts/token-audit.sh` |

### Test Suite (72 tests, 12 suites)
| Test File | Tests | What It Covers |
|-----------|-------|----------------|
| `src/lib/nightShiftRouter.test.js` | 15+ | Routing edge cases: empty input, null domain, keyword routing, substring non-match, stored preference, adversarial flag, domain override |
| `api/cfai.test.js` | 8 | Domain prompt resolution, input length guard, Groq retry, GET/POST/405 routing, missing-key response |
| `src/AppShell.test.jsx` | 7 | Tool navigation, hash routing, breadcrumb, lazy-loaded tool rendering |
| `src/REI.test.jsx` | — | REI chat component behavior |
| Remaining suites | — | CardoGuard, CreativeEngine, DebateFurnace, ToolsLanding, tracepoint, cardoGuardChecklist, loadSeedLibrary |

### Run Commands
```bash
# All tests
npm test

# Single test file
npx jest src/lib/nightShiftRouter.test.js

# Test with pattern
npx jest --testNamePattern="router"

# Watch mode
npm run test:watch
```

### Quality Gates
1. **Methodology Compliance:** ≥90% of responses contain Hinge + Facts + Move
2. **STOP Rule Enforcement:** 100% of underspecified coding requests trigger STOP
3. **Evidence Tiers:** 100% of genealogy claims have explicit 🟢🔵🟠🟡 tier
4. **Token Efficiency:** Average response ≤ token budget for arena
5. **Build Size:** No chunk >500 kB (current max: 339 kB)

---

## 🏗️ REI APP SURFACE *(Verified)*

### Current State
- **Repo:** `aaronmarchant96-max/debate-furnace`
- **Live:** https://debate-furnace.vercel.app
- **Entry:** `src/AppShell.jsx` (navigation), `src/REI.jsx` (chat)

### Personas (Live in Code)
| Persona | ID | Description | Domain |
|---------|-----|-------------|--------|
| The Generalist | assistant | Everyday reasoning, judgment, decision support | Conversation |
| The Hinge Finder | coding | Senior coding logic, STOP rule enforcement | Code |
| The Archivist | genealogy | Evidence-tiered genealogy | Research |
| The Storyteller | story | Narrative architecture | Creativity |

### Key Components
- **Domain Selector:** 4 personas, active badge, descriptions
- **Chat UI:** Message bubbles, copy button, timestamps, sender labels
- **System Prompts:** Domain-specific, CARDO REI compliant (stored in `api/cfai.js`)
- **Record Ingest:** Archivist only, 12000 char limit, source type selection
- **Code-Splitting:** All 7 tools (`AppShell.jsx`) use `React.lazy()` + `<Suspense>` — initial chunk 339 kB, largest secondary 197 kB

### Build Output (Post-Sprint)
| Chunk | Size (gzip) |
|-------|-------------|
| `index-*.js` (shell + React) | 339 kB (103 kB) |
| `DebateFurnace-*.js` | 197 kB (56 kB) |
| `Tracepoint-*.js` | 95 kB (17 kB) |
| `CreativeEngine-*.js` | 92 kB (19 kB) |
| `REI-*.js` | 57 kB (14 kB) |
| `StormReplay-*.js` | 38 kB (6 kB) |
| `CardoGuard-*.js` | 28 kB (5 kB) |
| `ToolsLanding-*.js` | 4 kB (1 kB) |

---

## 🚀 DEPLOYMENT

### Official Deployment
- **URL:** https://debate-furnace.vercel.app
- **Repository:** https://github.com/aaronmarchant96-max/debate-furnace
- **API:** https://debate-furnace.vercel.app/api/cfai
- **Vercel Project:** debate-furnace (team: prompthound-s-projects)

### Verification Checklist
1. ✅ Site returns HTTP/2 200
2. ✅ API /api/cfai returns success: true
3. ✅ Git remote = origin https://github.com/aaronmarchant96-max/debate-furnace
4. ✅ Vercel project = debate-furnace
5. ✅ Last-modified header ≥ your commit timestamp

### Local Verification
```bash
# Check deployment status
./scripts/verify-deploy.sh

# Test API
curl -s -X POST https://debate-furnace.vercel.app/api/cfai \
  -H "Content-Type: application/json" \
  -d '{"input":"test"}' | jq -r '.success'

# Quick battle validation
npm run validate:battle

# Token usage report
npm run token-audit

# Verify all pre-commit hooks
./scripts/test-hooks.sh
```

---

## 🔗 CROSS-REFERENCE MAP

### If You Need To...
| Action | File | Section |
|--------|------|---------|
| Understand CARDO REI steps | `CARDO-REI.md` | Steps 1-8 |
| Find deployment issues | `DEPLOYMENT_VERIFICATION.md` | Verification Checklist |
| See battle test cases | This file | Battle Arena Contexts |
| Configure model routing | `groq_router_v2_plan.md` | Routing Logic |
| Add new domain prompt | `api/cfai.js` | `DOMAIN_SYSTEM_PROMPTS` |
| Edit persona profiles | `src/REI.jsx` | `DOMAIN_PROFILES` |
| Run CI/CD | `.github/workflows/ci.yml` | N/A |
| Check logs | `api/lib/logger.js` | `LOG_LEVEL` env |
| Read router tests | `src/lib/nightShiftRouter.test.js` | Edge cases |
| Read API integration tests | `api/cfai.test.js` | Full-route tests |
| Update fingerprints | `data/fingerprints.json` | N/A |
| Check token usage | `data/token-usage.log` | N/A |

---

## 📁 FILE INVENTORY *(By Category)*

### Methodology
| File | Purpose | Status |
|------|---------|--------|
| `PROMPTHOUND-DOCS/CARDO-REI.md` | 8-step framework | ✅ |
| `PROMPTHOUND-DOCS/CLI-HANDBOOK.md` | CLI workflow | ✅ |
| `TOKEN_SAVERS.md` | Token optimization guide | ✅ |
| `docs/GRANT_APPENDIX.md` | Sprint case study (2026-07-03) | ✅ New |

### REI App
| File | Purpose | Status |
|------|---------|--------|
| `debate-furnace/src/REI.jsx` | Main chat component (prompt strings removed) | ✅ |
| `debate-furnace/src/AppShell.jsx` | Navigation, now lazy-loads all tools | ✅ Updated |
| `debate-furnace/api/cfai.js` | Backend route + domain prompt owner | ✅ Updated |
| `debate-furnace/api/lib/logger.js` | Structured JSON logger | ✅ New |
| `debate-furnace/api/cfai.test.js` | Integration tests (8) | ✅ New |

### Night Shift / Router
| File | Purpose | Status |
|------|---------|--------|
| `debate-furnace/docs/groq_router_v2_plan.md` | Routing spec | ✅ |
| `debate-furnace/docs/rei_platform_map.md` | Platform architecture | ✅ |
| `debate-furnace/src/lib/nightShiftRouter.js` | Word-boundary matching, null-safe | ✅ Updated |
| `debate-furnace/src/lib/nightShiftRouter.test.js` | Edge case tests (9 added) | ✅ Updated |

### CI/CD
| File | Purpose | Status |
|------|---------|--------|
| `.github/workflows/ci.yml` | Test + build on push/PR to main | ✅ New |

---

## 📊 CURRENT STATE SUMMARY *(As of July 3, 2026)*

### ✅ What's Done
- 4 REI personas live in code and UI
- HARD STOP RULE enforced in coding domain
- Phase 0 questions integrated into coding prompt
- Token-saving tools deployed (verify-deploy.sh, pre-commit hooks)
- Battle arena contexts defined for each persona
- **Chat history persistence fixed** — no longer wiped on mount (`src/REI.jsx`)
- **Prompt deduplication** — all 4 domain prompts moved to `api/cfai.js DOMAIN_SYSTEM_PROMPTS`
- **Router hardened** — word-boundary matching, null-safe catalog lookups, 9 edge case tests
- **Error recovery** — categorized errors (Network/Server) + Retry button restores input
- **Observability** — structured JSON logger (`api/lib/logger.js`, `LOG_LEVEL` env)
- **Accessibility** — `role="log"`, `aria-live="polite"`, `aria-modal`, `aria-pressed`
- **CI/CD** — `.github/workflows/ci.yml` (test + build on push/PR to main)
- **JSDoc types** — added to `nightShiftRouter.js` and `cardoGuard.js`
- **+17 tests** (55→72, 10→12 suites): 9 router edge cases + 8 API integration tests
- **Code-splitting** — all 7 tools switched to `React.lazy()`; initial bundle **849 kB → 339 kB (−60%)**
- **Dead code removed** — unused `MAX_MOBILE_TOKENS`, `assistantQuickPrompt`, shadowed variables

### 🎯 What's Next
- [ ] Review live performance of domain prompt resolution on deployment
- [ ] Refine system prompt profiles if requested
- [ ] Consider dynamic import() for further code-splitting (build clean, no remaining chunk warnings)
- [ ] State management extraction (custom hooks) — deferred, needs hook-level test harness

### ⚠️ Blockers
- ESLint v10 requires flat config (eslint.config.js) but project has `.eslintrc.json` — pre-existing, not a regression

### 🤖 Automation
- **On push/PR to main:** `npm test` + `npm run build` via GitHub Actions
- **On commit:** Pre-commit hooks block secrets
- **On deploy:** Auto-verify deployment status
- **Test count:** 72 tests, 12 suites — all passing

---

## 🔄 UPDATE LOG

| Date | Update | Author |
|------|--------|--------|
| 2026-06-29 | Created template structure | Vibe |
| 2026-06-29 | Added Battle Arena contexts | Vibe |
| 2026-06-29 | Added Night Shift / Fingerprint Router | Vibe |
| 2026-06-29 | Enhanced with validation, testing, glossary | Vibe |
| 2026-07-03 | Sprint: bugfixes, prompt dedup, router hardening, +17 tests, code-splitting (−60% bundle), CI/CD, observability, accessibility, JSDoc types. See `docs/GRANT_APPENDIX.md` | OpenCode + User |

---

## 📖 GLOSSARY

| Term | Definition | Source |
|------|------------|--------|
| **Hinge** | The single point of pivot that changes the answer | CARDO-REI.md |
| **Battle Arena** | Competitive testing environment for personas | This file |
| **Fingerprint** | Job type → model → performance mapping | groq_router_v2_plan.md |
| **Phase 0** | Pre-code questioning stance (7 questions) | api/cfai.js |
| **HARD STOP** | Non-negotiable rule: stop and ask questions | api/cfai.js |
| **Evidence Tiers** | 🟢 Primary, 🔵 Strong, 🟠 Needs Review, 🟡 Family Memory, ⚪ Unverified | CARDO-REI.md |
| **Token Budget** | Max tokens allowed per arena response | This file |

---

**Last Updated:** July 3, 2026  
**Status:** Live — current state of REI.ai platform  
**Next Review:** After next sprint or major architectural change  

> **Grant Appendix:** See `docs/GRANT_APPENDIX.md` for the full sprint case study — a textbook example of modern, AI-assisted, cost-aware engineering.
