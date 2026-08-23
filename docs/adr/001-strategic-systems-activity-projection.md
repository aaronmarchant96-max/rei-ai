# ADR 001: Strategic systems analysis and Activity projection

**Status:** Accepted for staged implementation
**Decision date:** 2026-08-23
**Pinned baseline:** `941a104bcc3855d3a6fd788e4c71d97f4feaff2a`

## Context

REI already records routing telemetry, CARDO decision artifacts, and evaluations in separate stores. Strategic systems analysis needs an evidence-bearing machine contract without changing routing, pricing, security escalation, or canonical evaluation denominators.

## Decision

1. `routingLog`, `decisionStore`, and `evalLog` remain authoritative for their existing responsibilities.
2. Activity is a deterministic read projection over those stores, never a fourth source of truth.
3. Validated `StrategicSituation` objects belong to the correlated decision artifact.
4. Runtime `EpistemicProvenance` remains separate from domain-level `StrategicEpistemicStatus`.
5. Product language uses **declared objective vs incentive model**. It never calls inferred motives “actual incentives.”
6. Strategic metadata is fail-open for the visible answer and fail-closed for persistence.
7. New source records receive durable IDs at write time. Legacy identities never depend on array position.
8. Activity exposes `complete`, `partial`, `legacy`, and `orphaned` projection states instead of silently hiding missing retained data.
9. Strategic interventions are domain advice. `policyProposalEngine` remains restricted to internal, human-reviewed REI governance proposals.
10. Incentive and confidence values remain categorical until empirical calibration exists.

## Trust boundary

A strategic response may contain one reserved, trailing JSON envelope. The envelope is canonical only after strict version, size, depth, cardinality, reference, and epistemic validation. Malformed, multiple, embedded, or non-trailing envelopes are discarded in full while the visible answer is still delivered.

Default exports remove prompt-bearing summaries, details, claims, and evidence content. No strategic artifact may be persisted partially.

## Consequences

- Ordinary requests retain existing CARDO behavior.
- Strategic detection cannot influence route or provider selection.
- Retention gaps remain visible and auditable.
- Predictions, outcomes, calibration, and game-state drift remain deferred until the v1 schema has real usage evidence.
