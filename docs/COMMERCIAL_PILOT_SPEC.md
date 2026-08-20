# REI.ai — Commercial Pilot Specification & BYOK Architecture

## 1. Commercial Architecture: Bring Your Own Key (BYOK)

To avoid cash-flow liabilities and align commercial incentives, REI operates strictly as an intelligent control, safety-gate, and measurement proxy rather than a resold inference provider.

```
┌─────────────────────────────────────────────────────────────┐
│                      CUSTOMER BUSINESS                      │
│   - Application / Agents (Cursor, Cline, Aider, Custom)     │
│   - Customer-Owned Provider Keys (OpenAI, Gemini, Groq)     │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                REI.AI CONTROL & ROUTING PROXY               │
│   1. Inspects semantic hinge & complexity R(T) locally      │
│   2. Runs client-side safety & anti-slop pre-flight checks  │
│   3. Selects optimal provider & model route                 │
│   4. Forwards request using customer's scoped credentials   │
│   5. Emits canonical RequestEvidence & cost telemetry       │
└──────────────────────────────┬──────────────────────────────┘
                               │
             ┌─────────────────┼─────────────────┐
             ▼                 ▼                 ▼
      ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
      │ OpenAI (4o)  │  │ Google (Gem) │  │  Groq (Llama)│
      └──────────────┘  └──────────────┘  └──────────────┘
             │                 │                 │
             └─────────────────┼─────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 DIRECT CUSTOMER BILLING                     │
│   - Upstream providers bill customer directly               │
│   - Zero inference cash-flow liability on REI               │
│   - Evidence ledger proves actual reconciled cost delta     │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. The Commercial Proposition

$$\text{Total Monthly Cost} = \text{Reduced Provider Spend} + \text{REI Platform Fee} \ll \text{Original Unmanaged Spend}$$

> **"You pay REI because REI makes the total number smaller."**

For pilot engagements, REI is offered with a **$0 platform fee for 30 days**. The customer retains their direct enterprise discount tiers, volume commitments, and billing relationships with all upstream model providers.

---

## 3. Credential Security & Invariants

BYOK solves the balance-sheet liability, but credential security requires explicit architectural controls:

### Deployment Options
1. **Local / VPC Sidecar Proxy (Recommended for Enterprise)**:
   - REI proxy runs containerized within the customer's private cloud / VPC.
   - Provider API keys never leave the customer's network boundary.
2. **Hosted Control Plane**:
   - Customer credentials stored in an encrypted tenant secret vault with zero persistence in telemetry, traces, logs, error reports, or analytics.
   - Requires dedicated, scoped pilot keys with customer-enforced hard spend ceilings.

### Security Invariants
- **Zero Token Persistence**: Prompts and completions are never stored by default unless explicitly opted-in for debugging.
- **Zero Credential Exposure**: Authorization headers and provider secrets are stripped before logging or telemetry emission.
- **Immediate Revocation**: Customer can rotate or revoke keys at any time directly in their provider console without contacting REI.

---

## 4. Three-Stage Graduated Pilot Funnel

```
┌─────────────────────────────────────────┐
│ Stage 1: Offline Replay Audit           │ → Anonymized historical logs replayed
│                                         │   Deterministic replayed cost estimate (Zero spend)
└────────────────────┬────────────────────┘
                     ▼
┌─────────────────────────────────────────┐
│ Stage 2: Bounded A/B Non-Inferiority    │ → 500–2,000 representative cases
│                                         │   Statistical non-inferiority test (δ ≤ 3%)
└────────────────────┬────────────────────┘
                     ▼
┌─────────────────────────────────────────┐
│ Stage 3: Controlled 30-Day BYOK Pilot   │ → Live traffic with bounded engineering limits
│                                         │   $0 REI Platform fee; live telemetry receipts
└─────────────────────────────────────────┘
```

### Stage 1: Offline Replay Audit (Zero Inference Spend)
- **Input**: Customer provides an export of anonymized historical request metadata ($N \approx 10,000$ requests).
- **Execution**: REI's deterministic replay engine evaluates routing decisions offline against versioned rate cards.
- **Output**: **Deterministic replayed cost estimate under versioned provider pricing**, explicitly categorizing:
  - `Observed`: Historical request volume, provider/model distribution, historical token counts (if supplied).
  - `Replayed`: Deterministic REI-selected route per query.
  - `Modeled`: Counterfactual provider cost under published rate cards.
  - `Derived`: Estimated net savings and domain deflection percentage.

### Stage 2: Bounded A/B Non-Inferiority Validation ($N=500–2,000$ Requests)
- **Hypothesis**: REI-routed model outputs are non-inferior to baseline flagship outputs within a pre-specified margin ($\delta = 3\%$).
- **Methodology**:
  - Stratified sampling across task difficulty tiers.
  - Dual-execution against baseline model and REI route.
  - Multi-tiered evaluation: deterministic regex/contract gates, multi-model judge cross-checks, and task-specific objective success metrics (e.g. test pass rate for code, schema compliance for structured JSON).
  - Stratified human-review sample (blind grading on 50–100 edge cases).
- **Conclusion Gate**: Pilot proceeds to live traffic only if:
  $$\text{Quality}_{\text{REI}} \ge \text{Quality}_{\text{Baseline}} - \delta \quad (\delta \le 3\%)$$

### Stage 3: Controlled 30-Day BYOK Pilot ($0 Platform Fee)
Live production routing with hard bounded-risk engineering controls:
- **Pilot Controls**:
  - Pre-set traffic volume cap (e.g., max 5,000 requests/day).
  - Daily spend ceiling enforced by customer-scoped keys.
  - Immediate kill-switch to bypass proxy.
  - Automated fallback to original baseline provider on timeout/error.
  - Maximum tolerated rescue rate threshold ($< 5\%$).
  - Strict latency ceiling ($P95 \le \text{baseline} + 250\text{ms}$).
  - Instant rollback procedure requiring zero code changes.

---

## 5. Non-Dilutive Startup Credits & Grant Alignment

| Program | Verified Value | Eligible Workloads | Application Strategy & Provenance |
| :--- | :--- | :--- | :--- |
| **Google Cloud Start** | $2,000 USD | Gemini 2.5/3.6, Vertex AI, Cloud Run | Pre-funded startup credits covering internal control traffic and benchmark evaluations. *(verified_as_of: 2026-08-20)* |
| **Microsoft for Startups** | Up to $1,000 (Initial)<br>Up to $5,000 (Verified)<br>Up to $150,000 (Scale) | Azure OpenAI, Mistral, Azure VM | Subsidizes enterprise validation suites and OpenAI proxy regression testing. *(verified_as_of: 2026-08-20)* |
| **AWS Activate Founders** | $1,000 – $5,000 | AWS Bedrock, Claude, Hosting | Edge infrastructure and Bedrock validation support. *(verified_as_of: 2026-08-20)* |
| **NRC IRAP / Regional R&D** | Non-dilutive R&D Grant | R&D technical salaries, algorithmic experimentation | Positioned strictly as an R&D technical project: *"Develop and validate a provider-independent routing and evidence system that reduces inference cost while preserving measured task quality across heterogeneous production workloads."* Avoids operational subsidy exclusions. |

---

## 6. Pilot Governance & Exit Criteria

At the end of the 30-day controlled pilot, the customer receives an **Audited Evidence Reconciliation Package** containing:
1. Total actual observed provider spend vs counterfactual baseline spend.
2. Verified task quality metrics and non-inferiority proof.
3. System reliability metrics (rescue rate, fallback frequency, P50/P95 latency).
4. Proposed ongoing commercial platform fee structured to guarantee net savings.
