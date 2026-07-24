import { useState } from "react";

// ── Confidence arc gauge (SVG) ──────────────────────────────────────────────
function ConfidenceDial({ value = 0 }) {
  const pct = Math.min(Math.max(value, 0), 1);
  const pctLabel = Math.round(pct * 100);
  const radius = 14;
  const circ = 2 * Math.PI * radius;
  const filled = circ * pct;
  const color = pct >= 0.75 ? "#4ade80" : pct >= 0.5 ? "#facc15" : "#f87171";

  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 36 36"
      aria-label={`Routing confidence: ${pctLabel}%`}
      title={`Confidence: ${pctLabel}%`}
      style={{ display: "inline-block", verticalAlign: "middle" }}
    >
      {/* Track */}
      <circle cx="18" cy="18" r={radius} fill="none" stroke="#334155" strokeWidth="3" />
      {/* Fill */}
      <circle
        cx="18"
        cy="18"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeDasharray={`${filled} ${circ - filled}`}
        strokeLinecap="round"
        transform="rotate(-90 18 18)"
      />
      <text x="18" y="22" textAnchor="middle" fontSize="9" fill={color} fontFamily="monospace">
        {pctLabel}%
      </text>
    </svg>
  );
}

// ── Domain History Strip ────────────────────────────────────────────────────
const DOMAIN_COLORS = {
  "coding-hinge":        "#60a5fa",
  "genealogy-deep-dive": "#a78bfa",
  "story-architect":     "#f472b6",
  "creative-prose":      "#f472b6",
  "fact-check":          "#34d399",
  "finance-analyst":     "#fbbf24",
  "structured-data":     "#38bdf8",
  "meta-routing":        "#94a3b8",
  "multi-turn-synthesis":"#818cf8",
  "red-team-surface":    "#f87171",
  "red-team-semantic":   "#fb923c",
  "structured-reasoning":"#6b7280",
  "simple-greeting":     "#4ade80",
};

function DomainHistoryStrip({ recentRoutes = [] }) {
  if (!recentRoutes.length) return null;
  return (
    <div
      className="rei-router-panel__history-strip"
      style={{ display: "flex", gap: 4, marginTop: 4, alignItems: "center" }}
      aria-label="Recent routing history"
    >
      <span style={{ fontSize: "0.65em", color: "#64748b", marginRight: 2 }}>RECENT</span>
      {recentRoutes.map((id, i) => (
        <span
          key={i}
          title={id}
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: DOMAIN_COLORS[id] || "#475569",
            opacity: 0.4 + (i / recentRoutes.length) * 0.6,
            cursor: "help",
          }}
        />
      ))}
    </div>
  );
}

