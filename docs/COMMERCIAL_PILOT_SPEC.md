# REI.ai — Commercial Pilot Specification & BYOK Architecture

## 1. Commercial Architecture: Bring Your Own Key (BYOK)

To eliminate inference cash-flow liability and maintain enterprise billing alignments, REI operates strictly as an intelligent control, safety-gate, and measurement proxy rather than a resold inference provider.

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
│   3. Selects policy-eligible provider and model route       │
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
│   - Stage 3 evidence reconciles observed provider billing   │
│     against baseline; Stage 1 produces modeled estimates    │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Implementation Status & Readiness Legend

To maintain strict evidence integrity, system capabilities are classified into two explicit tiers:

| Status Tier | Definition | Current Capabilities |
| :--- | :--- | :--- |
| **`[IMPLEMENTED & EVIDENCED]`** | Fully implemented in repository source code and verified by automated test suites. | • Deterministic Layer 0 router & complexity calculator (`nightShiftRouter.ts`)<br>• Serverless OpenAI-compatible proxy (`/api/v1/chat/completions`)<br>• Response headers (`X-REI-Pathway`, `X-REI-Savings`)<br>• Dynamic multi-provider dispatch with automated fallback (`cfai.js`)<br>• Pre-spend budget ceiling projection (`isOverBudget`)<br>• Epistemic evidence recording (`RequestEvidence`, `storeTrace`)<br>• Authoritative test runner & claims synchronization gate |
| **`[REQUIRED BEFORE STAGE 3 LAUNCH]`** | Contractual pilot requirement that must be configured, verified, or deployed before live customer traffic begins. | • Containerized VPC / Local Sidecar packaging<br>• Hosted tenant-isolated credential vault (if hosted option selected)<br>• Customer-specific daily aggregate spend & request rate limiters<br>• Customer-accessible emergency kill-switch integration<br>• Production circuit breakers (rescue rate $\le 5\%$, $P95$ latency $\le \text{baseline} + 250\text{ms}$)<br>• Zero-code instant rollback procedure |

---

## 3. The Commercial Proposition

$$\text{Total Monthly Cost} = \text{Reduced Provider Spend} + \text{REI Platform Fee} \ll \text{Original Unmanaged Baseline}$$

> **"You pay REI because REI makes the total number smaller."**

For pilot engagements, REI is offered with a **$0 platform fee for 30 calendar days**. The customer retains their direct enterprise discount tiers, volume commitments, and billing relationships with all upstream model providers.

---

## 4. Credential Security & Invariants

BYOK solves the balance-sheet liability, but credential security requires explicit architectural boundaries:

### Deployment Architectures
1. **Local / VPC Sidecar Proxy (Required Architecture for Early Pilots)**:
   - Containerized REI proxy deployed within the customer's private cloud / VPC.
   - Provider API keys never leave the customer's network boundary.
2. **Hosted Control Plane (`[REQUIRED BEFORE STAGE 3 LAUNCH]` if hosted)**:
   - Requires dedicated encrypted tenant secret storage, complete tenant isolation, least-privilege provider-scoped keys with hard spend ceilings, and audit logging.

### Security Invariants
- **No Unprotected Key Headers**: Long-lived provider credentials must not be transmitted as arbitrary unprotected request headers. Credential transport must use approved sidecar or vaulted mechanisms.
- **Zero Token Persistence by Default**: Prompts and completions are never stored to disk or database unless a customer explicitly authorizes a diagnostic mode with a defined deletion schedule.
- **Zero Credential Logging**: Authorization headers and provider secrets are stripped at the edge and never appear in traces, logs, error reports, or telemetry.
- **Immediate Revocation**: Customer can rotate or revoke keys directly in their provider consoles at any time.

---

## 5. Three-Stage Graduated Pilot Funnel

```
┌──────────────────────────────────────────────────────────┐
│ Stage 1: Offline Replay Audit                            │ → Anonymized historical logs replayed
│ Deterministic Replayed Cost Estimate                     │   Modeled savings signal (Zero spend)
└────────────────────────────┬─────────────────────────────┘
                             ▼
┌──────────────────────────────────────────────────────────┐
│ Stage 2: Bounded A/B Non-Inferiority Validation          │ → 500–2,000 representative cases
│ Statistical Non-Inferiority Testing                      │   Quality retention (δ = 3 percentage points)
└────────────────────────────┬─────────────────────────────┘
                             ▼
┌──────────────────────────────────────────────────────────┐
│ Stage 3: Controlled BYOK Pilot — $0 REI Platform Fee     │ → Live production traffic with bounded limits
│ Reconciled Observed Telemetry                            │   30 calendar days; live telemetry receipts
└──────────────────────────────────────────────────────────┘
```

### Stage 1 — Offline Replay Audit: Deterministic Replayed Cost Estimate
- **Execution**: No provider inference is executed. REI's deterministic replay engine evaluates routing decisions offline against versioned rate cards.
- **Data Stratification**:
  - `Observed`: Historical request volume, provider/model distribution, historical token counts (if supplied).
  - `Replayed`: Deterministic REI-selected route per query.
  - `Modeled`: Counterfactual provider cost under versioned pricing rate cards.
  - `Derived`: Estimated net savings signal and domain deflection percentage.
