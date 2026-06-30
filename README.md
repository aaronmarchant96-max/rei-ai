<!--
CARDO REI methodology applied to this document.
Reference: [CARDO REI Methodology](PROMPTHOUND-DOCS/CARDO-REI.md)
-->

# REI.ai Platform by PromptHound Labs

> Structured outputs for messy input. Find the hinge. Keep the limits visible.

**This repository is the REI.ai platform surface for PromptHound Labs. It ships the current live slice of the REI experience and its companion tools.**

**Current tools in this repo:**

- **REI.ai** — Shared methodology surface for specialized reasoning modes.
- **Debate Furnace** — Structured debate engine that pressure-tests arguments and surfaces the real decision hinge.
- **Story Forge** — Turns messy historical/mythic sources into usable story blueprints while keeping the source trail visible.
- **CARDO GUARD** — Synthetic decision validation tool that makes the cost-weighted breakeven explicit before anyone acts on an AI risk score.
- **Storm Replay** — Historical storm imagery analysis focused on separating signal from noise with strong calibration discipline.
- **Tracepoint** — Synthetic industrial signal review for one fictional pump asset, focused on evidence, calibration, and human review.

## CARDO REI Method

REI.ai uses the CARDO REI Method to separate what sounds good from what actually holds up.

![Debate Furnace preview](assets/debate-furnace-preview.png)

## About REI.ai

REI.ai is the shared platform layer in the PromptHound Labs suite. It is designed for questions and workflows that deserve more than a quick yes/no.

It organizes specialized tools around the same CARDO REI spine, then lets each tool pressure-test its own kind of input, surface where the case is strong or weak, and make the actual hinge of the decision visible so the user can decide with eyes open.

It is especially useful when the disagreement is really about values, tradeoffs, missing evidence, or what should even count as evidence.

The broader suite in this repo also includes Story Forge (source-faithful story development), CARDO GUARD (synthetic decision validation), Storm Replay (historical storm imagery calibration), and Tracepoint (synthetic industrial review).

## Problem / Approach / Result

- **Problem:** Most AI tools flatten messy work into generic chat.
- **Approach:** Build a platform of specialized tools that pressure-test inputs, flag weak reasoning, and surface the decision point through the CARDO REI Method.
- **Result:** A working REI.ai app with live tools, shared navigation, local fallback where needed, share links, history, mobile polish, and copyable reports.
- **Mission:** Help people think more clearly across debate, story, risk, weather, industrial signals, and review workflows.

## Live Demo

