# Hi there, I'm Aaron Marchant 👋 

**AI Systems Engineer & Solo Founder**  
*Creator of [REI.ai](https://github.com/aaronmarchant96-max/rei-ai) — The Zero-Risk Decision Audit & Pre-Spend LLM Router.*

---

### 🚀 Flagship Project: [REI.ai](https://github.com/aaronmarchant96-max/rei-ai)

> **“REI does not begin by asking for control of your AI traffic. It begins by earning the right to recommend a change.”**

[REI.ai](https://github.com/aaronmarchant96-max/rei-ai) is an OpenAI-compatible Decision Audit & Pre-Spend Router. It replays and shadows existing AI traffic (from Cursor, Cline, Aider, or backend APIs), categorizes requests into 3 evidence buckets, and demonstrates where token spend can be safely reduced *before* altering production execution.

- ⚡ **Pre-Spend Selection**: Evaluates prompt complexity in **< 1ms** in-memory (**< 40ms** e2e) before triggering API calls.
- 🛡️ **Zero-Risk Replay & Shadow Mode**: Evaluates traffic with **0 production overrides** and **0 extra model calls**.
- 📊 **3-Bucket Evidence Segmentation**:
  1. *Candidate to Shadow* (Sub-cent model replacement candidate)
  2. *Retain Current Tier* (Complexity justifies flagship models like GPT-4o)
  3. *Insufficient Evidence* (Missing or redacted prompt data excluded from savings claims)
- 🔒 **`ingestable ≠ replay-routable`**: Missing prompt text is normalized into denominator audits but excluded from savings metrics.
- 🔑 **Bring Your Own Key (BYOK)**: Customer-owned provider keys; zero inference balance-sheet liability.
- 🧪 **100% Green CI Suite**: Backed by **1,364 automated tests across 120 test suites**.

🌐 **Live Platform**: [https://rei.ai](https://rei.ai)  
📦 **Repository**: [github.com/aaronmarchant96-max/rei-ai](https://github.com/aaronmarchant96-max/rei-ai)

---

### 📊 Build Benchmarks & Engineering Rigor

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                          AARON'S BUILD BENCHMARKS                           │
├─────────────────────────────────────────────────────────────────────────────┤
│ • Total Tokens Processed ──► 1.848 Billion development & evaluation tokens  │
│ • Total Build Spend     ──► $23.52 API spend (97.35% input cache hit rate)  │
│ • Verified Test Suite   ──► 1,364 tests across 120 suites (100% Green CI)   │
│ • Git History           ──► 1,026 conventional commits on main branch       │
│ • Local Model Gate      ──► Epistemic quality gate for local LLaMA models   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 🛠️ Core Tech Stack & Engineering Invariants

- **Languages & Frameworks**: TypeScript, JavaScript (ESM/Node.js), React, Vite, CSS3.
- **AI & Infrastructure**: OpenAI Proxy Protocol (`/v1/chat/completions`), Vercel Serverless, DeepSeek-Chat, Groq, Ollama Local LLaMA, Google Gemini.
- **Architecture & Methodologies**: **CARDO REI** (Formal Epistemic Quality Gates), Hexagonal Runtime Decoupling (EchoForge), C-Activity Bootstrap Flywheel.

---

### 🌐 Links & Contact

- 🌐 **Live Platform**: [https://rei.ai](https://rei.ai)
- 📦 **Repository**: [github.com/aaronmarchant96-max/rei-ai](https://github.com/aaronmarchant96-max/rei-ai)
- 🐦 **Twitter / X**: [@PromptHound96](https://x.com/PromptHound96)
- 💻 **GitHub**: [github.com/aaronmarchant96-max](https://github.com/aaronmarchant96-max)
