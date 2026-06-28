<!--
CARDO REI methodology applied to this document.
Reference: [CARDO REI Methodology](PROMPTHOUND-DOCS/CARDO-REI.md)
-->

# CARDO GUARD Calibration Implementation Checklist

Use this when moving CARDO GUARD from the synthetic demo into an Arena-backed calibration mode.

## Inputs

- [ ] Arena Harness logs include `model_id`, `scenario_id`, `raw_confidence`, `actual_outcome`, and `timestamp`.
- [ ] The calibration dataset is built from evaluation logs, not manual demo values.
- [ ] The calibration method is chosen and documented: isotonic regression or Platt scaling.

## Artifact

- [ ] A calibration artifact is generated and versioned.
- [ ] The artifact stores the calibration method, sample size, and generation time.
- [ ] The artifact includes calibrated probability by bucket.
- [ ] The artifact includes uncertainty by bucket.
- [ ] The artifact keeps demo-only data separate from real calibration data.

## Decision Gate

- [ ] CARDO GUARD reads the calibration artifact.
- [ ] Raw confidence is mapped to calibrated probability.
- [ ] Uncertainty is available to the decision gate.
- [ ] The decision gate compares expected action waste against expected miss loss.
- [ ] The uncertainty penalty is documented before it is used in the recommendation.

## UI

- [ ] The first read still asks: `Should we act on this AI risk score?`
- [ ] The UI still leads with the plain human question.
- [ ] The calibration section is expandable or secondary, not dominant.
- [ ] The output stays readable to a non-technical operator.

## Safety

- [ ] The UI still says synthetic when it is synthetic.
- [ ] The UI does not imply operational advice from demo data.
- [ ] The UI does not claim improved model accuracy.
- [ ] The UI does not hide uncertainty.

## Finish Line

- [ ] The demo lane and calibration lane remain separate.
- [ ] The integration is reviewed with Arena Harness evidence in hand.
- [ ] The live output still reads clearly in under 10 seconds.
