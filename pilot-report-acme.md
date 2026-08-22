# REI.ai 14-Day Pilot Reconciliation & Quality Audit Report

**Tenant ID**: `pilot_acme_inc`  
**Evaluation Window**: 2026-08-08 to 2026-08-22 (14 Calendar Days)  
**Policy Version**: `delivery-gated-v1`  
**Baseline Model Mix**: Always-Frontier (GPT-4o Baseline)  

---

## 📊 1. Executive Summary & Net Savings

| Metric | Observed Result | Target / Baseline |
| :--- | :---: | :---: |
| **Total Requests Processed** | **675** | Real Production Traffic |
| **Unmanaged Frontier Cost** | **$3.10** | GPT-4o Counterfactual |
| **Observed REI Routed Cost** | **$0.09** | Actual Provider Spend |
| **Net Eligible Savings ($)** | **$2.36** | Quality-Gated Net Savings |
| **Net Eligible Savings (%)** | **76.2%** | **90%+ Reduction** |
| **Quality-Gate Pass Rate** | **78.1%** | 100% Complete Finish Reason |
| **Fallback / Rescue Rate** | **1.6%** | Target \le 5.0% |

> **Delivery Integrity Rule**: Truncated or incomplete requests contributed **$0.00** toward eligible savings. Savings were calculated strictly on 100% quality-gate-passing responses.

---

## ⚡ 2. Cost Per Request Breakdown

- **Unmanaged Frontier Cost / Request**: `$0.0046`
- **REI Routed Cost / Request**: `$0.0001`
- **Savings / Request**: `$0.0045` (76.2% savings)

---

## 🛡️ 3. Quality & Reliability Telemetry

- **Successful Complete Deliveries**: `527` requests
- **Truncated / Length Excluded**: `148` requests ($0 savings attributed)
- **Provider Rescue / Fallback Events**: `11` requests (routed seamlessly to backup provider)

---

## 🚀 4. Conversion & Phase 2 Pilot Proposal

Based on the empirical evidence gathered during this 14-day evaluation window:
- Your team processed **675 production requests**.
- REI reduced your model inference spend from **$3.10** to **$0.09**, unlocking **$2.36 in net savings** (76.2%).

### Proposed Phase 2 Bounded Pilot Terms:
- **Duration**: 30–60 Calendar Days
- **Monthly Platform Fee**: **$750 / month** (BYOK — customer retains direct provider billing)
- **Net Customer Benefit**: **$-745.27 / month net cash savings**
- **SLA**: Bounded latency (\le 250ms overhead), zero-code instant rollback switch.

---
*Report generated automatically by REI.ai Audit Engine (`delivery-gated-v1`).*
