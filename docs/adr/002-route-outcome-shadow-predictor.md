# ADR 002: Route outcome learning and shadow predictor

**Status:** Accepted for staged implementation
**Decision date:** 2026-08-23
**Pinned baseline:** `ede01009408035461d6a869f12f7e05609b084e9`

## Context

REI already records dense execution evidence (`routingLog`: durable IDs, request correlation, selected/resolved model, status, truncation, rescue, continuation counts, tokens, actual cost) and sparse verdicts (`evalLog`: quality, safety, routing correctness). The missing capability is smaller than a new learning platform: close the loop between *what happened after routing* and *whether prior evidence could predict it*.

## Decision

1. `RouteOutcome` is a **pure deterministic join** of existing authoritative records — never a new outcome store.
2. Delivery, quality, safety, and routing-policy are **independent outcome dimensions**, never collapsed into one "failure" bit.
3. v1 predicts a single, directly-observable target: **delivery failure risk**. Quality prediction is deferred until a calibrated pass contract exists.
4. Delivery is conservatively derived: `status == error` → failure; `finalTruncated == true` → failure; `status == success && finalTruncated == false` → success; otherwise unknown. Missing telemetry → unknown, never success.
5. `truncated == true` with `finalTruncated == false` remains success (continuation repaired it); `rescue` annotates, never forces failure.
6. Model identity provenance is explicit: `observed` (resolvedModel present), `derived` (only selected model present), `unavailable`.
7. Quality reports `unknown` in v1 — a `qualityScore` is a number until an evaluator publishes a pass threshold.
8. Prediction features are **privacy-preserving, non-content bands** (route, domain, model, hinge band, structured flag, adversarial band, input-size band). No raw prompt, embeddings, or semantic vectors enter the predictor.
9. Shadow predictions are recorded **before** execution with a `predictedAt` that must precede the outcome it claims to predict. No retroactive prediction counts as evidence.
10. The authority ladder is `shadow` → `advisory` → `policy-candidate`; **automatic routing influence is out of scope**.
11. `policyProposalEngine` remains self-informed, not self-modifying. C-Activity learning signals become proposals for human review only.

## Trust boundary

- v1 may claim: *"REI records observed route outcomes and evaluates pre-execution shadow predictions against subsequent outcomes without changing production routing."*
- v1 may **not** claim model-ranking ("Model B would have been better") — production logs only observe the model that actually executed; counterfactual alternatives require replay or controlled sampling.
- Missing precedent → `unknown`, never `0% risk`. Risk estimates use a Wilson binomial interval, never naive percentages or "model confidence".
- Different resolved model identities are never pooled automatically (model-version drift control).

## Consequences

- Routing, provider selection, security escalation, pricing, CARDO hinge weights, fingerprints, and the canonical routing-eval denominator remain unchanged.
- Shadow predictions have zero routing authority until promotion gates (calibration, baseline-beating, temporal holdout, model-version handling) are met with frozen evidence.
- Default exports of predictions/outcomes carry feature bands, route/model, support, risk, and outcomes — never raw prompts, `inputPreview`, or evaluation free-text.
