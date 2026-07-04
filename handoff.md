Goal:
Current state handoff for CLI agents working on PromptHound Labs experiments.

> **For every CLI session:** Start with `CLI_ENTRY.md` then `README.md`. This file supplements with the latest progress.

## Context

PromptHound Labs is an applied AI engineering lab. Everything in this repo is an experiment with a structured report: Question → Hypothesis → Implementation → Measurements → Results → Limitations → Next Iteration. The flagship experiment is REI.ai, but the methods (Fortis et Liber, CARDO REI, CARDO GUARD, Night Shift routing) are the primary outputs.

## Latest experiments (2026-07-03)

### Night Shift Fingerprint Router — v1 complete
- 9 fingerprint entries in `data/fingerprints.json` with weighted matching, negative terms, fallback chains, and real USD pricing
- Three-layer architecture: fast-path regex gates → weighted catalog matching → decision tree with rationale
- Fixed false-positive routing caused by generic words (`record`, `will`) in hardcoded genealogy regex
- 19 unit tests, batch route script for fingerprinting custom inputs
- [Full lab report](docs/experiments/night-shift-routing.md)

### Prompt Evaluation Suite — v1 complete
- 22 deterministic tests for domain prompt structure and response parser robustness
- Caught 2 regressions during development: null input crash and section-header-without-inline-content bug
- Zero inference cost, sub-second execution
- [Full lab report](docs/experiments/prompt-eval-suite.md)

### State Extraction (REI.jsx → 4 hooks)
- Extracted `useChatHistory`, `useSessionTracker`, `useThriftyMode`, `useDomainHint` from the main chat component
- REI.jsx: ~1773 lines (reduced despite adding cost/routing/hint/budget features)

### Code Splitting
- 7 tool components converted to `React.lazy()` + `<Suspense>`
- Initial bundle: 849 kB → 339 kB (−60%), 8 on-demand chunks

### Cost-Awareness UX
- Per-message cost badge, pre-send token/route/cost estimate, 5K token budget gauge
- Router rationale panel showing why a route was chosen + alternative routes with costs
- Session accumulator with markdown export

## Current state

- **Test count:** 95 tests, 13 suites — all passing.
- **Build:** Produces `dist/` successfully — 339 kB initial, 48 modules.
- **Lint:** Pre-existing — ESLint v10 requires flat config but `.eslintrc.json` exists.
- **Deployment:** https://debate-furnace.vercel.app
- **Monthly operating cost:** ~$20/month (GitHub Copilot + OpenRouter API)
- **Research framing:** README reframed as PromptHound Labs — Applied AI Engineering. Lab report template in `docs/lab-report-template.md`.

## Files

| File | Purpose |
|------|---------|
| `src/REI.jsx` | REI.ai chat interface (flagship experiment) |
| `api/cfai.js` | Backend — domain prompt resolution + Groq/OpenAI routing |
| `api/lib/logger.js` | Structured JSON logger |
| `src/lib/nightShiftRouter.js` | Night Shift fingerprint routing engine |
| `src/lib/cardoGuard.js` | CARDO GUARD decision gate |
| `data/fingerprints.json` | 9-entry fingerprint catalog (routing + pricing) |
| `src/AppShell.jsx` | Lazy-loaded tool shell (7 tools) |
| `src/hooks/` | 4 state-extraction hooks |
| `src/__eval__/promptEval.test.js` | Prompt evaluation suite (22 tests) |
| `docs/experiments/` | Structured lab reports |
| `docs/lab-report-template.md` | Lab report template |
| `scripts/batchRoute.cjs` | Batch route tester (28 sample inputs) |
| `.github/workflows/ci.yml` | CI pipeline |

## Next experiments (if applicable)

- Fingerprint synthesis tooling — generate match terms from labeled examples
- Routing confidence scoring exposed in UI
- Hybrid routing — rule-based for known patterns, lightweight embedding for novel queries
- Prompt quality fuzz tests that generate variations and verify parser robustness

## Do not

- Do not reintroduce long prompt strings in `src/REI.jsx` — they live in `api/cfai.js` now.
- Do not use Next.js App Router exports in `/api/` (must remain default handler).
- Do not introduce inference-dependent routing — decisions must be deterministic and testable.
- Do not remove lab report structure — every experiment needs a documented report.
