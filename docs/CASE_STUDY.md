# Case Study: Building a testable, cost-aware AI reasoning system

Live system: https://debate-furnace.vercel.app/#rei

Repository: https://github.com/aaronmarchant96-max/rei-ai-platform

The problem

Most AI prototypes look convincing on a happy path but fall apart when the input is ambiguous, noisy, or underspecified. I wanted a system that would behave more like a reviewed workflow than a demo.

What I built

The project now has a REI experience with a structured reasoning shell, a Night Shift routing layer, and a deterministic CARDO GUARD decision gate. The routing layer classifies requests before the model call and now uses richer fingerprint signals, complexity cues, and lightweight route-memory so it can adapt more sensibly to uncertain or repeated patterns. The prompt scaffolding adds a hard-stop rule for underspecified work. The app shell keeps the experience organized and reviewable.

How the routing works

The Night Shift router reads the incoming prompt and selects a path from a catalog. Simple greetings route to a cheap fast path. Coding, genealogy, and story prompts route to more structured profiles. Adversarial or red-team prompts route to a more expensive validation path. The routing rules are explicit and testable in src/lib/nightShiftRouter.js and data/fingerprints.json.

How I handled failure modes

One recurring issue was short prompts drifting off format and producing details that were not grounded in the request. That was addressed by tightening the prompt scaffolding and by routing short-path work through a more stable model choice. Another issue was parser mismatch in the REI reply parser. The parser was expecting one shape while the model produced another, so the output stopped looking structured. That was corrected by making the parser accept both forms. A smaller but real issue was a scroll effect that caused the layout to jump on input focus. That was removed.

Testing and evidence

The repo uses Jest as an evidence gate. The routing suite covers the main decision paths and the fallback case. The CARDO GUARD suite covers confidence bands, edge cases, and threshold behavior. The purpose is not only to prevent regressions but to make the system easier to reason about.

Why this matters

This project is not just a prompt demo. It shows a workflow for building an AI system with visible logic, explicit cost choices, tests, and documentation. That matters for QA, evaluation, and responsible product work because the strongest systems are the ones that can be reviewed and challenged.

Evidence and references

The main implementation files are src/REI.jsx, api/cfai.js, src/lib/nightShiftRouter.js, src/lib/cardoGuard.js, and src/AppShell.jsx.

The main test files are src/lib/nightShiftRouter.test.js and src/lib/cardoGuard.test.js.

The supporting docs are README.md, TOKEN_SAVERS.md, DEVELOPMENT_SETUP.md, and docs/REI_VIBE_MASTER_INDEX_TEMPLATE.md.
