# Policy Improvement Loop

REI is a **controller around intelligence**, not intelligence itself. An LLM is the expensive
actuator; REI is the control system that decides whether to infer, which model, how much, how
risky, with what evidence, and at what cost. This document is the specification of that loop —
how evidence becomes policy, and the boundary that keeps it self-informed rather than
self-modifying.

## The loop

```
             ┌─────────────────────────┐
             │       REI POLICY        │
             │                         │
             │  Should we infer?       │
             │  Which model?           │
             │  How much?              │
             │  How risky?             │
             │  What evidence?         │
             │  What cost?             │
             └───────────┬─────────────┘
                         │
                         ▼
                 ┌───────────────┐
                 │      LLM      │
                 └───────┬───────┘
                         │
                         ▼
                 ┌───────────────┐
                 │   Evaluation  │
                 └───────┬───────┘
                         │
                         ▼
                 ┌───────────────┐
                 │ Error / Trace │
                 └───────┬───────┘
                         │
                         └──────► policy improvement
```

## Boxes mapped to live code

| Box | Live implementation |
|-----|---------------------|
| **REI POLICY** | Decision cascade `src/lib/nightShiftRouter.ts` (`buildRouterDecision`), hinge classifier `src/lib/hingeClassifier.ts` (ECS/DAS/APS), red-team D1 scanner `src/lib/redTeamScanner.js`, domain prompts `src/systemPrompts.js`, claims gate `src/lib/claimGateway.ts` + `src/__eval__/claimRegistry.ts` |
| **LLM (actuator)** | Provider calls + fallback chain + rate-limit/cooldown `api/cfai.js` (DeepSeek / Gemini / Groq / OpenAI) |
| **Evaluation** | Deterministic eval loop: `requestId` correlation → `src/lib/evalLog.ts` (`routeExpected`, `routeCorrect`, `safetyVerdict`, `qualityScore`) → claims gate `verifyAll()` |
| **Error / Trace** | `src/lib/routingLog.ts` (what happened + cost), `src/lib/claimHistory.ts` (claim drift over time), error-gap catalogue (`docs/ERROR_GAP_CATALOGUE.md`), `docs/INCIDENT-001-ROUTING-MEASUREMENT.md` |
| **Policy improvement** | `docs/POLICY_PROPOSALS.md` (the proposal registry) — see protocol below |

## The 6-step loop protocol

1. **Measure** — a request is routed; the decision, cost estimate, and post-response actuals are
   written to `routingLog` under a `requestId`.
2. **Evaluate** — the deterministic scanner scores input and response; `evalLog` records
   `routeExpected` (policy-derived expectation) vs `routeCorrect` (observed outcome), plus a
   `safetyVerdict`. Claims gate `verifyAll()` scores the system's own published numbers.
3. **Trace** — anomalies surface as entries: a missed escalation, a false-positive escalation, an
   unexpectedly cheap/expensive route, a drifting claim.
4. **Review** — a human reads the trace and the evidence. (This step is the gate. It is never
   skipped.)
5. **Policy change** — a proposal in `POLICY_PROPOSALS.md` is applied as an actual engineering
   change: new fingerprint term, scanner pattern, route weight, threshold, or claim definition.
6. **Re-measure** — the change ships with tests + claims, and the loop starts again. The next
   evaluation measures the change's effect.

## The boundary: self-informed, NOT self-modifying

```
Observed evidence
      ↓
Deterministic proposal          ← machine (policyProposalEngine)
      ↓
Human/claims-gate review        ← gate (never skipped)
      ↓
Actual engineering change       ← human + tests + claims
      ↓
New observed evidence           ← loop repeats
```

NOT:

```
Observed evidence
      ↓
Automatic policy modification    ← never happens
```

The system may **propose** policy changes from its own eval trace. It may never **apply** them.
Application requires a human review and an engineering change that ships with tests and claims.
This is what separates a *self-informed* system (one that reads its own measurements before
reasoning) from a *self-modifying* system (one that rewrites its own behavior autonomously).
REI is deliberately the former.

## Design constraints on proposal generation

- **Pure / deterministic**: same observed evidence → same proposals. No LLM calls, no network,
  no provider cost, no random variation.
- **No policy mutation**: the proposal engine reads evidence and emits proposals. It never
  changes routing thresholds, weights, fingerprints, scanner patterns, or claim definitions.
- **Evidence, not absence of evidence**: each signal must fire on an *observable* downstream
  signal, never on "we saw nothing." A missed escalation requires a scanner escalation that did
  not reach the adversarial route. A false-positive escalation requires a benign outcome signal,
  not merely an expensive route. Cheap-route opportunity must distinguish *cheaper* from *safe
  to route cheaper*. Claim drift consumes the existing claims/integrity machinery — it does not
  invent a second definition of truth.
- **Provenance**: every proposal carries how it was discovered, so the loop can answer "how did
  we catch this?" — the `[caught: X]` convention.
