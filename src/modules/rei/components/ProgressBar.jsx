export default function ProgressBar({ entries, labelFn, palette = "#F59E0B", style }) {
  return (
    <div style={style}>
      {entries.map(function (entry, idx) {
        var item = entry[0];
        var count = entry[1];
        return (
          <div
            key={item}
            style={{
              display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px",
              animation: "slide-up 0.35s ease-out both",
              animationDelay: (idx * 80) + "ms",
            }}
          >
            <div style={{
              fontSize: "13px", fontWeight: 600, width: "160px", flexShrink: 0,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}
            title={item}>
              {labelFn ? labelFn(item) : item}
            </div>
            <div style={{ height: "8px", borderRadius: "4px", flex: 1, minWidth: "60px", overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: Math.max(count * 6, 2) + "%",
                borderRadius: "4px",
                background: palette,
                transition: "width 0.4s ease",
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
