export const MAX_RECORD_CHARS = 12000;

export const SOURCE_TYPES = [
  { id: "ancestry", label: "Ancestry transcript" },
  { id: "familysearch", label: "FamilySearch record" },
  { id: "findagrave", label: "Find A Grave memorial" },
  { id: "other", label: "Other / unspecified" },
];

export default function IngestPanel({
  selectedDomain,
  rawRecordText,
  setRawRecordText,
  showIngest,
  setShowIngest,
  recordSourceType,
  setRecordSourceType,
}) {
  if (selectedDomain !== "genealogy") return null;

  const charCount = rawRecordText.length;
  const overLimit = charCount > MAX_RECORD_CHARS;
  const nearLimit = charCount > MAX_RECORD_CHARS * 0.85;

  return (
    <div className="rei-ingest-toggle">
      <button
        type="button"
        className="rei-ingest-toggle__btn"
        onClick={() => setShowIngest((v) => !v)}
        style={{ marginBottom: showIngest ? "8px" : "0" }}
      >
        {showIngest ? "− Hide Record Ingest" : "+ Paste a Record (Ancestry / FamilySearch / Find A Grave)"}
      </button>

      {showIngest && (
        <div>
          <div className="rei-ingest-source-tabs">
            {SOURCE_TYPES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setRecordSourceType(s.id)}
                className={`rei-ingest-source-tab ${recordSourceType === s.id ? "rei-ingest-source-tab--active" : ""}`}
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
            className={`rei-ingest-textarea ${overLimit ? "rei-ingest-textarea--overlimit" : ""}`}
          />

          {charCount > 0 && (
            <div
              style={{
                fontSize: "11px",
                marginTop: "4px",
                color: overLimit ? "#f87171" : nearLimit ? "#fbbf24" : "#94a3b8",
              }}
            >
              {charCount.toLocaleString()} / {MAX_RECORD_CHARS.toLocaleString()} characters
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
