<!--
CARDO REI methodology applied to this document.
Reference: [CARDO REI Methodology](PROMPTHOUND-DOCS/CARDO-REI.md)
-->

# Debate Furnace QA Checklist

Use this before shipping a change to Debate Furnace.

## Core Checks

- The question input still works on mobile and desktop.
- Starter questions still launch a debate.
- Custom questions still fall back cleanly when Gemini is unavailable.
- The three rounds still render in order.
- The final report still shows the hinge, scores, takeaways, and verdict.
- Copy report and copy round still work.
- Share links still restore the debate state.
- Saved history still loads and reopens correctly.

## Content Checks

- The app still reads like a product, not a demo script.
- Labels are plain and readable.
- No section relies on jargon to make sense.
- The final report explains what happened without overclaiming.

## Regression Checks

- Mobile layout does not overflow.
- Buttons still fit their labels.
- Empty or partial inputs fail gracefully.
- Fallback language only appears when the AI path actually fails.
- No unrelated copy changed when the feature changed.

## Ship Rule

If the change affects debate flow, report output, or sharing, run the app and verify the full end-to-end path once before merging.
