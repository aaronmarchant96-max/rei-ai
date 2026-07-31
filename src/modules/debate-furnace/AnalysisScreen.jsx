import { T } from "./config.js";
import { Section } from "./components.jsx";

export default function AnalysisScreen({ debate, grid, mobile, compactLine, stoke }) {
  return (
    <Section title={`${debate.icon} QUESTION ANALYSIS`} color={T.brass}>
      <div style={grid}>
        <p
          style={{
            fontSize: 13,
            color: T.textDim,
            lineHeight: mobile ? compactLine : 1.7,
            overflowWrap: "anywhere",
          }}
        >
          {debate.desc}
        </p>
        <div>
          {debate.criteria.map((c) => (
            <span
              key={c}
              style={{
                display: "inline-block",
                background: `${T.gold}10`,
                border: `1px solid ${T.gold}30`,
                borderRadius: 8,
                padding: "2px 8px",
                fontSize: 11,
                color: T.gold,
                margin: 2,
              }}
            >
              {c}
            </span>
          ))}
        </div>
      </div>
      <button
        onClick={stoke}
        style={{
          marginTop: 16,
          background: `linear-gradient(135deg,${T.molten},${T.brass})`,
          border: "none",
          borderRadius: 10,
          padding: "12px 22px",
          color: "white",
          fontWeight: 900,
          cursor: "pointer",
        }}
      >
        BEGIN ROUND 1 — OPENING ARGUMENTS
      </button>
    </Section>
  );
}