- **Output**: **Deterministic replayed cost estimate under versioned provider pricing**. (Never labeled as actual, observed, or guaranteed savings).
- **Advancement Gate**: Recommended modeled savings signal $\ge 20\%$ (advisory threshold agreed with customer).

### Stage 2 — Bounded A/B Non-Inferiority Validation
- **Hypothesis**: REI-routed outputs are non-inferior to baseline flagship outputs within a pre-specified margin ($\delta = 3\text{ percentage points}$).
- **Evidence Hierarchy**:
  1. **Primary**: Task-specific objective metrics (e.g. test pass rate, schema compliance) where available.
  2. **Primary / Secondary**: Stratified blind human review (50–100 edge cases).
  3. **Secondary / Corroborating**: Multi-model judge cross-checks and deterministic format gates.
- **Approved Conclusion**: If the statistical gate passes, the report states:
  > *"No material quality degradation was detected within the pre-specified non-inferiority margin."*
- **Alternative**: If non-inferiority is not established, the report states:
  > *"Non-inferiority was not established for the evaluated workload under the pre-specified margin."*

### Stage 3 — Controlled BYOK Pilot — $0 REI Platform Fee
Live production routing with customer-approved bounded-risk engineering controls:
- **Contractual Controls & Limits**:
  - **Operating Duration**: 30 calendar days.
  - **REI Platform Fee**: $0.00 USD (customer remains responsible for direct provider usage).
  - **Traffic Cap**: Customer-approved requests/day or percentage of eligible traffic.
  - **Daily Spend Ceiling**: Customer-approved currency amount/day enforced via scoped keys.
  - **Emergency Kill Switch**: Named customer and REI operators with immediate DNS/config bypass.
  - **Baseline Fallback**: Automated fallback to original baseline provider on timeout/error.
  - **Rescue Threshold**: $\le 5\%$ of total requests.
  - **Latency Ceiling**: $P95 \le \text{agreed baseline } P95 + 250\text{ms}$.
  - **Availability Target**: Proposed $\ge 99.9\%$.
  - **Data Retention**: Prompt retention disabled by default.
  - **Rollback Procedure**: Zero-code rollback procedure with verified recovery time.

---

## 6. Non-Dilutive Startup Credits & Grant Alignment

*(Verified against direct official program sources as of 2026-08-20)*

| Program | Verified Support Structure | Official Program Source | Workload & Strategy Alignment |
| :--- | :--- | :--- | :--- |
| **Google for Startups Cloud Program** | Start tier: **$2,000 USD** in Google Cloud credits (valid 1 year); covers proprietary Google models including Gemini. | [Google Cloud Startup Benefits](https://cloud.google.com/startup/benefits) | Pre-funded credits subsidize internal benchmark validation and control workloads. *(verified_as_of: 2026-08-20)* |
| **Microsoft for Startups Founders Hub** | Staged progression: Initial up to **$1,000**; Verified business milestone up to **$5,000**; Later milestones up to **$150,000** in Azure credits. | [Microsoft for Startups](https://www.microsoft.com/en-us/startups) & [Azure Credit Progression](https://learn.microsoft.com/en-us/microsoft-for-startups/benefits/azure-credits) | Subsidizes enterprise validation suites, Azure OpenAI, and Mistral model testing. *(verified_as_of: 2026-08-20)* |
| **AWS Activate** | Founders tier: **$1,000** to **$5,000** in AWS credits (valid for AWS services including Bedrock). | [AWS Activate Credits](https://aws.amazon.com/startups/credits) | Edge proxy infrastructure and Bedrock validation support. *(verified_as_of: 2026-08-20)* |
| **NRC IRAP** | Non-dilutive financial support for qualifying Canadian SME R&D and technological innovation projects. | [NRC IRAP Financial Support](https://nrc.canada.ca/en/support-technology-innovation/financial-support-technology-innovation-through-nrc-irap) | Positioned strictly as an R&D technology innovation project (*"Develop and validate a provider-independent routing and evidence system that reduces inference cost while preserving measured task quality across heterogeneous production workloads"*). Does not fund routine operating expenses or third-party inference bills. *(verified_as_of: 2026-08-20)* |

---

## 7. Exit Reconciliation Package

At the end of Stage 3, the customer receives an **Audited Evidence Reconciliation Package** reporting three separate evidence blocks:
1. **Stage 1 Block (Modeled Replay Evidence)**: Replayed routing distribution and modeled counterfactual savings under versioned rate cards.
2. **Stage 2 Block (Experimental Quality Evidence)**: Statistical non-inferiority evaluation, win/tie/loss counts, and objective metric reports.
3. **Stage 3 Block (Observed Live Evidence)**: Reconciled observed provider charges, observed latency distribution ($P50/P95$), observed availability, rescue rate ($\le 5\%$), and fallback frequency.
