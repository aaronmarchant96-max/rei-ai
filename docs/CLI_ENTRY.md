# CLI Entry Point — Fortis et Liber Principles:

1. **Leverage** - Focused entry points  
2. **Surface Area** - Minimal onboarding  
3. **Recoil** - Clear mistake recovery  
4. **Enumeration** - Explicit verification  
5. **Parity** - Balanced task coverage  
6. **Solvency** - Guaranteed completion  
7. **Conservation** - Token efficiency

## Read This First

**Token Goal:** Reduce onboarding from 100K → 12K tokens (88% savings).

**Rule:** If it's in this document, use it. If you need more, it's in the code comments or referenced files.

---

## What is debate-furnace?

This is the experiment repository for **PromptHound Labs** — an applied AI engineering lab. The lab explores how AI-assisted work should be done well via structured reasoning, adaptive model routing, and evidence-aware workflows. Every experiment has a structured report (Question → Hypothesis → Implementation → Measurements → Results → Limitations → Next Iteration).

The flagship experiment is **REI.ai**, a reasoning-first chat interface that applies the lab's methods in a live setting. It uses cost-aware routing (Night Shift), a deterministic decision gate (CARDO GUARD), and domain-specific reasoning modes.

- **Lab portfolio:** https://debate-furnace.vercel.app
- **Repo:** https://github.com/aaronmarchant96-max/rei-ai-platform
- **Lab reports:** `docs/experiments/`
- **Goal:** Build AI systems that are testable, reviewable, cost-conscious, and well-documented

---

## Key Files

| File | Purpose |
|------|---------|
| `src/REI.jsx` | Main chat experience, domain profiles, retry on fallback |
| `src/AppShell.jsx` | App navigation and tool routing |
| `api/cfai.js` | Backend route, **domain prompt resolution**, Groq/OpenAI routing |
| `api/lib/logger.js` | Structured JSON logger |
| `src/lib/nightShiftRouter.js` | Cost-aware routing, word-boundary matching, null-safe catalog |
| `src/lib/cardoGuard.js` | Decision gate (confidence bands, cost analysis) |
| `data/fingerprints.json` | Routing catalog (models, costs, quality gates) |

---

## Before You Ask AI

### 1. Check Deployment Status (0 tokens)
```bash
./scripts/verify-deploy.sh
```

### 2. Search Codebase (0 tokens)
```bash
# Find a pattern
rg "HARD STOP" src/ api/

# Check git history
git log --oneline -20
git show <commit>
```

### 3. Run Tests Locally (0 tokens)
```bash
npm run lint
npm test -- --testPathPattern=nightShift
npm run build
```

### 4. Grep for Answers (0 tokens)
```bash
# Find domain prompts (now in backend)
rg "DOMAIN_SYSTEM_PROMPTS" api/cfai.js

# Find routing rules
rg "buildRouterDecision" src/

# Find logger usage
rg "logger\." api/
```

---

## Common Tasks

### "I want to change the assistant prompt"
**File:** `api/cfai.js` → `DOMAIN_SYSTEM_PROMPTS`  
**Pattern:** Edit the prompt string for `assistant` directly  
**Verify:** `npm run lint && npm run build`

### "I want to understand the routing"
**File:** `src/lib/nightShiftRouter.js`  
**Check:** The comments at the top of `buildRouterDecision()`  
**Verify:** `npm test -- --testPathPattern=nightShift`

### "I want to add a new routing rule"
**File:** `data/fingerprints.json` or `src/lib/nightShiftRouter.js`  
**Pattern:** Add fingerprint → add rule → add test  
**Verify:** `npm test` (all tests pass)

### "I want to check token usage"
**Files:** Commit messages (check `git log --oneline`)  
**Pattern:** Commits track `token impact: low|medium|high`  
**Check:** Recent commits show the pattern of work

---

## Verification Checklist

Run these before claiming a task is done:

```bash
# Lint
npm run lint
# ✅ No errors

# Build
npm run build
# ✅ Produces dist/

# Test
npm test -- --runInBand
# ✅ All tests pass (or document why a test fails)

# Deploy check (if pushing)
./scripts/verify-deploy.sh
# ✅ Shows site is live
```

---

## Mistake Recovery

### "I edited something and now tests fail"
```bash
git diff src/REI.jsx
# Review what changed
git checkout src/REI.jsx
# Revert
# Try again with smaller, more focused change
```

### "The app won't build"
```bash
npm run build 2>&1 | head -20
# Read the error carefully
# Usually: missing import, syntax error, or circular dependency
git log --oneline -5
# Check what the last commits changed
```

### "I don't know where to make a change"
```bash
rg "pattern_i_am_looking_for" src/ api/
# Find the exact file and line
# Open it and read the surrounding code + comments
# If still unclear, ask AI with the file excerpt
```

---

## Token-Efficient Requests

### ✅ DO (Cheap)
- "Edit line 657 in src/REI.jsx: change X to Y"
- "Add a test for nightShiftRouter.js covering case X"
- "Show me the git diff for the routing changes"

### ❌ AVOID (Expensive)
- "Explain the whole codebase"
- "How do I deploy?" (use verify-deploy.sh)
- "Review all my tests" (run them locally first)
- "Write me a tutorial on the system"

---

## References

- **TOKEN_SAVERS.md** — Workflow optimization guide
- **handoff.md** — Current state and blockers
- **docs/fortis-et-liber.md** — Full CLI reference (if you need more detail)
- **CASE_STUDY.md** — How the system was built and why

---

**Last Updated:** 2026-07-01  
**Token Target:** 12K for full onboarding  
**Status:** Active (use this document first, every time)
