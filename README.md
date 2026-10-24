---
status: canonical
authority_scope: public-entrypoint-and-headlines
owner: Aaron Marchant
last_verified: 2026-09-02
verified_against_commit: 4e729c2
claims_source: docs/CLAIM_LEDGER.md
supersedes: []
superseded_by: null
archived_at: null
---

# REI.ai

An OpenAI-compatible proxy and inference router that cuts LLM costs by routing each prompt to the cheapest capable model before sending it.

![Tests](https://img.shields.io/badge/tests-1375%2F1375-brightgreen)
![Build tokens](https://img.shields.io/badge/build_tokens-1.84B-blue)
![Build spend](https://img.shields.io/badge/build_spend-%2423.52-orange)
![Build cache hit](https://img.shields.io/badge/build_cache_hit-97.35%25-green)
[![License: MIT / CC BY-NC-SA 4.0](https://img.shields.io/badge/license-MIT%20%7C%20CC%20BY--NC--SA%204.0-blue)](LICENSE)

---

## 1. Value, Plainly

When developers run LLM applications or agent workflows, they often send every request to expensive flagship models (such as GPT-4o). Most routine tasks, including simple questions, syntax checks, classification, or small edits, do not require a flagship model.

REI.ai sits between your application and your model providers as a drop-in local proxy. Before any external request is made, REI inspects the incoming prompt, determines the minimum capable model required, routes the request to that model, and returns standard OpenAI-compatible completions with cost receipts.

Backed by **1,405 automated tests across 123 test suites**.

> For technical reviewers and engineering teams: See [Under the Hood: Systems Audit](docs/WHAT_YOU_MIGHT_MISS.md) for a technical walkthrough of the architectural constraints, error-gap taxonomy, multi-agent governance, and token caching mechanics.

### Quick Start (Local Node)

Start the proxy server locally on port 3000:

```bash
git clone https://github.com/aaronmarchant96-max/rei-ai.git
cd rei-ai
npm install
npm run server
```

### Quick Start (Docker)

```bash
docker build -t rei-ai .
docker run -p 3000:3000 -e REI_API_KEY=local-dev-key rei-ai
```

### Point Your Application

Configure any standard OpenAI client or agent (Cursor, Cline, Aider, OpenCode, LangChain, or the official OpenAI SDK):

```bash
export OPENAI_BASE_URL="http://localhost:3000/v1"
export OPENAI_API_KEY="local-dev-key"
```

Send a test request via curl:

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer local-dev-key" \
  -d '{
    "model": "rei-auto",
    "messages": [
      {"role": "user", "content": "Explain what a database index is in one sentence."}
    ]
  }'
```

The response returns a standard OpenAI completion payload along with an execution receipt:

```json
{
  "id": "chatcmpl-1724210000000",
  "object": "chat.completion",
  "created": 1724210000,
  "model": "gemini-3.6-flash",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "A database index is a specialized data structure that accelerates data retrieval operations on a table at the expense of additional storage and write time."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 181,
    "completion_tokens": 40,
    "total_tokens": 221
  },
  "rei": {
    "routed": true,
    "pathway": "the-engineer",
    "model_selected": "gemini-3.6-flash",
    "cost_observed": "$0.00003",
    "counterfactual_cost": "$0.00115",
    "savings_derived": "97.4%"
  }
}
```

Detailed integration guides are available in [docs/PROXY_QUICKSTART.md](docs/PROXY_QUICKSTART.md).

---

## 2. Mechanism, Precisely

REI.ai intercepts requests sent to `/v1/chat/completions` and `/api/cfai` and processes them through an execution pipeline:

```text
Prompt -> Threat Scanner -> Feature Extraction -> Route Resolution -> Concurrency Pool -> Delivery Integrity -> Receipt
```

### Inputs
- Standard OpenAI Chat Completion request body (`model`, `messages`, `temperature`, `max_tokens`, `stream`).
- Model identifier `rei-auto` enables automated routing. If a specific provider model is requested in shadow mode, that model is preserved while recommendations are logged in parallel.

### Pipeline Steps
1. **Pre-Send Security Inspection**: Evaluates prompt text against 16 threat categories (including recursive jailbreaks, base64 ciphers, system prompt extractions, and credential exfiltration) locally with zero token consumption before dispatch.
2. **Feature Extraction and Classification**: Evaluates input length, uncertainty markers, code fences, markdown tables, comparison terms, and conditional framing to generate a structural complexity score.
3. **Deterministic Cascade**: Routes requests through an ordered priority sequence:
   - Simple greetings and routine status checks -> High-speed low-cost tier (LLaMA 3.1 8B).
   - In-distribution coding and architectural planning -> The Engineer (medium-cost tier).
   - Legal synthesis grounded in historical precedents -> The Precedent Engine.
   - Evidence-tiered genealogical queries -> The Archivist.
   - Deep dialectical pressure-testing and counterfactual analysis -> The Critical Inquirer.
   - High-complexity or unclassified queries -> Flagship structured reasoning tier.
4. **Prompt-Freeze Caching and Single-Flight Coalescing**: Freezes prompt prefix order to maximize upstream provider cache hits and coalesces identical in-flight non-streaming requests per tenant using SHA-256 canonical hashing.
5. **Delivery Integrity Gate**: Validates completion transport, confirms `finish_reason: "stop"`, and checks artifact formatting before output dispatch.

### Guarantees and Invariants
- **Shadow Mode Invariant**: In shadow and replay modes, the requested provider model is preserved with zero overrides. Recommendations are recorded for audit only.
- **Delivery Gate Invariant**: Truncated, malformed, or failed provider responses are marked `savingsEligibility: "excluded"` and record $0.00 towards eligible savings.
- **Evidence Tiering**: Every transaction records telemetry with explicit epistemic tiers (`observed`, `derived`, `modeled`, `replayed`, `unavailable`). Telemetry is never fabricated or imputed with default zeros.
- **Provider Concurrency Bounds**: Requests are metered through bounded tenant concurrency pools to prevent provider rate-limit exhaustion.

---

## 3. Evidence, One Level Deeper

Every claim published across this repository maps directly to an automated verification command. Claims without reproducible commands are retired. Complete records, failure logs, and baseline models are indexed in [docs/CLAIM_LEDGER.md](docs/CLAIM_LEDGER.md).

### Verified Test System

Run the local test harness to reproduce suite claims:

```bash
# Run fast test loop (~11.4s on 12-thread machine via 50% maxWorkers)
npm run test:fast

# Run serial test suite (123 test suites, 1405 tests)
npm test

# Verify automated claims consistency against test results
npm run claims:check
```

- **Empirical Rigor:** Backed by 1,405 automated tests across 123 test suites.
- **Feynman Gate Suite**: 136 ground-truth holdout queries across 5 specialized domains with zero cross-set data contamination (`npm test -- src/__eval__/feynmanGate.test.js`).
- **Deterministic Replay**: Verified 12/12 routing decisions on the fixed red-team regression corpus.

### Token Economy and Spend Audit

Reproduce cache and expenditure totals directly from raw billing exports:

```bash
npm run verify:cache
```

| Metric | Verified Value | Producing Command / Source |
| :--- | :--- | :--- |
| Development & Evaluation Tokens | **1,848,473,560** (1.848B) | `npm run verify:cache` (`data/cache-spend.csv`) |
| Cache Hits | **1,794,848,768** tokens | `npm run verify:cache` |
| Cache Misses | **48,854,782** tokens | `npm run verify:cache` |
| Total API Spend | **$23.5172** | `npm run verify:cache` (billing export reconciliation) |
| Input Cache Hit Rate | **97.3502%** | `npm run verify:cache` |
| Counterfactual No-Cache Spend | **$590.5747** | `npm run verify:cache` |
| Total Spend Reduction | **$567.0575** (96.0%) | `npm run verify:cache` |
| Automated Tests | **1405 passing tests across 123 suites** | `npm test -- --runInBand` |
| Hardware Budget | ThinkPad T14 Gen 2a (~$60/mo) | Measured development environment |

---

## Repository History

This repository was imported to GitHub as a squashed snapshot on 2026-09-03, with an initial commit back-dated to 2026-04-01 to mark project inception. Detailed claim provenance and change proposals are tracked in [docs/CLAIM_LEDGER.md](docs/CLAIM_LEDGER.md) and [docs/POLICY_PROPOSALS.md](docs/POLICY_PROPOSALS.md).

---

## Architectural Documentation

- [Under the Hood: Systems Audit](docs/WHAT_YOU_MIGHT_MISS.md) - Deep dive on test invariants, multi-agent governance, and error-gap tracking.
- [Defense-in-Depth Control Matrix](docs/DEFENSE_IN_DEPTH_CONTROL_MATRIX.md) - Threat taxonomy, routing gates, and scanner rules.
- [Architecture Specification](docs/ARCHITECTURE.md) - System topology, component interactions, and data contracts.
- [Testing Strategy](docs/TESTING.md) - Test hierarchy, holdout datasets, and metamorphic test specs.
- [Claim Ledger](docs/CLAIM_LEDGER.md) - Complete register of empirical claims and producing commands.
- [Caching Rules](docs/CACHING_RULES.md) - Prompt-freeze protocol and token cache management.
- [Proxy Quickstart](docs/PROXY_QUICKSTART.md) - Integration instructions for Python, TypeScript, and CLI tools.
- [Decisions (ADR)](docs/DECISIONS.md) - Architecture decision records.
- [Error Gap Catalogue](docs/ERROR_GAP_CATALOGUE.md) - Registry of caught defects, regressors, and test gaps.

---

## License

- **Code & Tooling**: [MIT License](LICENSE) &copy; 2026 Aaron Marchant / PromptHound Labs.
- **Documentation, Narrative & Archival Text**: [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)](LICENSE) &copy; 2026 Aaron Marchant.
