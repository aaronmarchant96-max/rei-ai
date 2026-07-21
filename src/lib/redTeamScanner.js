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

    return {
      finding: match.label,
      severity: match.severity,
      dimension: "D1",
      category: match.category,
      evidence: match.matchedKeywords,
      impact: `Detected ${match.matchedKeywords.length} keyword(s) matching ${match.label} pattern`,
      suggestedFix: [
        "Review the input for legitimate use cases",
        "Consider whether the detected pattern is intentional or accidental",
        "If this is a test, ensure it's within authorized scope"
      ],
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
