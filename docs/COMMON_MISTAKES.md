# Common Mistakes & Quick Fixes

> **Purpose:** Reduce token spend on troubleshooting by providing self-service answers.
> **Estimated savings:** 1000+ tokens per session by preventing backtracking.

---

## 🚨 Deployment Issues

| Symptom | Likely Cause | Quick Fix | Verification |
|---------|--------------|-----------|--------------|
| Vercel deploy fails with "No such file" | Missing `dist` directory | Run `npm run build` locally first | `ls -la dist/` |
| Vercel deploy succeeds but site is blank | React build error | Check `npm run build` output | `npm run build` |
| Groq API 429 error | Rate limit | Wait 60s, then retry | `sleep 60 && curl ...` |
| OpenAI API 401 error | Invalid/expired API key | Check `.env` for `OPENAI_API_KEY` | `echo $OPENAI_API_KEY` |
| API key not loading | `.env` not in Vercel | Add to Vercel dashboard | Check Vercel env vars |

---

## 🔧 Build & Lint Issues

| Symptom | Likely Cause | Quick Fix | Verification |
|---------|--------------|-----------|--------------|
| `npm run build` fails | Syntax error or missing dependency | Run `npm install && npm run lint` | Fix lint errors |
| ESLint errors | Code style violations | Run `npm run lint:fix` | `npm run lint` passes |
| Jest tests fail | Test assertion failure | Run `npm test` to see which | Fix failing test |
| "Cannot find module" | Missing import | Run `npm install` | Module appears in node_modules |
| Circular dependency | Import loop | Check import chain | `node --trace-warnings` |

---

## 🤖 Routing Issues

| Symptom | Likely Cause | Quick Fix | Verification |
|---------|--------------|-----------|--------------|
| All prompts route to same model | Fingerprint matching broken | Check `data/fingerprints.json` | `npm test -- --testPathPatterns=routingEval` |
| Deterministic responses not triggering | Pattern regex too strict | Edit `src/lib/deterministicEngine.js` | Test with `hi`, `hello` |
| Premium model never used | Confidence threshold too high | Adjust in `src/lib/cardoGuard.js` | Check escalation logic |
| Cost calculations wrong | Incorrect cost per token | Update `data/fingerprints.json` | Verify `costPer1kInput/Output` |

---

## 📊 Test Issues

| Symptom | Likely Cause | Quick Fix | Verification |
|---------|--------------|-----------|--------------|
| `jest: not found` | Jest not installed | Run `npm install` | `which jest` |
| Tests timeout | Slow API responses | Increase timeout in jest.config.cjs | `npm test` passes |
| Test file not found | Wrong path | Use `--testPathPatterns=filename` | Check file exists |
| Mock not working | Mock syntax error | Verify mock setup | Test passes |

---

## 💡 Code Patterns

### ✅ DO (Token-Efficient)
```javascript
// Use grep before asking
rg "functionName" src/

// Use existing patterns
grep -r "HARD STOP" src/

// Run tests locally
npm test -- --testPathPattern=nightShift
```

### ❌ AVOID (Token-Expensive)
```javascript
// Don't ask for explanations of code you can read
"Explain how buildRouterDecision works"  // Use the JSDoc + read the code

// Don't ask for deployment help
"How do I deploy?"  // Use ./scripts/verify-deploy.sh

// Don't ask for full code reviews
"Review all my changes"  // Run lint + tests locally first
```

---

## 📝 Before Asking Vibe

1. **Check this file** — Your answer might be here
2. **Read CLI_ENTRY.md** — Start with the entry point
3. **Run `./scripts/verify-deploy.sh`** — Check deployment status
4. **Grep the codebase** — `rg "keyword" src/`
5. **Run tests locally** — `npm test`
6. **Check git diff** — `git diff`

---

## 🧠 Critical Architecture Mistakes (Lessons from v4)

During the development of the v4 Semantic Router, three major architectural evaluation mistakes occurred that temporarily invalidated our accuracy claims. Documenting them here prevents recurrence:

1. **The Synthetic Fallback Illusion:** `@xenova/transformers` silently caught network/module loading errors and fell back to generating hash-noise vectors (`Math.sin()` logic). Tests passed with 100% "green" accuracy because they were comparing hash noise to hash noise.
   * **Fix:** Added strict `fallback: false` enforcement in tests and explicit telemetry logging.
2. **Jest CJS Module Boundary Blockers:** Jest's Babel transform couldn't handle `import.meta.url` natively, which the WASM embedder required, forcing the synthetic fallback. 
   * **Fix:** Bypassed Jest completely for the true evaluation by writing a standalone native Node ESM benchmark (`scripts/run-v4-benchmark.mjs`).
3. **Blind Set Contamination:** 8+ strings in the "un-contaminated" 50-prompt blind holdout set were identical to exemplars used to train the domain sub-centroids (`scripts/generate-domain-centroids.mjs`), leading to artificially perfect cosine similarities (1.0000) and an inflated 94.0% accuracy claim.
   * **Fix:** Exported the blind dataset, enforced a programmatic `Set` intersection check that throws an error on >0% overlap, and rewrote all 90 training exemplars to ensure true zero-shot evaluation (which yielded the true 92.0% accuracy).
4. **The Sandboxed Local-Fix Illusion:** Editing and testing code locally in an agent session without committing and pushing to the remote git branch leads to false-positive success reports where production (Vercel) remains on old, broken code.
   * **Fix:** Enforce pre-execution and verification git status checks (`git diff --stat`, `git log`) before marking any task complete.
5. **Google Express API Key Model Gating (Gemini 404s):** Newer Google Gemini API keys (Express keys with `AQ...`) receive 404 Not Found errors on legacy 2.X models via the OpenAI compatibility layer, causing unwanted fallbacks to Groq/Llama.
   * **Fix:** Always maintain a prioritized multi-model candidate list in `api/cfai.js` (`gemini-3.6-flash`, `gemini-3.1-pro-preview`, `gemini-2.5-flash`, `gemini-3.5-flash-lite`).

---

## 🎯 Quick Recovery Commands

```bash
# Revert last change
git checkout HEAD -- file.js

# See what changed
git diff
git log --oneline -5

# Install all dependencies
npm install

# Full verification
npm run lint && npm run build && npm test

# Check deployment
./scripts/verify-deploy.sh
```

---

**Status:** ✅ Common mistakes documented
**Token impact:** High (prevents 1000+ tokens/session in troubleshooting)
**Next review:** After 10 sessions or when new patterns emerge
