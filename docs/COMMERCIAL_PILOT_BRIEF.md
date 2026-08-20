# REI.ai — Commercial Pilot Brief (Executive Summary)

**Document:** Customer-Facing 1-Page Pilot Overview  
**Model:** Bring Your Own Key (BYOK) — Zero Inference Cash-Flow Liability  
**Pilot Operating Duration:** 30 Calendar Days from Stage 3 Launch  
**REI Platform Fee during Pilot:** **$0.00 USD**  

---

## 1. Purpose & Value Proposition

REI.ai is an intelligent cognitive control plane that evaluates whether policy-based, deterministic LLM routing can reduce multi-provider inference costs while preserving output quality within an agreed non-inferiority margin ($\delta = 3\text{ percentage points}$).

$$\text{Customer Value} = \text{Reduced Provider Spend} + \text{REI Platform Fee} \ll \text{Original Unmanaged Baseline Spend}$$

> **"You pay REI because REI makes the total number smaller."**

---

## 2. Customer Inputs Required

To execute the graduated pilot, the customer provides:
- Anonymized historical prompt logs ($N \approx 10,000$) with token counts and current model distribution (for Stage 1).
- Customer quality rubric and representative evaluation corpus (for Stage 2).
- Dedicated, scoped provider API credentials with provider-side spend ceilings (for Stage 3).
- Customer-approved operational parameter limits (traffic cap, daily spend ceiling, baseline model, kill-switch operators).

---

## 3. Data Protection & Credential Security Invariants

- **VPC Sidecar Preferred**: Containerized proxy deployed within customer's private cloud; provider credentials never traverse the public internet.
- **No Unprotected Key Headers**: Long-lived provider credentials are never transmitted via arbitrary unprotected HTTP headers.
- **Zero Token Persistence by Default**: Prompts and completions are processed in volatile memory only and never stored to disk or database.
- **Zero Credential Logging**: Secrets and authorization tokens are stripped at the edge and never appear in traces, logs, or analytics.
- **Customer Control**: Customer maintains complete authority over key issuance, rotation, spend caps, and revocation.

---

## 4. Three Graduated Pilot Stages & Gates

```
Stage 1 — Offline Replay Audit: Deterministic Replayed Cost Estimate
  • Evidence: Modeled replay estimate under versioned pricing rate cards (Zero token spend).
  • Gate: Recommended modeled savings signal ≥ 20%.

Stage 2 — Bounded A/B Non-Inferiority Validation
  • Evidence: Experimental quality evidence on representative sample (500–2,000 cases).
  • Gate: Non-inferiority established within δ = 3 percentage points.

Stage 3 — Controlled BYOK Pilot — $0 REI Platform Fee
  • Evidence: Observed live provider telemetry reconciled against baseline (30 calendar days).
  • Gate: Customer-approved cost, quality, availability (≥ 99.9%), P95 latency, and rescue limits.
```

---

## 5. Bounded-Risk Controls & Operational Limits

Live routing in Stage 3 is constrained by explicit, customer-approved boundaries:
- **Daily Traffic Cap**: Pre-set numeric request limit (e.g. 5,000 req/day).
- **Daily Spend Ceiling**: Hard currency ceiling enforced via scoped provider keys.
- **Automated Fallback**: Immediate fallback to original baseline provider on timeout/error.
- **Rescue Rate Circuit Breaker**: Rescue rate threshold $\le 5\%$ of total turns.
- **Latency Ceiling**: $P95 \le \text{agreed baseline } P95 + 250\text{ms}$.
- **Emergency Kill Switch**: Immediate DNS/config bypass operated by designated customer leads.
- **Rollback Objective**: Zero-code rollback validated to recover within $< 5$ minutes.

---

## 6. Deliverables

1. **Stage 1 Replay Audit Report**: Detailed distribution and modeled counterfactual savings.
2. **Stage 2 Quality Experiment Report**: Statistical non-inferiority validation results.
3. **Stage 3 Reconciled Telemetry Package**: Observed provider billing reconciliation, latency profiles, rescue counts, and commercial transition recommendation.

---

## 7. Commercial Terms & Transition

- **$0 Platform Fee**: 30-day Stage 3 live routing is free of platform charges. Customer pays upstream providers directly.
- **Zero-Penalty Disconnect**: Disconnect from the proxy at any time with zero financial penalty or continuing obligation.
- **Post-Pilot Commercial Transition**: Structured to target net customer savings with a shared-value fee. Zero variable fees apply unless quality and billing reconciliation gates are verified.

---

## 8. Epistemic Evidence Disclaimer

> **Important Evidence Distinction:** Stage 1 results are modeled replay estimates under versioned pricing snapshots. Stage 2 results are experimental quality evidence. Only Stage 3 live provider billing and telemetry can produce observed live-cost, latency, and reliability results.
