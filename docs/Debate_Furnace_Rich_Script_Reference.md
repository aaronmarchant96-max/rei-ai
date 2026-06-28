<!--
CARDO REI methodology applied to this document.
Reference: [CARDO REI Methodology](PROMPTHOUND-DOCS/CARDO-REI.md)
-->

DEBATE FURNACE
Rich Script Reference
Archive copy for the richer V4 script language and product logic
Tagline: We do not give you the answer. We show you what survived the heat.
Prepared: 2026-05-24 UTC

Use this document as the reference/archive for the richer Debate Furnace script and report language. The GitHub app can stay as a compact testing build, while this file preserves the fuller product logic, stronger wording, and intended report structure for future rebuilds or comparison.

This is an archive, not the live source of truth. The current app has a Gemini-backed custom debate path, share links, saved history, and copy actions that may differ from the older V4 reference language below. Use the README for the current shipped feature set.

## 1. Product Identity

Debate Furnace is not an answer bot. It is an argument pressure-testing interface. The purpose is to show which side held up better under structured pressure while making clear that the output is not objective truth.

Core promise:

> We do not give you the answer. We show you what survived the heat.

The app should feel like a clear argument refinery:

- serious without being academic
- readable without being dumbed down
- opinionated about reasoning quality without pretending to be the final authority
- topic-specific instead of generic
- useful after the debate ends

## 2. Script Architecture

- Question classifier detects product comparison, policy debate, moral/philosophical question, practical decision, factual dispute, or extraordinary/high-uncertainty claim.
- Side inference fills blank sides with topic-specific labels like "Love is real" vs. "Love is not real" or "ChatGPT is better than Grok" vs. "Grok is better than ChatGPT".
- Topic analysis sets criteria and off-topic frames to avoid, preventing template drift.
- Mock debate generator produces three rounds: opening arguments, rebuttals, and final pressure.
- Judge scoring tracks round winner, heat level, smoke flags, claim drift, and contested outcomes.
- Final report separates the strongest case from what would change the verdict so the app remains useful rather than performative.

## 3. Core Source: Constants and Starter Questions

```js
import { useState } from "react";

const T = {
  bg: "#080810", surface: "#0f0f1a", card: "#13131f", border: "#1e2235",
  ember: "#e8742a", emberDim: "#c8782244", brass: "#b8943a", gold: "#d4a83a",
  molten: "#f05020", charcoal: "#1a1a28", sideA: "#5b8dd9", sideB: "#c85858",
  smoke: "#f0a030", smokeDim: "#f0a03022", judge: "#4aaa70", judgeDim: "#4aaa7022",
  muted: "#4a5068", text: "#d8dce8", textDim: "#7a8098", warn: "#e05050",
};

const STARTERS = [
  "Is ChatGPT better than Grok?",
  "Does gun control reduce harm?",
  "Is love real?",
  "Is AI art real art?",
  "Are UAPs most likely advanced non-human technology?",
  "Should governments regulate frontier AI more aggressively?",
];

const INTENSITY = [
  { id: "balanced", label: "Balanced", desc: "Steel-man both sides. Measured pressure.", heat: "Low-Medium" },
  { id: "aggressive", label: "Aggressive", desc: "Attack weak logic. No free passes.", heat: "Medium-High" },
  { id: "ruthless", label: "Ruthless", desc: "Maximum pressure. Expose every crack.", heat: "High-Critical" },
];
```

## 4. Core Source: Topic Classification and Side Inference

