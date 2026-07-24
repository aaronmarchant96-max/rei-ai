# REI.ai — Cost-Performance Routing for Enterprise AI

> **"The OpenAI-compatible router that thinks before it spends."**

REI.ai automatically minimizes your LLM API costs by intelligently routing every request to the lowest-cost option that meets your target quality—deflecting up to 78% of inference spend before firing a single token.

---

## 📊 Telemetry Highlights (The Two Numbers)
*   **$6.51 to build it:** 601 million tokens of deep reasoning and planning processed via DeepSeek & OpenCode CLI for the cost of a cup of coffee.
*   **78% cheaper to run it:** The routing suite deflects greetings and simple queries, saving 78% in API costs compared to an always-premium baseline.
*   **Product Roadmap:** See [`docs/ROADMAP.md`](file:///home/potatoking/rei-ai/docs/ROADMAP.md) for the Open-Core strategy, REI Router proxy API, and enterprise slice roadmap.

---

## 🧠 Design Philosophy

REI is built on five core design principles adapted from theoretical physics decomposition:

| Phase | Physics Principle | REI Implementation |
| :--- | :--- | :--- |
| **1. Reduce** | Strip a complex system down to its fundamental components. | **CARDO REI 8-Stage Pipeline:** Every task decomposes into the same structured phases (Collect, Analyze, Record, Distinguish, Organize, Review, Evaluate, Iterate). |
| **2. Formulaic Gate** | Express the core dynamics mathematically. | **CARDO GUARD Equation:** All operational decisions reduce to a single cost-weighted utility inequality (`Miss Loss > Action Waste`). |
| **3. Unify** | Prove the same governing equation holds across diverse domains. | **Multi-Domain Registry:** Genealogy, coding, debate, telemetry, and creative writing are routed and verified using the same core logic with zero domain-specific code. |
| **4. Test** | Validate model constraints experimentally. | **Assertion-Gated Tests:** 162 automated Jest tests assert chronological, biological, and cost boundaries. The build fails if cost savings $\le 0$. |
| **5. Falsify** | Define the criteria that would disprove the system's claims. | **Reproducible Benchmarks:** Zero-inference lexical routing can be run and audited by any third party with identical, deterministic results. |

---

## 📐 Formal Definition: The Routing Model

Let $T$ be a reasoning task.  
The system computes the **Complexity Index** $R(T)$:
$$R(T) = (\text{Word Count} \times 2) + (\text{Question Marks} \times 8) + (\text{Uncertainty Keyword Hits} \times 10)$$

Where:
*   **Lexical weight ($\times 2$):** Baseline processing density coefficient.
*   **Branching weight ($\times 8$):** Questions signal decision points, multiplying uncertainty.
*   **Uncertainty weight ($\times 10$):** Explicit uncertainty statements (e.g., *"not sure"*, *"unclear"*) carry heavy cognitive load.

### Complexity Tier Mapping:
*   $R(T) < 20 \rightarrow$ **Low:** Routed to Deterministic ($0 cost) or Base/Cheap models.
*   $20 \le R(T) < 40 \rightarrow$ **Medium:** Routed to Standard pathway (`llama-3.3-70b-versatile`).
*   $R(T) \ge 40 \rightarrow$ **High:** Routed to Premium reasoning pathway (`gpt-4o`) via the CARDO GUARD gate.

---

## 🛡️ The CARDO GUARD Decision Gate

Escalation to premium models is treated as a thermodynamic utility trade-off under uncertainty:

*   **Expected Action Waste ($W$):** The cost of escalating when the warning is a false alarm.
    $$W = C_a \times P_f$$
    *(Where $C_a$ is the Cost to Act, and $P_f$ is the false alarm rate of the model).*
*   **Expected Miss Loss ($L$):** The risk-adjusted cost of ignoring a complex query.
    $$L = C_m \times (1 - P_f)$$
    *(Where $C_m$ is the Cost of Missing).*
*   **The Decision Rule:**
    $$\text{Verdict} = \begin{cases} \text{ACT (Escalate to Premium)}, & \text{if } L > W \\ \text{DO NOT ACT (Use Base/Standard)}, & \text{if } L \le W \end{cases}$$

---

## 🌐 Unification Across Domains

The same 8-stage CARDO REI pipeline + cost-weighted CARDO GUARD gate governs five domains with **zero domain-specific code**:

| Domain | Input Type | The Hinge (Phase Transition) | Evidence Tiers | Cost Risk |
| :--- | :--- | :--- | :--- | :--- |
| **Genealogy** | Timelines, parish certs, military rolls | Identification of same-name generation gaps | 🟢 Primary $\rightarrow$ 🟡 Family Memory | False positive on misattributed ancestor |
| **Coding** | Repositories, APIs, stack traces | Is prompt details specific enough to compile? | HARD STOP validation | Premium vs Standard cost delta |
| **Debate** | Arguments, claims, references | Burden of proof allocation | Source citation credibility | Cost of generating vs verifying |
| **Industrial** | Telemetry, vibrations, thermal data | Anomaly exceeds safety threshold | Sensor reading $\rightarrow$ Feature $\rightarrow$ Score | Cost of shutdown vs missed failure |
| **Creative** | Story prompts, character outlines, structures | Character motivation hinge (want/fear) | Coherence and genre alignment | Token budget on long generation |

---

## ⚡ Quick Start

### 1. Installation
```bash
npm install
npm run dev
```
Starts the local Vite development server. Backend routes through `api/cfai.js` (with local Groq/OpenAI failover).

### 2. Run the Benchmark
Verify the cost-savings assertions and routing accuracy:
```bash
npm test -- --testPathPatterns=routingEval
```

### 3. Run the Blind Test Set
Validate routing against held-out prompts never seen during development:
```bash
npm test -- --testPathPatterns=routingEvalBlind
```

### 4. Run the Full Test Suite
```bash
npm test
```
Runs all 162 regression tests confirming logical correctness, error boundary recovery, and budget safety.

---

## 🛠️ Key Components

| File | Purpose |
| :--- | :--- |
| [**`src/lib/nightShiftRouter.js`**](file:///home/potatoking/debate-furnace/src/lib/nightShiftRouter.js) | Core routing engine — complexity scoring, catalog matching, and cost estimation. |
| [**`src/lib/deterministicEngine.js`**](file:///home/potatoking/debate-furnace/src/lib/deterministicEngine.js) | Layer 0 — returns $0-cost instant answers for smalltalk and greetings. |
| [**`src/lib/cardoGuard.js`**](file:///home/potatoking/debate-furnace/src/lib/cardoGuard.js) | Cost-governor — executes the `L > W` escalation inequality check. |
| [**`src/lib/costHelpers.js`**](file:///home/potatoking/debate-furnace/src/lib/costHelpers.js) | Unified cost tracker enforcing ceiling-based estimates. |
| [**`src/__eval__/routingEval.test.js`**](file:///home/potatoking/debate-furnace/src/__eval__/routingEval.test.js) | 57-prompt benchmark harness with assertion-gated cost/savings checks. |
| [**`data/fingerprints.json`**](file:///home/potatoking/debate-furnace/data/fingerprints.json) | The static fingerprint catalog with domain keywords and thresholds. |

---

## 🐋 Run with Docker
```bash
docker compose up
```

## ⚙️ Environment Variables
Create a `.env` file in the root directory:
```env
GROQ_API_KEY=your_groq_key
OPENAI_API_KEY=your_openai_key  # Optional fallback for premium pathway
```
If no keys are found, the platform falls back to deterministic mock outputs.
