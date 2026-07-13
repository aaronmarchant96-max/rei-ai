# Night Shift Router

**The cheapest model that still meets the confidence bar.**

A cost-aware LLM routing engine built for the AMD Developer Hackathon: ACT II (Track 1 — Hybrid Token-Efficient Routing Agent). Selects the least expensive reasoning pathway capable of meeting a measurable confidence threshold.

## What it does

```
Incoming query → classify complexity + domain →
route to cheapest adequate pathway →
return decision with confidence, cost estimate,
and savings vs always-premium baseline
```

| Pathway | Model | Cost/1K | When |
|---------|-------|---------|------|
| Deterministic | None (Layer 0) | $0 | Greetings, smalltalk |
| Cheap | llama-3.1-8b-instant | $0.0001 | Translation, simple queries |
| Medium | llama-3.3-70b-versatile | $0.0014 | Reasoning, coding, genealogy |
| Premium | gpt-4o | $0.0125 | Adversarial, high-stakes |

## Demo — 10 seconds

```bash
node scripts/demo.mjs
```

Routes two prompts: a greeting (→ deterministic, $0) and an adversarial request (→ premium, gpt-4o). Shows route, pathway, confidence, cost estimate, premium cost, savings %, rationale, and alternative routes.

Single prompt mode:

```bash
node scripts/demo.mjs "write a python function to sort a list"
```

## Benchmarks

```bash
npm test -- --testPathPatterns=routingEval
```

- **57 prompts** across 9 categories (greeting, coding, genealogy, creative, fact-check, reasoning, mixed, adversarial, unknown)
- **68% cost savings** vs always-premium routing (lab conditions — real-world savings higher due to API-layer Layer 0)
- **80% routing accuracy** on category-matched prompts
- **5 deterministic** queries handled for $0 — the cheapest model is no model
- **9% escalation rate** to premium pathway (only when genuinely needed)
- **15 test suites, 162 tests**, all passing
- **Domain detection** isolates current input from conversation history — no more routing bleed

## Architecture

```
Query → Deterministic Engine (Layer 0)
     → Night Shift Router (fingerprint matching + confidence scoring)
     → CARDO GUARD (cost-governor: is expensive inference justified?)
     → Response + routing trace
```

Full decision flow diagram: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## Run with Docker

```bash
docker compose up
```

## Key components

| File | Purpose |
|------|---------|
| `src/lib/nightShiftRouter.js` | Core routing engine — fingerprint matching, confidence scoring, pathway selection, cost estimation |
| `src/lib/deterministicEngine.js` | Layer 0 — zero-token responses for greetings and smalltalk |
| `src/lib/cardoGuard.js` | Cost-governor — `shouldEscalateToRemote()` decides when expensive inference is justified |
| `src/hooks/useSessionTracker.js` | Cumulative savings tracker — `savingsVsPremium`, `escalationCount` |
| `src/__eval__/routingEval.test.js` | 57-prompt benchmark harness with accuracy/savings gates |
| `data/fingerprints.json` | 9-entry routing catalog with confidence thresholds per pathway |

## Submission notes

- All routing decisions are **deterministic and testable** — no inference dependency in the router itself
- The benchmark harness has **zero inference cost** (pure assertion-based evaluation)
- Containerized with Docker for the competition submission requirement
- Layer 0 deterministic engine runs at both **frontend and API** layers — greetings/smalltalk are $0 regardless of entry point
- Conversation history capped at **5 messages** to keep token costs low
- The `deRoboticize` filter strips formulaic openers from API responses before they reach the UI