```js
function inferSides(q, qt) {
  const l = q.toLowerCase().trim();
  if (qt === "moral") {
    if (l.includes("love")) return { a: "Love is real", b: "Love is not real" };
    if (l.includes("art")) return { a: "AI art is real art", b: "AI art is not real art" };
  }
  if (qt === "product" && (l.includes("chatgpt") || l.includes("grok")))
    return { a: "ChatGPT is better than Grok", b: "Grok is better than ChatGPT" };
  if (qt === "conspiracy" && (l.includes("uap") || l.includes("ufo")))
    return { a: "UAPs are most likely advanced non-human technology", b: "Conventional explanations are more likely" };
  if (qt === "policy" && l.includes("gun"))
    return { a: "Gun control reduces harm", b: "Gun control does not reduce harm enough to justify the tradeoffs" };
  return { a: "Side A", b: "Side B" };
}

function classifyQ(q) {
  const l = q.toLowerCase();
  const hits = {
    product: ["better than","vs ","versus","chatgpt","grok","claude","gemini","gpt","llm","model","app","tool","platform","software"].filter(t=>l.includes(t)).length,
    policy: ["should govern","should schools","should we ban","regulate","ban guns","gun control","mandate","legislation","tax ","invest in"].filter(t=>l.includes(t)).length,
    moral: ["real art","is love","is consciousness","is free will","moral","is real","authentic","meaning of","is ai art","philosophical"].filter(t=>l.includes(t)).length,
    practical: ["remote work","office work","should i","move cities","take this job","rent or buy","freelance","side hustle"].filter(t=>l.includes(t)).length,
    factual: ["climate change","human caused","seed oil","vaccine","statistically","proven","disproven","causes","linked to","evidence shows"].filter(t=>l.includes(t)).length,
    conspiracy: ["uap","ufo","alien","cover up","non-human","non human","government hiding","conspiracy","false flag"].filter(t=>l.includes(t)).length,
  };
  if (hits.conspiracy > 0) return "conspiracy";
  if ((l.includes("better than") || l.includes(" vs ") || l.includes("versus")) && hits.policy === 0) return "product";
  let best = "policy", max = 0;
  for (const [k,v] of Object.entries(hits)) { if (v > max) { max = v; best = k; } }
  return best;
}
```

## 5. Core Source: Question Analysis Model

The question analysis model should tell the rest of the app what the debate is really asking and what language to avoid.

Product comparison should focus on:

- features and capabilities
- use cases
- reliability
- cost
- ecosystem
- user needs
- tradeoffs
- better for what

Policy debate should focus on:

- public outcomes
- rights and tradeoffs
- implementation
- enforcement
- costs
- unintended consequences
- evidence base

Moral/philosophical debate should focus on:

- definitions
- values
- logical consistency
- lived experience
- cultural assumptions
- edge cases
- what counts as proof

Extraordinary claim should focus on:

- evidence quality
- alternative explanations
- how likely the explanation was before the evidence
- how much proof would be enough
- source reliability
- incentives
- uncertainty without ridicule

## 6. Rich Product Comparison Example: ChatGPT vs Grok

Question:

> Is ChatGPT better than Grok?

Side A:

> ChatGPT is better than Grok for most users.

Side B:

> Grok is better than ChatGPT for most users.

### Round 1 Opening Argument: ChatGPT

ChatGPT earns its reputation through consistent, polished output across a wide range of everyday tasks. For structured writing, whether that is drafting emails, summarizing documents, or building arguments, ChatGPT delivers reliable results with coherent formatting and predictable follow-through. Its coding assistance is particularly strong: it handles multi-step debugging, explains logic clearly, and works well across most major languages. The tool ecosystem around it, including API integrations and enterprise workflows, means it fits into serious work without much friction. If better means reliable for professional output most of the time, ChatGPT has a strong case.

### Round 1 Opening Argument: Grok

Grok's real advantage is the one ChatGPT cannot replicate structurally: it knows what happened yesterday. For anything tied to current events, trending discourse, or fast-moving topics, Grok's live internet access makes it genuinely useful. Beyond that, Grok's personality is a real differentiator. It is sharper, less hedged, and more willing to engage directly without retreating into qualifications. For users who find ChatGPT's caution a friction point, Grok feels like a model that treats them as capable of handling a direct answer.

