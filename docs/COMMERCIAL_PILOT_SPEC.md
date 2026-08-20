# REI.ai — Commercial Pilot Specification & BYOK Architecture

## 1. Commercial Architecture: Bring Your Own Key (BYOK)

To avoid cash-flow liabilities and align incentives, REI operates as an intelligent control and measurement layer rather than a resold inference provider.

```
┌─────────────────────────────────────────────────────────────┐
│                      CUSTOMER BUSINESS                      │
│   - Application / Agents (Cursor, Cline, Aider, custom)     │
│   - Provider API Keys (OpenAI, Gemini, Groq, DeepSeek)      │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                REI.AI CONTROL & ROUTING PROXY               │
│   1. Inspects semantic hinge & complexity R(T) locally      │
│   2. Runs client-side safety & anti-slop pre-flight checks  │
│   3. Selects optimal provider & model route                 │
│   4. Forwards request using customer's own API credentials  │
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
│   - Provider bills customer directly                        │
│   - Zero inference cash-flow liability on REI               │
│   - Evidence ledger proves actual reconciled cost delta     │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. The Commercial Proposition

$$\text{Total Monthly Cost} = \text{Reduced Provider Spend} + \text{REI Platform Fee} \ll \text{Original Unmanaged Spend}$$

> **"You pay REI because REI makes the total number smaller."**

For pilot engagements, REI is offered at **$0 platform fee for 30 days**. The customer keeps their existing provider accounts and billing relationships intact.

---

## 3. Three-Stage Low-Risk Pilot Funnel

```
┌───────────────────────────┐
│ Stage 1: Replay Audit     │ → 10k historical prompts replayed offline
│                           │   Zero inference cost; counterfactual report generated
└─────────────┬─────────────┘
              ▼
┌───────────────────────────┐
│ Stage 2: Stratified A/B   │ → 500–2,000 representative cases tested
│                           │   Direct quality & latency comparison
└─────────────┬─────────────┘
              ▼
┌───────────────────────────┐
│ Stage 3: Live BYOK Proxy  │ → 30-day zero-risk live routing trial
│                           │   Direct customer keys; live telemetry receipts
└───────────────────────────┘
```

### Stage 1: Offline Replay Audit (Zero Inference Spend)
- **Input**: Customer exports an anonymized request log sample ($N \approx 10,000$ requests).
- **Execution**: REI's offline replay harness evaluates route selections and computes exact counterfactual cost savings against their existing unrouted baseline.
- **Output**: An executive audit report detailing estimated savings, domain distribution, and Layer 0 deflection rate.

### Stage 2: Stratified A/B Validation ($N=500–2,000$ Requests)
- **Execution**: A representative stratified sample across difficulty tiers is executed in parallel against both the baseline model and the REI-selected route.
- **Evaluation**: Output quality is evaluated via deterministic and multi-model cross-check gates to prove zero quality degradation.

### Stage 3: Live 30-Day Zero-Risk Trial
- **Integration**: The customer changes their client `baseURL` to `https://proxy.rei.ai/v1` and supplies their existing API keys via headers.
- **Operation**: Live traffic is routed with full failover, rescue-fallback protections, and live cost-attribution telemetry.

---

## 4. Non-Dilutive Startup Credits & Grant Alignment

| Program | Value | Eligible Workloads | Application Strategy |
| :--- | :--- | :--- | :--- |
| **Google Cloud Start** | $2,000 USD | Gemini 2.5/3.6, Vertex AI, Cloud Run | Pre-funded startup credits covering internal control traffic and benchmark evaluations. |
| **Microsoft for Startups** | $1,000–$5,000 | Azure OpenAI, Mistral, Azure VM | Subsidizes enterprise validation suites and OpenAI proxy regression testing. |
| **AWS Activate Founder** | $1,000–$5,000 | AWS Bedrock, Claude, Hosting | Infrastructure support for edge proxy deployment. |
| **NRC IRAP / Regional R&D** | Non-dilutive R&D Grant | R&D salaries, algorithmic experimentation | Position as a technical innovation project: *"Develop and validate a provider-independent routing and evidence system that reduces inference cost while preserving measured task quality across heterogeneous production workloads."* |

---

## 5. Summary of Commercial Advantages

1. **Zero Cash-Flow Traps**: Customer provider bills never flow through REI's balance sheet.
2. **Frictionless Onboarding**: Customer retains existing enterprise discount tiers and compliance contracts with their upstream model providers.
3. **Empirical Trust**: Every routing decision produces an auditable trace with exact epistemic tiering (`Observed`, `Derived`, `Modeled`, `Replayed`, `Unavailable`).
