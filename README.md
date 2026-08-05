# REI.ai — Structured Reasoning & Cost-Aware LLM Routing

> **Built by a self-taught developer who started building AI systems in 2026.**
>
> No CS degree. No tech background. Just a $25/month budget, an Intel Celeron J4105 with 8GB RAM, and a question: *can one person build something real in AI this year?*

REI.ai is the answer — a structured reasoning framework that automatically classifies prompts locally and routes them to the cheapest capable model. 1.35 billion tokens processed. $14.66 total API cost. Six tools shipped. 440+ tests.

---

## 📊 What This Is (And Isn't)

**This is:**
- An explicit, testable router that saves ~68% on LLM API costs vs an always-premium (gpt-4o) baseline — lab benchmark (deterministic, reproducible via `npm test -- --testPathPatterns=routingEval`); production telemetry suggests ~90% but is self-reported
- A reasoning shell grounded in the CARDO REI methodology: find the hinge, separate facts from assumptions, name what would change the answer
- A portfolio of 6 specialized tools (debate pressure-testing, narrative architecture, legal precedent analysis, industrial telemetry, genealogy, and the general-purpose REI chat engine)
- 440+ tests across 31 suites — routing decisions, classifier math, adversarial scanning, blind-holdout evaluations

**This is not:**
- Another ChatGPT wrapper with a nice UI
- A VC-funded startup with a team of engineers
- A product with paying users (yet)

---

## 🧠 The 5 Reasoning Domains

The routing engine classifies prompts into one of five core domains:

1. **The Generalist** — Everyday reasoning, judgment, and decision support
2. **The Engineer** — Software architecture and coding logic (CARDO REI methodology, Phase 0 questioning)
3. **The Archivist** — Evidence-tiered genealogy and historical records analysis
4. **The Storyteller** — Narrative architecture and character hinge generators
5. **The Precedent Engine** — Legal case analysis grounded in a 12-case verified index

---

## 📐 Router Architecture

REI's routing pipeline is a **priority if-chain** — it checks the cheapest, most-specific paths first in a fixed order, and the first match wins. It runs locally with zero inference (pure keyword + structural regex) and produces a testable `RouterDecision`:

```mermaid
flowchart LR
    A[Prompt Input] --> B{Greeting / Meta?}
    B -->|Yes| C[simple-greeting<br/>deepseek-chat · 50 tok]
    B -->|No| D{Adversarial?}
    D -->|Yes| E[adversarial-validation<br/>deepseek-chat · 5× cost]
    D -->|No| F{Domain keyword?}
    F -->|Coding| G[coding-hinge<br/>deepseek-chat · 1200 tok]
    F -->|Genealogy| H[genealogy-deep-dive<br/>deepseek-chat · 1500 tok]
    F -->|Story| I[story-architect<br/>gemini-flash-latest · 2000 tok]
    F -->|Legal| J[legal-hinge<br/>deepseek-chat · 1500 tok]
    F -->|None| K{High structure?}
    K -->|Yes| L[structured-reasoning<br/>deepseek-chat · 800 tok]
    K -->|No| M[structured-reasoning<br/>deepseek-chat · 800 tok]
    C --> N[REI Response]
    E --> N
    G --> N
    H --> N
    I --> N
    J --> N
    L --> N
    M --> N
```

**Decision order (first match wins):**

1. **Greeting / meta-query** → `simple-greeting` — cheapest path, 50-token budget
2. **Adversarial / red-team** → `adversarial-validation` — strictest gate, 5× cost multiplier
3. **Domain keyword match** (coding → genealogy → story → legal) — domain-specific enforcement rules (HARD_STOP, EVIDENCE_TIERS, etc.)
4. **High-structure / high-complexity** → `structured-reasoning` — stricter evaluation gate
5. **Fallback** → `structured-reasoning` — balanced default

**What's NOT in the router:** CARDO GUARD is a decision gate that runs *after* routing — it's a standalone tool and a guidance frame in the generalist prompt, not a routing layer. Domain prompts are selected by the chat UI after the router returns, not by the router itself.

**Models:** every route runs `deepseek-chat` except story (`gemini-flash-latest`). `gpt-4o` appears only as the **premium cost baseline** for the savings metric — it is not a production route.

---

## 🧠 Philosophy

REI is grounded in two principles:

- **Engelbart's H-LAM/T framework:** The system does not replace human reasoning — it augments it. The router proposes, the human decides. Together they close the feedback loop.
- **Kaku's definition of intelligence:** Higher intelligence is the ability to use feedback loops to model reality. REI's eval benchmarks measure accuracy, the router improves, the gap closes.

Read more: [Architecture & Methodology](docs/README.md) · [ADR Log](docs/DECISIONS.md) · [Testing Strategy](docs/TESTING.md)

---

## 👤 About the Builder

I started 2026 with zero AI engineering experience. No CS degree, no bootcamp, no tech job. I learned by building.

This repo represents ~4 months of work:

| Metric | Value |
|--------|-------|
| Total API spend | **$14.66** |
| Tokens processed | **1.35 billion** |
| Models deployed | **6 tools** |
| Tests written | **440+ across 31 suites** |
| Hardware | Intel Celeron J4105, 8GB RAM |
| Budget | $25/month |
| Training | Self-taught, started 2026 |

The point isn't that this is the best AI system out there. It isn't. The point is that you don't need a PhD, a $10M seed round, or a team of engineers to build something real. You need to start, test everything, and not stop.

---

## 🛠️ Quick Start

```bash
git clone https://github.com/aaronmarchant96-max/rei-ai
cd rei-ai
npm install
npm run dev      # Start local dev server
npm test         # Run 440+ tests
```

---

## 📚 Documentation

- **[Architecture & Methodology](docs/README.md)** — Canonical doc index
- **[Architecture Decision Records](docs/DECISIONS.md)** — Dated ADRs with trade-offs
- **[Testing Strategy](docs/TESTING.md)** — 31 suites, testing philosophy
- **[Contributing](CONTRIBUTING.md)** — Setup, code style, PR checklist
- **[Security Policy](SECURITY.md)** — Vulnerability reporting

---

## 🔗 Links

- **Live App:** [https://debate-furnace.vercel.app](https://debate-furnace.vercel.app)
- **Source:** [github.com/aaronmarchant96-max/rei-ai](https://github.com/aaronmarchant96-max/rei-ai)
- **License:** MIT

---

*Built in 2026 by Aaron Marchant. Self-taught. One machine. $14.66.*
