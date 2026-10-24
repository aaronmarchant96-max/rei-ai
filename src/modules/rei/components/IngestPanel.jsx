import { useMemo } from "react";
import { validateArchiveRecordSchema } from "../../../lib/archivistEngine";

const CENSUS_1850_EXEMPLAR = JSON.stringify({
  id: "rec-census-1850",
  title: "1850 U.S. Federal Census",
  sourceType: "census",
  sourceIdentity: {
    recordId: "rec-census-1850",
    title: "1850 U.S. Federal Census",
    repository: "NARA",
    collection: "Seventh Census of the United States, 1850",
    jurisdiction: "Columbiana County, Ohio",
    recordDate: "1850-08-12",
    recordType: "census"
  },
  locators: {
    roll: "007",
    page: "142",
    line: "035",
    dwellingNumber: "0102",
    familyNumber: "0105"
  },
  access: {
    sourceUrl: "https://example.org/census-1850",
    urlStatus: "verified_working"
  },
  capture: {
    imageInspected: false,
    transcriptionStatus: "unverified",
    transcription: "Dwelling 102, Family 105: John Marchant, age 32, blacksmith, born Pennsylvania."
  },
  provenance: {
    standard: {
      line: { value: "035", suppliedBy: "imported", verificationStatus: "unverified" },
      page: { value: "142", suppliedBy: "imported", verificationStatus: "unverified" }
    }
  }
}, null, 2);

export default function IngestPanel({ selectedDomain, rawRecordText, setRawRecordText, showIngest, setShowIngest, recordSourceType, setRecordSourceType, maxRecordChars, sourceTypes }) {
  if (selectedDomain !== "genealogy") return null;

  const charCount = rawRecordText.length;
  const overLimit = charCount > maxRecordChars;
  const nearLimit = charCount > maxRecordChars * 0.85;

  const jsonValidation = useMemo(() => {
    const trimmed = (rawRecordText || "").trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed);
        return validateArchiveRecordSchema(parsed);
      } catch (e) {
        return { valid: false, errors: ["Invalid JSON syntax"] };
      }
    }
    return null;
  }, [rawRecordText]);

  return (
    <div style={{ width: "100%", marginBottom: "10px" }}>
      <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: showIngest ? "8px" : "0" }}>
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
          }}
        >
          {showIngest ? "− Hide Record Ingest" : "+ Attach an Archival Record"}
        </button>

        {showIngest && (
          <button
            type="button"
            onClick={() => {
              setRawRecordText(CENSUS_1850_EXEMPLAR);
              setRecordSourceType("census");
            }}
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "var(--text-muted)",
              borderRadius: "8px",
              padding: "7px 11px",
              fontSize: "11.5px",
              cursor: "pointer",
            }}
            title="Load structured 1850 Census exemplar with exact locators and unverified capture"
          >
            📋 Load 1850 Census Exemplar
          </button>
        )}
      </div>

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
            placeholder="Paste raw transcript OR structured ArchiveRecord JSON with exact string locators (e.g. line: '035'). REI will preserve evidence and validate claims against the transcript."
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
