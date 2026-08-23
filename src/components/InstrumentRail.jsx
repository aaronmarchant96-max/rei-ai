import { useState, useRef, useEffect } from "react";
import { BarChart3, Pin, PinOff, X, ExternalLink } from "lucide-react";

export default function InstrumentRail({
  sessionTokens = 0,
  sessionMessages = 0,
  sessionCost = 0,
  sessionChunks = 0,
  savingsVsPremium = 0,
  escalationCount = 0,
  modelBreakdown = {},
  lifetimeCost = 0,
  lifetimeSavings = 0,
  activityCount = 0,
  telemetryMode = "pinned",
  isInspectOpen = false,
  focusedDecision = null,
  onToggleMode,
  onCloseInspect,
  originRef,
}) {
  const [internalMode, setInternalMode] = useState(telemetryMode);

  useEffect(() => {
    if (telemetryMode !== undefined) {
      setInternalMode(telemetryMode);
    }
  }, [telemetryMode]);

  const handleToggle = (newMode) => {
    setInternalMode(newMode);
    if (onToggleMode) {
      onToggleMode(newMode);
    }
  };

  const isPinned = internalMode === "pinned";
  const isDrawerModal = isInspectOpen && !isPinned;
  const isCollapsed = !isPinned && !isDrawerModal;

  const drawerRef = useRef(null);
  const closeButtonRef = useRef(null);

  const totalPremiumCost = sessionCost + savingsVsPremium;
  const savingsPercent = totalPremiumCost > 0
    ? Math.round((savingsVsPremium / totalPremiumCost) * 100)
    : 0;

  // Accessible Escape key dismissal, focus trapping, and focus restoration for modal drawer
  useEffect(() => {
    if (!isDrawerModal) return;

    // Focus close button on open
    setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseInspect?.();
      }
      if (e.key === "Tab" && drawerRef.current) {
        const focusable = drawerRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      // Restore focus to originating inspect trigger
      if (originRef?.current && typeof originRef.current.focus === "function") {
        originRef.current.focus();
      }
    };
  }, [isDrawerModal, onCloseInspect, originRef]);

  if (isCollapsed) {
    return (
      <aside className="rei-instrument-rail is-collapsed" aria-label="Session telemetry and inspection">
        <button
          type="button"
          onClick={() => handleToggle("pinned")}
          className="rei-instrument-rail__toggle-btn"
          aria-label="Expand sidebar"
          title="Expand sidebar"
        >
          &#8249;
        </button>
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleToggle("pinned")}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleToggle("pinned")}
          className="rei-instrument-rail__collapsed-hero"
          title={`Rate Advantage: ${savingsPercent}%`}
          aria-label={`Activity count: ${activityCount}. Rate advantage: ${savingsPercent}%. Click to expand.`}
        >
          <div className="rei-instrument-rail__collapsed-hero-value">
            {`EFFICIENCY: ${totalPremiumCost > 0 ? `${savingsPercent}%` : "\u2014"}`}
          </div>
        </div>
      </aside>
    );
  }

  return (
    <>
      {isDrawerModal && (
        <div
          className="rei-inspect-backdrop"
          onClick={onCloseInspect}
          aria-hidden="true"
        />
      )}
      <aside
        ref={drawerRef}
        className={`rei-instrument-rail ${isDrawerModal ? "rei-instrument-rail--drawer" : ""}`}
        role={isDrawerModal ? "dialog" : "complementary"}
        aria-modal={isDrawerModal ? "true" : undefined}
        aria-label="Decision Inspection and Telemetry"
      >
        <div className="rei-instrument-rail__header">
          <div className="rei-instrument-rail__header-title">
            <BarChart3 size={15} style={{ color: "var(--accent-cyan, #38bdf8)" }} />
            <span className="rei-instrument-rail__title">
              {focusedDecision ? "Decision Report" : "Live Telemetry"}
            </span>
          </div>

          <div className="rei-instrument-rail__header-actions">
            {/* Pin Toggle for persistent desktop preference */}
            <button
              type="button"
              onClick={() => handleToggle(isPinned ? "collapsed" : "pinned")}
              className={`rei-instrument-rail__pin-btn ${isPinned ? "is-pinned" : ""}`}
              aria-label={isPinned ? "Unpin sidebar to collapse" : "Pin sidebar open"}
              title={isPinned ? "Unpin sidebar" : "Pin sidebar"}
            >
              {isPinned ? <PinOff size={14} /> : <Pin size={14} />}
            </button>

            {/* Close / Collapse button */}
            <button
              ref={closeButtonRef}
              type="button"
              onClick={isDrawerModal ? onCloseInspect : () => handleToggle("collapsed")}
              className="rei-instrument-rail__toggle-btn"
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              {isDrawerModal ? <X size={15} /> : <>&#8250;</>}
            </button>
          </div>
        </div>

        {/* Focused Decision Inspection View (when opened from message Inspect) */}
        {focusedDecision ? (() => {
          const rawModel = focusedDecision.model;
          const hasValidModel = typeof rawModel === "string" && rawModel.trim().length > 0 && rawModel !== "undefined" && rawModel !== "unknown" && rawModel !== "unknown-model" && rawModel !== "[object Object]";
          const displayModel = hasValidModel ? rawModel : "Model unavailable";

          const isObserved = Boolean(focusedDecision.isObservedCost) && Number.isFinite(focusedDecision.cost) && focusedDecision.cost >= 0 && hasValidModel;
          const hasEstimate = Number.isFinite(focusedDecision.estimatedCost) && focusedDecision.estimatedCost > 0;

          const costMode = isObserved
            ? "Observed telemetry"
            : hasEstimate
              ? "Ceiling-based estimate"
              : "Unavailable";

          const queryCostDisplay = isObserved
            ? `$${focusedDecision.cost.toFixed(5)}`
            : hasEstimate
              ? `~$${focusedDecision.estimatedCost.toFixed(5)}`
              : "Cost unavailable · Provider usage telemetry missing";

          return (
            <div className="rei-side-card rei-side-card--decision">
              <div className="rei-side-card__heading" style={{ color: "var(--accent-cyan, #38bdf8)" }}>
                Inspecting: {focusedDecision.label || focusedDecision.id || "Decision"}
              </div>
              <div className="rei-side-stat">
                <span className="rei-side-stat__label">Assigned Model</span>
                <span className="rei-side-stat__value mono">{displayModel}</span>
              </div>
              <div className="rei-side-stat">
                <span className="rei-side-stat__label">Cost Mode</span>
                <span className="rei-side-stat__value mono" style={{ fontSize: "11px" }}>
                  {costMode}
                </span>
              </div>
              <div className="rei-side-stat">
                <span className="rei-side-stat__label">Query Cost</span>
                <span className={`rei-side-stat__value mono${isObserved ? " verified" : ""}`}>
                  {queryCostDisplay}
                </span>
              </div>
              {Number.isFinite(focusedDecision.hingeScore) && (
                <div className="rei-side-stat">
                  <span className="rei-side-stat__label">Hinge Score (HS)</span>
                  <span className="rei-side-stat__value mono">{focusedDecision.hingeScore.toFixed(2)}</span>
                </div>
              )}
              {focusedDecision.rationale && (
                <div style={{ marginTop: "10px", fontSize: "12px", color: "var(--text-secondary, #94a3b8)", lineHeight: "1.45" }}>
                  <strong>Routing Rationale:</strong> {focusedDecision.rationale}
                </div>
              )}
              {focusedDecision.blueprint && (
                <div style={{ marginTop: "12px", padding: "10px", background: "rgba(0,0,0,0.3)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <div style={{ color: "var(--accent-cyan, #38bdf8)", fontSize: "11px", textTransform: "uppercase", fontWeight: 700, marginBottom: "6px" }}>
                    📐 Planning & Scaffolding Blueprint
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text, #e2e8f0)", whiteSpace: "pre-wrap", lineHeight: "1.45" }}>
                    {focusedDecision.blueprint}
                  </div>
                </div>
              )}
            </div>
          );
        })() : null}

        <div className="rei-side-card rei-side-card--session">
          <div className="rei-side-card__heading">This Session</div>
          {sessionCost === 0 && sessionTokens === 0 && sessionMessages === 0 ? (
            <div className="rei-side-empty" style={{ border: "none", padding: "8px 0" }}>
              Routing will select the cheapest capable model for each query.
              Typical savings vs. calling GPT-4o directly: ~90%+ (ceiling-based).
              Numbers appear here after your first response.
            </div>
          ) : (
            <>
              <div className="rei-side-stat">
                <span className="rei-side-stat__label">Cost</span>
                <span className={`rei-side-stat__value mono${sessionCost === 0 ? " zero" : ""}`}>
                  {!Number.isFinite(sessionCost) || sessionCost < 0
                    ? "Cost unavailable · Provider usage telemetry missing"
                    : sessionCost === 0
                      ? "\u2014"
                      : sessionCost < 0.0001
                        ? "< $0.0001"
                        : `$${sessionCost.toFixed(4)}`}
                </span>
              </div>
              <div className="rei-side-stat">
                <span className="rei-side-stat__label">Tokens</span>
                <span className={`rei-side-stat__value mono${sessionTokens === 0 ? " zero" : ""}`}>
                  {!Number.isFinite(sessionTokens) || sessionTokens <= 0
                    ? "\u2014"
                    : sessionTokens.toLocaleString()}
                </span>
              </div>
              <div className="rei-side-stat">
                <span className="rei-side-stat__label">Messages</span>
                <span className={`rei-side-stat__value mono${sessionMessages === 0 ? " zero" : ""}`}>
                  {Number.isFinite(sessionMessages) && sessionMessages > 0 ? sessionMessages : "\u2014"}
                </span>
              </div>
              {sessionChunks > sessionMessages && (
                <div className="rei-side-stat">
                  <span className="rei-side-stat__label" title="Some responses needed more than one inference chunk to finish (continuation).">
                    Inference chunks
                  </span>
                  <span className="rei-side-stat__value mono">
                    {Number.isFinite(sessionChunks) ? sessionChunks : "\u2014"}
                  </span>
                </div>
              )}
              <div className="rei-side-stat">
                <span className="rei-side-stat__label">Saved vs. premium</span>
                <span className="rei-side-stat__value verified mono">
                  {Number.isFinite(savingsVsPremium) && savingsVsPremium > 0 && Number.isFinite(sessionCost) && sessionCost >= 0
                    ? `$${savingsVsPremium.toFixed(4)}`
                    : "\u2014"}
                </span>
              </div>
            </>
          )}
        </div>

        <div className="rei-side-card rei-side-card--models">
          <div className="rei-side-card__heading">Models</div>
          {(() => {
            const validModels = Object.entries(modelBreakdown).filter(([model, tokens]) =>
              typeof model === "string" &&
              model.trim().length > 0 &&
              model !== "undefined" &&
              model !== "unknown" &&
              model !== "unknown-model" &&
              model !== "[object Object]" &&
              Number.isFinite(Number(tokens)) &&
              Number(tokens) > 0
            );

            if (validModels.length === 0) {
              return (
                <div className="rei-side-empty">
                  No model calls yet.<br />Routing shows up here after your first message.
                </div>
              );
            }

            return validModels.map(([model, tokens]) => {
              const numericTokens = Number(tokens);
              return (
                <div key={model} className="rei-side-stat">
                  <span title={model} className="rei-side-stat__label">
                    {model.length > 22 ? model.slice(0, 19) + "..." : model}
                  </span>
                  <span className="rei-side-stat__value mono">
                    {numericTokens.toLocaleString()} tok
                  </span>
                </div>
              );
            });
          })()}
        </div>

        {lifetimeCost > 0 && (
          <div className="rei-side-card">
            <div className="rei-side-card__heading">Historical Cumulative</div>
            <div className="rei-side-stat">
              <span className="rei-side-stat__label">Total cost</span>
              <span className="rei-side-stat__value mono">${lifetimeCost.toFixed(4)}</span>
            </div>
            <div className="rei-side-stat">
              <span className="rei-side-stat__label">Total saved</span>
              <span className="rei-side-stat__value verified mono">${lifetimeSavings.toFixed(2)}</span>
            </div>
            {escalationCount > 0 && (
              <div className="rei-side-stat">
                <span className="rei-side-stat__label">Escalations</span>
                <span className="rei-side-stat__value mono">{escalationCount}</span>
              </div>
            )}
          </div>
        )}

        <div className="rei-side-card rei-side-card--protocol">
          <div className="rei-side-card__heading">Protocol Architecture</div>
          <div className="rei-side-chips">
            <span className="rei-side-chip">CARDO v3.4</span>
            <span className="rei-side-chip">Hinge Classifier</span>
            <span className="rei-side-chip">CARDO Guard</span>
          </div>
        </div>

        <a href="/#analytics" className="rei-side-dash-link">
          Full Analytics Dashboard <ExternalLink size={12} style={{ marginLeft: "4px", display: "inline" }} />
        </a>
      </aside>
    </>
  );
}
