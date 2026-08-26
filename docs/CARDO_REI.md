# The REI Method

> **Purpose:** a plain-language standard for building AI systems whose choices,
> results, and claims can be inspected. CARDO is the formal execution cycle
> that implements the method; it is not the first thing a customer must learn.

## The five questions

| Question | What it prevents |
|---|---|
| **1. What kind of job is this?** | Treating every prompt as the same problem. |
| **2. Which model should handle it?** | Choosing by habit or brand instead of capability, cost, and risk. |
| **3. What rules must the answer follow?** | Deciding what “good enough” means only after seeing the output. |
| **4. Did it finish correctly?** | Counting incomplete or invalid delivery as success. |
| **5. Can we prove what happened?** | Making quality, routing, or savings claims without a receipt. |

## The product

- **REI Method:** the five-question standard.
- **REI Engine:** software controls that apply it inside an AI application.
- **REI Studio:** the live workspace that makes those controls visible.
- **REI Decision Audit:** a bounded replay of existing traffic that identifies
  missing controls before a team changes its production stack.

## The formal CARDO execution cycle

```text
          THE REI METHOD
   Five accountable questions
                  │
                  ▼
             FIND THE HINGE
                  │
       ┌──────────┼──────────┐
       ▼          ▼          ▼
    Decision    Claim      System
       │          │          │
       ▼          ▼          ▼
    Test it     Measure it   Trace it
       │          │          │
       └──────────┼──────────┘
                  ▼
          Verified evidence
                  │
                  ▼
       Human / Claims Gate
                  │
                  ▼
              Iterate
```

## How CARDO maps to the repo

| Box | Where it lives in the code |
|-----|----------------------------|
| **Find the hinge** | The 8-stage CARDO pipeline: Collect → Analyze → Record → Distinguish → Organize → Review → Evaluate → Iterate. Hinge = the single point of pivot that changes the answer. |
| **Decision → Test it** | `npm test -- --runInBand` (jest); every claim-bearing behavior has a regression test. |
| **Claim → Measure it** | `CLAIM_LEDGER.md` maps every public metric to a reproducing command; `gen-claims.mjs` snapshots the suite. |
| **System → Trace it** | Routing + cost are deterministic: `nightShiftRouter.ts`, `hingeClassifier.ts`, `cardoGuard.js`. Savings telemetry via `/api/savings` over KV traces. |
| **Verified evidence** | Claims are stratified by evidence class (measured / replayed / estimated / modeled). A transformation, calculation, or repetition cannot upgrade an evidence class by itself. |
| **Human / Claims Gate** | The artifact proposes, the human decides. The system never auto-mutates policy; proposals pass a human gate. |
| **Iterate** | Neurath's boat — reconstruct plank-by-plank while at sea, commit by commit. |

## The invariant

Missing evidence stays missing. Incomplete delivery is not success. A modeled
or replayed value never becomes an observed value through presentation alone.
The artifact proposes; the human decides.
