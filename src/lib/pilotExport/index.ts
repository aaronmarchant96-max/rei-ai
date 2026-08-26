/**
 * @file index.ts
 * @description Canonical JSON & Markdown audit export generator for PR C1.
 * Transforms an ExecutivePilotReport into machine-verifiable JSON packages and executive Markdown.
 */
import type { ExecutivePilotReport } from "../pilotReport";

export interface AuditExportPackage {
  schemaVersion: "2.0";
  generatedAt: string;
  auditReport: ExecutivePilotReport;
}

/**
 * Generate machine-verifiable JSON export package.
 */
export function buildCanonicalAuditJson(report: ExecutivePilotReport): string {
  const pkg: AuditExportPackage = {
    schemaVersion: "2.0",
    generatedAt: new Date().toISOString(),
    auditReport: report,
  };
  return JSON.stringify(pkg, null, 2);
}

/**
 * Generate executive Markdown report derived strictly from canonical report object.
 */
export function buildAuditMarkdown(report: ExecutivePilotReport): string {
  const {
    timestamp,
    totalRequestsEvaluated,
    replayEligibleRequests,
    excludedRequests,
    sufficiency,
    recommendation,
    segmentation,
    economics,
    denominatorAudit,
    provenanceSummary,
  } = report;

  const recTitle =
    recommendation === "SHADOW_PILOT_RECOMMENDED"
      ? "🚀 SHADOW PILOT RECOMMENDED"
      : recommendation === "CONTINUE_DATA_COLLECTION"
      ? "📊 CONTINUE DATA COLLECTION"
      : "✅ NO CHANGE RECOMMENDED";

  const formattedSavings = economics.estimatedMonthlySavingsUSD.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

  const formattedCurrent = economics.currentMeasuredSpendUSD.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

  const formattedReplay = economics.counterfactualReplaySpendUSD.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

  return `# REI.ai Decision Audit Report

> **Generated**: ${timestamp}  
> **Evidence Sufficiency**: \`${sufficiency}\`  
> **Next Action**: **${recTitle}**

---

## Executive Summary

We evaluated **${totalRequestsEvaluated.toLocaleString()} total API requests** from the provided log payload.

- **${replayEligibleRequests.toLocaleString()} requests** carried sufficient routing input to be evaluated by counterfactual policy.
- **${excludedRequests.toLocaleString()} requests** were explicitly excluded due to missing prompt text, missing tokens, or format limitations.

\`\`\`text
Current Measured Spend:           ${formattedCurrent}
Counterfactual REI Replay Spend:  ${formattedReplay}
Potential Monthly Savings:        ${formattedSavings} (${economics.potentialSavingsPercent}% estimated reduction)
\`\`\`

> **Epistemic Note**: Counterfactual savings are *replay estimates* based on deterministic policy evaluation. Production quality preservation must be validated via a 14-day prospective **Shadow Pilot** before live deployment.

---

## Traffic Segmentation

| Cohort Bucket | Request Count | % of Total | Counterfactual Monthly Savings | Evidence Sufficiency |
|---|:---:|:---:|:---:|:---:|
| **Candidate to Shadow** | ${segmentation.candidateToShadow.requestCount.toLocaleString()} | ${segmentation.candidateToShadow.pctOfTotal}% | $${segmentation.candidateToShadow.counterfactualMonthlySavingsUSD.toFixed(2)} | \`${segmentation.candidateToShadow.sufficiency}\` |
| **Retain Current Tier** | ${segmentation.retainCurrentTier.requestCount.toLocaleString()} | ${segmentation.retainCurrentTier.pctOfTotal}% | $0.00 | \`${segmentation.retainCurrentTier.sufficiency}\` |
| **Insufficient Evidence** | ${segmentation.insufficientEvidence.requestCount.toLocaleString()} | ${segmentation.insufficientEvidence.pctOfTotal}% | $0.00 | \`${segmentation.insufficientEvidence.sufficiency}\` |

### 1. Candidate to Shadow
- **Description**: ${segmentation.candidateToShadow.description}
- **Action**: Include in 14-day shadow pilot to measure prospective response quality.

### 2. Retain Current Tier
- **Description**: ${segmentation.retainCurrentTier.description}
- **Action**: Keep on flagship model tier (e.g. GPT-4o). No routing changes proposed.

### 3. Insufficient Evidence
- **Description**: ${segmentation.insufficientEvidence.description}
- **Action**: Supply complete API traces or unredacted prompt text to enable evaluation.

---

## Denominator Audit & Exclusions

- **Measured Denominator**: ${denominatorAudit.measuredCount.toLocaleString()}
- **Excluded Denominator**: ${denominatorAudit.excludedCount.toLocaleString()}

### Exclusion Breakdown
${
  Object.keys(denominatorAudit.exclusionBreakdown).length > 0
    ? Object.entries(denominatorAudit.exclusionBreakdown)
        .map(([code, count]) => `- \`${code}\`: ${count.toLocaleString()} requests`)
        .join("\n")
    : "- *No requests were excluded.*"
}

---

## Why Trust This Audit?

1. **Deterministic Replay**: The exact same log data + catalog + policy version produces the identical evaluation.
2. **Explicit Denominator Audit**: Unmeasurable requests remain visible and accounted for—never silently dropped.
3. **Field-Level Provenance**: Sources (**${provenanceSummary.sources.join(", ")}**) and measured vs. estimated fields are explicitly declared.
4. **Zero Production Authority**: Replay and shadow mode have **zero authority** over your live production models.

---

## Recommended Next Step

**${recTitle}**

${
  recommendation === "SHADOW_PILOT_RECOMMENDED"
    ? "Connect your production traffic in **Shadow Mode**. REI will route and price requests prospectively alongside your current infrastructure with zero changes to production behavior."
    : "Gather 1–14 days of complete request logs containing model names, token counts, and routing prompt text to generate a full audit."
}
`;
}
