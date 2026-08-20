# REI.ai — Commercial Pilot Agreement & Terms Template

**Customer:** `[Customer Company Name]`  
**Provider:** PromptHound Labs / REI.ai  
**Pilot Duration:** 30 Calendar Days from Stage 3 Launch  
**REI Platform Fee during Pilot:** **$0.00 USD**  
**Architecture:** Bring Your Own Key (BYOK) — Customer-Scoped Provider Credentials  

---

## 1. Objectives & Scope

This agreement establishes the terms for evaluating the **REI.ai Cognitive Control & Routing Layer** across customer AI workloads to:
1. Measure potential inference cost reduction across heterogeneous LLM providers.
2. Verify output quality retention within a statistical non-inferiority margin ($\delta \le 3\%$).
3. Deliver an audited, reproducible evidence package comparing baseline vs routed economics.

---

## 2. Credential Security & Data Protection Invariants

- **BYOK Credential Isolation**: The Customer supplies dedicated, scoped API keys directly from their provider consoles (OpenAI, Google Cloud, Groq, Anthropic). Customer retains all direct billing relationships and volume discounts.
- **Zero Token Persistence**: Prompts and completions are processed in volatile memory only and are never persisted to disk, database, or analytics pipelines by default.
- **Zero Credential Logging**: Authorization headers and secrets are scrubbed at the edge and never appear in traces, logs, or error reports.
- **Immediate Revocation**: Customer may rotate or revoke API keys at any time directly with the upstream provider.

---

## 3. Graduated Pilot Stages & Gates

```
Stage 1: Offline Replay Audit (Zero Spend)
  ↓ [Gate 1: Projected Net Savings ≥ 20%]
Stage 2: Bounded A/B Non-Inferiority Validation (500–2,000 cases)
  ↓ [Gate 2: Output Quality Retention δ ≤ 3%]
Stage 3: Controlled 30-Day BYOK Production Routing ($0 Platform Fee)
  ↓ [Exit: Audited Evidence Reconciliation Package]
Commercial Decision
```

---

## 4. Operational Boundaries & Risk Limits

To guarantee bounded operational risk, Stage 3 live routing is constrained by the following parameters:

| Control | Parameter Limit | Enforcement Mechanism |
| :--- | :--- | :--- |
| **Traffic Cap** | `[5,000]` requests / day | Edge rate-limiter |
| **Spend Ceiling** | `[$50.00]` / day | Hard provider key limit |
| **Rescue Threshold** | $\le 5\%$ of total requests | Automated fallback |
| **Latency Budget** | $P95 \le \text{Baseline} + 250\text{ms}$ | Circuit breaker |
| **Kill Switch** | Instant bypass to baseline | DNS / Config flag |

---

## 5. Success Criteria & Exit Deliverables

The pilot shall be deemed successful if:
1. **Measured Cost Reduction**: Verified provider cost reduction $\ge 25\%$ vs baseline.
2. **Quality Non-Inferiority**: Evaluated task success delta $\le 3\%$ across stratified benchmark samples.
3. **Availability**: System uptime $\ge 99.9\%$ with rescue fallbacks preventing failed turns.

At the conclusion of Day 30, REI will deliver a machine-readable **Audited Evidence Reconciliation Package** detailing exact observed savings, latency profiles, and routing traces.

---

## 6. Commercial Transition Terms

Upon successful completion, Customer may opt to:
- **Transition to Standard Commercial Tier**: Ongoing platform fee structured to guarantee that:
  $$\text{Reduced Provider Spend} + \text{REI Platform Fee} < \text{Original Unmanaged Baseline Spend}$$
- **Discontinue with Zero Penalty**: Disconnect proxy `baseURL` with zero ongoing commitments.

---

**Authorized Signatures:**

**For Customer:**  
Signature: __________________________  
Name: `[Name]`  
Title: `[Title]`  
Date: `[Date]`  

**For PromptHound Labs / REI.ai:**  
Signature: __________________________  
Name: Aaron Marchant  
Title: Lead Architect & Founder  
Date: `[Date]`  
