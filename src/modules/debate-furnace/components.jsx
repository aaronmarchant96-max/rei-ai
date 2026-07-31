import { T } from "./config.js";

export function Pill({ children, color, compact = false }) {
  return (
    <span
      style={{
        background: `${color}18`,
        border: `1px solid ${color}44`,
        borderRadius: 12,
        padding: compact ? "2px 8px" : "2px 10px",
        fontSize: compact ? 10 : 11,
        color,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

export function Section({ title, color, children }) {
  return (
    <div
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderTop: `3px solid ${color}`,
        borderRadius: 12,
        padding: 18,
        marginBottom: 12,
      }}
    >
      <div style={{ fontSize: 10, letterSpacing: 3, color, fontWeight: 800, marginBottom: 12 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

export function Card({ title, color, children }) {
  return (
    <div
      style={{
        background: T.card,
        border: `1px solid ${color}24`,
        borderTop: `3px solid ${color}66`,
        borderRadius: 12,
        padding: 16,
      }}
    >
      <div style={{ fontSize: 10, letterSpacing: 2, color, fontWeight: 800, marginBottom: 8 }}>
        {title}
      </div>
      <p style={{ fontSize: 13, color: T.textDim, lineHeight: 1.75, margin: 0 }}>{children}</p>
    </div>
  );
}

export function HingeCard({ hinge, shortA, shortB, mobile, compactLine, grid }) {
  return (
    <Section title="THE HINGE" color={T.gold}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <Pill color={T.brass} compact={mobile}>
          {hinge.questionType}
        </Pill>
        <Pill color={T.gold} compact={mobile}>
          Hinge Clarity: {hinge.hingeClarityLevel}
        </Pill>
      </div>
      <div style={grid}>
        <Card title={`${shortA.toUpperCase()} PROTECTS`} color={T.sideA}>
          {hinge.sideAProtects}
        </Card>
        <Card title={`${shortA.toUpperCase()} FEARS LOSING`} color={T.sideA}>
          {hinge.sideAFears}
        </Card>
        <Card title={`${shortB.toUpperCase()} PROTECTS`} color={T.sideB}>
          {hinge.sideBProtects}
        </Card>
        <Card title={`${shortB.toUpperCase()} FEARS LOSING`} color={T.sideB}>
          {hinge.sideBFears}
        </Card>
      </div>
      <div
        style={{
          background: T.charcoal,
          border: `1px solid ${T.gold}30`,
          borderRadius: 10,
          padding: mobile ? 14 : 16,
          marginTop: 12,
        }}
      >
        <div
          style={{
            fontSize: 10,
            letterSpacing: 2,
            color: T.gold,
            fontWeight: 800,
            marginBottom: 8,
          }}
        >
          CORE TENSION
        </div>
        <p
          style={{
            fontSize: 14,
            color: T.text,
            lineHeight: mobile ? compactLine : 1.7,
            margin: 0,
            overflowWrap: "anywhere",
          }}
        >
          {hinge.coreTension}
        </p>
      </div>
      <p
        style={{
          fontSize: 12,
          color: T.textDim,
          lineHeight: mobile ? compactLine : 1.65,
          margin: "12px 0 0",
          overflowWrap: "anywhere",
        }}
      >
        <b style={{ color: T.text }}>Why clarity is {hinge.hingeClarityLevel.toLowerCase()}:</b>{" "}
        {hinge.hingeClarityReason}
      </p>
      <p
        style={{
          fontSize: 13,
          color: T.textDim,
          lineHeight: mobile ? compactLine : 1.65,
          margin: "10px 0 0",
          overflowWrap: "anywhere",
        }}
      >
        <b style={{ color: T.judge }}>Bridge point:</b> {hinge.bridgePoint}
      </p>
    </Section>
  );
}

export function Score({ label, score, color }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
        <span style={{ fontSize: 12, color: T.muted, fontWeight: 700 }}>{label}</span>
        <b style={{ fontSize: 24, color }}>{score.toFixed(1)}</b>
      </div>
      <div style={{ height: 4, background: T.border, borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${score * 10}%`, background: color }} />
      </div>
    </div>
  );
}

export function DecisionPathControls({ value, onChange }) {
  return (
    <div
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 12,
        marginBottom: 12,
        padding: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              letterSpacing: 3,
              color: T.muted,
              fontWeight: 800,
              marginBottom: 6,
            }}
          >
            DECISION PATH
          </div>
          <div style={{ fontSize: 12, color: T.textDim, lineHeight: 1.45 }}>
            Auto for practical and policy questions; override it when you want.
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["auto", "show", "hide"].map((mode) => (
            <button
              key={mode}
              onClick={() => onChange(mode)}
              style={{
                background: value === mode ? T.surface : T.charcoal,
                border: `1px solid ${value === mode ? T.ember : T.border}`,
                borderRadius: 999,
                padding: "6px 10px",
                color: value === mode ? T.ember : T.muted,
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 800,
                fontFamily: "inherit",
              }}
            >
              {mode === "auto" ? "Auto" : mode === "show" ? "Show" : "Hide"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DecisionPathPanel({ decisionPath, mobile, compactLine, grid }) {
  return (
    <Section title="RECOMMENDED DECISION PATH" color={T.judge}>
      <div style={grid}>
        <div>
          <div
            style={{
              fontSize: 10,
              letterSpacing: 2,
              color: T.judge,
              fontWeight: 800,
              marginBottom: 8,
            }}
          >
            RECOMMENDED APPROACH
          </div>
          <p
            style={{
              fontSize: 14,
              color: T.text,
              lineHeight: mobile ? compactLine : 1.7,
              margin: 0,
            }}
          >
            {decisionPath.framework}
          </p>
        </div>
        <div>
          <div
            style={{
              fontSize: 10,
              letterSpacing: 2,
              color: T.judge,
              fontWeight: 800,
              marginBottom: 8,
            }}
          >
            WHY THIS FITS
          </div>
          <p
            style={{
              fontSize: 13,
              color: T.textDim,
              lineHeight: mobile ? compactLine : 1.7,
              margin: 0,
            }}
          >
            {decisionPath.why}
          </p>
        </div>
        <div>
          <div
            style={{
              fontSize: 10,
              letterSpacing: 2,
              color: T.judge,
              fontWeight: 800,
              marginBottom: 8,
            }}
          >
            DRIVER / APPROVER
          </div>
          <p
            style={{
              fontSize: 13,
              color: T.textDim,
              lineHeight: mobile ? compactLine : 1.7,
              margin: 0,
            }}
          >
            <b style={{ color: T.text }}>Driver:</b> {decisionPath.driver}
            <br />
            <b style={{ color: T.text }}>Approver:</b> {decisionPath.approver}
          </p>
        </div>
        <div>
          <div
            style={{
              fontSize: 10,
              letterSpacing: 2,
              color: T.judge,
              fontWeight: 800,
              marginBottom: 8,
            }}
          >
            INPUT / LOG
          </div>
          <p
            style={{
              fontSize: 13,
              color: T.textDim,
              lineHeight: mobile ? compactLine : 1.7,
              margin: 0,
            }}
          >
            <b style={{ color: T.text }}>Input deadline:</b> {decisionPath.deadline}
            <br />
            <b style={{ color: T.text }}>Decision log template:</b> {decisionPath.logTemplate}
          </p>
        </div>
      </div>
    </Section>
  );
}
