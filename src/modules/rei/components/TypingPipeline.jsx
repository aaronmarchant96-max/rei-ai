export default function TypingPipeline() {
  const steps = ["C", "A", "R", "DO"];

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "4px",
      padding: "10px 0", fontSize: "11px",
    }}>
      {steps.map((step, i) => (
        <span key={step} style={{
          display: "inline-flex", alignItems: "center",
          gap: i < steps.length - 1 ? "4px" : "8px",
        }}>
          <span style={{
            display: "inline-flex", alignItems: "center",
            justifyContent: "center",
            width: "20px", height: "20px", borderRadius: "5px",
            background: "rgba(240,201,101,0.08)",
            border: "1px solid rgba(240,201,101,0.15)",
            color: "#64748b",
            fontWeight: 700, fontSize: "10px",
            animation: `pulse 1.5s ease-in-out infinite ${i * 0.35}s`,
          }}>
            {step}
          </span>
          {i < steps.length - 1 && (
            <span style={{ color: "rgba(148,163,184,0.25)", fontSize: "8px" }}>►</span>
          )}
        </span>
      ))}
      <span style={{ color: "#64748b", marginLeft: "4px" }}>REI is reasoning…</span>
    </div>
  );
}
