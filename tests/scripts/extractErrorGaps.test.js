import {
  buildJson,
  computeSummary,
  evaluateErrorGapState,
  parseCommitLog,
  validateArtifact,
} from "../../scripts/extract-error-gaps.mjs";

const rawLog = [
  "d2cef8f9157c20e252e7cbd746073ecacaa49e62\x002026-08-22\x00fix(gateway) [caught: test]\x00body\x00\x01",
  "ea133b7572861f7ec000f464d40be731051a683b\x002026-08-21\x00ignore invalid [caught: contract-break]\x00body\x00\x01",
  "f617b19a157c20e252e7cbd746073ecacaa49e62\x002026-07-20\x00fix(ui)\x00context [caught: manual]\x00\x01",
].join("");

function artifactFromLog(log = rawLog) {
  const entries = parseCommitLog(log);
  return buildJson(entries, computeSummary(entries), "2026-08-22T00:00:00.000Z");
}

describe("extract-error-gaps history-mode contract", () => {
  it("parses supported tags from subjects and bodies and ignores unknown tags", () => {
    const entries = parseCommitLog(rawLog);

    expect(entries).toHaveLength(2);
    expect(entries.map((entry) => entry.hash)).toEqual(["d2cef8f", "f617b19"]);
    expect(entries.map((entry) => entry.tags)).toEqual([["test"], ["manual"]]);
  });

  it("accepts an internally consistent committed artifact", () => {
    expect(validateArtifact(artifactFromLog())).toEqual({ valid: true, errors: [] });
  });

  it("rejects corrupted artifact summary metadata", () => {
    const artifact = artifactFromLog();
    artifact.summary.totalEntries = 999;

    const result = validateArtifact(artifact);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("summary.totalEntries does not match entries");
  });

  it("passes a valid committed artifact when repository history is shallow", () => {
    const result = evaluateErrorGapState({
      isShallow: true,
      checkOnly: true,
      existing: artifactFromLog(),
      rawGitLog: rawLog.slice(0, rawLog.indexOf("\x01") + 1),
    });

    expect(result).toMatchObject({
      success: true,
      mode: "shallow-artifact-validation",
      skipWrite: false,
    });
  });

  it("fails closed for a corrupted artifact when repository history is shallow", () => {
    const artifact = artifactFromLog();
    artifact.entries[0].tags = ["unsupported"];

    const result = evaluateErrorGapState({
      isShallow: true,
      checkOnly: true,
      existing: artifact,
      rawGitLog: "",
    });

    expect(result.success).toBe(false);
    expect(result.mode).toBe("shallow-artifact-validation");
    expect(result.errors).toContain("entries[0].tags contains an unsupported tag");
  });

  it("refuses to overwrite the ledger from shallow history", () => {
    const result = evaluateErrorGapState({
      isShallow: true,
      checkOnly: false,
      existing: artifactFromLog(),
      rawGitLog: "",
    });

    expect(result).toMatchObject({ success: true, skipWrite: true });
  });

  it("retains strict stale detection when complete history is available", () => {
    const staleArtifact = artifactFromLog(rawLog.slice(0, rawLog.indexOf("\x01") + 1));
    const result = evaluateErrorGapState({
      isShallow: false,
      checkOnly: true,
      existing: staleArtifact,
      rawGitLog: rawLog,
    });

    expect(result).toMatchObject({
      success: false,
      mode: "full-history-comparison",
      staleDetected: true,
    });
  });
});
