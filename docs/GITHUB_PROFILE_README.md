# Hi there, I'm Aaron Marchant 👋 

**AI Systems Engineer & Solo Founder**  
*Creator of [REI.ai](https://github.com/aaronmarchant96-max/rei-ai) — The Evidence-Bounded Decision Audit & Pre-Spend LLM Router.*

---

### 🚀 Flagship Project: [REI.ai](https://github.com/aaronmarchant96-max/rei-ai)

> **“REI does not begin by asking for control of your AI traffic. It begins by earning the right to recommend a change.”**

[REI.ai](https://github.com/aaronmarchant96-max/rei-ai) is an OpenAI-compatible Decision Audit & Pre-Spend Router. Its replay workflow categorizes existing traffic into three evidence buckets and identifies candidates for a prospective shadow pilot before any live-routing change.

- ⚡ **Pre-Spend Selection**: Uses a deterministic in-memory policy without making an LLM call to choose an LLM; a fresh retained benchmark is required before publishing a latency ceiling.
- 🛡️ **Bounded Replay & Shadow Contract**: The isolated `ExecutionController` unit contract preserves the requested model and adds no provider call in shadow mode; production integration remains a separate gate.
- 📊 **3-Bucket Evidence Segmentation**:
  1. *Candidate to Shadow* (Sub-cent model replacement candidate)
  2. *Retain Current Tier* (Complexity justifies flagship models like GPT-4o)
  3. *Insufficient Evidence* (Missing or redacted prompt data excluded from savings claims)
- 🔒 **`ingestable ≠ replay-routable`**: Missing prompt text is normalized into denominator audits but excluded from savings metrics.
- 🔑 **Bring Your Own Key (BYOK)**: Customer-owned provider keys; zero inference balance-sheet liability.
- 🧪 **Local Verification**: **1,366/1,366 automated tests across 121/121 suites** passed locally on 2026-09-02.

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
│ • Verified Test Suite   ──► 1,366/1,366 tests across 121/121 suites (local) │
│ • Git History           ──► 1,028 commits on main (measured 2026-09-02)      │
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
