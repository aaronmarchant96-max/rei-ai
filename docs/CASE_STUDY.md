# Case Study: Internal Development Workflow Audit & Evidence Discipline

**Live System**: [https://rei.ai](https://rei.ai)  
**Repository**: [https://github.com/aaronmarchant96-max/rei-ai](https://github.com/aaronmarchant96-max/rei-ai)  
**Incident Reference**: [INCIDENT-001-ROUTING-MEASUREMENT.md](./INCIDENT-001-ROUTING-MEASUREMENT.md)

---

> ⚠️ **Epistemic Framing Notice**: This case study analyzes the internal development, test, and evaluation workload used to construct REI.ai itself. It demonstrates the evidence discipline behind the platform and is presented as founder build-workflow evidence—**not as customer inference savings**.

---

## 1. The Core Objective

Most AI applications rely on monolithic flagship models (e.g., GPT-4o) for every request, incurring high token costs even on routine, low-complexity turns. 

We sought to build an **OpenAI-compatible pre-spend router and decision audit engine** that evaluates incoming prompt complexity in **< 14 milliseconds**, routing routine tasks to low-cost sub-cent models while reserving flagship models for complex multi-step reasoning.

---

## 2. Internal Build Workload Telemetry

During the 3-month development and evaluation cycle of REI.ai:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    INTERNAL BUILD WORKLOAD BENCHMARKS                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ • Total Tokens Processed ──► 1.848 Billion development & eval tokens        │
│ • Total Observed Spend   ──► $23.52 API spend (97.35% input cache hit rate)  │
│ • Verified Test Suite    ──► 119 test suites / 1,346 automated tests         │
│ • Operating Model        ──► Lean Serverless (~$20–$60/month infrastructure)   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Decision Audit Breakdown (Replay Evaluation)

Applying REI's counterfactual replay engine (`pilotEval.ts`) to our internal development traces yielded the following 3-bucket traffic segmentation:

### A. Candidate to Shadow (62% of traffic)
- **Workload**: Routine code formatting, state isolation checks, prompt syntax validation, and greeting turns.
- **Replay Finding**: Pre-spend policy correctly assigned low-cost sub-cent routes (`llama-3.1-8b` / `deepseek-chat`) preserving required response format.
- **Economic Impact**: $0.05/M token pricing vs $2.50/M baseline on routine turns.

### B. Retain Current Tier (28% of traffic)
- **Workload**: Multi-turn strategic game-theoretic analysis, legal precedent matching, complex concurrency data race evaluation (Go RLock mutation), and adversarial red-teaming.
- **Replay Finding**: `hingeScore` and domain fingerprinting justified retaining high-capability flagship models (`deepseek-chat` / `gemini-1.5-pro`). No routing downgrades proposed.

### C. Insufficient Evidence (10% of traffic)
- **Workload**: Internal test fixtures with redacted prompt text or missing input/output token splits.
- **Handling**: Marked `replayEligible: false` with exclusion code `no_routing_input`. Excluded from cost reduction claims.

---

## 4. Key Invariants & Integrity Controls

1. **`ingestable ≠ replay-routable`**: Missing or redacted prompt text is normalized into the denominator audit but excluded from routing decisions and savings estimates.
2. **Zero Production Authority in Shadow Mode**: Shadow mode routes and prices requests prospectively alongside live production with **zero model overrides** and **zero extra provider API calls**.
3. **Fail-Closed Error Logging**: Ingestion errors record row index and `ExclusionCode`—never sensitive raw prompt text.
4. **Deterministic Replay**: Given the same source data, catalog rates, and policy version, the audit produces identical, byte-equivalent evaluation output.

---

## 5. Supporting Code & Documentation

- **Ingestion & Normalization**: [src/lib/pilotIngest/index.ts](../src/lib/pilotIngest/index.ts)
- **Replay & Segmentation**: [src/lib/pilotReport.ts](../src/lib/pilotReport.ts)
- **Canonical Export**: [src/lib/pilotExport/index.ts](../src/lib/pilotExport/index.ts)
- **Execution Controller**: [src/lib/executionController.ts](../src/lib/executionController.ts)
- **Customer Pilot Workspace**: [src/modules/pilot/PilotWorkspace.jsx](../src/modules/pilot/PilotWorkspace.jsx)
