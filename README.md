# REI.ai

**Budget-respecting reasoning.**

## Who this is for

You want an AI reasoning partner but don't want to burn $20/month on a subscription that runs GPT-4 for every query — including "hello." REI is for developers writing code, researchers evaluating evidence, genealogists cross-referencing records, and writers building narrative structure — anyone who wants precise answers without paying premium-model prices for simple questions.

## What you can do that you can't today

- **Get reasoning for pennies.** Every query routes to the cheapest adequate model. Greetings cost $0. Coding problems get a 70B model at ~$0.0014/1K tokens. Only adversarial validation hits GPT-4.
- **See why the router chose that model.** Every response includes a transparent routing decision — confidence score, cost estimate, savings vs always-premium, and alternative routes considered.
- **Never pay for "hello."** The Layer 0 deterministic engine handles greetings, smalltalk, and FAQ patterns with zero API calls. The cheapest model is no model.
- **Track your session budget.** Per-message cost badges, a 5K token budget gauge, and a session summary panel show exactly what you spent and saved.

## How it works

```
Incoming query → classify complexity + domain →
route to cheapest adequate pathway →
return decision with confidence, cost estimate,
and savings vs always-premium baseline
```

| Pathway | Model | When |
|---------|-------|------|
| Deterministic | None (Layer 0) | Greetings, smalltalk |
| Cheap | llama-3.1-8b-instant | Translation, simple queries |
| Medium | llama-3.3-70b-versatile | Reasoning, coding, genealogy |
| Premium | gpt-4o | Adversarial, high-stakes |

## Quick start

```bash
npm install
npm run dev
```

Runs the Vite dev server. Backend routes through `api/cfai.js` (Vercel serverless or local Groq/OpenAI fallback).

## Benchmarks

```bash
npm test -- --testPathPatterns=routingEval
```

- **57 prompts** across 9 categories (greeting, coding, genealogy, creative, fact-check, reasoning, mixed, adversarial, unknown)
- **68% cost savings** vs always-premium routing
- **80% routing accuracy** on category-matched prompts
- **9% escalation rate** to premium (only when genuinely needed)
- **178 tests, 16 suites**, all passing

Blind test set (held-out prompts never used in development):
```bash
npm test -- --testPathPatterns=routingEvalBlind
```

## Architecture

```
Query → Deterministic Engine (Layer 0)
     → Night Shift Router (fingerprint matching + confidence scoring)
     → CARDO GUARD (cost-governor: is expensive inference justified?)
     → Response + routing trace
```

Full decision flow: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## Key components

| File | Purpose |
|------|---------|
| `src/lib/nightShiftRouter.js` | Core routing engine — fingerprint matching, confidence scoring, pathway selection, cost estimation |
| `src/lib/deterministicEngine.js` | Layer 0 — zero-token responses for greetings and smalltalk |
| `src/lib/cardoGuard.js` | Cost-governor — decides when expensive inference is justified |
| `src/lib/costHelpers.js` | Unified cost model — ceiling-based estimates with split usage tracking |
| `src/hooks/useSessionTracker.js` | Cumulative savings tracker — sessions, costs, escalations |
| `src/__eval__/routingEval.test.js` | 57-prompt benchmark harness with accuracy/savings gates |
| `src/__eval__/routingEvalBlind.test.js` | 24-prompt blind test set — held-out, never used in development |
| `data/fingerprints.json` | Routing catalog with confidence thresholds per pathway |

## Run with Docker

```bash
docker compose up
```

## Environment

Create a `.env` file with:

```
GROQ_API_KEY=your_groq_key
OPENAI_API_KEY=your_openai_key  # optional, for premium pathway
```

Without keys, the platform falls back to deterministic responses and mock mode.

## Design principles

- **Deterministic routing** — all decisions are testable, zero inference dependency in the router
- **Layer 0 first** — greetings and smalltalk never hit an API; the cheapest model is no model
- **Budget-respecting** — cost ceiling semantics: always overestimate, never under-bill
- **Right-sized** — the cheapest adequate pathway, not the most expensive by default
- **Transparent** — every routing decision carries a rationale, confidence score, and savings calculation
