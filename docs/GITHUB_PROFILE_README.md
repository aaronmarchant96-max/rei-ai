# Hi there, I'm Aaron Marchant

**AI Systems Engineer**
*Creator of [REI.ai](https://github.com/aaronmarchant96-max/rei-ai) — The Evidence-Bounded Decision Audit & Pre-Spend LLM Router.*

---

### Flagship Project: [REI.ai](https://github.com/aaronmarchant96-max/rei-ai)

> **"Audit before you route. Show the evidence before you spend."**

[REI.ai](https://github.com/aaronmarchant96-max/rei-ai) is an OpenAI-compatible Decision Audit & Pre-Spend Router. Its replay workflow categorizes existing traffic into three evidence buckets and identifies candidates for a prospective shadow pilot before any live-routing change.

- **Pre-Spend Selection**: Uses a deterministic in-memory policy without making an LLM call to choose an LLM; a fresh retained benchmark is required before publishing a latency ceiling.
- **Bounded Replay & Shadow Contract**: The isolated `ExecutionController` unit contract preserves the requested model and adds no provider call in shadow mode; production integration remains a separate gate.
- **3-Bucket Evidence Segmentation**: Before REI moves any live traffic, you see which requests are safe to downgrade and what it would save:
  1. *Candidate to Shadow* (Simple or structured requests safe to route to sub-cent models)
  2. *Retain Current Tier* (Complex reasoning where flagship models like GPT-4o are demonstrably justified)
  3. *Insufficient Evidence* (Missing or redacted prompt data excluded from savings claims to prevent false accounting)
- **`ingestable != replay-routable`**: Missing prompt text is normalized into denominator audits but excluded from savings metrics.
- **Bring Your Own Key (BYOK)**: Customer-owned provider keys; zero inference balance-sheet liability.
- **Automated Verification**: **1,405/1,405 automated tests across 123/123 suites** passing on both local runs and hosted [GitHub Actions CI](https://github.com/aaronmarchant96-max/rei-ai/actions) (verified 2026-10-24).

**Live Platform**: [prompthound-labs.vercel.app/#rei](https://prompthound-labs.vercel.app/#rei)
**Repository**: [github.com/aaronmarchant96-max/rei-ai](https://github.com/aaronmarchant96-max/rei-ai)

---

### Build Benchmarks & Engineering Rigor

| Benchmark Metric | Measured Result | Verification Method |
| :--- | :--- | :--- |
| Total Tokens Processed | **1.848 Billion** development & evaluation tokens | `npm run verify:cache` (`data/cache-spend.csv`) |
| Total Build Spend | **$23.52** API spend (97.3502% input cache hit rate) | Billing export reconciliation |
| Verified Test Suite | **1,405/1,405 tests** across 123/123 suites (local & CI) | Hosted GitHub Actions + `npm test` (2026-10-24) |
| Git History | **1,062 commits** on main (measured 2026-10-24) | `git rev-list --count main` |
| Operating Budget | ~$60/month lean serverless infrastructure | Infrastructure receipts |

---

### Why I Built This

Before teaching myself to code, I spent a decade in construction doing commercial glazing and swing-stage rigging. When you work at height, you don't guess—you test the lines and check the connections yourself.

When I started building software, I was surprised by how much of the AI ecosystem runs on blind trust: models hallucinating facts, startups burning through cloud budgets on calls they don't need, and tools that sound smart until you look at what they're actually doing.

I built REI.ai because I wanted tools that are honest, verifiable, and frugal:

- **Family Archive**: I started this because I was digitizing old family records and got tired of AI tools confidently inventing relatives who never existed. When you're dealing with real human history, an algorithm shouldn't make things up just to sound helpful.
- ***The Thulans***: A long-form fiction project I've been writing. Most LLMs spit out generic purple prose. I wanted an editorial tool with restraint—one that checks continuity, catches plot holes, and respects character voice without rewriting everything into corporate sludge.
- **Built for Regular People**: I don't have venture capital or a server farm. I built this on a secondhand ThinkPad T14. The entire development cost was under \$24 across nearly 2 billion tokens because the caching and routing actually work. AI should be a bicycle for the mind for everyday people, not an expensive black box that lies to you.

---

### Core Tech Stack & Engineering Invariants

- **Languages & Frameworks**: TypeScript, JavaScript (ESM/Node.js), React, Vite, CSS3.
- **AI & Infrastructure**: OpenAI Proxy Protocol (`/v1/chat/completions`), Vercel Serverless, DeepSeek-Chat, Groq, Ollama Local LLaMA, Google Gemini.
- **Architecture & Quality Controls**: Evidence-first quality gates (CARDO — Context, Assertion, Reasoning, Delivery, Outcome), decoupled engine runtimes, and closed-loop telemetry audits.

---

### Links & Contact

- **Live Platform**: [https://prompthound-labs.vercel.app/#rei](https://prompthound-labs.vercel.app/#rei)
- **Repository**: [github.com/aaronmarchant96-max/rei-ai](https://github.com/aaronmarchant96-max/rei-ai)
- **Twitter / X**: [@PromptHound96](https://x.com/PromptHound96)
- **GitHub**: [github.com/aaronmarchant96-max](https://github.com/aaronmarchant96-max)