export default function RouterPanel({ routerDecision, defaultExpanded, recentRoutes }) {
  const [expanded, setExpanded] = useState(defaultExpanded || false);
  if (!routerDecision) return null;

  const suspicionScore = routerDecision.routingSignals?.suspicionScore ?? 0;
  const domainSignals = routerDecision.routingSignals?.domainSignals;
  const complexity = routerDecision.routingComplexity;
  const isHybrid = routerDecision.hybridMode === true;

  return (
    <div className="rei-router-panel" role="region" aria-label="Routing details">
      <button
        type="button"
        className="rei-router-panel__summary"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <span className="rei-router-panel__summary-label">Routing</span>
        <span className="rei-router-panel__toggle">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="rei-router-panel__grid">
          {/* ── Pathway + Confidence dial ─────────────────────────────── */}
          <div className="rei-router-panel__item">
            <span className="rei-router-panel__label">Pathway</span>
            <span>{routerDecision.pathway || "medium"}</span>
          </div>
          <div className="rei-router-panel__item" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="rei-router-panel__label">Confidence</span>
            {routerDecision.routingConfidence != null ? (
              <ConfidenceDial value={routerDecision.routingConfidence} />
            ) : (
              <span>{routerDecision.pathway === "deterministic" ? "100%" : "n/a"}</span>
            )}
            {routerDecision.confidenceFloorApplied && (
              <span title="Confidence floor applied due to adversarial suspicion" style={{ fontSize: "0.7em", color: "#f87171" }}>⬆ floored</span>
            )}
          </div>

          {/* ── Hybrid collision breakdown ─────────────────────────────── */}
          {isHybrid && routerDecision.hybridPrimary && (
            <div className="rei-router-panel__item rei-router-panel__item--full">
              <span className="rei-router-panel__label">Hybrid Blend</span>
              <span>
                {routerDecision.hybridPrimary.label} ({routerDecision.hybridPrimary.pct}%)
                {" ⟷ "}
                {routerDecision.hybridSecondary?.label} ({routerDecision.hybridSecondary?.pct}%)
                <span style={{ marginLeft: 6, color: "#64748b", fontSize: "0.8em" }}>
                  ratio {(routerDecision.collisionRatio ?? 0).toFixed(2)}
                </span>
              </span>
            </div>
          )}

          {/* ── Cost ─────────────────────────────────────────────────────── */}
          <div className="rei-router-panel__item">
            <span className="rei-router-panel__label">Est. cost</span>
            <span>${routerDecision.estimatedCost?.toFixed(6) || "0"}</span>
          </div>
          <div className="rei-router-panel__item">
            <span className="rei-router-panel__label">Premium cost</span>
            <span>${routerDecision.premiumCost?.toFixed(6) || "0"}</span>
          </div>
          <div className="rei-router-panel__item">
            <span className="rei-router-panel__label">Gate</span>
            <span>{routerDecision.qualityGate}</span>
          </div>

          {/* ── Complexity v2 ─────────────────────────────────────────── */}
          {complexity && (
            <div className="rei-router-panel__item rei-router-panel__item--full">
              <span className="rei-router-panel__label">Complexity</span>
              <span>
                {complexity.score} ({complexity.tier})
                <span className="rei-router-panel__detail">
                  {" "}W:{complexity.words}×2 · Q:{complexity.questionMarks}×8 · U:{complexity.uncertaintyHits}×10
                  {complexity.codeFences > 0 && ` · CF:${complexity.codeFences}×15`}
                  {complexity.markdownTable > 0 && ` · TBL:${complexity.markdownTable}×12`}
                  {complexity.bulletList > 0 && ` · BL:${Math.min(complexity.bulletList, 5)}×8`}
                  {complexity.urlCount > 0 && ` · URL:${complexity.urlCount}×5`}
                  {complexity.multiClause > 0 && ` · IF:${complexity.multiClause}×10`}
                  {complexity.compareLanguage > 0 && ` · CMP:${complexity.compareLanguage}×6`}
                </span>
              </span>
            </div>
          )}

          {/* ── Domain signal scores ──────────────────────────────────── */}
          {domainSignals?.scores && (
            <div className="rei-router-panel__item rei-router-panel__item--full">
              <span className="rei-router-panel__label">Domain Signals</span>
              <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {Object.entries(domainSignals.scores).map(([domain, score]) => (
                  <span
                    key={domain}
                    style={{
                      fontSize: "0.75em",
                      padding: "1px 5px",
                      borderRadius: 4,
                      background: score >= 0.2 ? "#1e3a5f" : "#1e293b",
                      color: score >= 0.4 ? "#60a5fa" : score >= 0.2 ? "#94a3b8" : "#475569",
                      fontFamily: "monospace",
                    }}
                  >
                    {domain}: {score.toFixed(2)}
                  </span>
                ))}
                {domainSignals.collision && (
                  <span style={{ fontSize: "0.72em", color: "#f472b6", marginLeft: 2 }}>⚡ collision</span>
                )}
              </span>
            </div>
          )}

          {/* ── Adversarial suspicion ─────────────────────────────────── */}
          {suspicionScore > 0.2 && (
            <div className="rei-router-panel__item rei-router-panel__item--full">
              <span className="rei-router-panel__label" style={{ color: "#f87171" }}>Suspicion</span>
              <span style={{ color: "#f87171" }}>
                {Math.round(suspicionScore * 100)}%
                {suspicionScore >= 0.65 && " — rephrase pattern detected"}
                {suspicionScore >= 0.9 && " — surface + rephrase hit"}
              </span>
            </div>
          )}

          {/* ── Escalation ───────────────────────────────────────────── */}
          {routerDecision.escalated && routerDecision.escalationReason && (
            <div className="rei-router-panel__item rei-router-panel__item--full">
              <span className="rei-router-panel__label">Escalated</span>
              <span>{routerDecision.escalationReason}</span>
            </div>
          )}
          {routerDecision.escalatedByDepth && (
            <div className="rei-router-panel__item rei-router-panel__item--full">
              <span className="rei-router-panel__label">Depth Gate</span>
              <span>Base model response was too shallow. Escalated to premium for quality.</span>
            </div>
          )}

          {/* ── Why ──────────────────────────────────────────────────── */}
          {routerDecision.rationale && (
            <div className="rei-router-panel__why">
              <span className="rei-router-panel__label">Why</span>
              <span>{routerDecision.rationale}</span>
            </div>
          )}

          {/* ── Signals ──────────────────────────────────────────────── */}
          {routerDecision.routingSignals && (
            <div className="rei-router-panel__item rei-router-panel__item--full">
              <span className="rei-router-panel__label">Signals</span>
              <span>
                {routerDecision.matchedPattern
                  ? `Pattern: ${routerDecision.matchedPattern}`
                  : routerDecision.routingSignals.matchedTerms?.length > 0
                    ? `Matched: ${routerDecision.routingSignals.matchedTerms.join(", ")}`
                    : "No specific terms matched"}
                {" · "}Complexity: {routerDecision.routingComplexity?.tier || routerDecision.routingSignals?.complexityTier || "n/a"}
              </span>
            </div>
          )}

          {/* ── Alternatives ─────────────────────────────────────────── */}
          {routerDecision.alternativeRoutes && routerDecision.alternativeRoutes.length > 0 && (
            <div className="rei-router-panel__item rei-router-panel__item--full rei-router-panel__item--muted">
              <span className="rei-router-panel__label">Alternatives</span>
              <span>
                {routerDecision.alternativeRoutes.map((alt, i) => (
                  <span key={alt.model}>
                    {i > 0 && " · "}
                    {alt.label}{" "}({(alt.costPer1kTotal * 1000).toFixed(2)}&cent;/1K)
                    {alt.costDeltaFromSelected !== 0 && (
                      <span style={{ color: alt.costDeltaFromSelected > 0 ? "#f87171" : "#4ade80" }}>
                        {" "}{alt.costDeltaFromSelected > 0 ? "+" : ""}{alt.savingsPercentage}%
                      </span>
                    )}
                  </span>
                ))}
              </span>
            </div>
          )}

          {/* ── Domain History Strip ──────────────────────────────────── */}
          <div className="rei-router-panel__item rei-router-panel__item--full">
            <DomainHistoryStrip recentRoutes={recentRoutes || []} />
          </div>
        </div>
      )}
    </div>
  );
}
