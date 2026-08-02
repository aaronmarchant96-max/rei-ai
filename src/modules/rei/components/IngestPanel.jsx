export default function IngestPanel({ selectedDomain, rawRecordText, setRawRecordText, showIngest, setShowIngest, recordSourceType, setRecordSourceType, maxRecordChars, sourceTypes }) {
  if (selectedDomain !== "genealogy") return null;

  const charCount = rawRecordText.length;
  const overLimit = charCount > maxRecordChars;
  const nearLimit = charCount > maxRecordChars * 0.85;

  return (
    <div style={{ width: "100%", marginBottom: "10px" }}>
      <button
        type="button"
        onClick={() => setShowIngest((v) => !v)}
        style={{
          background: "rgba(240, 201, 101, 0.08)",
          border: "1px solid rgba(240, 201, 101, 0.25)",
          color: "var(--amber-text)",
          borderRadius: "8px",
          padding: "8px 12px",
          fontSize: "12.5px",
          fontWeight: 600,
          cursor: "pointer",
          marginBottom: showIngest ? "8px" : "0",
        }}
      >
        {showIngest ? "− Hide Record Ingest" : "+ Paste a Record (Ancestry / FamilySearch / Find A Grave)"}
      </button>

      {showIngest && (
        <div>
          <div style={{ display: "flex", gap: "6px", marginBottom: "8px", flexWrap: "wrap" }}>
            {sourceTypes.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setRecordSourceType(s.id)}
                style={{
                  fontSize: "11px",
                  padding: "5px 10px",
                  borderRadius: "6px",
                  border: recordSourceType === s.id
                    ? "1px solid var(--amber-border)"
                    : "1px solid rgba(255,255,255,0.1)",
                  background: recordSourceType === s.id
                    ? "rgba(240, 201, 101, 0.18)"
                    : "rgba(255,255,255,0.02)",
                  color: recordSourceType === s.id ? "var(--amber-text)" : "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                {s.label}
              </button>
            ))}
          </div>

          <textarea
            value={rawRecordText}
            onChange={(e) => setRawRecordText(e.target.value)}
            placeholder="Paste raw record text here — Ancestry transcript, FamilySearch page text, Find A Grave memorial details, census entry, etc. REI will evaluate and tier it as evidence alongside your question."
            rows={6}
            style={{
              width: "100%",
              background: "rgba(0,0,0,0.25)",
              border: overLimit
                ? "1px solid #ef4444"
                : "1px solid rgba(240, 201, 101, 0.2)",
              borderRadius: "8px",
              color: "var(--text)",
              fontSize: "12.5px",
              padding: "10px 12px",
              fontFamily: "monospace",
              resize: "vertical",
            }}
          />

          {charCount > 0 && (
            <div
              style={{
                fontSize: "11px",
                marginTop: "4px",
                color: overLimit ? "#f87171" : nearLimit ? "var(--amber-text)" : "var(--text-muted)",
              }}
            >
              {charCount.toLocaleString()} / {maxRecordChars.toLocaleString()} characters
              {overLimit && " — too long, trim before sending"}
              {!overLimit && nearLimit && " — approaching limit"}
              {!overLimit && !nearLimit && " — will attach to your next message, then clear"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
