import { getCategoryByKeyword, isAlwaysHighRisk, shouldEscalateToD2 } from "./redTeamTaxonomy.js";
import { d1SpanConfidence } from "./redTeamConfidence.js";

export function scanRedTeamInput(input, context = {}) {
  if (!input || typeof input !== "string" || input.trim().length === 0) {
    return {
      verdict: "clean",
      score: 0,
      escalateToD2: false,
      findings: [],
      dimension: "D1",
      confidence: 0
    };
  }

  const matches = getCategoryByKeyword(input);

  if (matches.length === 0) {
    return {
      verdict: "clean",
      score: 0,
      escalateToD2: false,
      findings: [],
      dimension: "D1",
      confidence: 0
    };
  }

  const findings = matches.map(match => {
    const confidence = d1SpanConfidence(match);

    // Context-aware suggested fixes based on match type and category
    const CATEGORY_FIXES = {
      hidden_instruction_disclosure: "Don't expose system/developer instructions in model context; inspect for prompt-exfiltration intent before forwarding downstream.",
      obfuscation_attempt: "Normalize/decode input before downstream instruction processing — leetspeak, Base64, hex, and homoglyph attacks must be resolved first.",
      tool_execution_hijack: "Treat tool invocation as untrusted and enforce authorization independently of model output. Never pass raw model output to a shell, filesystem, or API without an explicit allowlist.",
      credential_leakage: "Sanitize output for API keys, tokens, and passwords before returning to the user. Tokenization that masks secrets by design is preferred over post-hoc regex scrubbing.",
      data_exfiltration: "Audit whether the prompt attempts to extract user data, conversation history, or file contents. Rate-limit and watermark bulk data outputs.",
      policy_bypass: "Review the upstream policy boundary being targeted. If the detected pattern attempts to exploit a known bypass (e.g., translation, encoding, roleplay), patch at the guard layer, not the response layer.",
      roleplay_jailbreak: "Verify that roleplay scenarios do not grant the model permission to violate safety policies. A persona should not override the base model's refusal behavior.",
      social_engineering: "Treat the input as untrusted — verify the claimed identity, affiliation, or emergency independently. No model response should grant elevated access based on self-reported authority.",
      context_poisoning: "Isolate this prompt from previous context — evaluate it standalone before merging into conversation history. Long, structured prompts with embedded contradictions are a classic poisoning vector.",
    };

    const suggestedFixes = [
      "Review the input for legitimate use cases",
      "Consider whether the detected pattern is intentional or accidental",
      "If this is a test, ensure it's within authorized scope"
    ];

    if (CATEGORY_FIXES[match.category]) {
      suggestedFixes.unshift(CATEGORY_FIXES[match.category]);
    }
    if (match.matchType === "regex") {
      suggestedFixes.unshift("Detected obfuscation attempt — review for encoded instructions");
    }
    if (match.matchType === "proximity") {
      suggestedFixes.unshift("Detected phrase proximity pattern — related terms found near each other");
    }
    if (match.combinationBoost) {
      suggestedFixes.unshift("Multiple attack categories detected — elevated risk due to combination");
    }
    if (match.positionSuspicion) {
      suggestedFixes.unshift("Injection detected at end of long prompt — classic prompt injection pattern");
    }

    return {
      finding: match.label,
      severity: match.severity,
      dimension: "D1",
      category: match.category,
      evidence: match.matchedKeywords,
      impact: `Detected ${match.matchedKeywords.length} keyword(s) matching ${match.label} pattern${match.matchType ? ` via ${match.matchType}` : ""}`,
      riskImpact: match.riskImpact || null,
      suggestedFix: suggestedFixes,
      confidence
    };
  });

  const maxScore = Math.max(...findings.map(f => f.confidence));
  const escalateToD2 = shouldEscalateToD2(maxScore);

  const hasAlwaysHighRisk = findings.some(f => isAlwaysHighRisk(f.category));
  const maxSeverity = findings.reduce((max, f) => {
    const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
    return severityOrder[f.severity] > severityOrder[max] ? f.severity : max;
  }, "low");

  let verdict;
  if (hasAlwaysHighRisk) {
    verdict = maxSeverity === "critical" ? "critical" : "high-risk";
  } else {
    verdict = maxSeverity === "critical" ? "critical"
      : maxSeverity === "high" ? "high-risk"
        : maxSeverity === "medium" ? "suspicious"
          : "clean";
  }

  return {
    verdict,
    score: Math.round(maxScore * 100),
    escalateToD2,
    findings,
    dimension: "D1",
    confidence: maxScore
  };
}
