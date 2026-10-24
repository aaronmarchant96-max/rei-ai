import React, { useState, useEffect } from "react";
import {
  evaluatePassageEditorial,
  getEditorialDecisionHistory,
  saveEditorialDecisionRecord,
  clearEditorialDecisionHistory,
} from "../../../lib/editorialEngine";

const BENCHMARK_EXEMPLARS = [
  {
    label: "EVAL-001: Funeral Bell Rule",
    chapter: 1,
    passage:
      "His brother’s chit should have gone back to the Council when he died, to close his tool-account. Keeping it after the funeral bell meant four pints taken from the household’s water ration. It didn’t matter whether it had been stolen or found.",
    critique:
      "Review the suggestion to change 'after the funeral bell' to 'before the funeral bell'. Is it a faithful clarification? Do not change the rule.",
  },
  {
    label: "EVAL-002: Nut vs. Washer Check",
    chapter: 1,
    passage:
      "The smith had set his chisel against a rusted nut on the bar joining two lengths of track. His cheek was almost against the rail as he watched the cut deepen. A stub of tallow candle hung between his front teeth, dripping wax onto his jacket.\n“If that nut drops in the ditch, you’re diving for it before shift bell,” he muttered around the candle. “I’m not shorting the tally for your blue fingers.”",
    critique:
      "A review says this passage inconsistently switches from a nut to a washer. Check the quotation before proposing any repair.",
  },
  {
    label: "EVAL-003: Opening Joint Purpose",
    chapter: 1,
    passage:
      "Bram had wrapped tarred hemp around his right thumb to keep the cracks in his skin from bleeding into the grease tub.\nHe knelt beneath the haulage rails, holding the wooden tub under the joint Kaelen was breaking loose. Washing lye had stripped his knuckles gray; cold had swollen them red. Each hammer blow shivered through the timber under his knee and sent rings across the oil on the ditch water. He had watched this joint all morning. It was the one Wulfila had named.",
    critique:
      "A reviewer says the opening gives no reason for Bram's attention to this joint until after the bolt drops. Assess that criticism against this current excerpt.",
  },
  {
    label: "EVAL-004: Reconcile Bram's Age",
    chapter: 1,
    passage:
      "“He said his spare boots were here,” Bram whispered. “Only one season on the heels. When I turn fourteen on the thirtieth, I could put sacking in the toes and wear them.”\nTwo days later, Tap Twelve ran clear. On the fourth day the roof over their bunkhouse collapsed and buried it. On the sixth, Odo drafted thirteen-year-old Bram onto the salvage crew to pay what remained of Wulfila’s funeral charge.\n“Wulfila lowered a line there,” Bram said. “He told me it came up wet. He jumped on the twelfth—forty days ago. The Sub-Deacon had already read out that the North Cistern was dry to the mud.”\nConflicting older summary: Bram (14).",
    critique:
      "The accepted manuscript governs conflicting old lore. A stale character summary labels Bram fourteen. Determine what should be reconciled, using the supplied story evidence.",
  },
  {
    label: "EVAL-005: Preserve Specific Grief",
    chapter: 1,
    passage:
      "Haila had brought the scarf Wulfila had left with her. She spread it across her knees, with one finger through a burn hole.\n“I told him not to dry it on the stove.”\n“He said a coal spat,” Bram said.\n“There was always a coal.”\nBram laughed before he could stop himself. He looked at Sanna, but she was watching Haila.\nWhen Marta came to take the bowls, he lifted his brother’s slate himself.",
    critique:
      "Review this grief passage for a concrete clarity or continuity defect. Retaining it is allowed. Do not remove the laugh merely because the scene concerns a death.",
  },
  {
    label: "EVAL-006: Witnessed Gantry Ledger",
    chapter: 1,
    passage:
      "“But the Gantry is witnessed. When the clerk takes my remaining years, he has to write eight pints into the book for our hearth. Not a promise from Odo. A mark in their own ledger.”",
    critique:
      "Would replacing this reasoning with 'Odo cannot lie on the Gantry in front of the crowd' preserve Wulfila's belief? Explain briefly without rewriting the chapter.",
  },
  {
    label: "SFT-001: Odo's Taped Fingers",
    chapter: 2,
    passage: "Odo stepped into the doorway, its fingers wrapped in paper tape against the biting lime.",
    critique: "Correct the pronoun so the fingers clearly belong to Odo.",
  },
];

