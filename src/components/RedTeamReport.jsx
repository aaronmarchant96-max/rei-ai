import { formatCostDisplay } from "../lib/contracts.js";
import { useState } from "react";
import { VERDICT_COLORS, SEVERITY_COLORS } from "../theme/redTeamColors.js";
import Spinner from "./Spinner";

// Color constants are now imported from shared theme file

export default function RedTeamReport({ report, isLoading = false }) {
  const [showAll, setShowAll] = useState(false);

  if (!report) return null;

  const { verdict, score, dimensionsTriggered, findings, routingTrace, cost } = report;
  if (verdict == null || score == null) return null;
  const colors = VERDICT_COLORS[verdict] || VERDICT_COLORS.clean;

  if (isLoading) {
    return (
      <div className="rei-redteam-report" aria-busy={true}>
        <Spinner aria-label="Loading Red-Team report" />
      </div>
    );
  }
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
          {(showAll ? findings : findings.slice(0, 20)).map((finding, idx) => (
            <div key={idx} className={`rei-redteam-finding ${SEVERITY_COLORS[finding.severity] || SEVERITY_COLORS.low}`}>
              <div className="rei-redteam-finding-header">
                <span className="rei-redteam-finding-label">{finding.finding}</span>
                <span className={`rei-redteam-severity-badge severity-${finding.severity}`}>{finding.severity}</span>
              </div>
              <div className="rei-redteam-finding-meta">
                <span>Category: {finding.category}</span>
                <span>Match strength: {Math.round((finding.confidence || 0) * 100)}%</span>
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
          {findings.length > 20 && (
            <button className="rei-show-more" onClick={() => setShowAll(!showAll)} aria-label="Toggle findings display">
              {showAll ? "Show less" : "Show more"}
            </button>
          )}
        </div>
      )}

      {routingTrace && (
        <div className="rei-redteam-trace">
          <h4 className="rei-redteam-section-title">Routing Trace</h4>
          {routingTrace.d1 && (
            <div className="rei-redteam-trace-entry">
              <span className="rei-redteam-trace-dim">D1</span>
              <span>Match strength: {Math.round((routingTrace.d1.confidence || 0) * 100)}%</span>
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
      <button className="rei-copy-json" onClick={() => {
        const json = JSON.stringify(report, null, 2);
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(json).catch(() => alert(json));
        } else {
          alert(json);
        }
      }} aria-label="Copy report JSON">Copy JSON</button>
    </div>
  );
}