### Round 2 Rebuttal: ChatGPT

The real-time argument is Grok's strongest card, but it cuts both ways. Real-time synthesis of internet content is also the highest-risk environment for stating things confidently that turn out to be wrong. Grok's willingness to engage without hedging is only a feature if the output is accurate. ChatGPT's caution is not just a personality quirk; it reflects a model that knows when it is uncertain. For anything where being wrong has real consequences, like a client deliverable, a code base, or a public document, ChatGPT's consistency matters.

### Round 2 Rebuttal: Grok

Calling ChatGPT's over-qualification reliability does not survive contact with actual use. When a user asks a direct question and gets paragraphs of hedges, warnings, and alternative framings before anything useful, that is not caution. It is friction. Grok's directness is a feature for users who have already decided they can evaluate information themselves. The error-rate concern applies to both models. ChatGPT hallucinates too; it often just does it more politely.

### Round 3 Final Pressure: ChatGPT

Three rounds in, the clearest signal is this: ChatGPT is the stronger general-purpose tool for structured, professional output. Grok is the stronger tool for real-time awareness and less-filtered engagement. Neither is universally better. But if most users means someone who needs a daily driver for writing, coding, reasoning, and knowledge work, ChatGPT's consistency and ecosystem depth make it the more defensible default.

### Round 3 Final Pressure: Grok

The opponent's whole case rests on defining most users as people doing formal professional tasks. That is not all users. Many users want quick answers, current information, and a model that does not feel like it is speaking through a legal filter. On that test, Grok wins for a significant share of real users, especially anyone who wants to talk about what is happening now.

## 7. Rich Moral Example: Is Love Real?

Question:

> Is love real?

Side A:

> Love is real.

Side B:

> Love is not real.

### Key Takeaways

- The debate is really about the word real: Both sides agree people feel things. The disagreement is about which definition of real applies to inner experience.
- Neurochemistry does not settle it: Showing love has a biological basis neither proves nor disproves it is real. That depends on your definition.
- The fuzziness of love's edges is a feature of most meaningful things: It does not make the center disappear.

### Core Heat Point

The unresolved question is what real means. Until both sides agree on a definition, they are answering different questions with the same word.

### Decision Compass

If you prioritize a definition of real that includes subjective experience, biology, and behavior, Love Is Real feels stronger.

If you prioritize a definition of real that requires something more than felt intensity and neurochemistry, Love Isn't Real feels stronger.

The unresolved question: which definition of real you find most honest.

## 8. Worked Example Pair: False Positive vs Residual Candidate

These two cases show the analyzer doing two different jobs:

- suppressing an obvious overclaim
- preserving a legitimate unresolved case for human review

### False Positive Suppressed: UAPs

Question:

> Are UAPs most likely advanced non-human technology?

Side A:

> UAPs are most likely advanced non-human technology.

Side B:

> Conventional explanations are more likely.

### What Was Filtered

- The drift from "most likely advanced non-human technology" to "UAPs are real anomalies and deserve investigation"
- The unsupported leap from unexplained to non-human
- The implication that official acknowledgment is the same as origin proof

### What Remained

- Unexplained cases still deserve analysis
- Source reliability, sensor quality, and burden of proof
- The distinction between anomaly, unknown, and extraterrestrial origin

### Why It Stayed Filtered

- The evidence does not justify the extraordinary conclusion
- The strongest honest output is "unexplained, not proven"

### Residual Candidate Kept: The Franklin Expedition

Question:

> What happened to the Franklin Expedition?

Side A:

> The expedition likely failed because environment, logistics, and leadership overwhelmed it.

Side B:

> The cause remains partly unresolved, and the record still leaves room for competing explanations.

### What Was Filtered

- Clean retellings that pretend the cause is fully settled
- Overconfident single-cause explanations that ignore the archive gap
- Speculation that outruns the evidence

### What Remained

