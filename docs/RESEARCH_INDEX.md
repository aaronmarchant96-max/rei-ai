# Research Index — PromptHound Labs

A running index of experiments across the full project history. Each experiment follows the same structure: Question → Hypothesis → Implementation → Measurements → Results → Limitations → Next Iteration.

---

## Repositories

The lab spans 6 active repositories across AI engineering, evaluation, computer vision, and archival research.

| Repository | Focus | Language | Status |
|-----------|-------|----------|--------|
| [rei-ai-platform](https://github.com/aaronmarchant96-max/rei-ai-platform) | AI reasoning, routing, evaluation | JavaScript/React | Active |
| [llm-adversarial-testing](https://github.com/aaronmarchant96-max/llm-adversarial-testing) | LLM evaluation & red-teaming harness | Python | Active |
| [family-archive](https://github.com/aaronmarchant96-max/family-archive) | Private genealogy archive with confidence labels | TypeScript/Next.js | Active |
| [uap-footage-analyzer](https://github.com/aaronmarchant96-max/uap-footage-analyzer) | Multi-source video anomaly detection | Python/OpenCV | Maintenance |
| [goes-anomaly-hunter](https://github.com/aaronmarchant96-max/goes-anomaly-hunter) | Satellite thermal anomaly monitoring | Python | Maintenance |
| [local-video-motion-zone-detector](https://github.com/aaronmarchant96-max/local-video-motion-zone-detector) | Local security footage motion detection | Python/OpenCV | Maintenance |

---

## Timeline

### 2026-04

| Status | Experiment | Category | Report | Repo |
|--------|-----------|----------|--------|------|
| ✓ | Arena Harness — local LLM evaluation for instruction adherence, structured output, and adversarial pressure | Evaluation | — | llm-adversarial-testing |
| ✓ | Manuscript Comparison — multi-model evaluation (Claude, Le Chat, Manus) on structured manuscript tasks | Evaluation | — | llm-adversarial-testing |
| ✓ | Dual-Axis Arena — multi-turn adversarial testing with control vs pressure axis | Evaluation | — | llm-adversarial-testing |
| ✓ | Prompt Injection Resistance — case studies on file injection, roleplay jailbreaks, positive reinforcement exploits | Evaluation | — | llm-adversarial-testing |

### 2026-05

| Status | Experiment | Category | Report | Repo |
|--------|-----------|----------|--------|------|
| ✓ | UAP Footage Analyzer — multi-source video anomaly detection with normalized pipeline | Architecture, CV | — | uap-footage-analyzer |
| ✓ | GOES Anomaly Hunter — satellite thermal hotspot detection from NOAA public data | CV | — | goes-anomaly-hunter |
| ✓ | Local Video Motion Zone Detector — zone-based motion events from local video files | CV | — | local-video-motion-zone-detector |
| ✓ | Debate Furnace — Gemini-backed structured debate engine | Architecture, UX | — | rei-ai-platform |
| ✓ | Story Forge — inspiration engine with curated seed library | UX, Architecture | — | rei-ai-platform |
| ✓ | Testing Infrastructure — Jest + React Testing Library setup | Evaluation | — | rei-ai-platform |
| ✓ | CARDO GUARD — deterministic decision gate (cost vs. confidence) | Architecture, Evaluation | — | rei-ai-platform |

### 2026-06

| Status | Experiment | Category | Report | Repo |
|--------|-----------|----------|--------|------|
| ✓ | Marchant Family Archive — private genealogy archive with confidence labels, source scans, ancestor browser, evidence tiers | Architecture, UX | — | family-archive |
| ✓ | Tracepoint — precision scan with snapshot testing | Architecture, Evaluation | — | rei-ai-platform |
| ✓ | REI.ai Platform — domain-switching chat with model routing, conversation memory, CARDO REI methodology | Architecture, UX, Cost | — | rei-ai-platform |
| ✓ | Archivist Ingest v2 — raw record paste for genealogy with source type selection and length guards | UX | — | rei-ai-platform |
| ✓ | Mobile-First Redesign — responsive layout overhaul with safe area insets | UX | — | rei-ai-platform |
| ✓ | Night Shift Fingerprint Router — weighted keyword catalog for prompt classification | Architecture, Cost | [report](experiments/night-shift-routing.md) | rei-ai-platform |

### 2026-07

| Status | Experiment | Category | Report | Repo |
|--------|-----------|----------|--------|------|
| ✓ | Prompt Evaluation Suite — 22 deterministic tests for prompt structure and response parsing | Evaluation | [report](experiments/prompt-eval-suite.md) | rei-ai-platform |
| ✓ | State Extraction — 4 custom hooks from REI.jsx | Architecture | — | rei-ai-platform |
| ✓ | Code Splitting — 7 tool components via React.lazy() (849 kB → 339 kB) | Architecture | — | rei-ai-platform |
| ✓ | Cost-Awareness UX — per-message cost badges, pre-send estimates, 5K token budget gauge, session accumulator | UX, Cost | — | rei-ai-platform |
| ✓ | Fortis et Liber Documentation — principle annotations across core functions | Architecture | — | rei-ai-platform |
| ✓ | Fingerprint Data Overhaul — real USD pricing, weighted matching, fallback chains, 3 new entries | Architecture, Cost | — | rei-ai-platform |
| ✓ | Routing False-Positive Fix — removed `record`/`will` from genealogy regex, added negativeMatchTerms | Architecture, Evaluation | — | rei-ai-platform |

### 2026-08 (planned)

| Status | Experiment | Category |
|--------|-----------|----------|
| □ | Context Compression | Cost, Architecture |
| □ | CARDO GUARD Validation Study | Evaluation |
| □ | Session Recovery Engine | UX, Architecture |

### 2026-09 (planned)

| Status | Experiment | Category |
|--------|-----------|----------|
| □ | User Study — routing accuracy | Evaluation, UX |
| □ | Routing Benchmark — cost comparison | Cost, Evaluation |

---

## By Category

### 🧪 Architecture
System design, state management, code organization, and structural experiments.

| Experiment | Date | Status | Report | Repo |
|-----------|------|--------|--------|------|
| UAP Footage Analyzer — multi-source ingestion pipeline | 2026-05 | ✓ | — | uap-footage-analyzer |
| Debate Furnace | 2026-05 | ✓ | — | rei-ai-platform |
| Story Forge | 2026-05 | ✓ | — | rei-ai-platform |
| CARDO GUARD | 2026-05 | ✓ | — | rei-ai-platform |
| Marchant Family Archive | 2026-06 | ✓ | — | family-archive |
| Tracepoint | 2026-06 | ✓ | — | rei-ai-platform |
| REI.ai Platform | 2026-06 | ✓ | — | rei-ai-platform |
| Night Shift Fingerprint Router | 2026-06 | ✓ | [report](experiments/night-shift-routing.md) | rei-ai-platform |
| State Extraction (4 hooks) | 2026-07 | ✓ | — | rei-ai-platform |
| Code Splitting (7 lazy components) | 2026-07 | ✓ | — | rei-ai-platform |
| Fortis et Liber Documentation | 2026-07 | ✓ | — | rei-ai-platform |
| Fingerprint Data Overhaul | 2026-07 | ✓ | — | rei-ai-platform |
| Routing False-Positive Fix | 2026-07 | ✓ | — | rei-ai-platform |

### 📊 Evaluation
Testing, measurement, quality assurance, and validation experiments.

| Experiment | Date | Status | Report | Repo |
|-----------|------|--------|--------|------|
| Arena Harness — local LLM evaluation | 2026-04 | ✓ | — | llm-adversarial-testing |
| Manuscript Comparison (Claude, Le Chat, Manus) | 2026-04 | ✓ | — | llm-adversarial-testing |
| Dual-Axis Arena — multi-turn adversarial testing | 2026-04 | ✓ | — | llm-adversarial-testing |
| Prompt Injection Resistance case studies | 2026-04 | ✓ | — | llm-adversarial-testing |
| Testing Infrastructure | 2026-05 | ✓ | — | rei-ai-platform |
| CARDO GUARD | 2026-05 | ✓ | — | rei-ai-platform |
| Tracepoint | 2026-06 | ✓ | — | rei-ai-platform |
| Prompt Evaluation Suite | 2026-07 | ✓ | [report](experiments/prompt-eval-suite.md) | rei-ai-platform |
| Routing False-Positive Fix | 2026-07 | ✓ | — | rei-ai-platform |

### 🔬 Computer Vision
Video analysis, motion detection, and satellite data experiments.

| Experiment | Date | Status | Report | Repo |
|-----------|------|--------|--------|------|
| UAP Footage Analyzer — multi-source video anomaly detection | 2026-05 | ✓ | — | uap-footage-analyzer |
| GOES Anomaly Hunter — satellite thermal hotspot detection | 2026-05 | ✓ | — | goes-anomaly-hunter |
| Local Video Motion Zone Detector — zone-based motion events | 2026-05 | ✓ | — | local-video-motion-zone-detector |

### 💰 Cost
Token optimization, model selection, and cost-aware routing experiments.

| Experiment | Date | Status | Report |
|-----------|------|--------|--------|
| REI.ai Platform (model routing) | 2026-06 | ✓ | — |
| Night Shift Fingerprint Router | 2026-06 | ✓ | [report](experiments/night-shift-routing.md) |
| Cost-Awareness UX | 2026-07 | ✓ | — |
| Fingerprint Data Overhaul (pricing) | 2026-07 | ✓ | — |

### 👤 UX
Interface design, user feedback, and interaction pattern experiments.

| Experiment | Date | Status | Report |
|-----------|------|--------|--------|
| Debate Furnace | 2026-05 | ✓ | — |
| Story Forge | 2026-05 | ✓ | — |
| REI.ai Platform | 2026-06 | ✓ | — |
| Archivist Ingest v2 | 2026-06 | ✓ | — |
| Mobile-First Redesign | 2026-06 | ✓ | — |
| Cost-Awareness UX | 2026-07 | ✓ | — |

---

## Summary

| Metric | Value |
|--------|-------|
| Total experiments | 25 completed, 5 planned |
| Active repositories | 6 |
| Active since | April 7, 2026 |
| Time building | ~3 months |
| Total commits | 387 |
| Published lab reports | 2 of 25 |
| Test coverage (primary repo) | 95 tests, 13 suites |
| Bundle size (primary repo) | 339 kB initial |
| Monthly operating cost | ~$20/month (GitHub Copilot + OpenRouter API) |
| Background | Construction trades — no prior tech experience |

---

*PromptHound Labs — Applied AI Engineering*  
*Experiments are documented, tested, and reproducible. Not peer-reviewed.*
