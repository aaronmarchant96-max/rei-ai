export default function DecisionDetail({ entry, onClose }) {
  if (!entry) return null;

  const { id, sections = {}, routerDecision, domainLabel, inputPreview, createdAt, actualTokens, actualCost, durationMs } = entry;

  const hasSection = (key) => {
    const val = sections[key];
    return typeof val === "string" && val.trim().length > 0;
  };

  const sectionOrder = [
    { key: "Hinge", label: "Hinge" },
    { key: "Facts", label: "Facts" },
    { key: "Assumptions", label: "Assumptions" },
    { key: "Evaluation", label: "Evaluation" },
    { key: "ChangeMind", label: "What Would Change This" },
    { key: "Move", label: "Recommended Move" },
  ];

  const detailSx = {
    background: "var(--surface-elevated, rgba(255,255,255,0.03))",
    border: "1px solid rgba(240, 201, 101, 0.1)",
    borderRadius: "12px",
    padding: "24px",
    maxWidth: "780px",
    margin: "0 auto",
    color: "var(--text-primary, #e5e7eb)",
    fontFamily: "system-ui, -apple-system, sans-serif",
    fontSize: "14px",
    lineHeight: "1.6",
    position: "relative",
  };

  const headerSx = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "20px",
    paddingBottom: "16px",
    borderBottom: "1px solid rgba(240, 201, 101, 0.08)",
  };

  const titleSx = {
    margin: 0,
    fontSize: "20px",
    fontWeight: 600,
    color: "var(--amber-text, #f0c965)",
  };

  const metaSx = {
    fontSize: "13px",
    color: "var(--text-muted)",
    marginTop: "4px",
  };

  const closeBtnSx = {
    background: "none",
    border: "none",
    color: "var(--text-muted)",
    cursor: "pointer",
    fontSize: "20px",
    lineHeight: 1,
    padding: "0 4px",
  };

  const sectionSx = {
    marginBottom: "20px",
    padding: "14px 16px",
    background: "rgba(240, 201, 101, 0.03)",
    borderRadius: "8px",
    border: "1px solid rgba(240, 201, 101, 0.06)",
  };

  const sectionLabelSx = {
    margin: "0 0 8px",
    fontSize: "13px",
    fontWeight: 600,
    color: "var(--amber-text)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  };

  const sectionTextSx = {
    margin: 0,
    whiteSpace: "pre-wrap",
    color: "var(--text-primary, #e5e7eb)",
    fontSize: "14px",
    lineHeight: "1.7",
  };

  const routerSx = {
    marginBottom: "20px",
    padding: "10px 14px",
    background: "rgba(240, 201, 101, 0.02)",
    borderRadius: "8px",
    border: "1px solid rgba(240, 201, 101, 0.05)",
    fontSize: "12px",
    color: "var(--text-secondary)",
  };

  const previewSx = {
    marginBottom: "20px",
    padding: "12px 16px",
    background: "rgba(0,0,0,0.15)",
    borderRadius: "8px",
    borderLeft: "3px solid rgba(240, 201, 101, 0.2)",
    fontSize: "13px",
    color: "var(--text-secondary)",
    fontStyle: "italic",
  };

  const footerSx = {
    display: "flex",
    gap: "16px",
    padding: "12px 0 0",
    borderTop: "1px solid rgba(240, 201, 101, 0.08)",
    fontSize: "12px",
    color: "var(--text-muted)",
  };

  return (
    <div className="rei-decision-detail" style={detailSx}>
      <div style={headerSx}>
        <div>
          <h2 style={titleSx}>CARDO Decision Report</h2>
          <div style={metaSx}>
            {new Date(createdAt).toLocaleString()} — {domainLabel}
          </div>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} style={closeBtnSx} aria-label="Close detail">
            ×
          </button>
        )}
      </div>

      <div style={routerSx}>
        <strong>Route:</strong> {routerDecision?.label || "Unknown"}
        {routerDecision?.model ? ` — ${routerDecision.model}` : ""}
        {routerDecision?.hingeScore != null ? ` — Hinge: ${routerDecision.hingeScore.toFixed(3)}` : ""}
        {routerDecision?.matchedTerms?.length > 0 && (
          <> — Matched: {routerDecision.matchedTerms.join(", ")}</>
        )}
      </div>

      <div style={previewSx}>
        &ldquo;{inputPreview}{inputPreview && inputPreview.length >= 200 ? "…" : ""}&rdquo;
      </div>

      {sectionOrder.map(({ key, label }) =>
        hasSection(key) ? (
          <div key={key} style={sectionSx}>
            <h3 style={sectionLabelSx}>{label}</h3>
            <p style={sectionTextSx}>{sections[key]}</p>
          </div>
        ) : null
      )}

      <div style={footerSx}>
        <span>ID: {id}</span>
        {actualTokens != null && <span>{actualTokens.toLocaleString()} tokens</span>}
        {actualCost != null && <span>${actualCost.toFixed(6)} actual cost</span>}
        {durationMs != null && <span>{(durationMs / 1000).toFixed(1)}s</span>}
      </div>
    </div>
  );
}
