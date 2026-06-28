<!--
CARDO REI methodology applied to this document.
Reference: [CARDO REI Methodology](PROMPTHOUND-DOCS/CARDO-REI.md)
-->

# CARDO GUARD Launch Gate Checklist

Use this before shipping anything that uses CARDO GUARD language, logic, or reports.

## Scope Checks

- The tool is a decision validator, not a prediction engine.
- The scenario is narrow and named.
- The tool stays inside one decision context instead of becoming generic "AI governance."
- The output is framed as support for judgment, not a replacement for judgment.

## Input Checks

- The scenario is synthetic or clearly labeled if real.
- The confidence score is shown with its source or calibration context.
- Synthetic calibration bands are labeled as demo-only unless they come from real evaluation logs.
- The cost to act is stated in real units.
- The cost of missing is stated in real units.
- Any thresholds used are visible and easy to inspect.

## Hinge Checks

- The hinge is explicit in the output.
- The tradeoff is clear: act versus do not act.
- The recommendation follows from the stated costs, not from vibes.
- The report explains what would change the decision.
- The report explains what evidence is still missing.

## Safety Checks

- The copy does not claim improved model accuracy.
- The copy does not claim to replace expert judgment.
- The copy does not imply certainty that the inputs do not support.
- The copy does not hide assumptions behind a polished score.
- The copy does not suggest real operational use if the workflow is still synthetic.

## Output Checks

- The report names the recommendation plainly.
- The report includes assumptions and limits.
- The report says when it should not be trusted.
- The report reads like a decision review, not a dashboard.
- The report stays readable to a non-technical operator.

## Regression Checks

- The scenario still renders correctly on mobile and desktop.
- The decision math still matches the displayed inputs.
- The boundary language still makes the synthetic status obvious.
- The hero uses the approved structure (PromptHound Labs + tagline, CARDO GUARD, "Should we act on this AI risk score?", one-line description, single pair of synthetic/not-operational badges) and centers the spine sentence: "AI confidence is not the decision. Cost-weighted consequence is the decision gate." Guardrails appear once as compact reminders, not repeated blocks.
- No unrelated copy changed when the feature changed.

## Do Not Ship If

- the tool starts sounding like a forecasting product
- the recommendation is detached from the cost tradeoff
- the output sounds more certain than the inputs justify
- the scenario has drifted from narrow validation into generic AI oversight
- the report cannot answer why this decision was made under these assumptions

## Ship Rule

If the change affects the decision formula, the report structure, or the boundary language, run the full flow once and verify the output before merging.
