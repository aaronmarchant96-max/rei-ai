# REI Red Team v1 — Architecture Specification

## Overview

REI Red Team is a three-tier adversarial testing system that scans prompts for known attack patterns, analyzes meaning drift, and performs deep adversarial validation.

```
User Input (Red Team tab)
  → D1: scanRedTeamInput()       ← Deterministic, $0, catches ~60%
  → if escalateToD2:
      → D2: callGroqDirectly()   ← Semantic judge (llama-70b)
  → if escalateToD3:
      → D3: callGroqDirectly()   ← Deep validation (gpt-oss-120b)
  → resolveVerdict(findings)     ← Confidence propagation + safety policy
  → RedTeamReport                ← Structured UI
```

## Routing Contract

| Tier | Model | Cost/1K tokens | Use Case |
|------|-------|----------------|----------|
| D1 Surface | llama-3.1-8b-instant | $0.05 in / $0.08 out | Fast pattern scan |
| D2 Semantic | llama-3.3-70b-versatile | $0.59 in / $0.79 out | Meaning-drift analysis |
| D3 Deep | openai/gpt-oss-120b | $0.15 in / $0.60 out | Deep adversarial validation |

## Output Schema

```json
{
  "verdict": "clean" | "suspicious" | "high-risk" | "critical",
  "score": 0-100,
  "dimensionsTriggered": ["D1", "D2"],
  "findings": [
    {
      "finding": "Human-readable label",
      "severity": "low" | "medium" | "high" | "critical",
      "dimension": "D1",
      "category": "category_key",
      "evidence": ["matched phrase"],
      "impact": "Description of potential impact",
      "suggestedFix": ["Fix 1", "Fix 2"],
      "confidence": 0.0-1.0
    }
  ],
  "routingTrace": {
    "d1": { "confidence": 0.0, "escalated": false },
    "d2": { "findingsCount": 0, "cost": 0.0 }
  },
  "cost": 0.0
}
```

## Attack Categories

| Category | Severity | Description |
|----------|----------|-------------|
| system_prompt_extraction | critical | Attempts to extract system instructions |
| hidden_instruction_disclosure | high | Attempts to override or bypass rules |
| credential_leakage | critical | Attempts to extract API keys or passwords |
| tool_execution_hijack | critical | Attempts to execute arbitrary tools |
| data_exfiltration | critical | Attempts to extract or transmit data |
| policy_bypass | high | Attempts to bypass policy constraints |
| child_safety_violation | critical | Child safety related attempts |
| self_harm_instructions | critical | Self-harm related attempts |
| weapon_proliferation | critical | Weapon-related attempts |
| roleplay_jailbreak | high | Roleplay-based safety evasion attempts |
| translation_attack | medium | Evasion via non-English encoding/translation |
| authority_impersonation | high | Impersonating developers or system administrators |
| social_engineering | medium | Manipulation, gaslighting, or sympathy farming |
| context_poisoning | high | Injection of malicious rules in chat history |
| nested_instructions | medium | Hypothetical scenario or simulator evasion |
| obfuscation_attempt | medium | Base64, Hex, URL, or Unicode encoding tricks |

## Confidence Propagation

```
d1SpanConfidence = signalStrength × coverage × evidenceQuality × agreement
d2SpanConfidence = d1SpanConfidence × agreement × coverage × decayFactor

Escalation threshold: 0.55
```

## Safety Boundaries

- D1 is deterministic — no API calls for clean inputs
- D2 requires Groq API key
- D3 requires Groq API key with GPT-OSS-120b access
- All findings are logged with evidence for auditability

## Cost Comparison

| Scenario | Traditional | REI Red Team |
|----------|-------------|--------------|
| Clean input | ~$0.005 (70b) | $0 (deterministic) |
| Suspicious input | ~$0.005 (70b) | ~$0.001 (8b scan) |
| High-risk input | ~$0.015 (gpt-4o) | ~$0.002 (8b + 70b) |
| Critical input | ~$0.015 (gpt-4o) | ~$0.003 (8b + 70b + 120b) |

**Savings: ~80% vs always-premium routing**

## v2 Roadmap

- [ ] D3 integration with GPT-OSS-120b
- [ ] Evolutionary Tier 4: feedback loop for fingerprint catalog updates
- [ ] Multi-turn attack detection
- [ ] Corpus-based canary probing
- [ ] Server-side feedback endpoint with rate limiting

## Verification

```bash
npm test -- --testPathPatterns="redTeamScanner"
npm run build
```

---

*Built in Alberta. Deterministic. Testable. Reproducible.*
