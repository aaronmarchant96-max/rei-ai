# REI.ai — Cost-Aware LLM Routing & Structured Reasoning

> **REI.ai by PromptHound Labs**  
> *"A structured reasoning framework with cost-aware LLM routing."*

REI.ai automatically minimizes LLM API costs by classifying prompts locally and routing them to the cheapest capable model before a single remote token is processed. 

---

## 📊 Performance & Testing Metrics

We prioritize verifiable, empirical benchmarks over generalized claims:

*   **90% Route Accuracy:** Verified on our fresh, 30-prompt blind holdout set for the v3 keyword router (evolving from a 67% baseline to 90% post-tuning).
*   **v4 Semantic Router (Research):** Currently at **70% accuracy** running local 384-dimensional dense vector embeddings (`all-MiniLM-L6-v2` via ONNX/WASM in browser/Node).
*   **399 Automated Tests:** 27 test suites running 399 regression tests assert chronological, logical, and safety boundaries with 0 regressions.
*   **12 Landmark Legal Cases:** Our legal reasoning domain is grounded in a 12-case verified index to prevent hallucination.

---

## 🧠 The 5 Reasoning Domains

The routing engine classifies prompts into one of five core domains:

1.  **The Generalist (assistant):** Everyday queries, reasoning, and low-complexity tasks.
2.  **The Hinge Finder (coding):** Advanced software logic executing the CARDO REI methodology (verifies API shapes, enforces developer checks, and halts on ambiguity).
3.  **The Archivist (genealogy):** Evidence-tiered historical records analysis (same-name disambiguation, parish registers, age boundary validation).
4.  **The Storyteller (story):** Narrative architecture and character hinge generators.
5.  **The Lex (legal):** Local precedent grounding utilizing the `Case Hinge` engine.

---

## 📐 Router Architecture & Core Components

REI's routing pipeline runs in less than 5ms locally and consists of:

### 1. Zero-Inference Matcher (Layer 0)
Regex-based scanner that intercepts simple greetings, metadata inquiries, and smalltalk, returning instant local responses at $0 cost.

### 2. Night Shift Router (v3 Keyword Engine)
High-speed keyword-based router that parses input structural properties, mapping prompts to domain profiles and executing the `isLikelyLegalRequest()` and coding branches.

### 3. Local ONNX Embeddings (v4 Research Engine)
Processes inputs through a 384-dimensional semantic embedding pipeline (`@xenova/transformers` running the `all-MiniLM-L6-v2` model) to determine cosine similarity against domain centroids.

### 4. CARDO GUARD Decision Gate
Escalates high-complexity queries to premium models under an expected-utility inequality:
$$\text{Verdict} = \text{ACT (Escalate)} \iff \text{Miss Loss} > \text{Action Waste}$$

### 5. Adversarial Defense & Red-Team Scanner
Scans payloads for injection vectors and malicious prompts, instantly routing suspicious traffic to hardened security models.

### 6. Case Hinge (Legal Grounding)
A deterministic parser that extracts standard citations (e.g., *Donoghue v Stevenson*, *410 U.S. 113*), matches them against a landmark cases dataset, and flags unverified citations before the LLM generates a response.

---

## 🌐 User Interface & Case Studies

Our landing page is structured to highlight both the flagship router and the specialized tools that prove the CARDO framework:
*   **Interactive Router Demo:** Live playground displaying the selected model, estimated token usage, and real-time cost delta.
*   **CARDO Pipeline Trace:** Full visibility into the reasoning steps (Collect, Analyze, Record, Distinguish, Operate).
*   **Vibrant GUI:** Responsive glassmorphism dashboards with staggered entrance animations and real-time telemetry metrics.

---

## 🛠️ Tech Stack & Deployment

*   **Frontend:** React (lazy-loaded code splitting), Tailwind CSS (Relume gold preset).
*   **Backend:** Node.js, Vercel Serverless Functions (`api/cfai.js`).
*   **Embeddings:** ONNX Runtime Web / WASM.
*   **Testing:** Jest (jsdom environment).

---

## ⚡ Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/aaronmarchant96-max/rei-ai
cd rei-ai
npm install
```

### 2. Run Locally
```bash
npm run dev
```

### 3. Run Benchmark Suite
```bash
npm test
```

---

## 🔗 Project Links

*   **Live Demo:** [https://debate-furnace.vercel.app/#rei](https://debate-furnace.vercel.app/#rei)
*   **Source Code:** [https://github.com/aaronmarchant96-max/rei-ai](https://github.com/aaronmarchant96-max/rei-ai)
