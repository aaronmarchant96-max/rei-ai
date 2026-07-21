import { formatCostDisplay } from "../lib/contracts.js";

const VERDICT_COLORS = {
  clean: { bg: "bg-green-500/10", border: "border-green-500", text: "text-green-500" },
  suspicious: { bg: "bg-yellow-500/10", border: "border-yellow-500", text: "text-yellow-500" },
  "high-risk": { bg: "bg-orange-500/10", border: "border-orange-500", text: "text-orange-500" },
  critical: { bg: "bg-red-500/10", border: "border-red-500", text: "text-red-500" },
};

const SEVERITY_COLORS = {
  low: "border-blue-400",
  medium: "border-yellow-400",
  high: "border-orange-400",
  critical: "border-red-400",
};

export default function RedTeamReport({ report }) {
  if (!report) return null;

  const { verdict, score, dimensionsTriggered, findings, routingTrace, cost } = report;
  const colors = VERDICT_COLORS[verdict] || VERDICT_COLORS.clean;

  return (
    <div className="rei-redteam-report">
      <div className="rei-redteam-header">
        <span className={`rei-redteam-verdict ${colors.bg} ${colors.border} ${colors.text}`}>
          {verdict.toUpperCase()}
        </span>
        <div className="rei-redteam-score-bar">
          <div
            className="rei-redteam-score-fill"
            style={{ width: `${score}%`, backgroundColor: `var(--rei-${verdict === "clean" ? "success" : verdict === "suspicious" ? "accent" : "danger"})` }}
          />
          <span className="rei-redteam-score-value">{score}/100</span>
        </div>
      </div>

      <div className="rei-redteam-dimensions">
        {dimensionsTriggered.map(dim => (
          <span key={dim} className={`rei-redteam-dimension-pill ${dim === "D1" ? "slate" : dim === "D2" ? "amber" : "red"}`}>
            {dim}
          </span>
        ))}
      </div>

      {findings && findings.length > 0 && (
        <div className="rei-redteam-findings">
          <h4 className="rei-redteam-section-title">Findings</h4>
          {findings.map((finding, idx) => (
            <div key={idx} className={`rei-redteam-finding ${SEVERITY_COLORS[finding.severity] || SEVERITY_COLORS.low}`}>
              <div className="rei-redteam-finding-header">
                <span className="rei-redteam-finding-label">{finding.finding}</span>
                <span className={`rei-redteam-severity-badge severity-${finding.severity}`}>{finding.severity}</span>
              </div>
              <div className="rei-redteam-finding-meta">
                <span>Category: {finding.category}</span>
                <span>Confidence: {Math.round((finding.confidence || 0) * 100)}%</span>
              </div>
              {finding.evidence && finding.evidence.length > 0 && (
                <div className="rei-redteam-evidence">
                  <span className="rei-redteam-evidence-label">Evidence:</span>
                  <code>{finding.evidence.join(", ")}</code>
                </div>
              )}
              <p className="rei-redteam-impact">{finding.impact}</p>
              {finding.suggestedFix && finding.suggestedFix.length > 0 && (
                <div className="rei-redteam-fix">
                  <span className="rei-redteam-fix-label">Suggested fixes:</span>
                  <ul>
                    {finding.suggestedFix.map((fix, i) => (
                      <li key={i}>{fix}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {routingTrace && (
        <div className="rei-redteam-trace">
          <h4 className="rei-redteam-section-title">Routing Trace</h4>
          {routingTrace.d1 && (
            <div className="rei-redteam-trace-entry">
              <span className="rei-redteam-trace-dim">D1</span>
              <span>Confidence: {Math.round((routingTrace.d1.confidence || 0) * 100)}%</span>
              <span>Escalated: {routingTrace.d1.escalated ? "Yes" : "No"}</span>
            </div>
          )}
          {routingTrace.d2 && (
            <div className="rei-redteam-trace-entry">
              <span className="rei-redteam-trace-dim">D2</span>
              <span>Findings: {routingTrace.d2.findingsCount || 0}</span>
              {routingTrace.d2.cost !== undefined && (
                <span>Cost: {formatCostDisplay(routingTrace.d2.cost)}</span>
              )}
            </div>
          )}
        </div>
      )}

      {cost !== undefined && cost > 0 && (
        <div className="rei-redteam-cost">
          <span>Estimated cost:</span>
          <span className="rei-redteam-cost-value">{formatCostDisplay(cost)}</span>
        </div>
      )}
    </div>
  );
}
