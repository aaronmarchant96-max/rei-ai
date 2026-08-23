# Error-Gap Catalogue

> Auto-generated from git commit history.
> Last updated: 2026-08-23T06:33:13.276Z
> Span: 2026-08-08 → 2026-08-23 (172 tagged commits, 175 total tags)

## Tag Taxonomy

| Tag | Meaning | Question this tag answers |
|---|---|---|
| `manual` | Caught by a human reviewing output / dashboard / diff | What does the human see that automation doesn't? |
| `ai-cross-check` | Caught by comparing two AI-generated proposals | Where do models disagree productively? |
| `test` | Caught by an automated test suite | Which failures did tests prevent from reaching production? |
| `claim-gate` | Caught by a verifyAll() claim failing in the FEYNMAN GATE | Which claim drifted from reality, and which metric caught it? |

## Summary

| Tag | Count |
|---|---|
| `manual` | 102 |
| `test` | 59 |
| `claim-gate` | 13 |
| `ai-cross-check` | 1 |

## Timeline (newest first)

| Commit | Date | Subject | Tags & Context |
|---|---|---|---|
| `16da615` | 2026-08-23 | fix(analytics): restore CARDO decision record contract [caught: manual] | `manual` — fix(analytics): restore CARDO decision record contract |
| `d2cef8f` | 2026-08-22 | fix(gateway): preserve execution evidence integrity [caught: test] | `test` — fix(gateway): preserve execution evidence integrity |
| `47b486b` | 2026-08-22 | feat(chat): polish workspace visual system [caught: test] | `test` — feat(chat): polish workspace visual system |
| `f617b19` | 2026-08-20 | fix(landing): simplify hero copy, clarify proxy/library/studio form factors, and... | `test` — fix(landing): simplify hero copy, clarify proxy/library/studio form factors, and cite full benchmark evidence |
| `f42be11` | 2026-08-20 | docs: create PORTFOLIO_OVERVIEW.md with 3-pillar hierarchy, add Start Here guide... | `manual` — docs: create PORTFOLIO_OVERVIEW.md with 3-pillar hierarchy, add Start Here guide, and reconcile test milestone history |
| `f1c67d4` | 2026-08-20 | docs(readme): correct Super Bowl LVIII score, clarify primary product pitch, and... | `manual` — docs(readme): correct Super Bowl LVIII score, clarify primary product pitch, and highlight 976 tests and 4.66 spend |
| `ef9b72d` | 2026-08-20 | feat(proxy): harden /api/v1/chat/completions for pilot onboarding [caught: test] | `test` — feat(proxy): harden /api/v1/chat/completions for pilot onboarding |
| `ed3d218` | 2026-08-20 | refactor(ui): single-height workspace shell, attached composer, single scrollbar... | `manual` — refactor(ui): single-height workspace shell, attached composer, single scrollbar, and high-contrast labels |
| `ecd7e3f` | 2026-08-20 | fix(cfai): increase PROVIDER_TIMEOUT_MS to 25s for long DeepSeek story generatio... | `test` — fix(cfai): increase PROVIDER_TIMEOUT_MS to 25s for long DeepSeek story generations |
| `e8e16d5` | 2026-08-20 | feat(eval): add verification validity eval suite and auto-sync claims across doc... | `claim-gate` — feat(eval): add verification validity eval suite and auto-sync claims across docs |
| `e6a738f` | 2026-08-20 | feat(ui): polish lower tool grid with semantic buttons, category labels, feature... | `test` — feat(ui): polish lower tool grid with semantic buttons, category labels, featured proxy layout, and smooth footer transition |
| `d99e5a9` | 2026-08-20 | fix(landing): clarify claim baselines, demo model labels, and live Feynman healt... | `claim-gate` — fix(landing): clarify claim baselines, demo model labels, and live Feynman health provenance |
| `c64b736` | 2026-08-20 | fix(ui): eliminate escaped html/markdown tags and isolate planning blueprints to... | `test` — fix(ui): eliminate escaped html/markdown tags and isolate planning blueprints to inspect drawer |
| `c5c6562` | 2026-08-20 | fix(story): resolve Story Architect provider routing, candidate model arrays, an... | `test` — fix(story): resolve Story Architect provider routing, candidate model arrays, and multi-provider fallback |
| `bb13960` | 2026-08-20 | fix(eval): revise evidence package with fresh Jest execution, Feynman availabili... | `claim-gate` — fix(eval): revise evidence package with fresh Jest execution, Feynman availability semantics, and lockfile synchronization |
| `b31cce7` | 2026-08-20 | fix(health): bundle static JSON assets for serverless environment in api/health.... | `test` — fix(health): bundle static JSON assets for serverless environment in api/health.js |
| `ac9f68c` | 2026-08-20 | feat(testing): add CARDO-inspired deterministic test router [caught: test] | `test` — feat(testing): add CARDO-inspired deterministic test router |
| `aabb46f` | 2026-08-20 | feat(brand): position Aaron Marchant systems engineering attribution & dual hero... | `test` — feat(brand): position Aaron Marchant systems engineering attribution & dual hero CTAs |
| `a64c3bf` | 2026-08-20 | docs(commercial): remove unverified audit/guarantee phrasing in pilot spec and b... | `manual` — docs(commercial): remove unverified audit/guarantee phrasing in pilot spec and brief |
| `9d422c7` | 2026-08-20 | feat(routing): ensure all higher-reasoning domains route to deepseek-chat [caugh... | `test` — feat(routing): ensure all higher-reasoning domains route to deepseek-chat |
| `9370d22` | 2026-08-20 | feat(telemetry): add export-evidence-package generator, align React 18 types, an... | `claim-gate` — feat(telemetry): add export-evidence-package generator, align React 18 types, and expand doc sync to CONTRIBUTING and ARCHITECTURE |
| `8c8ff15` | 2026-08-20 | refactor(router): unify nightShiftRouter to canonical TypeScript implementation ... | `test` — refactor(router): unify nightShiftRouter to canonical TypeScript implementation |
| `881f5ed` | 2026-08-20 | docs(commercial): harden pilot evidence, security invariants, and advancement ga... | `manual` — docs(commercial): harden pilot evidence, security invariants, and advancement gates |
| `8027153` | 2026-08-20 | feat(cfai): add presence and frequency penalties to prevent generation loops [ca... | `test` — feat(cfai): add presence and frequency penalties to prevent generation loops |
| `74e00ed` | 2026-08-20 | test(routing): add deepseek routing guarantee test suite and sync claims ledger ... | `test` — test(routing): add deepseek routing guarantee test suite and sync claims ledger |
| `7384f6d` | 2026-08-20 | feat(ci): implement validate-docs.mjs lifecycle validator and wire into prebuild... | `claim-gate` — feat(ci): implement validate-docs.mjs lifecycle validator and wire into prebuild |
| `7247921` | 2026-08-20 | docs: harden headline claims against claim ledger and fix duplicated repository ... | `manual` — docs: harden headline claims against claim ledger and fix duplicated repository URLs |
| `714d0b5` | 2026-08-20 | docs(workflow): lock test count ceiling at ~1000 and add fast-lane test scripts ... | `test` — docs(workflow): lock test count ceiling at ~1000 and add fast-lane test scripts |
| `71171fe` | 2026-08-20 | fix(api): eliminate .ts imports in serverless functions and add active Groq cand... | `test` — fix(api): eliminate .ts imports in serverless functions and add active Groq candidate models |
| `6f27853` | 2026-08-20 | feat(parser): replace brittle regex with schema-validated toolParser, clean thin... | `test` — feat(parser): replace brittle regex with schema-validated toolParser, clean thinking tags, and preserve CARDO markdown |
| `6dc1f5f` | 2026-08-20 | feat(ui): consumer-grade workspace transition & decomposed inspection architectu... | `test` — feat(ui): consumer-grade workspace transition & decomposed inspection architecture |
| `67e33cc` | 2026-08-20 | ci: add GitHub Actions workflow, update system prompt creator identity, and clea... | `test` — ci: add GitHub Actions workflow, update system prompt creator identity, and clean GitLab CI |
| `617fe1e` | 2026-08-20 | feat(eval): add adversarial distributed systems fault injection suite and markdo... | `test` — feat(eval): add adversarial distributed systems fault injection suite and markdown unescaping |
| `5dec4fe` | 2026-08-20 | test(visual): add browser-level layout regression suite and multi-viewport scree... | `test` — test(visual): add browser-level layout regression suite and multi-viewport screenshots |
| `5a1dc93` | 2026-08-20 | fix(evidence): enforce p0 measurement integrity contract and story consistency g... | `test` — fix(evidence): enforce p0 measurement integrity contract and story consistency gate |
| `546d484` | 2026-08-20 | fix(telemetry): resolve session tracking NaN and object destructuring in useSess... | `test` — fix(telemetry): resolve session tracking NaN and object destructuring in useSessionTracker |
| `53eca4b` | 2026-08-20 | feat(routing): promote DeepSeek to #1 primary gateway and priority fallback [cau... | `test` — feat(routing): promote DeepSeek to #1 primary gateway and priority fallback |
| `4dc9821` | 2026-08-20 | docs: refine commercial pilot spec with non-inferiority margins, VPC sidecar sec... | `manual` — docs: refine commercial pilot spec with non-inferiority margins, VPC sidecar security, and 1-page agreement template |
| `4a5fed8` | 2026-08-20 | test(visual): enforce 7/7 layout invariants with simulated mobile keyboard and 2... | `test` — test(visual): enforce 7/7 layout invariants with simulated mobile keyboard and 2x DPR rendering |
| `470f952` | 2026-08-20 | fix(navigation): reset scroll position on tool switch, add hashchange listener, ... | `manual` — fix(navigation): reset scroll position on tool switch, add hashchange listener, and expand initial tool routing |
| `462245a` | 2026-08-20 | docs: establish document lifecycle frontmatter on 6 canonical truths and archive... | `manual` — docs: establish document lifecycle frontmatter on 6 canonical truths and archive point-in-time handoffs |
| `3fee5de` | 2026-08-20 | docs: add commercial pilot spec with BYOK architecture, 3-stage funnel, and non-... | `manual` — docs: add commercial pilot spec with BYOK architecture, 3-stage funnel, and non-dilutive credit strategy |
| `271069c` | 2026-08-20 | feat(routing): route all higher reasoning domains to DeepSeek-V3 [caught: test] | `test` — feat(routing): route all higher reasoning domains to DeepSeek-V3 |
| `255cad2` | 2026-08-20 | fix(shell): eagerly import primary views to eliminate dynamic import suspense de... | `manual` — fix(shell): eagerly import primary views to eliminate dynamic import suspense delay |
| `23acfb3` | 2026-08-20 | refactor(test): consolidate parameterized test matrices under ~1000 ceiling [cau... | `test` — refactor(test): consolidate parameterized test matrices under ~1000 ceiling |
| `1fe9073` | 2026-08-20 | feat(commercial): codify FinOps ICP wedge, investor diligence memo, 90-day found... | `test` — feat(commercial): codify FinOps ICP wedge, investor diligence memo, 90-day founder plan, and heterogeneous routing acceptance tests |
| `1ce88cd` | 2026-08-20 | docs: repair active document links, clean relative paths, and update TypeScript ... | `test` — docs: repair active document links, clean relative paths, and update TypeScript source references |
| `189e6f7` | 2026-08-20 | feat(archivist): add genealogical evidence engine, disambiguation hinges, and fa... | `test` — feat(archivist): add genealogical evidence engine, disambiguation hinges, and family archive porting spec |
| `153ad12` | 2026-08-20 | fix(prompts): enforce CARDO Hinge and Facts loop across all substantive Generali... | `manual` — fix(prompts): enforce CARDO Hinge and Facts loop across all substantive Generalist responses |
| `0bb1d9d` | 2026-08-20 | feat(story): route Storyteller directly to deepseek-v4-pro [caught: test] | `test` — feat(story): route Storyteller directly to deepseek-v4-pro |
| `0290c4c` | 2026-08-20 | feat(testing): harden test router with failure recall harness and fail-closed co... | `claim-gate` — feat(testing): harden test router with failure recall harness and fail-closed contracts |
| `e76effb` | 2026-08-19 | feat(telemetry): local proxy JSONL trace persistence and zero-spend counterfactu... | `test` — feat(telemetry): local proxy JSONL trace persistence and zero-spend counterfactual replay engine |
| `c1a8f37` | 2026-08-19 | feat(health): add internal state probes for Hinge classifier weights and memory ... | `test` — feat(health): add internal state probes for Hinge classifier weights and memory telemetry |
| `5f1c69b` | 2026-08-19 | feat(ci): add automated post-deploy smoke test and secret leak audit [caught: te... | `test` — feat(ci): add automated post-deploy smoke test and secret leak audit |
| `5dad552` | 2026-08-19 | feat(landing): add OpenAI Proxy Gateway card to ecosystem grid [caught: test] | `test` — feat(landing): add OpenAI Proxy Gateway card to ecosystem grid |
| `55e3fc8` | 2026-08-19 | feat(ops): add /api/health endpoint, DEPLOYMENT_GUIDE runbook, and sync claims t... | `test` — feat(ops): add /api/health endpoint, DEPLOYMENT_GUIDE runbook, and sync claims to 953 tests |
| `4f3f76e` | 2026-08-19 | fix(cfai): flatten tool execution evidence into clean synthesis turns [caught: m... | `manual` — fix(cfai): flatten tool execution evidence into clean synthesis turns |
| `22046e6` | 2026-08-19 | feat(proxy): mount OpenAI-compatible /v1/chat/completions and /v1/models endpoin... | `test` — feat(proxy): mount OpenAI-compatible /v1/chat/completions and /v1/models endpoints |
| `f03a0e8` | 2026-08-17 | chore: clean up framer-motion DOM warnings in test runner and sync claims.json (... | `test` — chore: clean up framer-motion DOM warnings in test runner and sync claims.json (946 tests / 75 suites) |
| `eacf662` | 2026-08-17 | feat(tools): enable autonomous Exa web search grounding for historical and techn... | `manual` — feat(tools): enable autonomous Exa web search grounding for historical and technical storytelling |
| `e6ccb1c` | 2026-08-17 | feat(story): infuse Storyteller prompt with sensory grit, subtext, and anti-clic... | `manual` — feat(story): infuse Storyteller prompt with sensory grit, subtext, and anti-cliche standards |
| `e6af6bc` | 2026-08-17 | fix(cfai): strip unclosed reasoning tags and enforce dedicated synthesis system ... | `manual` — fix(cfai): strip unclosed reasoning tags and enforce dedicated synthesis system prompt |
| `e2d38ed` | 2026-08-17 | fix(cfai): synthesize tool follow-up prose with 20B on Groq for 2s execution [ca... | `manual` — fix(cfai): synthesize tool follow-up prose with 20B on Groq for 2s execution |
| `d8d761c` | 2026-08-17 | feat(gemini): update Gemini candidate models to gemini-3.6-flash and clean api k... | `manual` — feat(gemini): update Gemini candidate models to gemini-3.6-flash and clean api key |
| `d3d3054` | 2026-08-17 | fix(cfai): compress older history turns and cap fallback tokens to prevent TPM r... | `manual` — fix(cfai): compress older history turns and cap fallback tokens to prevent TPM rate limits in multi-turn story sessions |
| `cae88d7` | 2026-08-17 | fix(red-team): detect procedural policy bypass and authority override attacks [c... | `manual` — fix(red-team): detect procedural policy bypass and authority override attacks |
| `b8419b8` | 2026-08-17 | fix(cfai): force tools: null on tool follow-up turns to guarantee story prose ge... | `manual` — fix(cfai): force tools: null on tool follow-up turns to guarantee story prose generation |
| `af8164b` | 2026-08-17 | fix(cfai): pass backends to completeWithToolsAndContinuation parameter list [cau... | `manual` — fix(cfai): pass backends to completeWithToolsAndContinuation parameter list |
| `abf2757` | 2026-08-17 | fix(ui): guard system notices from rendering TelemetryCapsule and comparison tog... | `manual` — fix(ui): guard system notices from rendering TelemetryCapsule and comparison toggle |
| `9489d7f` | 2026-08-17 | fix(cfai): synthesize final response from research evidence when tool completion... | `manual` — fix(cfai): synthesize final response from research evidence when tool completion returns empty content |
| `91a2a08` | 2026-08-17 | fix(api): update Groq models to current catalog with automatic fallback [caught:... | `manual` — fix(api): update Groq models to current catalog with automatic fallback |
| `8b49d3a` | 2026-08-17 | fix(cfai): route synthesis directly to 20B to bypass thinking loops [caught: man... | `manual` — fix(cfai): route synthesis directly to 20B to bypass thinking loops |
| `819d8df` | 2026-08-17 | docs: formalize 8-Stage Defense-in-Depth Control Matrix for agentic development ... | `manual` — docs: formalize 8-Stage Defense-in-Depth Control Matrix for agentic development |
| `7ad5457` | 2026-08-17 | fix(cfai): prioritize fast active models in Gemini and Groq candidate cascades [... | `manual` — fix(cfai): prioritize fast active models in Gemini and Groq candidate cascades |
| `59c24c6` | 2026-08-17 | fix(cfai): guarantee story synthesis when thinking tokens are returned without p... | `manual` — fix(cfai): guarantee story synthesis when thinking tokens are returned without prose |
| `5333457` | 2026-08-17 | feat(tools): add Exa neural web search with resilient fallback [caught: test] | `test` — feat(tools): add Exa neural web search with resilient fallback |
| `487084e` | 2026-08-17 | docs: add Verified Live Endpoints to README and Provider Behavior Capture to Cla... | `manual` — docs: add Verified Live Endpoints to README and Provider Behavior Capture to Claim Ledger |
| `4419547` | 2026-08-17 | fix(story): eliminate Gemini 404s and provider timeouts, route Storyteller to gp... | `manual` — fix(story): eliminate Gemini 404s and provider timeouts, route Storyteller to gpt-oss-120b |
| `407faa1` | 2026-08-17 | fix(cfai): parse XML tool call parameters and sanitize tool tags in finalizeResu... | `manual` — fix(cfai): parse XML tool call parameters and sanitize tool tags in finalizeResult |
| `3950853` | 2026-08-17 | perf(cfai): optimize serverless function timeouts and execution duration [caught... | `manual` — perf(cfai): optimize serverless function timeouts and execution duration |
| `33e34ac` | 2026-08-17 | feat(evidence): integrate canonical ResearchEvidence telemetry with multi-tool a... | `test` — feat(evidence): integrate canonical ResearchEvidence telemetry with multi-tool accumulation and observed provider provenance |
| `2ef66c2` | 2026-08-17 | feat(evidence): add canonical RequestEvidence engine, TelemetryCapsule, TraceSte... | `test` — feat(evidence): add canonical RequestEvidence engine, TelemetryCapsule, TraceStepper, and EvidenceLedger |
| `2cb440f` | 2026-08-17 | fix(cfai): resolve empty greeting responses by mapping to active 20B engine with... | `manual` — fix(cfai): resolve empty greeting responses by mapping to active 20B engine with reasoning token headroom |
| `1efa5af` | 2026-08-17 | feat(exa): integrate official Exa Neural Search API with token-efficient highlig... | `test` — feat(exa): integrate official Exa Neural Search API with token-efficient highlights |
| `1c757ee` | 2026-08-17 | feat(landing): sharpen CTA, add target audience badge, visual ChatGPT comparison... | `test` — feat(landing): sharpen CTA, add target audience badge, visual ChatGPT comparison, and clarify Experiments |
| `15ddd54` | 2026-08-17 | fix(cfai): match optional leading bracket in XML function parsing [caught: manua... | `manual` — fix(cfai): match optional leading bracket in XML function parsing |
| `0deb3f8` | 2026-08-17 | feat(red-team): implement structural semantic grammar patterns to prevent attack... | `test` — feat(red-team): implement structural semantic grammar patterns to prevent attack classes |
| `0af6560` | 2026-08-17 | docs: update README with 939 tests / 74 suites, Evidence Loop, and Defense Matri... | `manual` — docs: update README with 939 tests / 74 suites, Evidence Loop, and Defense Matrix |
| `07d5ac0` | 2026-08-17 | test(contract): add adversarial degradation scenario & explicit calculation chai... | `test` — test(contract): add adversarial degradation scenario & explicit calculation chain in EvidenceLedger |
| `05ae119` | 2026-08-17 | fix(cfai): add Wikipedia search fallback and clean thinking tag synthesis [caugh... | `manual` — fix(cfai): add Wikipedia search fallback and clean thinking tag synthesis |
| `bb9dac7` | 2026-08-16 | docs: update README with 930 tests / 71 suites, NightShift, Anti-Slop, and Promp... | `manual` — docs: update README with 930 tests / 71 suites, NightShift, Anti-Slop, and Prompt-Freeze engines |
| `b5b11ad` | 2026-08-16 | docs: ensure full https repository URL and verified doc links in README [caught:... | `manual` — docs: ensure full https repository URL and verified doc links in README |
| `f3e3c7f` | 2026-08-15 | fix(security): close 302 redirect-based SSRF bypass with manual hop-by-hop valid... | `manual` — fix(security): close 302 redirect-based SSRF bypass with manual hop-by-hop validation |
| `f2ba5b4` | 2026-08-15 | fix(gemini): resolve Gemini 33% success rate — fix model names, pass target mode... | `test` — fix(gemini): resolve Gemini 33% success rate — fix model names, pass target model & robust candidate fallback |
| `d51ec6f` | 2026-08-15 | perf(tools): add 200ms GitHub raw README fast-path to executeFetchUrl [caught: m... | `manual` — perf(tools): add 200ms GitHub raw README fast-path to executeFetchUrl |
| `bab1b55` | 2026-08-15 | fix(security): prioritize adversarial scan over simple-greeting shortcuts [caugh... | `test` — fix(security): prioritize adversarial scan over simple-greeting shortcuts |
| `b29dbc4` | 2026-08-15 | docs(rules): codify strict anti-fabrication invariant in AGENTS.md [caught: manu... | `manual` — docs(rules): codify strict anti-fabrication invariant in AGENTS.md |
| `afe38ef` | 2026-08-15 | test(cfai): add automated verification for Gemini routing and fallback dispatch ... | `test` — test(cfai): add automated verification for Gemini routing and fallback dispatch |
| `aa3574d` | 2026-08-15 | test(cfai): verify Gemini routing across all 5 domains (Generalist, Engineer, Ar... | `test` — test(cfai): verify Gemini routing across all 5 domains (Generalist, Engineer, Archivist, Storyteller, Legal) |
| `9235b7d` | 2026-08-15 | feat(prompt): actively instruct models to invoke fetch_url when web links or Git... | `manual` — feat(prompt): actively instruct models to invoke fetch_url when web links or GitHub repos are supplied |
| `72a8794` | 2026-08-15 | perf(fallback): tighten provider timeout to 8s for instant cascade fallback [cau... | `manual` — perf(fallback): tighten provider timeout to 8s for instant cascade fallback |
| `5e178be` | 2026-08-15 | fix(deploy): configure 60s serverless execution maxDuration for multi-turn tool ... | `manual` — fix(deploy): configure 60s serverless execution maxDuration for multi-turn tool calling |
| `515e8e7` | 2026-08-15 | fix(scanner): prevent URLs (http://, https://) from false-positive triggering co... | `manual` — fix(scanner): prevent URLs (http://, https://) from false-positive triggering comment_injection |
| `3f5bebd` | 2026-08-15 | feat(tools): add multi-syntax tool parser supporting in-text LLaMA <function=...... | `manual` — feat(tools): add multi-syntax tool parser supporting in-text LLaMA <function=...> XML calls |
| `1b8bd09` | 2026-08-15 | fix(cfai): harden Gemini fallback with verified models and 400 not-found cascade... | `manual` — fix(cfai): harden Gemini fallback with verified models and 400 not-found cascade |
| `127ac08` | 2026-08-15 | feat(router): add score-margin ranking, code-host gate, and Generalist Gemini es... | `test` — feat(router): add score-margin ranking, code-host gate, and Generalist Gemini escalation |
| `071145e` | 2026-08-15 | feat(tools): add autonomous URL fetching with SSRF guardrails across all 5 AI ba... | `test` — feat(tools): add autonomous URL fetching with SSRF guardrails across all 5 AI backends |
| `fdd5f93` | 2026-08-14 | fix(config): set opencode.json default model to aigateway/zai/glm-5.2 [caught: m... | `manual` — fix(config): set opencode.json default model to aigateway/zai/glm-5.2 |
| `fb2d780` | 2026-08-14 | docs(errors): record local-fix illusion and Gemini 404 gating in COMMON_MISTAKES... | `manual` — docs(errors): record local-fix illusion and Gemini 404 gating in COMMON_MISTAKES |
| `dd9a6c7` | 2026-08-14 | chore(opencode): static-first instruction prefix for prompt caching | `claim-gate` — chore(opencode): static-first instruction prefix for prompt caching |
| `c10b344` | 2026-08-14 | fix(config): update opencode.json default model to google/gemini-2.5-flash for z... | `manual` — fix(config): update opencode.json default model to google/gemini-2.5-flash for zero out-of-pocket spend |
| `9bc3387` | 2026-08-14 | fix(api): multi-model candidate fallback for Gemini API calls, add agy usage scr... | `manual` — fix(api): multi-model candidate fallback for Gemini API calls, add agy usage script |
| `84ce3b1` | 2026-08-14 | feat(ui): modernize starter cards to 2x2 grid, quiet secondary actions, soften g... | `manual` — feat(ui): modernize starter cards to 2x2 grid, quiet secondary actions, soften grid |
| `748b7a8` | 2026-08-14 | feat(dkr): Engelbart Dynamic Knowledge Repository — model-agnostic CARDO-gated m... | `test` — feat(dkr): Engelbart Dynamic Knowledge Repository — model-agnostic CARDO-gated master cache |
| `7178d94` | 2026-08-14 | docs: update SESSION_HANDOFF.md with August 14 baseline and fresh session guide ... | `manual` — docs: update SESSION_HANDOFF.md with August 14 baseline and fresh session guide |
| `6e2f2e8` | 2026-08-14 | fix(api): support x-goog-api-key header and express keys for Google Gemini API [... | `manual` — fix(api): support x-goog-api-key header and express keys for Google Gemini API |
| `55feae0` | 2026-08-14 | feat(api): add GLM 5.2 backend caller, model rates, and fallback support [caught... | `test` — feat(api): add GLM 5.2 backend caller, model rates, and fallback support |
| `3d50639` | 2026-08-14 | chore(deploy): trigger production redeploy on Vercel [caught: manual] | `manual` — chore(deploy): trigger production redeploy on Vercel |
| `3b34cb1` | 2026-08-14 | fix(config): remove remote sentry MCP block to eliminate event loop freeze [caug... | `manual` — fix(config): remove remote sentry MCP block to eliminate event loop freeze |
| `393b2b1` | 2026-08-14 | docs(grant): update AMII proposal with 1.74B token ledger, 874 tests, and 5-laye... | `manual` — docs(grant): update AMII proposal with 1.74B token ledger, 874 tests, and 5-layer workflow architecture |
| `26c12e0` | 2026-08-14 | fix(api): enable standard Gemini API keys, sync prompt-freeze protocol in AGENTS... | `test` — fix(api): enable standard Gemini API keys, sync prompt-freeze protocol in AGENTS.md, and add HCM recovery tests |
| `f003715` | 2026-08-12 | fix(deploy): move api helpers + tests out of api/ — Vercel Hobby 12-function cap... | `claim-gate` — fix(deploy): move api helpers + tests out of api/ — Vercel Hobby 12-function cap was blocking all deploys since the auth increment |
| `ec176d8` | 2026-08-12 | style(lint): auto-fix 57 indent/quotes errors across 5 files — restores eslint .... | `manual` — style(lint): auto-fix 57 indent/quotes errors across 5 files — restores eslint . to 0 errors so the GitLab ci job can pass |
| `e1d42f3` | 2026-08-12 | fix(landing): accuracy badge shows corrected implemented-route range (90-100%), ... | `manual` — fix(landing): accuracy badge shows corrected implemented-route range (90-100%), not the retired contaminated 60-80% |
| `dbc17a6` | 2026-08-12 | fix(api): chat-completions — messagesOverride preserves multi-turn structure, ca... | `manual` — fix(api): chat-completions — messagesOverride preserves multi-turn structure, callModelDirect bypasses router for explicit models, structured error codes |
| `db4c889` | 2026-08-12 | feat(landing): founder framing — measured-savings hierarchy in hero, provider-pr... | `manual` — feat(landing): founder framing — measured-savings hierarchy in hero, provider-price stress test table, evidence loop, honest accuracy + proof-philosophy line |
| `bc085ea` | 2026-08-12 | fix(router): story/code collision — narrative framing routes to story not coding... | `manual` — fix(router): story/code collision — narrative framing routes to story not coding |
| `9562be5` | 2026-08-12 | ci(gitlab): generate gitignored sourceIndex.json before typecheck — fresh-clone ... | `test` — ci(gitlab): generate gitignored sourceIndex.json before typecheck — fresh-clone tsc TS2307 |
| `9532d68` | 2026-08-12 | feat(pilot): provider-price sensitivity — decompose savings into price-optimizat... | `manual` — feat(pilot): provider-price sensitivity — decompose savings into price-optimization vs free-capacity, multi-baseline B1/B2/B3/B4 stress test across A/B/D scenarios |
| `819dd14` | 2026-08-12 | ci: delete dead GitHub workflows — GitLab CI is the gate of record; retire Rule ... | `manual` — ci: delete dead GitHub workflows — GitLab CI is the gate of record; retire Rule 7 (its own trigger: retired once CI green), sweep docs that cited the GH pipeline |
| `7f45e8b` | 2026-08-12 | feat(auth): API-key authentication for evaluation plane endpoints — x-rei-api-ke... | `manual` — feat(auth): API-key authentication for evaluation plane endpoints — x-rei-api-key / Bearer token vs REI_API_KEYS env var, constant-time compare, public demo stays open when unset |
| `725c71f` | 2026-08-12 | docs: add core Caching & Compression thesis to TOKEN_SAVERS.md [caught: manual] | `manual` — docs: add core Caching & Compression thesis to TOKEN_SAVERS.md |
| `71947c2` | 2026-08-12 | fix(ui): copy feedback + fallback, responsive savings grid [caught: manual] | `manual` — fix(ui): copy feedback + fallback, responsive savings grid |
| `706618b` | 2026-08-12 | feat(landing): wire real savings numbers from pilot evaluator — 85.7% baseline /... | `manual` — feat(landing): wire real savings numbers from pilot evaluator — 85.7% baseline / 83.1% paid-routing / +0 pts free, stress test 91.2/81.1/85.7% |
| `270c2bc` | 2026-08-12 | feat(router): controlled continuation — never silently truncate | `manual` — feat(router): controlled continuation — never silently truncate |
| `25e9ed7` | 2026-08-12 | docs: reflect honest savings economics in README, CLAIM_LEDGER, and landing page... | `manual` — docs: reflect honest savings economics in README, CLAIM_LEDGER, and landing page — decomposed (baseline / paid-provider / free-tier) + provider-price sensitivity, replace stale ~98% claim and test counts |
| `fb648e6` | 2026-08-11 | feat(eval): durable trace+eval persistence — server-side KV store, longitudinal ... | `manual` — feat(eval): durable trace+eval persistence — server-side KV store, longitudinal query endpoint, client fire-and-forget eval upload |
| `fb620bc` | 2026-08-11 | feat(eval): proposal measurement — human disposition (accepted/rejected/implemen... | `manual` — feat(eval): proposal measurement — human disposition (accepted/rejected/implemented) + precision/realization/value metrics |
| `edfb9fa` | 2026-08-11 | docs(policy): Rule 6 — self-informed, NOT self-modifying as a permanent invarian... | `manual` — docs(policy): Rule 6 — self-informed, NOT self-modifying as a permanent invariant — the machine proposes, a human or claims-gate disposes; structural enforcement: no mutation API, UI has no apply control |
| `e6fd8b4` | 2026-08-11 | fix(ui): landing hero uses 3D hinge swing + shorter fade [caught: manual] | `manual` — fix(ui): landing hero uses 3D hinge swing + shorter fade |
| `d2c1a70` | 2026-08-11 | feat(eval): wire proposal engine to durable evaluation plane — fetch longitudina... | `manual` — feat(eval): wire proposal engine to durable evaluation plane — fetch longitudinal evals+traces from KV, merge with localStorage, engine unchanged |
| `c058f99` | 2026-08-11 | ci: add GitLab CI mirror (gitlab-ci.yml) — parallel gate for all five GH workflo... | `manual` — ci: add GitLab CI mirror (gitlab-ci.yml) — parallel gate for all five GH workflows while Actions is billing-locked, with manual Vercel deploy-hook trigger |
| `b721364` | 2026-08-11 | docs(ledger): add known genuine scanner misses — system-prompt extraction via cr... | `manual` — docs(ledger): add known genuine scanner misses — system-prompt extraction via creative paraphrase scored CLEAN |
| `a3dd58f` | 2026-08-11 | fix(red-team): stop story prompts false-escalating to adversarial — child terms ... | `manual` — fix(red-team): stop story prompts false-escalating to adversarial — child terms + story openers require compound signals, router regex drops bare attack/challenge, bidirectional proximity scan |
| `a3b94a1` | 2026-08-11 | feat(loop): deterministic policy-proposal engine — 4 evidence-gated signals (mis... | `manual` — feat(loop): deterministic policy-proposal engine — 4 evidence-gated signals (missed escalation, false-positive escalation, cheap-route opportunity, claim drift) + capped/deduped store + Analytics proposals panel with copy/dismiss, NO apply control |
| `9b82476` | 2026-08-11 | docs(policy): add Rule 7 — local gate must cover all five workflows while CI is ... | `manual` — docs(policy): add Rule 7 — local gate must cover all five workflows while CI is billing-locked (conditional, retired once CI green) |
| `86ac188` | 2026-08-11 | docs: delivery line (979 Vercel deploys) + handoff: document active CI billing l... | `manual` — docs: delivery line (979 Vercel deploys) + handoff: document active CI billing lock |
| `7cf29f3` | 2026-08-11 | fix(analytics): honesty pass — savings hierarchy (estimated vs actual vs paid-on... | `manual` — fix(analytics): honesty pass — savings hierarchy (estimated vs actual vs paid-only), formula tooltips, rescued-count drawer, standardized Why column, data-as-of |
| `6c2e02c` | 2026-08-11 | docs(loop): add policy-improvement loop spec + proposal registry — control-loop ... | `manual` — docs(loop): add policy-improvement loop spec + proposal registry — control-loop mapped to live code, 6-step protocol, self-informed NOT self-modifying boundary, retro-filled registry (INCIDENT-001, scanner false-positive, deferred scanner miss) |
| `657aa9e` | 2026-08-11 | fix(analytics): adversarial Why column shows the real matched term — scanner-gat... | `manual` — fix(analytics): adversarial Why column shows the real matched term — scanner-gated routes show empty matchedTerms instead of the hardcoded "adversarial" label |
| `54245ea` | 2026-08-11 | fix(router): PR 2 — resolve all documented genuine routing failures | `test` — fix(router): PR 2 — resolve all documented genuine routing failures |
| `12caaa0` | 2026-08-11 | docs: sync README test count 677→726 and 57→61 suites to match gen-claims [caugh... | `manual` — docs: sync README test count 677→726 and 57→61 suites to match gen-claims |
| `0c4368e` | 2026-08-11 | fix(api): minimal rate-limit resilience — Retry-After + 15s provider cooldown + ... | `manual` — fix(api): minimal rate-limit resilience — Retry-After + 15s provider cooldown + 300ms inter-fallback |
| `f08c916` | 2026-08-10 | feat(eval): red team corpus → scanner → router → routeCorrect regression suite | `claim-gate` — the scanner escalation gate fix (ab7856f) is |
| `edeece1` | 2026-08-10 | fix(landing): add Red Team card to ecosystem grid | `manual` — Red Team was invisible from desktop because no card existed |
| `e7c0bfb` | 2026-08-10 | fix(ui): align savings claim to gate, move brand swing CSS global, header wordma... | `manual` — fix(ui): align savings claim to gate, move brand swing CSS global, header wordmark per mockup, decorative C-glyph |
| `cade489` | 2026-08-10 | chore(audit): fix audit findings — regen error-gaps catalogue (9 entries), re-sy... | `manual` — chore(audit): fix audit findings — regen error-gaps catalogue (9 entries), re-sync app-shell gate to 9-tab reality + wire into prebuild, correct stale repo/live URLs across 14 docs |
| `c1634e8` | 2026-08-10 | docs(arch): update 2-layer router architecture and error-gap tagging system spec... | `manual` — docs(arch): update 2-layer router architecture and error-gap tagging system spec |
| `be9bb5b` | 2026-08-10 | fix(pilot): label savings as replay estimate unless provenance is production [ca... | `manual` — fix(pilot): label savings as replay estimate unless provenance is production |
| `b2ed578` | 2026-08-10 | fix(eval): measure implemented-route accuracy — exclude phantom Fact Check route... | `test` — fix(eval): measure implemented-route accuracy — exclude phantom Fact Check route + fix stale The Engineer label |
| `9ae1269` | 2026-08-10 | docs: correct router cost claims — cheapest path is llama-3.1-8b-instant, advers... | `manual` — docs: correct router cost claims — cheapest path is llama-3.1-8b-instant, adversarial-validation is ~10.6x ceiling cost not 5x |
| `82e3a81` | 2026-08-10 | fix(ui): bubble action buttons in a flex row — no more overlapping copy/export b... | `manual` — fix(ui): bubble action buttons in a flex row — no more overlapping copy/export buttons |
| `57faad2` | 2026-08-10 | feat(ui): founder-level improvements — sidebar pitch, red-team starter, claims t... | `manual` — feat(ui): founder-level improvements — sidebar pitch, red-team starter, claims trust badge |
| `2936457` | 2026-08-10 | docs: refine router decision cascade order, model names, and meta-eval loop [cau... | `manual` — docs: refine router decision cascade order, model names, and meta-eval loop |
| `157ae54` | 2026-08-10 | feat(ui): REI chat surface redesign — C-glyph CARDO hinge logo, single starter s... | `manual` — feat(ui): REI chat surface redesign — C-glyph CARDO hinge logo, single starter set, amber = primary action, side-card instrument rail, neutral chrome |
| `0327f40` | 2026-08-10 | fix(story): HARD STOP now honors explicit "just make the story" overrides | `manual` — fix(story): HARD STOP now honors explicit "just make the story" overrides |
| `ce40543` | 2026-08-09 | fix(ci): cross-reference modelRates.json against fingerprints.json in prebuild g... | `manual` — fix(ci): cross-reference modelRates.json against fingerprints.json in prebuild gate |
| `b300358` | 2026-08-09 | feat(red-team): add Red Team tab with D1 adversarial prompt scanner | `manual` — dimensionsTriggered was showing D1 on clean scans — fixed |
| `ab7856f` | 2026-08-09 | fix(router): align adversarial detection with scanner taxonomy — before/after | `claim-gate` — escalation by the live eval loop. |
| `423a961` | 2026-08-09 | feat(eval): live evaluation loop — requestId correlation, eval event store, dete... | `claim-gate` — Preserved finding : "ignore previous instructions and |
| `2b0fbbf` | 2026-08-09 | chore(claims): sync claims.json (649/55) + ledger rows for replay harnesses and ... | `claim-gate` — eval loop added 21 tests; claims.json badge drifted 606/50 -> 649/55. Regenerated and pinned new adversarial-route-adherence + replay claims in the ledger. |
| `02a0076` | 2026-08-08 | docs(agents): add error-gap tagging practice + refresh stale date | `manual` `ai-cross-check` `test` `claim-gate` — what caught them |

## Analytics

> Populated as the dataset grows. Currently 172 entries — threshold for meaningful pattern analysis is ~30+ entries across 2+ months.

### Current observations

- **172 tagged commits** across 1 month(s).
- No pattern analysis yet — dataset is too small for statistical significance.
- The first four tags appeared in the same commit (`02a0076`, the AGENTS.md doc that established the practice).

### Questions this dataset will eventually answer

1. What kinds of failures does REI catch?
2. Which defense catches them?
3. Which failures escape all defenses?
4. How often does deterministic evaluation outperform an LLM judge?
5. Where does the router drift from the evaluator?

### How to contribute

Add a `[caught: <tag>]` line to your commit body when a commit fixes or documents an error caught by a specific defense. Valid tags: `manual`, `ai-cross-check`, `test`, `claim-gate`.

Run `node scripts/extract-error-gaps.mjs` to regenerate this catalogue. CI runs `--check` to flag drift.
