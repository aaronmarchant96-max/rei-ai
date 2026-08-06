export default function MetricCard({ label, children, subtext, delay = 0, style }) {
  return (
    <div style={{
      padding: "18px 20px",
      borderRadius: "12px",
      background: "var(--surface, #111318)",
      border: "1px solid var(--border, rgba(255,255,255,0.08))",
      textAlign: "center",
      flex: "1 1 120px",
      minWidth: "120px",
      animation: "fade-in 0.4s ease-out both",
      animationDelay: delay + "ms",
      ...(style || {}),
    }}>
      {label && (
        <div style={{
          fontSize: "11px",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--textDim, #94A3B8)",
          marginBottom: "6px",
        }}>
          {label}
        </div>
      )}
      {children}
      {subtext && (
        <div style={{
          fontSize: "10px",
          color: "var(--textDim, #94A3B8)",
          marginTop: "4px",
        }}>
          {subtext}
        </div>
      )}
    </div>
  );
}
