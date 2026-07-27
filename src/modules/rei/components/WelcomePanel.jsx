export default function WelcomePanel({ onStart }) {
  const starters = [
    { label: "Sort out a decision", prompt: "Help me sort this out", icon: "💡" },
    { label: "Analyze a debate", prompt: "Separate facts from assumptions in this argument", icon: "⚔️" },
    { label: "Test an argument", prompt: "What would change my mind about this?", icon: "🧪" },
  ];

  return (
    <div style={{
      padding: "24px", borderRadius: "14px",
      background: "linear-gradient(135deg, rgba(240, 201, 101, 0.06) 0%, rgba(15, 20, 32, 0.8) 100%)",
      border: "1px solid rgba(240, 201, 101, 0.15)",
      textAlign: "center",
    }}>
      <div style={{ fontSize: "18px", fontWeight: 700, color: "#f0c965", marginBottom: "6px" }}>
        REI.ai — The Generalist
      </div>
      <div style={{ fontSize: "13px", color: "#94a3b8", lineHeight: "1.6", marginBottom: "18px", maxWidth: "400px", margin: "0 auto 18px" }}>
        I use the CARDO framework to find the <b style={{ color: "#f0c965" }}>hinge</b> — the single factor that changes the answer.
        Pick a starting point:
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {starters.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => onStart(s.prompt)}
            style={{
              padding: "12px 16px", borderRadius: "10px",
              background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(240, 201, 101, 0.12)",
              color: "#e2e8f0", cursor: "pointer",
              textAlign: "left", fontSize: "13px",
              transition: "all 0.15s ease",
              display: "flex", alignItems: "center", gap: "10px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(240, 201, 101, 0.35)";
              e.currentTarget.style.background = "rgba(240, 201, 101, 0.06)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(240, 201, 101, 0.12)";
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
            }}
          >
            <span style={{ fontSize: "16px" }}>{s.icon}</span>
            <span>{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
