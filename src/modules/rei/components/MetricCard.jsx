export default function MetricCard({ label, children, subtext, delay = 0, style }) {
  return (
    <div className="metric-card" style={{
      padding: "18px 20px",
      borderRadius: "14px",
      background: "linear-gradient(135deg, rgba(17,19,24,0.58), rgba(17,19,24,0.38))",
      backdropFilter: "blur(24px) saturate(140%)",
      WebkitBackdropFilter: "blur(24px) saturate(140%)",
      border: "1px solid transparent",
      borderImage: "linear-gradient(135deg, rgba(245,158,11,0.35), rgba(212,175,55,0.1)) 1",
      textAlign: "center",
      flex: "1 1 120px",
      minWidth: "120px",
      animation: "fadeIn 0.4s ease-out both",
      animationDelay: delay + "ms",
      transition: "border-color 0.3s ease, box-shadow 0.3s ease",
      ...(style || {}),
    }}>
      {label && (
        <div className="metric-card" style={{
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
        <div className="metric-card" style={{
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