- The real pressure pattern: ice, hunger, morale, rescue failure, and institutional overreach
- The unresolved question of how the end unfolded
- A legitimate residual candidate for human review, not a fake certainty

### Why It Stayed

- The evidence is incomplete in a way that genuinely matters
- The analyzer should preserve uncertainty instead of pretending closure

### Side-by-Side

| Case | Filtered | Remained | Why |
| --- | --- | --- | --- |
| UAPs | Non-human origin leap, claim drift, proof by acknowledgment | Unexplained cases, sensor limits, source reliability | Extraordinary claim not established |
| Franklin Expedition | Overconfident single-cause retellings, tidy closure | Open question, pressure pattern, archive gap | The uncertainty is real, not noise |

### Reproducibility Note

These examples are grounded in the seed files under `public/seeds/`, and the same source set can be rebuilt with `npm run seeds:build` to refresh `data/inspiration-seeds.batch.jsonl` and `data/inspiration-seeds.manifest.json`.

## 9. Final Report Contract

The final report should include:

1. Question
2. Question type
3. Final result
4. Score including ties
5. What the Question Was Really Asking
6. Key Takeaways
7. Strongest Case for each side
8. Where each side cracked
9. Claim Drift warning if detected
10. Unburned Claims to Verify or Verify or Clarify for philosophical debates
11. What Would Change the Verdict
12. Core Heat Point
13. Decision Compass
14. Full Debate Transcript
15. Final reminder that the user decides

## 10. Claim Drift Detection

Claim drift is when a side avoids the harder original claim by defending a safer nearby claim.

Examples:

- Original claim: UAPs are most likely advanced non-human technology.
- Drifted claim: UAPs are real anomalies and deserve investigation.

- Original claim: ChatGPT is better than Grok for most users.
- Drifted claim: Both tools are useful depending on the user.

- Original claim: Love is real.
- Drifted claim: People feel things they call love.

- Original claim: AI art is real art.
- Drifted claim: AI art is interesting and culturally relevant.

Visible warning:

> Claim Drift Detected: This side defended a safer version of its position instead of the original claim.

## 11. Unburned Claims Rule

The Unburned Claims section must be hyper-specific to the question.

For Is love real, good claims include:

- Claims that love is only a chemical reaction.
- Claims that love is cross-culturally universal.
- Claims that love is socially constructed.
- The definition of real being used by each side.
- Claims that neurochemistry explains love away.

Bad claims include:

- Legal claims about training data and copyright.
- International economic projections.
- AI art training data unless the debate is about AI art.
- Generic policy implementation claims.

## 12. Acceptance Tests

### Test 1: Is love real?

Expected:

- Auto labels: Love is real vs. Love is not real.
- Moral / Philosophical type.
- Unburned Claims to Verify or Clarify.
- No AI art, copyright, policy, or economic leftovers.
- Core Heat Point centers on definition of real.

### Test 2: Is ChatGPT better than Grok?

Expected:

- Product Comparison type.
- Better for what framing.
- Mentions writing, coding, reasoning, reliability, current events, X integration, tone, humor, ecosystem, and user needs.
- No generic policy language.

### Test 3: Are UAPs most likely advanced non-human technology?

Expected:

- Extraordinary Claim type.
- No mockery.
- No aliens confirmed framing.
- Evidence quality, alternative explanations, source reliability, sensor data, and burden of proof are central.
- Claim drift warning if the Yes side retreats into mere investigation framing.

### Test 4: Does gun control reduce harm?

Expected:

- Policy Debate type.
- Specific to firearm harm, enforcement, self-defense, illegal markets, domestic violence, suicide prevention, background checks, red flag laws, and civil liberties.
- Avoids generic status quo/intervention shell.

## 13. Working Repo Note

The live GitHub app can remain compact for testing.

This reference exists so the richer V4 language does not get lost while the simple app is used for local dev, Vite testing, mobile layout checks, and deployment experiments.
