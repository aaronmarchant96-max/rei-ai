<!--
CARDO REI methodology applied to this document.
Reference: [CARDO REI Methodology](PROMPTHOUND-DOCS/CARDO-REI.md)
-->

# Story Forge QA Checklist

Use this before shipping a change to Story Forge.

## Core Checks

- The seed library loads.
- The active seed changes correctly.
- The hinge, source trail, and supporting content still render.
- The story output still updates when the selected mode changes.
- Copy or export actions still work if present.
- Mobile layout still holds together.

## Content Checks

- The page explains the idea in plain language.
- Source trail items are visible and readable.
- The hinge is clear without extra explanation.
- The output feels like a usable starting point, not a generic summary.

## Regression Checks

- The tabs still switch cleanly between views.
- Long text does not break the layout.
- Seed-driven content stays aligned with the selected source.
- No unrelated copy changed when the feature changed.

## Ship Rule

If the change affects seed selection, output generation, or source trail rendering, run the page and verify the full flow once before merging.
