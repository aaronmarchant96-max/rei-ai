# PromptHound Labs — Applied AI Engineering

An applied AI engineering lab exploring how AI-assisted work should be done well. We build tools, methods, and evaluation frameworks for structured reasoning, adaptive model routing, and evidence-aware workflows.

**Lab portfolio:** https://debate-furnace.vercel.app  
**Repository:** https://github.com/aaronmarchant96-max/rei-ai-platform  
**Research index:** [docs/RESEARCH_INDEX.md](docs/RESEARCH_INDEX.md) — full timeline and category view  
**Project timeline:** [docs/PROJECT_TIMELINE.md](docs/PROJECT_TIMELINE.md) — milestones from first commit to REI.ai sprint  
**Lab repos:** 6 active repositories across AI engineering, evaluation, computer vision, and archival research

---

## Experiments

25 completed experiments across Architecture, Evaluation, Computer Vision, Cost, and UX categories — spanning 6 repositories. Lab reports available for select experiments.

### 2026-05

| Experiment | What | Repo |
|-----------|------|------|
| UAP Footage Analyzer | Multi-source video anomaly detection with normalized pipeline (OpenCV, Python) | uap-footage-analyzer |
| GOES Anomaly Hunter | Satellite thermal hotspot detection from NOAA public data | goes-anomaly-hunter |
| Local Video Motion Zone Detector | Zone-based motion events from local video files | local-video-motion-zone-detector |
| Debate Furnace | Gemini-backed structured debate engine with verdict templates, round management, and async decision paths | rei-ai-platform |
| Story Forge | Inspiration engine with curated seed library (JSON-sourced), genre alignment, and onboarding flow | rei-ai-platform |
| Testing Infrastructure | Jest + React Testing Library setup, first persistence test, app shell drift checks | rei-ai-platform |
| CARDO GUARD | Deterministic decision gate — evaluates whether acting is worth the cost using breakeven math and confidence bands | rei-ai-platform |

### 2026-04

| Experiment | What | Repo |
|-----------|------|------|
| Arena Harness | Local LLM evaluation harness for instruction adherence, structured output integrity, and adversarial pressure testing | llm-adversarial-testing |
| Manuscript Comparison | Multi-model evaluation (Claude, Le Chat, Manus) on structured manuscript tasks | llm-adversarial-testing |
| Dual-Axis Arena | Multi-turn adversarial testing with control vs. pressure axis comparison | llm-adversarial-testing |
| Prompt Injection Resistance | Case studies on file injection, roleplay jailbreaks, and positive reinforcement exploits | llm-adversarial-testing |

### 2026-06

| Experiment | What | Repo |
|-----------|------|------|
| Marchant Family Archive | Private genealogy archive with confidence labels, source scans, ancestor browser, evidence tiers | family-archive |
| Tracepoint | Precision scan tool with snapshot tests, decision readout, and combined reduction display | rei-ai-platform |
| REI.ai Platform | Domain-switching chat (generalist, coding, genealogy, story) with model routing, conversation memory, CARDO REI methodology, and Groq/OpenRouter backend | rei-ai-platform |
| Archivist Ingest v2 | Raw record paste for genealogy with source type selection, client/server length guards, and attachment trace | rei-ai-platform |
| Mobile-First Redesign | Responsive layout overhaul with safe area insets, breakpoint repairs, and Phase 0/1/2 hooks | rei-ai-platform |
| [Night Shift Fingerprint Router](docs/experiments/night-shift-routing.md) | Weighted keyword catalog for prompt classification — 9 fingerprints, 19 tests, < 1 ms per decision | rei-ai-platform |

### 2026-07

| Experiment | What | Repo |
|-----------|------|------|
| [Prompt Evaluation Suite](docs/experiments/prompt-eval-suite.md) | 22 deterministic tests for prompt structure and response parsing — caught 2 regressions | rei-ai-platform |
| State Extraction | 4 custom hooks extracted from REI.jsx (useChatHistory, useSessionTracker, useThriftyMode, useDomainHint) | rei-ai-platform |
| Code Splitting | 7 tool components via React.lazy() — 849 kB → 339 kB initial bundle | rei-ai-platform |
| Cost-Awareness UX | Per-message cost badges, pre-send token/route/cost estimates, 5K token budget gauge, session accumulator with markdown export | rei-ai-platform |
| Fingerprint Data Overhaul | Real USD pricing, weighted matching with negativeMatchTerms, fallback chains, 3 new entries | rei-ai-platform |
| Routing False-Positive Fix | Removed `record`/`will` from genealogy regex, added negativeMatchTerms, fixed history filter prefix | rei-ai-platform |

## Methods

- **Fortis et Liber** — Seven engineering principles (Leverage, Surface Area, Recoil, Enumeration, Parity, Solvency, Conservation) that guide architectural decisions
- **CARDO REI** — A structured reasoning methodology (Capture, Analyze, Reframe, Decide, Operationalize)
- **CARDO GUARD** — A deterministic decision gate that evaluates whether acting is worth the cost

## Lab Reports

Every experiment gets a structured report: Question → Hypothesis → Implementation → Measurements → Results → Limitations → Next Iteration.

[Lab report template](docs/lab-report-template.md)

## Evidence

| Metric | Value |
|--------|-------|
| Test suite (primary repo) | 95 tests, 13 suites |
| Bundle size (primary repo) | 339 kB initial |
| Active repositories | 6 |
| Total experiments | 25 completed, 5 planned |
| Active since | April 7, 2026 (~3 months) |
| Total commits | 387 across 7 repos |
| Routing latency | < 1 ms per decision |
| Monthly operating cost | ~$20/month (GitHub Copilot + OpenRouter API) |
| CI | GitHub Actions (test + build on push/PR) |
| Active months | 3 (May 2026 – Jul 2026) |

## Repository Structure

```
src/
  REI.jsx              — Chat interface (flagship experiment)
  AppShell.jsx         — Lazy-loaded tool shell (7 tools)
  lib/
    nightShiftRouter.js — Fingerprint routing engine
    cardoGuard.js       — Decision gate
  hooks/
    useChatHistory.js   — Persistent chat state
    useSessionTracker.js— Session cost tracking
    useThriftyMode.js   — Cheap-path toggle
    useDomainHint.js    — Auto domain detection
api/
  cfai.js              — Domain prompt resolution + model routing
  lib/logger.js        — Structured JSON logging
data/
  fingerprints.json    — 9-entry fingerprint catalog (pricing + routing)
docs/
  experiments/         — Lab reports
  RESEARCH_INDEX.md    — Full experiment index
  fortis-et-liber.md   — Engineering principles reference
```

## How to Run

```
npm install
npm test       # 95 tests, 13 suites
npm run build  # 339 kB initial, 48 modules
```

---

*PromptHound Labs — Applied AI Engineering*  
*"How should AI-assisted work be done well?"*
