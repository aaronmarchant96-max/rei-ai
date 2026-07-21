# Micro-Grant Proposal: PromptHound Labs

**Submitted by:** PromptHound Labs — Applied AI Engineering  
**Requested amount:** $10,000–$25,000  
**Duration:** 6 months  
**Status:** Draft for review

---

## Summary

PromptHound Labs has validated several low-cost AI engineering methods — including structured reasoning, adaptive model routing, and AI workflow documentation — using commodity hardware and modest API budgets. We seek support to evaluate these methods with larger datasets, additional users, and more rigorous benchmarking.

Our methods are designed for teams that cannot afford premium AI infrastructure: solo developers, small startups, and researchers. We build tools that make AI-assisted work more predictable, testable, and cost-efficient without requiring expensive models or complex infrastructure.

---

## Background

Between April 7 and July 3, 2026, PromptHound Labs completed 25 engineering experiments across 6 repositories. The lab was started from a non-technical background (construction trades) with no prior programming experience, using commodity hardware and free-tier AI tools.

**AI Engineering & Evaluation (rei-ai-platform):** State extraction hooks, code splitting (60% bundle reduction), deterministic decision gates, fingerprint-based routing, structured documentation workflows, a 95-test evidence suite, a prompt evaluation harness that caught 2 production regressions, and cost-aware routing with live token budget tracking.

**LLM Evaluation (llm-adversarial-testing):** A local evaluation harness for instruction adherence, structured output integrity, and adversarial pressure testing. Includes 9 case studies covering file injection, roleplay jailbreaks, multi-turn continuity, and dual-axis (control vs. pressure) comparisons. CI pipeline runs automated red-team scenarios.

**Computer Vision (uap-footage-analyzer, goes-anomaly-hunter, local-video-motion-zone-detector):** Three OpenCV-based experiments in video anomaly detection. A multi-source UAP footage pipeline with normalized ingestion adapters. A satellite thermal hotspot detector pulling from public NOAA GOES data. A local security footage motion detector with configurable zones and structured JSONL logging.

**Genealogy & Archival (family-archive):** A private genealogy archive with confidence-labeled records, inline source scans, evidence tiers, ancestor browser, and document management built on Next.js.

All experiments were built on a ~$20/month budget (GitHub Copilot + OpenRouter API) using commodity hardware and open-source tooling.

---

## Problem

Three problems limit AI adoption in resource-constrained settings:

**1. Cost unpredictability.** Teams cannot estimate AI costs before writing code. Model selection is often manual, static, or delegated to expensive "router" models that double the cost of every request.

**2. Evaluation gaps.** Most AI-assisted workflows lack deterministic test suites. Prompt changes are deployed without structural validation, and regressions are caught by users rather than tests.

**3. Knowledge loss.** AI workflow decisions — why a particular model was chosen, why a prompt is structured a certain way, why a routing rule exists — are rarely documented. When the original builder moves on, the reasoning is lost.

Our experiments address these problems through engineering methods rather than more AI. The Night Shift router replaces model-based routing with deterministic fingerprint matching. The prompt evaluation suite replaces manual review with automated structural tests. The Fortis et Liber documentation framework captures reasoning alongside code.

---

## Proposed Work

We request funding to validate these methods under more rigorous conditions.

### Experiment 1: Routing Benchmark (Months 1–2)

**Current state:** The Night Shift router has been tested against 28 hand-curated inputs with 0/28 false positives. This is not statistically significant.

**Proposed:** Curate a labeled dataset of 500+ prompts across 10 categories. Measure routing accuracy, latency, and cost against:
- A fixed-model baseline (all requests → one model)
- An LLM-as-router baseline (cheap model decides which model to call)
- The Night Shift weighted fingerprint approach

Publish results as a benchmark report.

**Budget:** $1,000–$2,000 for API costs (baseline comparison models), $500 for dataset curation.

### Experiment 2: Prompt Evaluation Field Study (Months 2–4)

**Current state:** The prompt evaluation suite contains 22 tests covering two domain prompts and one response parser. It has only been run by the original developer.

**Proposed:** Recruit 5–10 participants to use the evaluation suite against their own AI prompts. Measure:
- Time to integrate the suite into a new project
- Number of regressions caught during development
- False positive rate
- Qualitative feedback on usability

Publish results as a field study report.

