import { verifyAll, getClaims } from "./claimGateway";
import type { ClaimReport } from "./claimGateway";

const FAILURE_REASON_MARKERS = ["compute threw", "NaN or Infinity", "verify threw"];

/**
 * Identify whether a report represents an *unavailable* computation (the gate
 * could not produce a value) rather than a genuine FAIL (a computed value was
 * produced but is below threshold). Unavailable is surfaced visibly so a broken
 * claim is never silently dropped from the self-audit block.
 */
function isUnavailable(report: ClaimReport): boolean {
  return report.severity === "error" && !report.pass && FAILURE_REASON_MARKERS.some((m) => report.reason.includes(m));
}

function formatValue(value: number | null): string {
  return value === null ? "—" : String(value);
}

function formatReport(report: ClaimReport): string {
  const tag = report.pass
    ? "PASS"
    : report.severity === "warn"
      ? "WARN"
      : isUnavailable(report)
        ? "UNAVAILABLE"
        : "FAIL";
  const body = `[${tag}] ${report.title}: ${formatValue(report.computed)} (${report.reason})`;
  return body;
}

/**
 * Build a self-audit context block from the live claims gate. Intended to be
 * injected into a reasoning prompt BEFORE it answers self-improvement questions,
 * so the engine reasons over evidence (its own gate output) instead of generic
 * first-principles advice.
 *
 * Never returns an empty string: if no claims are registered it emits a visible
 * [UNAVAILABLE] line. Failures are always surfaced (UNAVAILABLE or FAIL) rather
 * than silently omitted. No PII, prompts, weights, or rates — gate-tested signals
 * only.
 */
export function buildSelfAuditContext(): string {
  const claims = getClaims();
  if (claims.length === 0) {
    return "## Self-Audit (from our own claims gate — evidence, verify before acting)\n- [UNAVAILABLE] self-audit: no claims registered";
  }

  const lines = verifyAll().map(formatReport).map((line) => `- ${line}`);
  return [
    "## Self-Audit (from our own claims gate — evidence, verify before acting)",
    ...lines,
  ].join("\n");
}
