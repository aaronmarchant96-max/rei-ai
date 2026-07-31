import { T } from "./config.js";
import { Pill, Section, Card, HingeCard, DecisionPathControls, DecisionPathPanel } from "./components.jsx";

export default function FinalReport({
  hinge,
  debate,
  mobile,
  compactLine,
  grid,
  result,
  h,
  unburned,
  decisionPath,
  decisionPathShown,
  decisionPathPreference,
  setDecisionPathPreference,
  open,
  setOpen,
  copyRound,
  roundCopied,
  copy,
  copied,
  reset,
}) {
  return (
    <>
      <HingeCard
        hinge={hinge}
        shortA={debate.shortA}
        shortB={debate.shortB}
        mobile={mobile}
        compactLine={compactLine}
        grid={grid}
      />
      <div
        style={{
          background: "linear-gradient(135deg,#130f08,#0f0810)",
          border: `1px solid ${T.gold}44`,
          borderRadius: 16,
          padding: mobile ? 20 : 28,
          textAlign: "center",
          marginBottom: 18,
        }}
      >
        <div style={{ fontSize: 10, letterSpacing: 6, color: T.brass, marginBottom: 10 }}>
          WHAT SURVIVED THE HEAT
        </div>
        <div style={{ fontSize: mobile ? 24 : 30, fontWeight: 900, color: T.gold }}>
          {result}
        </div>
        <div
          style={{
            fontSize: 13,
            color: T.muted,
            marginTop: 8,
            lineHeight: mobile ? compactLine : 1.6,
          }}
        >
          {debate.shortA}: {debate.aWins} rounds · {debate.shortB}: {debate.bWins} rounds
          {debate.ties ? ` · ${debate.ties} tie` : ""}
        </div>
        <Pill color={h[2]} compact={mobile}>
          {h[0]} — {h[1]}
        </Pill>
        <p style={{ fontSize: 11, color: T.muted, fontStyle: "italic" }}>
          Performed better under pressure means it scored higher under this debate setup — not
          a claim of objective truth.
        </p>
      </div>
      <Section title={`${debate.icon} WHAT THE QUESTION WAS REALLY ASKING`} color={T.brass}>
        <p
          style={{
            fontSize: 13,
            lineHeight: mobile ? compactLine : 1.7,
            overflowWrap: "anywhere",
            color: T.textDim,
          }}
        >
          {debate.desc}
        </p>
      </Section>
      <Section title="KEY TAKEAWAYS" color={T.gold}>
        {debate.take.map(([t, b]) => (
          <p
            key={t}
            style={{
              fontSize: 13,
              color: T.textDim,
              lineHeight: mobile ? compactLine : 1.7,
              overflowWrap: "anywhere",
            }}
          >
            <b style={{ color: T.text }}>{t}:</b> {b}
          </p>
        ))}
      </Section>
      <div style={grid}>
        <Card title={`STRONGEST — ${debate.shortA.toUpperCase()}`} color={T.sideA}>
          {debate.strongA}
        </Card>
        <Card title={`STRONGEST — ${debate.shortB.toUpperCase()}`} color={T.sideB}>
          {debate.strongB}
        </Card>
        <Card title={`WHERE ${debate.shortA.toUpperCase()} CRACKED`} color={T.ember}>
          {debate.crackA}
        </Card>
        <Card title={`WHERE ${debate.shortB.toUpperCase()} CRACKED`} color={T.ember}>
          {debate.crackB}
        </Card>
      </div>
      <Section title={unburned} color={T.smoke}>
        {debate.verify.map((v) => (
          <div
            key={v}
            style={{
              fontSize: 13,
              color: T.textDim,
              lineHeight: mobile ? compactLine : 1.65,
              overflowWrap: "anywhere",
              marginBottom: 8,
            }}
          >
            • {v}
          </div>
        ))}
      </Section>
      <Section title="WHAT WOULD CHANGE THE VERDICT?" color={T.brass}>
        <div style={grid}>
          {[
            [`Make ${debate.shortA} stronger`, debate.changeA, T.sideA],
            [`Make ${debate.shortB} stronger`, debate.changeB, T.sideB],
          ].map(([t, items, c]) => (
            <div key={t}>
              <b style={{ fontSize: 11, color: c }}>{t.toUpperCase()}</b>
              {items.map((i) => (
                <div
                  key={i}
                  style={{
                    fontSize: 12,
                    color: T.textDim,
                    lineHeight: mobile ? compactLine : 1.65,
                    overflowWrap: "anywhere",
                    marginTop: 6,
                  }}
                >
                  • {i}
                </div>
              ))}
            </div>
          ))}
        </div>
      </Section>
      <DecisionPathControls
        value={decisionPathPreference}
        onChange={setDecisionPathPreference}
      />
      {decisionPathShown && (
        <DecisionPathPanel
          decisionPath={decisionPath}
          mobile={mobile}
          compactLine={compactLine}
          grid={grid}
        />
      )}
      <Section title="WHAT THIS REALLY DEPENDS ON" color={T.gold}>
        <p
          style={{
            fontSize: mobile ? 14 : 15,
            lineHeight: mobile ? compactLine : 1.7,
            overflowWrap: "anywhere",
            fontStyle: "italic",
          }}
        >
          {debate.core}
        </p>
        <p style={{ lineHeight: mobile ? 1.55 : 1.7, overflowWrap: "anywhere" }}>
          If you value <b style={{ color: T.sideA }}>{debate.comp[0]}</b>, {debate.shortA}{" "}
          feels stronger.
        </p>
        <p style={{ lineHeight: mobile ? 1.55 : 1.7, overflowWrap: "anywhere" }}>
          If you value <b style={{ color: T.sideB }}>{debate.comp[1]}</b>, {debate.shortB}{" "}
          feels stronger.
        </p>
        <p style={{ lineHeight: mobile ? 1.55 : 1.7, overflowWrap: "anywhere" }}>
          <span style={{ color: T.muted }}>The real question is: </span>
          <em style={{ color: T.gold }}>{debate.comp[2]}</em>.
        </p>
        <div
          style={{
            borderTop: `1px solid ${T.border}`,
            paddingTop: 12,
            fontSize: 13,
            color: T.muted,
            fontStyle: "italic",
          }}
        >
          The decision is yours. The furnace shows what the choice depends on.
        </div>
      </Section>
      <div
        style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 12,
          marginBottom: mobile ? 18 : 18,
          overflow: "hidden",
        }}
      >
        <button
          onClick={() => setOpen(!open)}
          style={{
            width: "100%",
            background: "none",
            border: "none",
            padding: mobile ? "12px 14px" : "14px 18px",
            display: "flex",
            justifyContent: "space-between",
            color: T.muted,
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          FULL DEBATE TRANSCRIPT <span>{open ? "▲" : "▼"}</span>
        </button>
        {open && (
          <div
            style={{
              padding: mobile ? "4px 14px 18px" : "4px 18px 22px",
              borderTop: `1px solid ${T.border}`,
            }}
          >
            {debate.rounds.map((rr) => (
              <div key={rr.round} style={{ marginTop: 20 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    alignItems: "center",
                    flexWrap: "wrap",
                    marginBottom: 10,
                  }}
                >
                  <b style={{ fontSize: 10, letterSpacing: 3, color: T.ember }}>
                    ROUND {rr.round} — {rr.label.toUpperCase()}
                  </b>
                  <button
                    onClick={() => copyRound(rr)}
                    style={{
                      background: T.surface,
                      border: `1px solid ${T.border}`,
                      borderRadius: 999,
                      padding: "5px 10px",
                      color: roundCopied === `r${rr.round}` ? T.judge : T.muted,
                      cursor: "pointer",
                      fontSize: 11,
                      fontWeight: 800,
                      fontFamily: "inherit",
                    }}
                  >
                    {roundCopied === `r${rr.round}` ? "Copied" : "Copy Round"}
                  </button>
                </div>
                <p
                  style={{ lineHeight: mobile ? compactLine : 1.7, overflowWrap: "anywhere" }}
                >
                  <b style={{ color: T.sideA }}>{debate.shortA}:</b> {rr.aArg}
                </p>
                <p
                  style={{ lineHeight: mobile ? compactLine : 1.7, overflowWrap: "anywhere" }}
                >
                  <b style={{ color: T.sideB }}>{debate.shortB}:</b> {rr.bArg}
                </p>
                <div
                  style={{
                    background: T.charcoal,
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 13,
                    color: T.muted,
                    lineHeight: mobile ? compactLine : 1.65,
                    overflowWrap: "anywhere",
                  }}
                >
                  <b style={{ color: T.judge }}>JUDGE:</b> {rr.judgeNote}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <p style={{ textAlign: "center", color: T.muted, fontSize: 12, fontStyle: "italic" }}>
        "Pressure-test both sides. Find the hinge. Decide what matters."
      </p>
      <div
        style={{
          display: "flex",
          flexDirection: mobile ? "column" : "row",
          gap: 12,
          position: mobile ? "sticky" : "static",
          bottom: mobile ? 0 : "auto",
          zIndex: mobile ? 20 : 1,
          padding: mobile ? "10px 0 calc(12px + env(safe-area-inset-bottom))" : 0,
          background: mobile ? `${T.bg}f2` : "transparent",
          backdropFilter: mobile ? "blur(16px)" : "none",
          borderTop: mobile ? `1px solid ${T.border}` : "none",
        }}
      >
        <button
          onClick={copy}
          style={{
            flex: 1,
            background: T.charcoal,
            border: `1px solid ${T.border}`,
            borderRadius: 12,
            padding: 13,
            color: copied ? T.judge : T.muted,
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          {copied ? "Copied" : "Copy Full Report"}
        </button>
        <button
          onClick={reset}
          style={{
            flex: 1,
            background: `linear-gradient(135deg,${T.molten},${T.brass})`,
            border: "none",
            borderRadius: 12,
            padding: 13,
            color: "white",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          NEW DEBATE
        </button>
      </div>
      <div
        style={{
          maxWidth: 940,
          margin: "14px auto 0",
          display: "flex",
          justifyContent: "center",
          gap: 14,
          flexWrap: "wrap",
          fontSize: 12,
          color: T.muted,
        }}
      >
        <a
          href="https://x.com/PromptHound96"
          target="_blank"
          rel="noreferrer"
          style={{ color: T.textDim, textDecoration: "none" }}
        >
          X @PromptHound96
        </a>
        <span style={{ color: T.border }}>•</span>
        <a
          href="https://github.com/aaronmarchant96-max"
          target="_blank"
          rel="noreferrer"
          style={{ color: T.textDim, textDecoration: "none" }}
        >
          GitHub aaronmarchant96-max
        </a>
      </div>
    </>
  );
}
