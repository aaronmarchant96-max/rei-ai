<!--
CARDO REI methodology applied to this document.
Reference: [CARDO REI Methodology](PROMPTHOUND-DOCS/CARDO-REI.md)
-->

# CARDO GUARD Calibration Spec

This document defines the future calibration path for CARDO GUARD.

The current CARDO GUARD UI remains a synthetic decision gate. This spec describes the next layer:

- Arena Harness produces calibration artifacts from evaluation logs.
- CARDO GUARD consumes those artifacts to turn raw model confidence into a calibrated decision gate.

## Goal

Let CARDO GUARD answer a business question with calibrated model evidence:

- Should we act on this AI risk score?
- If yes, why?
- If no, why not?

The core idea stays the same:

- compare cost to act against cost of missing
- make the hinge visible
- keep the explanation readable to a non-technical operator

## File Layout

### Current CARDO GUARD UI

- [`src/CardoGuard.jsx`](/home/potatoking/debate-furnace/src/CardoGuard.jsx)
  - Renders the human-first UI
  - Reads the evaluation result
  - Shows the recommendation, hinge, and explanation

- [`src/lib/cardoGuard.js`](/home/potatoking/debate-furnace/src/lib/cardoGuard.js)
  - Current synthetic decision math
  - Scenario presets
  - Human-readable explanation helpers

### Future Calibration Lane

- `scripts/build-cardo-guard-calibration.mjs`
  - Reads Arena Harness logs
  - Fits calibration curves
  - Writes a calibration artifact

- `data/cardo-guard.calibration.json`
  - Versioned calibration artifact consumed by CARDO GUARD
  - Built from real evaluation logs, not manual input

- `src/lib/cardoGuardCalibration.js`
  - Loads the calibration artifact
  - Maps raw confidence to calibrated probability
  - Exposes uncertainty values

- `src/lib/cardoGuardDecision.js`
  - Computes the decision gate from calibrated probability, cost to act, and cost of missing
  - Returns the recommendation and explanation text

## Data Flow

### 1. Arena Harness produces logs

Input fields:

- `model_id`
- `scenario_id`
- `raw_confidence`
- `actual_outcome`
- `timestamp`

### 2. Calibration artifact is built

The calibration build step turns logs into a deployable artifact.

Two supported calibration methods:

- isotonic regression
- Platt scaling

The artifact stores both the calibration curve and the uncertainty estimate.

### 3. CARDO GUARD consumes the artifact

CARDO GUARD reads the artifact and uses it to:

- translate raw confidence into calibrated probability
- estimate uncertainty around that probability
- compare action cost and miss cost

### 4. CARDO GUARD shows the gate

The UI shows:

- raw confidence
- calibrated probability
- uncertainty
- expected action waste
- expected miss loss
- recommendation
- hinge
- short reason

## Calibration Artifact Shape

Recommended JSON shape:

```json
{
  "modelId": "arena-harness-v1",
  "calibrationMethod": "isotonic",
  "generatedAt": "2026-05-29T18:45:00.000Z",
  "sampleSize": 1284,
  "source": {
    "repo": "arena-harness",
    "logPath": "data/evaluation-logs.jsonl"
  },
  "buckets": [
    {
      "rawConfidenceMin": 0.8,
      "rawConfidenceMax": 0.9,
      "calibratedProbability": 0.74,
      "sigma": 0.06,
      "falseAlarmRate": 0.26
    }
  ]
}
```

### Field Notes

- `calibratedProbability`
  - The probability that the risk is real after calibration.

- `sigma`
  - The estimated standard error for the calibrated probability.

- `falseAlarmRate`
  - The complement of calibrated probability in the chosen bucket.

- `buckets`
  - Confidence ranges with bucket-level calibration values.

## Decision Gate Logic

Recommended decision logic:

```text
expected_action_waste = cost_to_act * (1 - calibrated_probability)
expected_miss_loss = cost_to_miss * calibrated_probability

decision_ratio = expected_miss_loss / expected_action_waste
uncertainty_penalty = 1 + gamma * sigma / (calibrated_probability * (1 - calibrated_probability))

act if decision_ratio > uncertainty_penalty
```

### Plain-English Meaning

- If the model is wrong, acting may waste money.
- If the risk is real, ignoring it may cost more.
- CARDO GUARD compares those two costs before turning a score into a decision.
- If the calibration is noisy, the gate gets stricter.

## UI Copy Guidance

The current synthetic demo should stay simple, but the calibration-backed mode should use plain labels:

- `Should we act on this AI risk score?`
- `CARDO GUARD`
- `Chance risk is real = 100% - false alarm rate`
- `Expected cost if we act and the model is wrong`
- `Expected cost if we ignore it and the risk is real`
- `The decision hinge`

Avoid leading with technical terms like:

- calibration curve
- calibration artifact
- uncertainty penalty
- standard error

Those terms can appear in an expandable `How this works` section, but not in the first read.

## Implementation Notes

Keep the product split clean:

- The current synthetic CARDO GUARD remains the default demo.
- The calibration-backed flow is a separate mode or follow-on feature.
- Arena Harness remains the source of truth for real calibration logs.
- CARDO GUARD only consumes the calibration artifact.

## Why This Matters

This makes CARDO GUARD more credible without making it feel like a math dashboard.

It becomes:

- a human-first decision gate
- backed by real calibration
- honest about uncertainty
- still understandable in seconds

