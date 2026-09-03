# Contributing to REI.ai

Thank you for your interest in contributing to **REI.ai**!

REI is built on a foundation of **empirical rigor, verified claims, and least-authority systems design**. Every model choice, cost claim, and test assertion in this repository must be grounded in reproducible evidence.

---

## 🧭 Core Principles

1. **"Claim Before Code"**: If a contribution touches routing, economics, security, or accuracy, define the claim and the measurement test contract before writing implementation code.
2. **Zero Fabrication**: Never submit estimated numbers into measured telemetry fields. Telemetry numbers in docs and tests must match machine stdout.
3. **Principle of Least Authority**: Components should possess the minimum network, filesystem, and model execution permissions required to perform their task.

---

## 🛠️ Development Setup

### Prerequisites
- **Node.js**: `>= 20.0.0`
- **npm**: `>= 10.0.0`
- **Git**

### Installation
```bash
# 1. Clone the repository
git clone https://github.com/aaronmarchant96-max/rei-ai.git
cd rei-ai

# 2. Install dependencies
npm install

# 3. Start local development server (frontend + API)
npm run dev

# Or run the headless cognitive proxy gateway alone on port 3000
npm run server
```

---

## 🧪 Verification & Testing Gates

Before committing or opening a pull request, your branch **must pass all verification gates**:

```bash
# 1. Fast iteration test loop (~11s)
npm run test:fast

# 2. Full test suite verification (1,366+ tests across 121 suites)
npm test

# 3. Claims ledger synchronization check (MUST pass cleanly)
node scripts/gen-claims.mjs --check

# 4. Error-gap catalogue check
node scripts/extract-error-gaps.mjs --check

# 5. Production build check
npm run build
```

> [!IMPORTANT]
> Do not hand-edit test count badges or documentation numbers in `README.md` or `docs/CLAIM_LEDGER.md`. Always run `node scripts/gen-claims.mjs` to synchronize claims from authoritative test execution output.

---

## 📝 Commit Conventions & Error-Gap Tagging

We follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `perf:`).

When fixing a defect or closing an error gap, tag the commit with the detection mechanism that caught it:

| Tag | Caught By |
| :--- | :--- |
| `[caught: test]` | Automated test suite (local or CI) |
| `[caught: ai-cross-check]` | Model family cross-check or adversarial evaluation |
| `[caught: claim-gate]` | Feynman Gate or `scripts/gen-claims.mjs` integrity check |
| `[caught: review]` | Code review, PR review, or human inspection |
| `[caught: manual]` | Manual observation during runtime or dashboard inspection |

**Example:**
```bash
git commit -m "fix(router): prevent regex backtracking on long query strings [caught: test]"
```

---

## 🚀 Submitting a Pull Request

1. **Create a topic branch**: `git checkout -b feature/your-feature-name`
2. **Write tests first**: Add targeted unit/integration tests under `src/` or `tests/`.
3. **Verify the suite**: Confirm `npm test`, `npm run build`, and `node scripts/gen-claims.mjs --check` pass 100% green.
4. **Open a PR**: Provide a clear description of the problem solved, the architectural rationale, and the verified test results.
