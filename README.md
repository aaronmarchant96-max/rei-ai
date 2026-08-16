# REI.ai — Smart AI Routing & Structured Reasoning

> **"The future of AI isn't just about better models — it's about better systems."**
>
> Built by a self-taught developer who started building AI systems in 2026.
> No CS degree. No tech background. Just a $25/month budget, an Intel Celeron J4105 with 8GB RAM, and a question: *can one person build something real in AI this year?*

REI.ai is the answer — a smart, budget-friendly AI orchestration platform that inspects prompts locally and routes each request to the cheapest model capable of producing high-quality reasoning.

Backed by **930 automated unit tests across 71 test suites**, REI.ai enforces measurable cost savings, anti-slop verification, prompt-cache optimization, and client-side security.

---

## 📊 What This Is (And Isn't)

**What this is:**
- **A Deterministic AI Router:** Inspects prompt semantics locally and routes to the cheapest capable model. Cost savings are cleanly decomposed into *provider-price optimization* and *free-tier capacity*, reported separately, and stress-tested across model pricing landscapes. See [docs/CLAIM_LEDGER.md](docs/CLAIM_LEDGER.md) for exact benchmark numbers and producing commands.
- **Prompt-Freeze & Deterministic Caching:** Sustains a 90%+ prompt cache hit rate across LLM providers (Gemini caching discounts, DeepSeek prompt caching) by freezing prefix order and generating deterministic cache keys.
- **CARDO REI Reasoning Framework:** Enforces structured decision-making that separates verified evidence from assumptions.
- **Anti-Slop & De-Roboticize Pipeline:** Locally detects and strips buzzword padding, corporate boilerplate, and AI hedging.
- **Night Shift Batch Routing:** Queues non-urgent background inference to off-peak pricing windows and free-tier capacities.
- **A Suite of 6 Specialized Tool Domains:** Coding & Architecture, Historical Genealogy, Legal Precedent Analysis, Debate & Critical Pressure-Testing, Storytelling, and General Chat.
- **Empirical Rigor:** Backed by 930 automated unit tests across 71 test suites to guarantee routing logic, security guards, and cost contracts never drift.

**What this is not:**
- Just another standard ChatGPT wrapper with a UI reskin.
- A VC-funded startup backed by a venture team.
- Over-hyped software with unmeasured or fabricated claims.

---

## 🧠 The 6 Specialized Reasoning Domains

REI.ai automatically detects task intent and dispatches to specialized reasoning contexts:

1. **The Engineer** — Coding architecture, algorithmic logic, TypeScript refactoring, and step-by-step implementation plans.
2. **The Precedent Engine** — Legal analysis and regulatory risk synthesis grounded in a verified 12-case historical index.
3. **The Archivist** — Evidence-tiered genealogical research, document transcription, and conflict resolution.
4. **The Critical Inquirer (Debate)** — Dialectical pressure-testing, argument stress-testing, and counterfactual validation.
5. **The Storyteller** — Creative narrative design, character arc consistency, and world-building mechanics.
6. **The Generalist** — Multi-domain everyday problem solving, synthesis, and rapid query dispatch.

---

## 📐 How the Smart Router Works

Instead of blindly sending every request to expensive flagship models, REI runs a **deterministic 9-stage decision cascade** locally:

```mermaid
flowchart TD
    A[User Prompt] --> B[Hinge Classifier<br/>ECS / DAS / APS]
    B --> C{Deterministic Cascade}
    C -->|1. Empty| D[Default Route]
    C -->|2. Greeting| E[Cheapest Path<br/>llama-3.1-8b-instant]
    C -->|3. Meta Query| E
    C -->|4. Self-Eval| F[The Engineer]
    C -->|5. Adversarial| G[Red Team Validation]
    C -->|6. Domain Match| H[Specialist Route<br/>Coding / Legal / Genealogy / Story]
    C -->|7. High Complexity| I[Structured Reasoning<br/>CARDO REI]
    C -->|8. Stored Context| J[Recall Last Domain]
    C -->|9. Fallback| I
    E --> K[Verified Output + Cost Tracepoint]
    F --> K
    G --> K
    H --> K
    I --> K
    J --> K
```

