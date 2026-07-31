import { T, STARTERS } from "./config.js";

export default function OpeningScreen({
  mobile,
  reportLine,
  starterHelp,
  compactLine,
  question,
  setQuestion,
  sideA,
  setSideA,
  sideB,
  setSideB,
  intensity,
  setIntensity,
  grid,
  colors,
  start,
  loading,
  fallbackNotice,
  debateHistory,
  historyOpen,
  setHistoryOpen,
  loadSavedDebate,
  formatSavedAt,
}) {
  return (
    <div
      style={{
        background: T.bg,
        minHeight: "100vh",
        fontFamily: "Inter, system-ui, sans-serif",
        color: T.text,
        padding: mobile ? "16px 12px 92px" : "36px 20px 60px",
      }}
    >
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: mobile ? 18 : 32 }}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: 7,
              color: T.brass,
              fontWeight: 800,
              marginBottom: 14,
            }}
          >
            DEBATE FURNACE
          </div>
          <h1
            style={{
              fontSize: mobile ? 34 : 46,
              fontWeight: 900,
              margin: "0 0 12px",
              letterSpacing: -1.5,
              lineHeight: 1.05,
              background: `linear-gradient(135deg,${T.molten},${T.brass},${T.gold})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            The Furnace
          </h1>
          <p
            style={{
              color: T.textDim,
              fontSize: 14,
              lineHeight: 1.5,
              marginBottom: 8,
            }}
          >
            Pressure-test both sides.
            <br />
            Find the hinge. Decide what matters.
          </p>
          <p
            style={{
              color: T.muted,
              fontSize: 13,
              lineHeight: mobile ? reportLine : 1.7,
            }}
          >
            A thinking tool for arguments too complex for tribal yes/no answers.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: mobile ? "1fr" : "repeat(3,1fr)",
            gap: 12,
            marginBottom: mobile ? 18 : 28,
          }}
        >
          {[
            [
              "⚔",
              "Steel-Man Both Sides",
              "Each side gets its strongest form before pressure is applied.",
            ],
            [
              "⚑",
              "Flag the Smoke",
              "Weak logic, unsupported claims, and evasions get called out.",
            ],
            [
              "🧭",
              "Find the Hinge",
              "The report shows what the disagreement actually depends on.",
            ],
          ].map(([icon, title, body]) => (
            <div
              key={title}
              style={{
                background: T.card,
                border: `1px solid ${T.border}`,
                borderTop: `2px solid ${T.ember}`,
                borderRadius: 12,
                padding: 16,
              }}
            >
              <div style={{ fontSize: 20, marginBottom: 8 }}>{icon}</div>
              <b style={{ fontSize: 12 }}>{title}</b>
              <p
                style={{
                  fontSize: 12,
                  color: T.muted,
                  lineHeight: mobile ? compactLine : 1.6,
                  margin: "4px 0 0",
                }}
              >
                {body}
              </p>
            </div>
          ))}
        </div>

        <div
          style={{
            fontSize: 10,
            letterSpacing: 3,
            color: T.muted,
            fontWeight: 700,
            marginBottom: 10,
          }}
        >
          STARTER QUESTIONS
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: mobile ? "nowrap" : "wrap",
            overflowX: mobile ? "auto" : "visible",
            gap: 8,
            marginBottom: 18,
            paddingBottom: mobile ? 4 : 0,
          }}
        >
          {STARTERS.map((s) => (
            <button
              key={s}
              onClick={() => setQuestion(s)}
              style={{
                flex: mobile ? "0 0 auto" : "initial",
                whiteSpace: "nowrap",
                background: question === s ? `${T.ember}18` : T.charcoal,
                border: `1px solid ${question === s ? T.ember : T.border}`,
                borderRadius: 20,
                padding: mobile ? "6px 12px" : "7px 14px",
                fontSize: 12,
                color: question === s ? T.ember : T.textDim,
                cursor: "pointer",
              }}
            >
              {s}
            </button>
          ))}
        </div>

        <div
          style={{
            background: T.surface,
            border: `1px solid ${T.ember}44`,
            borderRadius: 16,
            padding: mobile ? 14 : 22,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: 3,
              color: T.brass,
              fontWeight: 800,
            }}
          >
            QUESTION UNDER PRESSURE
          </div>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={3}
            placeholder="State the question you want pressure tested..."
            style={{
              width: "100%",
              boxSizing: "border-box",
              marginTop: 8,
              background: "transparent",
              border: `1px solid ${T.border}`,
              borderRadius: 10,
              padding: "12px 14px",
              color: T.text,
              fontSize: 14,
              resize: "vertical",
              lineHeight: mobile ? 1.55 : 1.65,
              overflowWrap: "anywhere",
            }}
          />
          <p style={{ margin: "8px 0 0", color: T.muted, fontSize: 12, lineHeight: 1.45 }}>
            {starterHelp}
          </p>
          {fallbackNotice && (
            <p style={{ margin: "8px 0 0", color: T.ember, fontSize: 12, lineHeight: 1.45 }}>
              {fallbackNotice}
            </p>
          )}
          <div style={{ ...grid, marginTop: 14 }}>
            {[
              [sideA, setSideA, T.sideA, "SIDE A POSITION"],
              [sideB, setSideB, T.sideB, "SIDE B POSITION"],
            ].map(([v, set, c, label]) => (
              <div key={label}>
                <label style={{ fontSize: 10, letterSpacing: 2, color: c, fontWeight: 800 }}>
                  {label}
                </label>
                <input
                  value={v}
                  onChange={(e) => set(e.target.value)}
                  placeholder="Optional — auto-labeled if blank"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    marginTop: 6,
                    background: T.charcoal,
                    border: `1px solid ${c}33`,
                    borderRadius: 9,
                    padding: "10px 12px",
                    color: T.text,
                    fontSize: 13,
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: mobile ? "column" : "row",
            gap: 10,
            marginBottom: 18,
          }}
        >
          {["balanced", "aggressive", "ruthless"].map((x) => (
            <button
              key={x}
              onClick={() => setIntensity(x)}
              style={{
                flex: 1,
                padding: mobile ? "8px 8px" : "12px 8px",
                background: intensity === x ? T.surface : T.charcoal,
                border: `2px solid ${intensity === x ? colors[x] : T.border}`,
                borderRadius: 12,
                cursor: "pointer",
              }}
            >
              <b style={{ color: colors[x], textTransform: "capitalize" }}>{x}</b>
            </button>
          ))}
        </div>

        <div
          style={{
            position: mobile ? "sticky" : "static",
            bottom: mobile ? 0 : "auto",
            zIndex: mobile ? 20 : 1,
            marginTop: mobile ? 12 : 0,
            padding: mobile ? "10px 0 calc(12px + env(safe-area-inset-bottom))" : 0,
            background: mobile ? `${T.bg}f2` : "transparent",
            backdropFilter: mobile ? "blur(16px)" : "none",
            borderTop: mobile ? `1px solid ${T.border}` : "none",
          }}
        >
          <button
            onClick={start}
            disabled={!question.trim() || loading}
            style={{
              width: "100%",
              background:
                question.trim() && !loading
                  ? `linear-gradient(135deg,${T.molten},${T.brass})`
                  : T.charcoal,
              border: "none",
              borderRadius: 12,
              padding: 16,
              fontSize: 15,
              fontWeight: 900,
              color: question.trim() && !loading ? "white" : T.muted,
              cursor: question.trim() && !loading ? "pointer" : "not-allowed",
              letterSpacing: 2,
            }}
          >
            {loading ? "IGNITING..." : "IGNITE DEBATE"}
          </button>
        </div>

        {debateHistory.length > 0 && (
          <div
            style={{
              maxWidth: 680,
              margin: "16px auto 0",
              background: T.card,
              border: `1px solid ${T.border}`,
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <button
              onClick={() => setHistoryOpen((v) => !v)}
              style={{
                width: "100%",
                background: "none",
                border: "none",
                padding: "12px 14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  letterSpacing: 3,
                  color: T.muted,
                  fontWeight: 800,
                }}
              >
                MY DEBATES
              </span>
              <span style={{ fontSize: 12, color: T.textDim }}>
                {historyOpen ? "▲" : "▼"}
              </span>
            </button>
            {historyOpen && (
              <div
                style={{
                  borderTop: `1px solid ${T.border}`,
                  padding: "10px 12px",
                }}
              >
                {debateHistory.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => loadSavedDebate(item)}
                    style={{
                      display: "block",
                      width: "100%",
                      background: T.charcoal,
                      border: `1px solid ${T.border}`,
                      borderRadius: 10,
                      padding: "10px 12px",
                      marginBottom: 8,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <strong style={{ fontSize: 13, color: T.text }}>
                        {item.question}
                      </strong>
                      <span
                        style={{
                          fontSize: 11,
                          color: T.textDim,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatSavedAt(item.savedAt)}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: T.textDim,
                        lineHeight: 1.5,
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      {item.label}
                      <span style={{ color: T.border }}>•</span>
                      {item.result}
                      <span style={{ color: T.border }}>•</span>
                      {item.shortA} vs {item.shortB}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 14,
            flexWrap: "wrap",
            marginTop: 24,
            fontSize: 12,
          }}
        >
          <a
            href="https://x.com/PromptHound96"
            style={{ color: T.textDim, textDecoration: "none" }}
          >
            X @PromptHound96
          </a>
          <span style={{ color: T.border }}>•</span>
          <a
            href="https://github.com/aaronmarchant96-max"
            style={{ color: T.textDim, textDecoration: "none" }}
          >
            GitHub aaronmarchant96-max
          </a>
        </div>
      </div>
    </div>
  );
}