[Try the live REI.ai platform](https://debate-furnace.vercel.app/)

[Open the Tools page](https://debate-furnace.vercel.app/tools)

The same app contains:

- **REI.ai** (default — the platform reasoning layer)
- **Debate Furnace**
- **Story Forge**
- **CARDO GUARD** — the synthetic decision validation / launch gate tool
- **Storm Replay** — historical storm imagery analysis and calibration
- **Tracepoint** — industrial signal review

Switch tools from the top navigation.

## What It Does

This repo contains a suite of tools built around the same core idea: turn messy input into reviewable structure and make the real hinge visible.

**REI.ai / Debate Furnace** turns a question into a structured pressure test, shows where each side is strong, shows where each side cracks, and gives the decision back to the user.

It currently supports:

- starter questions with polished topic-specific debate logic
- custom questions routed through Gemini with a local fallback when generation fails
- three debate rounds: Opening Arguments, Rebuttals, and Final Pressure
- judge notes for each round
- final result summary
- key takeaways
- strongest case for each side
- where each side cracked
- unburned claims to verify
- what would change the verdict
- what the choice really depends on
- decision compass values that stay short and readable
- copyable markdown report
- copy individual rounds
- shareable debate links
- debate history saved in localStorage
- mobile-specific layout polish and sticky actions
- footer links to X and GitHub

The current version is a live public prototype with a Gemini-backed custom debate path. Starter questions still use the tuned local debate engine so the app stays fast and stable when you test the most common prompts.

## Story Forge

Story Forge is the companion tool in the same app shell. It turns a curated seed library built from real events, old texts, and strange source material into story blueprints without losing the source trail.

It is built to help with:

- finding the core tension in an event or text
- keeping the original sources visible
- turning source material into usable story hooks
- building around the hinge instead of flattening the material into generic summary
- keeping the source boundary visible so the final output reads as inspiration, not retelling

Two worked examples show the difference between filtering an overclaim and keeping a real unresolved case open:

- [UAP false positive suppression](docs/Debate_Furnace_Rich_Script_Reference.md#false-positive-suppressed-uaps): the analyzer strips out the leap from "unexplained" to "non-human" and leaves the case at "unexplained, not proven."
- [Franklin Expedition residual candidate](docs/Debate_Furnace_Rich_Script_Reference.md#residual-candidate-kept-the-franklin-expedition): the analyzer keeps the uncertainty in play because the historical record still leaves a legitimate gap.

The strongest proof pieces for Story Forge are in the seed library, source trail, and generated packets, with the reusable checklist documented here:

- [Story Forge QA Checklist](docs/story_forge_qa_checklist.md)
- [Story Forge Source Bank](docs/story_forge_source_bank.md)

## Storm Replay

Storm Replay is a historical storm imagery analysis tool focused on separating visual signal from noise under real-world conditions.

It processes sequences of weather imagery, extracts motion and intensity signals, and produces structured, reviewable artifacts (events, calibration metrics, review notes) so a human analyst can inspect what the system actually surfaced and what it missed.

Key characteristics:

- Explicitly not a forecasting or warning system
- Strong calibration mindset (motion, intensity, combined scoring)
- Designed for careful post-event analysis and evidence building
- Keeps limitations loud and visible at every step

Current focus: Tornado outbreak replays and similar high-stakes historical events, with heavy emphasis on false positive / false negative discipline.

Related work lives in the broader PromptHound analysis tooling.

## Tracepoint

Tracepoint is a synthetic industrial QA and decision-support prototype. It reviews deterministic hourly sensor readings for fictional assets like Pump Station P-204 and Compressor C-118, and explains why the signal crosses or does not cross a review threshold.

It is intentionally conservative:

- synthetic calibration demo only
- not operational advice
- not a forecasting system
- not a replacement for inspection, maintenance procedures, or safety controls

The tool shows:

- vibration, temperature, pressure, and flow trends
- a transparent scoring rule with visible thresholds
- reviewer marks and notes stored locally in the browser
- a cost-aware decision gate that compares acting versus not acting
- an exportable review packet for QA and portfolio review

Tracepoint is for evidence review, not for making real operational claims.

## CARDO GUARD

CARDO GUARD is the flagship PromptHound Labs tool for making the real decision hinge visible.

It is a synthetic decision checker that forces a clear comparison between the cost of acting on an AI risk score versus the cost of ignoring it. Instead of treating model confidence as the answer, CARDO GUARD surfaces the actual breakeven point and decision strength so the trade-off is explicit and auditable.

Core capabilities:

- Calculates risk-adjusted miss loss vs expected action waste
- Surfaces the exact breakeven miss cost where the recommendation flips
- Labels decision strength (Very Strong → Very Close)
- Explains the hinge in plain language
- Shows what would actually change the verdict
- Keeps every input and assumption visible and synthetic-first

Strong emphasis on guardrails: this is explicitly a synthetic demo tool. It is not operational advice, not a forecasting system, and not generic AI governance.

Documentation & artifacts:

- [CARDO GUARD Launch Gate Checklist](docs/cardo_guard_checklist.md)
- [CARDO GUARD Manual Test Script](docs/cardo_guard_manual_test.md)
- [Hinge Meter design spec](docs/hinge-meter/hinge_meter_design_spec.md)

Future direction: feed real calibration bands from evaluation harnesses while keeping the human-first read and synthetic defaults as the safe starting point.

## Method

PromptHound Labs turns messy input into reviewable structure. The CARDO REI loop is the shared proof path:

```text
Messy input
Find the pressure point
Separate surface signal from real structure
Produce a reviewable output
Keep human judgment and limits visible
```

Every PromptHound Labs project follows the same proof loop: define the idea, frame the limits, build in small steps, verify the output, manually review the result, commit the evidence, push it publicly, and turn the finished slice into a case study.

## Project Mapping

- **Debate Furnace**: Input is arguments. Pressure point is the hinge the disagreement actually turns on. Output is a pressure-tested decision path with the reasoning made visible.
- **Story Forge**: Input is history, myth, archives, and strange sources. Pressure point is the core tension inside the source material. Output is a story blueprint that keeps the source trail visible.
- **CARDO GUARD**: Input is an AI risk score plus real business costs. Pressure point is the breakeven between acting and not acting. Output is an auditable decision hinge with strength, breakeven point, and what would actually flip the recommendation.
- **Storm Replay**: Input is historical storm imagery. Pressure point is visual signal versus noise under real conditions. Output is structured events, calibration metrics, review notes, and case validation — explicitly not a forecast or alert.

## How to Use

1. Open the live app.
2. Pick a starter question or type your own.
3. Optionally enter Side A and Side B positions.
4. Choose the furnace intensity: Balanced, Aggressive, or Ruthless.
5. Click **Ignite Debate**.
6. Step through the rounds.
7. Read the final report and use **Copy Full Report** to save or share it.

Starter questions are the most polished. Custom questions use Gemini when available and fall back to the local engine if generation fails.

## Starter Topics

- ChatGPT vs Grok
- gun control
- love
- AI art
- UAPs
- frontier AI regulation
- remote work
- seed oils
- free will
- free college
- pineapple on pizza
- social media
- money as the root of evil
- cats vs dogs

## Tech Stack

```text
React
Vite
JavaScript
Vercel
GitHub
```

## Current Architecture

```text
React frontend
Vite build
Vercel serverless API route for Gemini
local scripted starter engine
question classifier
topic profiles
hash-based share links
localStorage debate history
structured final report renderer
copyable markdown output
```

## Evidence Gates and Testing Philosophy

This project uses Jest as an evidence gate before promoting a claim, rule, or workflow from prototype to something I would trust in a public-facing or portfolio context.

The emphasis is not just "tests exist". The emphasis is: every meaningful behavior is captured as a fixed input → expected output contract so the logic stays explicit, repeatable, and reviewable.

Typical coverage includes:

- UI flow tests for navigation, tool selection, debate progression, history persistence, and form interactions.
- Decision-logic tests for scoring and recommendation engines such as CARDO GUARD and Tracepoint.
- Contract tests for exported reports, handoff packets, and review artifacts.
- Guardrail tests to ensure the documented limits, warning language, and QA checklist stay intact.

In practice, this means a feature is not treated as reliable until the relevant Jest cases pass. If a tool claims to surface a hinge, a recommendation, or a review signal, the underlying behavior is backed by a deterministic test case rather than intuition alone.

That is a core part of the REI / PromptHound approach: evidence first, limits visible, and claims verified before promotion.

Environment variables:

```text
GEMINI_API_KEY=required for custom debates
GEMINI_MODEL=optional, defaults to gemini-2.5-flash-lite
```

## Roadmap

Planned next steps:

```text
more polished topic profiles
optional web search / research mode
citations for researched debates
rate limiting and caching
cleaner mobile polish
shorter share URLs backed by stored debate records
export as image or PDF
```

Longer-term goal:

```text
user question
→ AI debate generator
→ optional web research
→ structured Debate Furnace JSON
→ final pressure-tested report
```

## Reference Docs

The richer script and report language reference, source-bank notes, and product origin notes are archived here:

- [Debate Furnace Rich Script Reference](docs/Debate_Furnace_Rich_Script_Reference.md)
- [The Origin of Debate Furnace](docs/Debate_Furnace_Origin.md)
- [Debate Furnace QA Checklist](docs/debate_furnace_qa_checklist.md)
- [Story Forge QA Checklist](docs/story_forge_qa_checklist.md)
- [CARDO GUARD Launch Gate Checklist](docs/cardo_guard_checklist.md)
- [CARDO GUARD Manual Test Script](docs/cardo_guard_manual_test.md)

## Local Setup

```bash
npm install
npm run dev
```

```bash
npm test
```

## Build

```bash
npm run build
```

## Vercel Settings

```text
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
Root Directory: ./
```

## Status

PromptHound Labs is a working public prototype for the broader REI.ai platform. Debate Furnace is the original pressure-testing slice, and the current goal is to keep tightening the prompt quality, improve profile coverage, and turn the strongest user patterns into stable product features across the suite.
