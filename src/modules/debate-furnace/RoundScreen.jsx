import { T } from "./config.js";
import { Pill, Score } from "./components.jsx";

export default function RoundScreen({
  r,
  grid,
  mobile,
  debate,
  copyRound,
  roundCopied,
  compactLine,
  stoke,
  round,
}) {
  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 10,
          marginBottom: 18,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <Pill color={T.ember} compact={mobile}>
          ROUND {r.round} — {r.label.toUpperCase()}
        </Pill>
        <button
          onClick={() => copyRound(r)}
          style={{
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 999,
            padding: "5px 10px",
            color: roundCopied === `r${r.round}` ? T.judge : T.muted,
            cursor: "pointer",
            fontSize: 11,
            fontWeight: 800,
            fontFamily: "inherit",
          }}
        >
          {roundCopied === `r${r.round}` ? "Copied" : "Copy Round"}
        </button>
      </div>
      <div style={grid}>
        {[
          [debate.shortA, r.aArg, T.sideA, "A"],
          [debate.shortB, r.bArg, T.sideB, "B"],
        ].map(([n, a, c, s]) => (
          <div
            key={s}
            style={{
              background: T.card,
              border: `1px solid ${c}28`,
              borderTop: `3px solid ${c}`,
              borderRadius: 12,
              padding: mobile ? 16 : 20,
            }}
          >
            <b style={{ color: c }}>
              {s} {n.toUpperCase()}
            </b>
            <p style={{ fontSize: 13.5, lineHeight: mobile ? compactLine : 1.8 }}>{a}</p>
          </div>
        ))}
      </div>
      <div
        style={{
          background: T.card,
          border: `1px solid ${T.judge}33`,
          borderLeft: `3px solid ${T.judge}`,
          borderRadius: 12,
          padding: mobile ? 16 : 20,
          marginTop: 14,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            fontSize: 10,
            letterSpacing: 3,
            color: T.judge,
            fontWeight: 800,
            marginBottom: 14,
          }}
        >
          FURNACE JUDGE — ROUND {r.round}
        </div>
        <div style={grid}>
          <Score label={debate.shortA} score={r.sa} color={T.sideA} />
          <Score label={debate.shortB} score={r.sb} color={T.sideB} />
        </div>
        <p
          style={{
            fontSize: 13,
            color: T.muted,
            lineHeight: mobile ? compactLine : 1.65,
            overflowWrap: "anywhere",
          }}
        >
          {r.judgeNote}
        </p>
      </div>
      <button
        onClick={stoke}
        style={{
          width: "100%",
          background: "linear-gradient(135deg,#111825,#1a1228)",
          border: `1px solid ${T.sideA}44`,
          borderRadius: 12,
          padding: 14,
          color: T.sideA,
          fontWeight: 800,
          cursor: "pointer",
        }}
      >
        {round < 2
          ? `STOKE THE FURNACE → ROUND ${round + 2}`
          : "STOKE THE FURNACE → WHAT SURVIVED"}
      </button>
    </>
  );
}
