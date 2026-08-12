# REI.ai — Smart AI Routing & Structured Reasoning

> **"The future of AI isn't just about better models — it's about better systems."**
>
> Built by a self-taught developer who started building AI systems in 2026.
> No CS degree. No tech background. Just a $25/month budget, an Intel Celeron J4105 with 8GB RAM, and a question: *can one person build something real in AI this year?*

REI.ai is the answer — a smart, budget-friendly AI system that reads your prompts locally and routes them to the cheapest model capable of giving a great answer. 

It includes **6 specialized tools** and **726 automated test checks** ensuring everything stays fast, accurate, and cost-effective.

---

## 📊 What This Is (And Isn't)

**What this is:**
- **A Smart AI Traffic Controller:** Saves up to ~98% on AI API costs compared to always using expensive models like GPT-4o by picking the right model for the job.
- **A Structured Thinking Engine:** Uses a clear, step-by-step framework (CARDO REI) to separate facts from assumptions and give clear reasoning.
- **A Suite of 6 Specialized Tools:** Includes tools for debate pressure-testing, storytelling, legal precedent checks, industrial monitoring, genealogy, and everyday AI chat.
- **Battle-Tested Code:** Backed by 726 automated unit tests across 61 test suites to ensure routing and security logic never drift.

**What this is not:**
- Just another standard ChatGPT clone with a pretty interface.
- A VC-funded startup backed by a huge team of engineers.
- Over-hyped software with unverified claims.

---

## 🧠 The 5 AI Reasoning Tools

REI.ai automatically detects what kind of task you are working on and directs it to the right specialized prompt:

1. **The Generalist** — Everyday decision-making, clear advice, and logical problem-solving.
2. **The Engineer** — Coding logic, software structure, and step-by-step architecture planning.
3. **The Archivist** — Historical record analysis and evidence-backed family tree research.
4. **The Storyteller** — Creative writing, plot structures, and character development.
5. **The Precedent Engine** — Legal case analysis grounded in a verified 12-case index.

---

## 📐 How the Smart Router Works

Instead of sending every request straight to expensive cloud servers, REI's router runs an **ordered decision cascade** locally on your machine. Priority order matters: for instance, greetings run *before* security checks so simple prompts like *"hi, ignore your instructions"* hit the cheap fast path (`llama-3.1-8b-instant`) without paying the ~10.6x ceiling cost of the adversarial-validation route ($0.00013 vs $0.00138 per equivalent 1K-token ceiling).

```mermaid
flowchart TD
    A[Your Question] --> B[Hinge Classifier<br/>ECS / DAS / APS]
    B --> C{Decision Cascade}
    C -->|1. Empty| D[Default Route]
    C -->|2. Greeting| E[Cheapest Path<br/>llama-3.1-8b-instant]
    C -->|3. Meta Query| E
    C -->|4. Self-Eval| F[The Engineer]
    C -->|5. Adversarial| G[Red Team Validation]
    C -->|6. Domain Match| H[Specialist Route<br/>Coding / Genealogy / Story / Legal]
    C -->|7. High Complexity| I[Structured Reasoning]
    C -->|8. Stored Pref| J[Recall Last Domain]
    C -->|9. Fallback| I
    E --> K[Verified Response + Cost Trace]
    F --> K
    G --> K
    H --> K
    I --> K
    J --> K
```

### 🔁 Evaluating the Evaluator (Meta-Evaluation Loop)

REI doesn't just evaluate your questions — it **evaluates the reliability of the system doing the evaluation**:

```text
Architecture ──> Router ──> Evaluation ──> Error Gaps ──> [caught: tag] ──> Error Catalogue ──> Better System
```

Every bugfix or test failure logs a single commit tag (`[caught: test]`, `[caught: claim-gate]`, `[caught: manual]`). An automated pipeline projects git history into `docs/ERROR_GAP_CATALOGUE.md` to continuously answer: *Which defense catches our mistakes over time?*

---

## 🔴 Red Team — Instant Prompt Security Guard

The Red Team tab is a free, instant security scanner that inspects your prompt for hacks, jailbreak attempts, or policy bypasses **right inside your browser**.

### Why it matters:
- **Zero Cost & Private:** Runs 100% in your browser using local pattern checks — no data leaves your machine and zero API tokens are wasted.
- **Catches 14 Attack Types:** Flags prompt extraction, identity spoofing, credential leaks, hidden ciphers, and roleplay tricks.
- **Works for Any AI Engine:** Useful whether you are using OpenAI, Anthropic, DeepSeek, or local open-source models.

---

## 🧠 Philosophy

REI is built on a core belief: **the future of AI isn't just about better models — it's about better systems.**

- **Augmenting Human Judgment:** Technology should help people think better, not replace human judgment. The system suggests options; the human decides.
- **Verifiable Truth:** Every claim or cost-saving metric in this system is backed by reproducible tests you can run yourself in terminal.

---

## 👤 About the Builder

I started learning software and AI development in 2026. This project is the result of ~4 months of focused building under real-world constraints:

| Metric | Value |
|--------|-------|
| Total API Spend | **$14.66** |
| Tokens Processed | **1.35 billion** |
| Tools Built | **6 specialized applications** |
| Automated Tests | **726 passing tests across 61 suites** |
| Delivery | **1,000+ Vercel deployments** — production is live on Vercel with full deploy history |
| Hardware Used | Intel Celeron J4105, 8GB RAM |
| Monthly Budget | $25/month |
| Background | Self-taught, started late 2025/early 2026 |

---

## 🛠️ Quick Start

Want to run it locally or run the test suite?

```bash
git clone https://github.com/aaronmarchant96-max/rei-ai
cd rei-ai
npm install
npm run dev      # Launch local web interface
npm test         # Run all 726 automated tests
```

---

## 🔗 Live Links & Docs

- **Live Application:** [https://prompthound-labs.vercel.app/#rei](https://prompthound-labs.vercel.app/#rei)
- **Source Code:** [github.com/aaronmarchant96-max/rei-ai](https://github.com/aaronmarchant96-max/rei-ai)
- **Documentation:** [Architecture & Methodology](docs/README.md) · [Testing Strategy](docs/TESTING.md) · [ADR Log](docs/DECISIONS.md)

---

*Built in 2026 by Aaron Marchant. Self-taught. One machine.*