**Budget:** $1,000–$2,000 for participant incentives, $500 for documentation and onboarding materials.

### Experiment 3: Context Compression (Months 3–5)

**Current state:** Token budgets are tracked but not optimized. The system warns at 4K/5K tokens but does not compress.

**Proposed:** Evaluate three context compression strategies:
- Sliding window (drop oldest messages)
- Summarization-based compression (LLM rewrites history as a condensed summary)
- Signal-based compression (drop low-signal turns while preserving high-signal ones)

Measure token savings, reasoning quality impact, and implementation complexity. Publish results as a comparison report.

**Budget:** $1,000–$2,000 for API costs (summarization model calls), $500 for analysis tooling.

### Experiment 4: Open-Source Release (Months 4–6)

**Current state:** All methods are implemented but not packaged for external use.

**Proposed:** Extract the Night Shift router and prompt evaluation suite into standalone, documented open-source libraries. Include:
- README with setup and usage examples
- API reference
- Migration guide from model-based routing
- Example integration with common frameworks

**Budget:** $1,500 for documentation design and testing across environments.

---

## Timeline

| Month | Experiments |
|-------|------------|
| 1–2 | Routing Benchmark (dataset, baseline runs, analysis) |
| 2–4 | Prompt Evaluation Field Study (recruit, run, publish) |
| 3–5 | Context Compression (implement, measure, compare) |
| 4–6 | Open-Source Release (extract, document, publish) |

Deliverable at month 6: A published technical report with benchmark results, field study findings, and links to open-source libraries.

---

## Budget

| Item | Amount |
|------|--------|
| API costs (benchmark models, compression) | $3,000–$5,000 |
| Participant incentives (5–10 users) | $1,000–$2,000 |
| Dataset curation | $500–$1,000 |
| Documentation and tooling | $1,500–$2,000 |
| Analysis and report writing | $1,000–$2,000 |
| Cloud infrastructure (CI, hosting) | $500–$1,000 |
| Contingency | $1,500–$2,000 |
| **Total** | **$10,000–$15,000** |

For a more comprehensive study including conference travel or contracted statistical analysis, the budget would extend to $20,000–$25,000.

---

## Outcomes

### For the field
Published benchmarks comparing deterministic routing against model-based alternatives. Open-source libraries that any team can integrate. A documented methodology for prompt evaluation that does not require expensive infrastructure.

### For PromptHound Labs
Validation data to support future grant applications. A demonstrated ability to design and execute rigorous evaluations. Published reports that serve as a portfolio for consulting or employment opportunities.

### For the funder
Evidence that low-cost AI engineering methods can produce measurable improvements in cost predictability, test coverage, and knowledge retention — without requiring premium models or large teams.

---

## Statement of Need

PromptHound Labs has operated on a ~$20/month budget (GitHub Copilot + OpenRouter API) for three months using commodity hardware. This approach has been effective for initial validation but cannot support:

- **Dataset curation** — Labeling 500+ prompts for the routing benchmark requires paid annotators or significant time
- **API costs** — Comparing against paid models (GPT-4o, Claude) requires API credits beyond the current budget
- **Participant studies** — Recruiting external users requires incentives
- **Documentation** — Packaging libraries for external use requires design and testing effort

The requested $10,000–$25,000 would close the gap between prototype validation and published, reusable results.

---

## Appendices

- **Research index:** [RESEARCH_INDEX.md](RESEARCH_INDEX.md)
- **Published lab reports:** `docs/experiments/night-shift-routing.md`, `docs/experiments/prompt-eval-suite.md`
- **Lab report template:** `docs/lab-report-template.md`
- **Primary repository (REI.ai):** https://github.com/aaronmarchant96-max/rei-ai-platform
- **LLM evaluation harness:** https://github.com/aaronmarchant96-max/llm-adversarial-testing
- **Family archive:** https://github.com/aaronmarchant96-max/family-archive
- **UAP footage analyzer:** https://github.com/aaronmarchant96-max/uap-footage-analyzer
- **Satellite anomaly monitor:** https://github.com/aaronmarchant96-max/goes-anomaly-hunter
- **Motion zone detector:** https://github.com/aaronmarchant96-max/local-video-motion-zone-detector
- **Live portfolio:** https://debate-furnace.vercel.app

---

*PromptHound Labs — Applied AI Engineering*  
*Prepared July 2026. Not peer-reviewed.*
