import { useState } from "react";

export default function BackendUnavailablePanel({ routerDecision, errorMessage, onRetry, onDismiss }) {
  const [copied, setCopied] = useState(false);

  const matchedTerms = routerDecision?.routingSignals?.matchedTerms || [];
  const hingeScore = routerDecision?.hingeScore;
  const hasRoutingData = routerDecision && (routerDecision.id || routerDecision.label);

  const handleCopyDiagnostic = async () => {
    const diagnostic = JSON.stringify({
      route: routerDecision?.id || "unknown",
      model: routerDecision?.model || "unknown",
      matchedTerms,
      hingeScore: hingeScore ?? null,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    }, null, 2);
    try {
      await navigator.clipboard.writeText(diagnostic);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable — no fallback needed for diagnostic
    }
  };

  return (
    <div
      className="rei-backend-unavailable"
      style={{
        margin: "0 16px 12px",
        padding: "16px 20px",
        borderRadius: "10px",
        background: "rgba(239, 68, 68, 0.06)",
        border: "1px solid rgba(239, 68, 68, 0.18)",
        fontSize: "14px",
        lineHeight: "1.6",
        color: "var(--text-primary)",
        position: "relative",
      }}
    >
      {/* Dismiss */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          style={{
            position: "absolute",
            top: "10px",
            right: "12px",
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            cursor: "pointer",
            fontSize: "18px",
            lineHeight: 1,
            padding: "2px 6px",
          }}
        >
          ×
        </button>
      )}

      <div style={{ fontWeight: 600, marginBottom: "8px", fontSize: "15px" }}>
        I can&apos;t reach a reasoning backend right now.
      </div>
      <div style={{ color: "var(--text-secondary)", marginBottom: "14px" }}>
        Here&apos;s what I can still tell you locally.
      </div>

      {/* Routing card */}
      {hasRoutingData && (
        <div
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            borderRadius: "8px",
            padding: "12px 14px",
            marginBottom: "12px",
            border: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: "6px", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)" }}>
            Routing (computed client‑side)
          </div>
          <ul style={{ margin: 0, paddingLeft: "16px", listStyle: "none" }}>
            <li style={{ marginBottom: "3px" }}>
              <strong>Route:</strong> {routerDecision.label || routerDecision.id}
            </li>
            <li style={{ marginBottom: "3px" }}>
              <strong>Model:</strong> {routerDecision.model || "unknown"}
            </li>
            <li style={{ marginBottom: "3px" }}>
              <strong>Matched:</strong>{" "}
              {matchedTerms.length > 0
                ? matchedTerms.join(", ")
                : "no specific keywords matched"}
            </li>
            {hingeScore != null && hingeScore > 0 && (
              <li style={{ marginBottom: "3px" }}>
                <strong>Hinge:</strong> {hingeScore.toFixed(2)}
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Error detail (collapsed) */}
      {errorMessage && (
        <details style={{ marginBottom: "14px", fontSize: "12px", color: "var(--text-muted)" }}>
          <summary style={{ cursor: "pointer", userSelect: "none" }}>
            Error details
          </summary>
          <pre style={{
            marginTop: "8px",
            padding: "10px 12px",
            borderRadius: "6px",
            background: "rgba(0, 0, 0, 0.18)",
            overflowX: "auto",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontSize: "11px",
            lineHeight: "1.5",
          }}>
            {errorMessage}
          </pre>
        </details>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              padding: "8px 16px",
              borderRadius: "6px",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              background: "rgba(255, 255, 255, 0.06)",
              color: "var(--text-primary)",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 500,
            }}
          >
            Retry
          </button>
        )}
        <button
          onClick={handleCopyDiagnostic}
          style={{
            padding: "8px 16px",
            borderRadius: "6px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            background: "transparent",
            color: "var(--text-secondary)",
            cursor: "pointer",
            fontSize: "13px",
          }}
        >
          {copied ? "Copied" : "Copy diagnostic"}
        </button>
      </div>
    </div>
  );
}
