# Debate Furnace

Debate Furnace pressure-tests both sides of a question so you can see the real tradeoffs.

> We pressure-test both sides. You decide what matters.

![Debate Furnace preview](assets/debate-furnace-preview.png)

## Live Demo

Live Vercel deployment: https://debate-furnace-prompthound.vercel.app/

## What It Does

Most arguments are not really about facts alone. They are about which values matter more.

Debate Furnace breaks an argument into structured rounds, shows where each side is strong, shows where each side cracks, and gives the decision back to the user.

It currently supports:

- starter questions with polished topic-specific debate logic
- custom questions with a general argument-testing fallback
- three debate rounds: Opening Arguments, Rebuttals, and Final Pressure
- judge notes for each round
- final result summary
- key takeaways
- strongest case for each side
- where each side cracked
- unburned claims to verify
- what would change the verdict
- what the choice really depends on
- copyable markdown report

The current version is a scripted prototype, not a live research engine. It is designed to test the product concept, interface, debate structure, and report format before adding a real model-backed debate engine.

## How to Use

1. Open the live app.
2. Pick a starter question or type your own.
3. Optionally enter Side A and Side B positions.
4. Choose the furnace intensity: Balanced, Aggressive, or Ruthless.
5. Click **Ignite Debate**.
6. Step through the rounds.
7. Read the final report and use **Copy Full Report** to save or share it.

Starter questions are the most polished. Custom questions are supported, but some may fall back to a more general debate frame until the real AI backend is added.

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
local scripted debate engine
question classifier
topic profiles
structured final report renderer
copyable markdown output
```

No API key is required for the current deployed version.

## Roadmap

Planned next steps:

```text
more polished topic profiles
real AI-generated debate backend
optional web search / research mode
citations for researched debates
rate limiting and caching
cleaner mobile polish
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

The richer script and report language reference is archived here:

- [Debate Furnace Rich Script Reference](docs/Debate_Furnace_Rich_Script_Reference.md)

## Local Setup

```bash
npm install
npm run dev
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

Debate Furnace is currently a working public prototype. The main goal of this version is to get feedback, see what questions users try, identify where the scripted engine breaks, and use that feedback to guide the real AI-backed version.