export default function StoryEditorialPanel({ selectedDomain }) {
  if (selectedDomain !== "story") return null;

  const [isOpen, setIsOpen] = useState(false);
  const [passageText, setPassageText] = useState("");
  const [critiquePrompt, setCritiquePrompt] = useState("");
  const [chapter, setChapter] = useState(1);
  const [sourceVersion, setSourceVersion] = useState("Reading Draft (d4b2dc1)");
  const [reviewResult, setReviewResult] = useState(null);
  const [decisionHistory, setDecisionHistory] = useState([]);
  const [actionNotice, setActionNotice] = useState("");

  useEffect(() => {
    setDecisionHistory(getEditorialDecisionHistory());
  }, []);

  const handleLoadExemplar = (ex) => {
    setPassageText(ex.passage);
    setCritiquePrompt(ex.critique);
    setChapter(ex.chapter);
    setReviewResult(null);
    setActionNotice("");
  };

  const handleRunReview = () => {
    if (!passageText.trim()) return;
    const result = evaluatePassageEditorial({
      passage: passageText,
      critiquePrompt,
      chapter,
      sourceVersion,
    });
    setReviewResult(result);
    setActionNotice("");
  };

  const handleAuthorAction = (action) => {
    if (!reviewResult) return;

    const record = {
      id: `dec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      passageAnchor: `Chapter ${chapter}: "${passageText.slice(0, 40).trim()}..."`,
      chapter,
      decision: reviewResult.decision,
      status: action === "APPROVE" ? "AUTHOR_APPROVED" : "REJECTED",
      originalPassage: reviewResult.originalPassage,
      proposedRevision: reviewResult.proposedRevision,
      rationale: reviewResult.rationale,
      sourceVersion,
      projectId: "the-thulans",
    };

    saveEditorialDecisionRecord(record);
    setDecisionHistory(getEditorialDecisionHistory());

    if (action === "APPROVE") {
      setActionNotice("✓ Approved into session draft. Live manuscript files remain protected.");
      if (reviewResult.proposedRevision) {
        setPassageText(reviewResult.proposedRevision);
      }
    } else {
      setActionNotice("✓ Kept original text. Review decision logged in audit history.");
    }
  };

  const handleCopy = (text) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setActionNotice("✓ Copied clean passage to clipboard.");
      setTimeout(() => setActionNotice(""), 3000);
    }
  };

  return (
    <div style={{ width: "100%", marginBottom: "12px" }}>
      <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: isOpen ? "8px" : "0" }}>
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          style={{
            background: "rgba(240, 201, 101, 0.08)",
            border: "1px solid rgba(240, 201, 101, 0.25)",
            color: "var(--amber-text, #f0c965)",
            borderRadius: "6px",
            padding: "5px 12px",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span>📖 Editorial Review v0.1 (Single-Passage Benchmark)</span>
          <span style={{ opacity: 0.7 }}>{isOpen ? "▲" : "▼"}</span>
        </button>
        <span style={{ fontSize: "11px", color: "var(--text-muted, #71717a)" }}>
          The Thulans • Source: {sourceVersion} • Non-destructive draft
        </span>
      </div>

      {isOpen && (
        <div
          style={{
            background: "rgba(20, 20, 24, 0.95)",
            border: "1px solid rgba(240, 201, 101, 0.18)",
            borderRadius: "8px",
            padding: "14px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          {/* Preset Benchmark Quick-Loader */}
          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--amber-text, #f0c965)", marginBottom: "6px" }}>
              Load Benchmark Case (Preserved Evidence):
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {BENCHMARK_EXEMPLARS.map((ex, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleLoadExemplar(ex)}
                  style={{
                    fontSize: "11px",
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "var(--text-secondary, #d4d4d8)",
                    padding: "3px 8px",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>

          {/* Passage Input Area */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "11px", color: "var(--text-secondary, #a1a1aa)" }}>
              <span>Target Manuscript Passage (Single Excerpt):</span>
              <span>{passageText.length} characters • {passageText.trim().split(/\s+/).filter(Boolean).length} words</span>
            </div>
            <textarea
              value={passageText}
              onChange={(e) => setPassageText(e.target.value)}
              placeholder="Paste a Thulan passage to review..."
              rows={5}
              style={{
                width: "100%",
                background: "#09090b",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "6px",
                color: "#f4f4f5",
                fontSize: "13px",
                padding: "8px",
                fontFamily: "monospace",
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Optional Reviewer Critique Input */}
          <div>
            <div style={{ fontSize: "11px", color: "var(--text-secondary, #a1a1aa)", marginBottom: "4px" }}>
              Reviewer Critique / Proposed Change (Optional — tests resistance to rule inversion or false reviewer claims):
            </div>
            <input
              type="text"
              value={critiquePrompt}
              onChange={(e) => setCritiquePrompt(e.target.value)}
              placeholder="e.g. Review suggestion to change 'after the funeral bell' to 'before the funeral bell'..."
              style={{
                width: "100%",
                background: "#09090b",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "6px",
                color: "#f4f4f5",
                fontSize: "12px",
                padding: "6px 8px",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Execution Controls */}
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              type="button"
              onClick={handleRunReview}
              disabled={!passageText.trim()}
              style={{
                background: passageText.trim() ? "var(--amber-text, #f0c965)" : "#3f3f46",
                color: passageText.trim() ? "#000" : "#a1a1aa",
                fontWeight: 700,
                fontSize: "12px",
                padding: "6px 14px",
                borderRadius: "6px",
                border: "none",
                cursor: passageText.trim() ? "pointer" : "not-allowed",
              }}
            >
              Run Forensic Editorial Review
            </button>
            <span style={{ fontSize: "11px", color: "#a1a1aa" }}>
              Enforces Universal Standards, Project Voice Contract, and Canon Invariants.
            </span>
          </div>

          {/* Review Results */}
          {reviewResult && (
            <div
              style={{
                marginTop: "6px",
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "6px",
                padding: "12px",
              }}
            >
              {/* Decision Badge */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    padding: "3px 10px",
                    borderRadius: "14px",
                    background:
                      reviewResult.decision === "RETAIN_ORIGINAL"
                        ? "rgba(34, 197, 94, 0.14)"
                        : reviewResult.decision === "PROPOSE_REVISION"
                        ? "rgba(234, 179, 8, 0.14)"
                        : "rgba(59, 130, 246, 0.14)",
                    color:
                      reviewResult.decision === "RETAIN_ORIGINAL"
                        ? "#4ade80"
                        : reviewResult.decision === "PROPOSE_REVISION"
                        ? "#facc15"
                        : "#60a5fa",
                    border:
                      reviewResult.decision === "RETAIN_ORIGINAL"
                        ? "1px solid rgba(34, 197, 94, 0.35)"
                        : reviewResult.decision === "PROPOSE_REVISION"
                        ? "1px solid rgba(234, 179, 8, 0.35)"
                        : "1px solid rgba(59, 130, 246, 0.35)",
                  }}
                >
                  {reviewResult.decision === "RETAIN_ORIGINAL" && "✓ RETAIN ORIGINAL"}
                  {reviewResult.decision === "PROPOSE_REVISION" && "✎ PROPOSE REVISION"}
                  {reviewResult.decision === "NEED_MORE_CONTEXT" && "❓ NEED MORE CONTEXT"}
                </span>

                {reviewResult.staleCriticismDetected && (
                  <span
                    style={{
                      fontSize: "11px",
                      background: "rgba(239, 68, 68, 0.12)",
                      color: "#f87171",
                      border: "1px solid rgba(239, 68, 68, 0.3)",
                      padding: "2px 8px",
                      borderRadius: "10px",
                      fontWeight: 600,
                    }}
                  >
                    Stale Review Detected
                  </span>
                )}
              </div>

              {/* Rationale */}
              <div style={{ fontSize: "12px", lineHeight: "1.5", color: "#e4e4e7", marginBottom: "10px" }}>
                <strong>Editorial Rationale:</strong> {reviewResult.rationale}
              </div>

              {/* Side-by-Side Comparison if Proposing Revision */}
              {reviewResult.decision === "PROPOSE_REVISION" && reviewResult.proposedRevision && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                  <div style={{ background: "#09090b", padding: "8px", borderRadius: "4px", border: "1px solid rgba(239,68,68,0.2)" }}>
                    <div style={{ fontSize: "10px", textTransform: "uppercase", fontWeight: 700, color: "#f87171", marginBottom: "4px" }}>
                      Current Baseline:
                    </div>
                    <div style={{ fontSize: "12px", color: "#d4d4d8", fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
                      {reviewResult.originalPassage}
                    </div>
                  </div>
                  <div style={{ background: "#09090b", padding: "8px", borderRadius: "4px", border: "1px solid rgba(34,197,94,0.2)" }}>
                    <div style={{ fontSize: "10px", textTransform: "uppercase", fontWeight: 700, color: "#4ade80", marginBottom: "4px" }}>
                      Proposed Revision:
                    </div>
                    <div style={{ fontSize: "12px", color: "#d4d4d8", fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
                      {reviewResult.proposedRevision}
                    </div>
                  </div>
                </div>
              )}

              {/* Three-Tier Evidence Basis */}
              <div style={{ fontSize: "11px", color: "#a1a1aa", background: "rgba(0,0,0,0.3)", padding: "8px", borderRadius: "4px", marginBottom: "10px" }}>
                <div style={{ fontWeight: 700, color: "var(--amber-text, #f0c965)", marginBottom: "3px" }}>
                  Evidence Basis (Three-Tier Architecture):
                </div>
                {reviewResult.evidenceBasis.tierC_canonInvariants.length > 0 && (
                  <div>
                    <strong style={{ color: "#d4d4d8" }}>Tier C Canon Invariants:</strong>{" "}
                    {reviewResult.evidenceBasis.tierC_canonInvariants.join("; ")}
                  </div>
                )}
                {reviewResult.evidenceBasis.tierB_voiceContractRules.length > 0 && (
                  <div>
                    <strong style={{ color: "#d4d4d8" }}>Tier B Voice Contract:</strong>{" "}
                    {reviewResult.evidenceBasis.tierB_voiceContractRules.join("; ")}
                  </div>
                )}
                {reviewResult.evidenceBasis.documentedFacts.length > 0 && (
                  <div>
                    <strong style={{ color: "#d4d4d8" }}>Documented Facts:</strong>{" "}
                    {reviewResult.evidenceBasis.documentedFacts.join("; ")}
                  </div>
                )}
                {reviewResult.evidenceBasis.assumptionsExcluded.length > 0 && (
                  <div>
                    <strong style={{ color: "#f87171" }}>Assumptions Excluded:</strong>{" "}
                    {reviewResult.evidenceBasis.assumptionsExcluded.join("; ")}
                  </div>
                )}
              </div>

              {/* Author Actions */}
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                {reviewResult.decision === "PROPOSE_REVISION" ? (
                  <button
                    type="button"
                    onClick={() => handleAuthorAction("APPROVE")}
                    style={{
                      background: "rgba(34, 197, 94, 0.2)",
                      border: "1px solid rgba(34, 197, 94, 0.4)",
                      color: "#4ade80",
                      borderRadius: "4px",
                      padding: "4px 10px",
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Approve Revision into Draft
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => handleAuthorAction("REJECT")}
                  style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#e4e4e7",
                    borderRadius: "4px",
                    padding: "4px 10px",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {reviewResult.decision === "RETAIN_ORIGINAL" ? "Confirm Retain Original" : "Reject Revision"}
                </button>

                <button
                  type="button"
                  onClick={() => handleCopy(reviewResult.proposedRevision || reviewResult.originalPassage)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--amber-text, #f0c965)",
                    textDecoration: "underline",
                    fontSize: "11px",
                    cursor: "pointer",
                    padding: "4px 6px",
                  }}
                >
                  Copy Clean Text
                </button>
              </div>

              {actionNotice && (
                <div style={{ marginTop: "6px", fontSize: "11px", color: "#4ade80", fontWeight: 600 }}>
                  {actionNotice}
                </div>
              )}
            </div>
          )}

          {/* Session Audit History */}
          {decisionHistory.length > 0 && (
            <div style={{ marginTop: "4px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--amber-text, #f0c965)", textTransform: "uppercase" }}>
                  Session Editorial Decisions ({decisionHistory.length})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    clearEditorialDecisionHistory();
                    setDecisionHistory([]);
                  }}
                  style={{ background: "none", border: "none", color: "#71717a", fontSize: "10px", cursor: "pointer" }}
                >
                  Clear History
                </button>
              </div>
              <div style={{ maxHeight: "120px", overflowY: "auto", fontSize: "11px", color: "#a1a1aa", background: "#09090b", padding: "6px 8px", borderRadius: "4px", border: "1px solid rgba(255,255,255,0.06)" }}>
                {decisionHistory.map((rec) => (
                  <div key={rec.id} style={{ marginBottom: "4px", display: "flex", justifyContent: "space-between" }}>
                    <span>
                      <strong style={{ color: rec.status === "AUTHOR_APPROVED" ? "#4ade80" : "#facc15" }}>[{rec.status}]</strong> {rec.passageAnchor} — {rec.decision}
                    </span>
                    <span style={{ color: "#71717a", fontSize: "10px" }}>{new Date(rec.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
