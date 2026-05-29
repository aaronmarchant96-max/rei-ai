# CARDO GUARD Manual Test Script

Use this as a pass/fail check while clicking through the live tool.

## 1. Load State

- Open `CARDO GUARD`.
- Expected:
  - Header shows `PromptHound Labs` (with "Structured outputs for messy input." tagline visible in global shell).
  - Inside CARDO GUARD: clear subhead "CARDO GUARD", question "Should we act on this AI risk score?", one-line synthetic description, and the two top badges ("Synthetic demo only", "Not operational advice").
  - Default scenario is `Road closure reroute`.
  - Default example should read like `89%`, `15%`, `85%`, `$17,000`, and `$1,465,000`.
  - The confidence band note should say the calibration is synthetic for this demo and would come from model evaluation logs in a real deployment.

## 2. Draft vs Report

- Change only the slider from `70%` to another value.
- Expected:
  - The input control changes immediately.
  - The report does not change until you click `Run guard check`.

## 3. Run Guard Check

- Click `Run guard check`.
- Expected:
  - The report updates to match the current inputs.
  - Recommendation is shown as `ACT` or `DO NOT ACT`.
  - The hinge sentence matches the numbers shown in the report.

## 4. Scenario Switch

- Change the scenario to `Compressor anomaly`.
- Click `Run guard check`.
- Expected:
  - The scenario title and summary update.
  - Confidence, cost to act, and cost of missing reset to that scenario’s defaults.
  - The recommendation and hinge update accordingly.

## 5. Low-Stakes Scenario

- Switch to `Routine inspection nudge`.
- Click `Run guard check`.
- Expected:
  - The report shows a lower-stakes example.
  - Recommendation should follow the math and may still lean toward `ACT` if the calibrated event likelihood is high enough.
  - The report still explains the tradeoff in plain language.

## 6. Cost Flip

- Keep the same scenario.
- Raise `Cost of missing`.
- Lower `Cost to act`.
- Click `Run guard check`.
- Expected:
  - Recommendation should move toward `ACT`.
  - `Expected miss loss` should become larger than `Expected action waste`.
  - The hinge should say that missing-loss is higher.

## 7. Invalid Input Safety

- Clear `Cost to act` or type an invalid number.
- Click `Run guard check`.
- Expected:
  - The app does not crash.
  - The value falls back safely.
  - The report still renders.

## 8. Reset

- Change the scenario and values.
- Click `Reset synthetic example`.
- Expected:
  - Inputs return to the selected scenario’s defaults.
  - The report updates back to that scenario.

## 9. Boundary Language

- Read the report copy after a few runs.
- Expected:
  - It never claims prediction.
  - It never claims expert replacement.
  - It never sounds like generic AI governance.
  - It keeps boundary language tight: synthetic demo, visible costs/hinge, no prediction or expert claims.

- Check the hero area and intro card (after the two status badges).
- Expected:
  - It centers the approved spine once: "AI confidence is not the decision. Cost-weighted consequence is the decision gate."
  - The top badges provide the synthetic / not operational guardrails without repetition deeper in the page.
  - The working demo ("Test the decision", inputs, Recommendation, "The decision hinge" with margin) follows immediately and stays the focus.

## 10. Mobile Check

- Shrink the browser to mobile width.
- Expected:
  - Header still fits.
  - Tabs stack cleanly.
  - Input panel and report stack vertically.
  - Buttons remain usable.

## Pass Rule

- A run passes if the inputs, report, hinge, and recommendation stay aligned, the top-level hierarchy is clear (PromptHound Labs → CARDO GUARD), the spine sentence appears once prominently, and guardrail phrases ("synthetic demo", "not operational advice") appear only as compact top-level reminders without duplication.
