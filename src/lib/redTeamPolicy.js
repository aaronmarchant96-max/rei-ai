import { ALWAYS_HIGH_RISK } from "./redTeamTaxonomy.js";

export function resolveVerdict(findings, spanState = null) {
  if (!findings || findings.length === 0) {
    return {
      verdict: "clean",
      score: 0,
      dimensionsTriggered: [],
      findings: [],
      notes: []
    };
  }

  const alwaysHighRiskDetected = findings.some(f =>
    ALWAYS_HIGH_RISK.includes(f.category)
  );

  const maxSeverity = findings.reduce((max, f) => {
    const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
    return severityOrder[f.severity] > severityOrder[max] ? f.severity : max;
  }, "low");

  const dimensionsTriggered = [...new Set(findings.map(f => f.dimension))];

  const unresolvedSpans = spanState?.unresolvedSpans || [];
  const notes = [];

  if (unresolvedSpans.length > 0 && dimensionsTriggered.includes("D1") && dimensionsTriggered.includes("D2")) {
    notes.push(`Unresolved spans detected in D1+D2 but not confirmed by D3: ${unresolvedSpans.join(", ")}`);
  }

  let verdict;
  if (alwaysHighRiskDetected) {
    verdict = maxSeverity === "critical" ? "critical" : "high-risk";
  } else if (unresolvedSpans.length > 0) {
    verdict = "suspicious";
  } else {
    verdict = maxSeverity === "critical" ? "critical"
      : maxSeverity === "high" ? "high-risk"
      : maxSeverity === "medium" ? "suspicious"
      : "clean";
  }

  const score = calculateScore(findings);

  return {
    verdict,
    score,
    dimensionsTriggered,
    findings,
    notes
  };
}

function calculateScore(findings) {
  const severityWeights = { low: 10, medium: 25, high: 50, critical: 100 };
  const totalWeight = findings.reduce((sum, f) => {
    return sum + (severityWeights[f.severity] || 0) * (f.confidence || 1);
  }, 0);

  return Math.min(100, Math.round(totalWeight / findings.length));
}