### Why Order Matters
Cascade priority is economically optimized: simple greetings run *before* heavy adversarial security scans, allowing benign greetings like *"hello"* to hit the micro-cost path (`llama-3.1-8b-instant`) without paying the ~10.6x ceiling cost of an adversarial validation route ($0.00013 vs $0.00138 per equivalent 1K-token ceiling).

---

## ⚡ Core Platform Engines

### 1. Night Shift Batch Router (`src/lib/nightShiftRouter.ts`)
- Automatically identifies asynchronous, non-blocking background tasks (evaluations, document indexations, batch summaries).
- Batches and dispatches jobs during provider off-peak pricing windows and available free-tier token allocations.

### 2. Anti-Slop & De-Roboticize Filter (`src/lib/detectAISlop.js`, `src/lib/deRoboticize.js`)
- Scans model outputs for hollow corporate AI buzzwords (*"delve"*, *"testament"*, *"tapestry"*, *"vital role"*) and passive hedge phrases.
- Enforces concise, direct, human-first writing.

### 3. Feynman Claim Gateway & Tracepoints (`src/lib/claimGateway.ts`, `src/lib/tracepoint.js`)
- Full observability pipeline capturing token usage, latency, provider cost deltas, and counterfactual savings.
- Replayable verification logs preventing regression against baseline pricing.

### 4. Evaluating the Evaluator (Meta-Evaluation Loop)
REI tracks the reliability of its own defenses over time:
```text
Architecture ──> Router ──> Evaluation ──> Error Gaps ──> [caught: tag] ──> Error Catalogue ──> Better System
```
Every bugfix or test failure logs a machine-parseable tag (`[caught: test]`, `[caught: claim-gate]`, `[caught: manual]`), generating a living dataset in `docs/ERROR_GAP_CATALOGUE.md` showing which layers catch defects.

---

## 🔴 Red Team — Client-Side Prompt Security Guard

The Red Team tab is a zero-cost, in-browser security scanner that inspects prompts for jailbreaks, prompt injection, or policy bypass attempts **before any API call is made**.

- **100% Private & Zero Cost:** Runs in-browser pattern checks without consuming API tokens.
- **Catches 14 Attack Vectors:** Flags prompt extraction, identity spoofing, credential leaking, base64 ciphers, and recursive jailbreaks.
- **Model Agnostic:** Works as a pre-flight firewall for OpenAI, Anthropic, Gemini, Groq, or local Ollama endpoints.

---

## 👤 About the Builder

| Metric | Value |
| :--- | :--- |
| Total API Spend | **$14.66** |
| Tokens Processed | **1.35+ billion** |
| Specialized Domains | **6 application reasoning modes** |
| Automated Tests | **930 passing tests across 71 suites** |
| Deployments | **1,000+ Vercel production deployments** |
| Development Hardware | Intel Celeron J4105, 8GB RAM |
| Monthly Operating Budget | $25/month |
| Background | Self-taught, started late 2025/early 2026 |

---

## 🛠️ Quick Start

```bash
# Clone the repository
git clone https://github.com/aaronmarchant96-max/rei-ai
cd rei-ai

# Install dependencies
npm install

# Run development server
npm run dev

# Run full test suite (71 test suites, 930 tests)
npm test
```

---

## 🔗 Live Links & Documentation

- **Live Application:** [https://prompthound-labs.vercel.app/#rei](https://prompthound-labs.vercel.app/#rei)
- **Source Repository:** [https://github.com/aaronmarchant96-max/rei-ai](https://github.com/aaronmarchant96-max/rei-ai)
- **Architecture & Technical Docs:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · [Testing Strategy](docs/TESTING.md) · [Claim Ledger](docs/CLAIM_LEDGER.md) · [Decisions (ADR)](docs/DECISIONS.md) · [Error Gap Catalogue](docs/ERROR_GAP_CATALOGUE.md)

---

*Built in 2026 by Aaron Marchant. Self-taught. One machine.*
