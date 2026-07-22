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
