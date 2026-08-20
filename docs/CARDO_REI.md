# CARDO REI — Formal methodology for trustworthy AI development

> **Purpose:** the one-sheet specification of the CARDO REI method, kept in-repo
> so any agent or reader can orient without the external `CARDO_REI.md`.
> **CARDO Method** is the framework (find the hinge). **CARDO REI** is the
> product that makes it visible, auditable, and cost-aware.

```text
             CARDO REI
     Formal methodology for
       trustworthy AI development
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

## How this maps to the repo

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

Everything is the hinge. Everything is CARDO. Everything is REI.
The name is used deliberately, never as decoration.
