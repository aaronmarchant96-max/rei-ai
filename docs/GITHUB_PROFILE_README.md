# Hi there, I'm Aaron Marchant

**AI Systems Engineer**
*Creator of [REI.ai](https://github.com/aaronmarchant96-max/rei-ai) — The Evidence-Bounded Decision Audit & Pre-Spend LLM Router.*

---

### Flagship Project: [REI.ai](https://github.com/aaronmarchant96-max/rei-ai)

> **"REI does not begin by asking for control of your AI traffic. It begins by earning the right to recommend a change."**

[REI.ai](https://github.com/aaronmarchant96-max/rei-ai) is an OpenAI-compatible Decision Audit & Pre-Spend Router. Its replay workflow categorizes existing traffic into three evidence buckets and identifies candidates for a prospective shadow pilot before any live-routing change.

- **Pre-Spend Selection**: Uses a deterministic in-memory policy without making an LLM call to choose an LLM; a fresh retained benchmark is required before publishing a latency ceiling.
- **Bounded Replay & Shadow Contract**: The isolated `ExecutionController` unit contract preserves the requested model and adds no provider call in shadow mode; production integration remains a separate gate.
- **3-Bucket Evidence Segmentation**:
  1. *Candidate to Shadow* (Sub-cent model replacement candidate)
  2. *Retain Current Tier* (Complexity justifies flagship models like GPT-4o)
  3. *Insufficient Evidence* (Missing or redacted prompt data excluded from savings claims)
- **`ingestable != replay-routable`**: Missing prompt text is normalized into denominator audits but excluded from savings metrics.
- **Bring Your Own Key (BYOK)**: Customer-owned provider keys; zero inference balance-sheet liability.
- **Local Verification**: **1,405/1,405 automated tests across 123/123 suites** passed locally on 2026-10-24.

**Live Platform**: [prompthound-labs.vercel.app/#rei](https://prompthound-labs.vercel.app/#rei)
**Repository**: [github.com/aaronmarchant96-max/rei-ai](https://github.com/aaronmarchant96-max/rei-ai)

---

### Build Benchmarks & Engineering Rigor

| Benchmark Metric | Measured Result | Verification Method |
| :--- | :--- | :--- |
| Total Tokens Processed | **1.848 Billion** development & evaluation tokens | `npm run verify:cache` (`data/cache-spend.csv`) |
| Total Build Spend | **$23.52** API spend (97.3502% input cache hit rate) | Billing export reconciliation |
| Verified Test Suite | **1,405/1,405 tests** across 123/123 suites (local) | `npm test -- --runInBand` |
| Git History | **1,056 commits** on main (measured 2026-10-24) | `git rev-list --count main` |
| Operating Budget | ~$60/month lean serverless infrastructure | Infrastructure receipts |

---

### Behind the Machine: Tradecraft & The Human Reality

I spent over a decade working construction—mostly hanging off the side of high-rises doing commercial glazing and swing-stage rigging. When you work at height, you don't guess. You check the anchors, you test the drop lines, and you don't take someone else's word that a bolt is tight. If a rig fails, someone hits the ground.

When I started teaching myself to code, I looked at the AI space and felt like I was watching people hang drywall without framing the walls first. Models hallucinating answers, startups burning millions on cloud API calls they can't afford, and software that sounds smart until you actually inspect what it's doing.

I built REI.ai and its supporting tools because I needed software that works the way a good tradesman works: honest, verifiable, and frugal.

- **Family Archive**: I started this because I was digitizing old family records and got tired of AI tools confidently inventing relatives who never existed. When you're dealing with real human history, an algorithm shouldn't make things up just to sound helpful.
- ***The Thulans***: A long-form fiction project I've been writing. Most LLMs spit out generic purple prose. I wanted an editorial tool with restraint—one that checks continuity, catches plot holes, and respects character voice without rewriting everything into corporate sludge.
- **Built for Regular People**: I don't have venture capital or a server farm. I built this on a secondhand ThinkPad T14. The entire development cost was under \$24 across nearly 2 billion tokens because the caching and routing actually work. AI should be a bicycle for the mind for everyday people, not an expensive black box that lies to you.

---

### Core Tech Stack & Engineering Invariants

- **Languages & Frameworks**: TypeScript, JavaScript (ESM/Node.js), React, Vite, CSS3.
- **AI & Infrastructure**: OpenAI Proxy Protocol (`/v1/chat/completions`), Vercel Serverless, DeepSeek-Chat, Groq, Ollama Local LLaMA, Google Gemini.
- **Architecture & Methodologies**: **CARDO REI** (Formal Epistemic Quality Gates), Hexagonal Runtime Decoupling (EchoForge), C-Activity Bootstrap Flywheel.

---

### Links & Contact

- **Live Platform**: [https://prompthound-labs.vercel.app/#rei](https://prompthound-labs.vercel.app/#rei)
- **Repository**: [github.com/aaronmarchant96-max/rei-ai](https://github.com/aaronmarchant96-max/rei-ai)
- **Twitter / X**: [@PromptHound96](https://x.com/PromptHound96)
- **GitHub**: [github.com/aaronmarchant96-max](https://github.com/aaronmarchant96-max)
