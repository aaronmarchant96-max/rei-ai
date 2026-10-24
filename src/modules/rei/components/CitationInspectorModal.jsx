import React, { useState } from "react";
import { createRecordRevision, verifyModelClaim } from "../../../lib/archivistEngine";

export default function CitationInspectorModal({
  isOpen,
  onClose,
  record,
  claim,
  claims = [],
  revisions = [],
  onUpdateRecord
}) {
  if (!isOpen || !record) return null;

  const [isEditing, setIsEditing] = useState(false);
  const [editedLine, setEditedLine] = useState(record.locators?.line || "");
  const [editedPage, setEditedPage] = useState(record.locators?.page || "");
  const [imageInspected, setImageInspected] = useState(Boolean(record.capture?.imageInspected));
  const [transcriptionStatus, setTranscriptionStatus] = useState(
    record.capture?.transcriptionStatus || "unverified"
  );
  const [changeNotes, setChangeNotes] = useState("");

  const activeClaim = claim || (claims.length > 0 ? claims[0] : null);
  const validation = activeClaim ? verifyModelClaim(activeClaim, record) : null;

  const handleSaveCorrection = () => {
    if (!onUpdateRecord) return;
    const updates = {
      locators: {
        ...(record.locators || {}),
        line: editedLine.trim() || undefined,
        page: editedPage.trim() || undefined,
      },
      capture: {
        ...(record.capture || {}),
        imageInspected,
        transcriptionStatus,
      }
    };
    const summary = changeNotes.trim() || "Researcher verified locators and image status";
    const { newRecord, revision } = createRecordRevision(
      record,
      updates,
      "researcher",
      summary,
      revisions
    );
    onUpdateRecord(newRecord, revision);
    setIsEditing(false);
  };

  const transcript =
    record.capture?.transcription ||
    record.capture?.rawText ||
    record.transcription ||
    "";

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.82)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#18181b",
          border: "1px solid rgba(240, 201, 101, 0.3)",
          borderRadius: "14px",
          maxWidth: "720px",
          width: "100%",
          padding: "24px",
          boxShadow: "0 25px 50px rgba(0,0,0,0.7)",
          color: "#f4f4f5",
          maxHeight: "92vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "20px" }}>📜</span>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "var(--amber-text, #f0c965)" }}>
                {record.title || "Archival Record Citation"}
              </h2>
            </div>
            <div style={{ fontSize: "11px", color: "#a1a1aa", marginTop: "4px", fontFamily: "monospace" }}>
              Record ID: {record.id} {record.currentRevision ? `(Rev ${record.currentRevision})` : ""}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#a1a1aa",
              fontSize: "22px",
              cursor: "pointer",
              lineHeight: 1,
            }}
            aria-label="Close inspector"
          >
            ✕
          </button>
        </div>

        {/* Validation Status Banner */}
        {validation && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "8px",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: validation.passed
                ? "rgba(34, 197, 94, 0.1)"
                : "rgba(239, 68, 68, 0.12)",
              border: validation.passed
                ? "1px solid rgba(34, 197, 94, 0.3)"
                : "1px solid rgba(239, 68, 68, 0.35)",
            }}
          >
            <span style={{ fontSize: "16px" }}>{validation.passed ? "✓" : "⚠️"}</span>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: validation.passed ? "#4ade80" : "#f87171" }}>
                {validation.passed ? "Reference checks passed" : `Reference check failed: ${validation.reason || "unsupported claim"}`}
              </div>
              <div style={{ fontSize: "11px", color: "#a1a1aa", marginTop: "2px" }}>
                {validation.passed
                  ? "Cited record ID, locators, and verbatim excerpt match the ingested record transcript. (Does not certify historical truth of document)."
                  : "The cited excerpt or locators could not be confirmed against the stored record transcript."}
              </div>
            </div>
          </div>
        )}

        {/* Source Identity Grid */}
        <div style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "12px", textTransform: "uppercase", fontWeight: 700, color: "var(--amber-text, #f0c965)", marginBottom: "6px" }}>
            Source Identity
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", background: "rgba(255,255,255,0.02)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)", fontSize: "12px" }}>
            <div><span style={{ color: "#71717a" }}>Repository:</span> {record.sourceIdentity?.repository || record.repository || "Not supplied"}</div>
            <div><span style={{ color: "#71717a" }}>Collection:</span> {record.sourceIdentity?.collection || "Not supplied"}</div>
            <div><span style={{ color: "#71717a" }}>Jurisdiction:</span> {record.sourceIdentity?.jurisdiction || "Not supplied"}</div>
            <div><span style={{ color: "#71717a" }}>Record Date:</span> {record.sourceIdentity?.recordDate || record.date || "Not supplied"}</div>
          </div>
        </div>

        {/* Exact String Locators */}
        <div style={{ marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <span style={{ fontSize: "12px", textTransform: "uppercase", fontWeight: 700, color: "var(--amber-text, #f0c965)" }}>
              Exact String Locators (No Numeric Coercion)
            </span>
            <button
              onClick={() => setIsEditing(!isEditing)}
              style={{
                background: "transparent",
                border: "1px solid rgba(240, 201, 101, 0.3)",
                color: "var(--amber-text, #f0c965)",
                fontSize: "11px",
                padding: "2px 8px",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              {isEditing ? "Cancel Edit" : "✎ Edit Locators"}
            </button>
          </div>

          {!isEditing ? (
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", background: "rgba(255,255,255,0.02)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)", fontSize: "12px", fontFamily: "monospace" }}>
              {record.locators?.roll && <span style={{ background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: "4px" }}>roll: "{record.locators.roll}"</span>}
              {record.locators?.page && <span style={{ background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: "4px" }}>page: "{record.locators.page}"</span>}
              {record.locators?.line && <span style={{ background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: "4px" }}>line: "{record.locators.line}"</span>}
              {record.locators?.dwellingNumber && <span style={{ background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: "4px" }}>dwelling: "{record.locators.dwellingNumber}"</span>}
              {record.locators?.familyNumber && <span style={{ background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: "4px" }}>family: "{record.locators.familyNumber}"</span>}
              {(!record.locators || Object.keys(record.locators).length === 0) && (
                <span style={{ color: "#71717a", fontFamily: "sans-serif" }}>No locators recorded</span>
              )}
            </div>
          ) : (
            <div style={{ background: "rgba(255,255,255,0.04)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(240, 201, 101, 0.25)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                <div>
                  <label style={{ fontSize: "11px", color: "#a1a1aa", display: "block", marginBottom: "4px" }}>Page (String):</label>
                  <input
                    type="text"
                    value={editedPage}
                    onChange={(e) => setEditedPage(e.target.value)}
                    style={{ width: "100%", background: "#09090b", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "4px", padding: "6px", color: "#fff", fontSize: "12px", fontFamily: "monospace" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "11px", color: "#a1a1aa", display: "block", marginBottom: "4px" }}>Line (String, e.g. "035"):</label>
                  <input
                    type="text"
                    value={editedLine}
                    onChange={(e) => setEditedLine(e.target.value)}
                    style={{ width: "100%", background: "#09090b", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "4px", padding: "6px", color: "#fff", fontSize: "12px", fontFamily: "monospace" }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: "10px" }}>
                <label style={{ fontSize: "11px", color: "#a1a1aa", display: "block", marginBottom: "4px" }}>Revision Notes / Rationale:</label>
                <input
                  type="text"
                  placeholder="e.g. Researcher verified line 35 on high-res NARA microfilm scan"
                  value={changeNotes}
                  onChange={(e) => setChangeNotes(e.target.value)}
                  style={{ width: "100%", background: "#09090b", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "4px", padding: "6px", color: "#fff", fontSize: "12px" }}
                />
              </div>

              <button
                onClick={handleSaveCorrection}
                style={{
                  background: "var(--amber-text, #f0c965)",
                  color: "#09090b",
                  border: "none",
                  borderRadius: "6px",
                  padding: "6px 14px",
                  fontWeight: 600,
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                Save as New Record Revision
              </button>
            </div>
          )}
        </div>

        {/* Scoped Epistemic Confirmations */}
        <div style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "12px", textTransform: "uppercase", fontWeight: 700, color: "var(--amber-text, #f0c965)", marginBottom: "6px" }}>
            Scoped Verification & Epistemic Status
          </div>
          <div style={{ background: "rgba(255,255,255,0.02)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)", fontSize: "12px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", marginBottom: "6px" }}>
              <input
                type="checkbox"
                checked={imageInspected}
                onChange={(e) => setImageInspected(e.target.checked)}
              />
              <span style={{ fontWeight: 600 }}>Image Inspected by Human Researcher</span>
            </label>
            <div style={{ fontSize: "11px", color: "#71717a", marginLeft: "22px", marginBottom: "10px" }}>
              Separates documentary inspection from transcription verification. Checking this affirms that the researcher viewed the original/digital image.
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ color: "#a1a1aa" }}>Transcription Status:</span>
              <select
                value={transcriptionStatus}
                onChange={(e) => setTranscriptionStatus(e.target.value)}
                style={{ background: "#09090b", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "4px", padding: "4px 8px", color: "#fff", fontSize: "11.5px" }}
              >
                <option value="unverified">unverified (default imported)</option>
                <option value="human_verified">human_verified</option>
                <option value="ocr_raw">ocr_raw</option>
              </select>
            </div>
          </div>
        </div>

        {/* Verbatim Supporting Excerpt & Full Transcript */}
        <div style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "12px", textTransform: "uppercase", fontWeight: 700, color: "var(--amber-text, #f0c965)", marginBottom: "6px" }}>
            Stored Transcript & Cited Excerpt
          </div>
          {activeClaim?.sources?.[0]?.supportingExcerpt && (
            <div style={{ background: "rgba(240, 201, 101, 0.08)", border: "1px solid rgba(240, 201, 101, 0.2)", borderRadius: "6px", padding: "8px 10px", marginBottom: "8px", fontSize: "12px" }}>
              <span style={{ color: "var(--amber-text, #f0c965)", fontWeight: 600 }}>Cited Excerpt: </span>
              <span style={{ fontStyle: "italic" }}>"{activeClaim.sources[0].supportingExcerpt}"</span>
            </div>
          )}
          <div
            style={{
              maxHeight: "150px",
              overflowY: "auto",
              background: "#09090b",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "6px",
              padding: "10px",
              fontSize: "12px",
              fontFamily: "monospace",
              whiteSpace: "pre-wrap",
              color: "#e4e4e7",
            }}
          >
            {transcript || "No transcript text recorded."}
          </div>
        </div>

        {/* Revision Audit History */}
        {revisions.length > 0 && (
          <div>
            <div style={{ fontSize: "12px", textTransform: "uppercase", fontWeight: 700, color: "var(--amber-text, #f0c965)", marginBottom: "6px" }}>
              Revision History & Audit Trail
            </div>
            <div style={{ fontSize: "11px", color: "#a1a1aa", background: "rgba(255,255,255,0.02)", padding: "8px 10px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.06)" }}>
              {revisions.map((rev) => (
                <div key={rev.revisionId} style={{ marginBottom: "4px" }}>
                  <span style={{ fontWeight: 600, color: "var(--amber-text, #f0c965)" }}>Rev {rev.revisionNumber} ({rev.author})</span>: {rev.changeSummary} • <span style={{ color: "#71717a" }}>{new Date(rev.createdAt).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
