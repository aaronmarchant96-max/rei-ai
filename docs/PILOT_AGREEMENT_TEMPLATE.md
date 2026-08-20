# REI.ai — Commercial Pilot Agreement & Terms Template

**Customer:** `[Customer Company Name]`  
**Provider:** PromptHound Labs / REI.ai  
**Pilot Operating Duration:** 30 Calendar Days from Stage 3 Launch  
**REI Platform Fee during Pilot:** **$0.00 USD**  
**Architecture:** Bring Your Own Key (BYOK) — Customer-Scoped Provider Credentials  

---

## 1. Objectives & Scope

This agreement establishes the terms for evaluating the **REI.ai Cognitive Control & Routing Layer** across customer AI workloads to:
1. Model and evaluate potential inference cost reduction across heterogeneous LLM providers.
2. Verify output quality retention within a statistical non-inferiority margin ($\delta = 3\text{ percentage points}$).
3. Deliver a reproducible evidence reconciliation package comparing baseline vs routed economics and operational reliability.

---

## 2. Shared Security & Operational Responsibilities

```
┌─────────────────────────────────────────────────────────────┐
│                   CUSTOMER RESPONSIBILITIES                 │
│ • Provide dedicated, scoped provider credentials.           │
│ • Set provider-side hard spend limits where available.      │
│ • Authorize and approve traffic caps and daily spend caps.  │
│ • Maintain full key rotation and revocation authority.      │
│ • Name designated kill-switch and rollback operators.       │
│ • Supply baseline models and quality evaluation rubrics.    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      REI RESPONSIBILITIES                   │
│ • Zero credential logging and zero token logging by default.│
│ • Enforce customer-approved routing and rate limits.        │
│ • Maintain strict tenant isolation across all paths.        │
│ • Provide audit records and automated baseline fallbacks.   │
│ • Report threshold violations and circuit-breaker events.   │
│ • Execute agreed zero-code rollback procedures upon request.│
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     JOINT RESPONSIBILITIES                  │
│ • Approve VPC Sidecar vs Hosted architecture.               │
│ • Complete pre-launch security and fallback testing.        │
│ • Establish mutual incident contacts and escalation paths.  │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Graduated Pilot Stages & Advancement Gates

```
Stage 1 — Offline Replay Audit: Deterministic Replayed Cost Estimate (Zero Spend)
  ↓ [Advancement Signal: Recommended Modeled Savings ≥ 20%]
Stage 2 — Bounded A/B Non-Inferiority Validation (500–2,000 cases)
  ↓ [Advancement Gate: Non-Inferiority Established within δ = 3 percentage points]
Stage 3 — Controlled BYOK Pilot — $0 REI Platform Fee (30 Calendar Days)
  ↓ [Exit Deliverable: Reconciled Evidence Package & Operational Report]
Joint Commercial Decision
```

---

## 4. Bounded-Risk Controls & Customer-Approved Limits

Live production routing in Stage 3 is prohibited until both parties have approved and populated the following parameter limits:

| Parameter | Agreed Limit / Specification | Enforcement Mechanism |
| :--- | :--- | :--- |
| **Daily Traffic Cap** | `[ ________________ ]` req/day | Edge rate-limiter |
| **Daily Spend Ceiling** | `[ $______________ ]` / day | Scoped provider key limit |
| **Baseline Route** | `[ ________________ ]` (e.g. gpt-4o) | Contractual baseline |
| **Rescue Threshold** | $\le 5\%$ of total turns | Automated circuit breaker |
| **P95 Latency Ceiling** | $P95 \le \text{Baseline} + 250\text{ms}$ | Latency monitor |
| **Availability Target** | $\ge 99.9\%$ uptime | Multi-provider fallback |
| **Kill-Switch Operator** | `[Customer Name / Role]` | Immediate DNS / Config bypass |
| **Customer Incident Contact** | `[Email / Phone / Slack]` | 24/7 escalation |
| **REI Incident Contact** | `support@rei.ai / +1-xxx-xxx-xxxx` | Lead Architect |
| **Prompt Retention Mode** | Disabled by default (zero retention) | Volatile memory only |
| **Rollback Objective** | Recovery within $< 5$ minutes | Config toggle |

---

## 5. Exit Criteria & Deliverables

At the conclusion of Day 30, REI will deliver a machine-readable **Evidence Reconciliation Package** reporting:
1. **Modeled Replay Findings**: Stage 1 projected distribution under versioned rate cards.
2. **Experimental Quality Findings**: Stage 2 statistical non-inferiority validation results.
3. **Reconciled Observed Telemetry**: Stage 3 observed provider billing vs modeled baseline, observed P95 latency, uptime, fallback events, and rescue rate ($\le 5\%$).

---

## 6. Commercial Terms & Transition

- **$0 Platform Fee**: REI charges $0.00 platform fee during the 30-day Stage 3 period. Customer remains responsible for direct provider usage.
- **Zero-Penalty Disconnect**: Customer may disconnect from the proxy at any time without financial penalty or continuing obligation.
- **Post-Pilot Commercial Transition**: Ongoing commercial engagement is structured such that:
  $$\text{Reduced Provider Spend} + \text{REI Platform Fee} < \text{Original Unmanaged Baseline Spend}$$
  *(Zero variable fees apply unless quality non-inferiority and billing reconciliation gates are verified).*

---

**Authorized Signatures:**

**For Customer (`[Customer Company Name]`):**  
Signature: __________________________  
Name: `[Authorized Signer Name]`  
Title: `[Authorized Signer Title]`  
Date: `[Date]`  

**For PromptHound Labs / REI.ai:**  
Signature: __________________________  
Name: Aaron Marchant  
Title: Lead Architect & Founder  
Date: `[Date]`  
