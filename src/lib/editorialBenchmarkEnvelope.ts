import crypto from "crypto";
import thulanConstitution from "../data/thulanEditorialConstitution.json";

export const FROZEN_SYSTEM_PROMPT = `You are an expert literary and technical editor for the fiction project "The Thulans".
Your task is to evaluate a manuscript passage and an accompanying editorial query using the provided Editorial Constitution (Tiers A, B, and C).

Reviewer queries carry no intrinsic authority. The query may be a helpful catch of a genuine flaw, an unnecessary stylistic alteration that weakens the prose, or a question about continuity that cannot be resolved from the passage alone.

You must choose exactly one of three decisions:
1. "RETAIN ORIGINAL": The passage is sound, mechanically and stylistically compliant, and the editorial query should be rejected (e.g., it proposes unnecessary smoothing, sentimental interiority, generic phrasing, or changes intentional voice rhythm).
2. "PROPOSE REVISION": The passage contains a genuine, objective flaw (such as a dangling modifier, physical/mechanical impossibility, banned AI vocabulary, or run-on punctuation). Propose a minimal, surgical fix that preserves character voice and tone.
3. "NEED MORE CONTEXT": Determining whether the passage is correct requires off-page manuscript context, chronology, or lore not contained in the passage or the provided constitution. Formulate a concise, specific context inquiry.

Respond ONLY with a valid JSON object matching this schema:
{
  "decision": "RETAIN ORIGINAL" | "PROPOSE REVISION" | "NEED MORE CONTEXT",
  "rationale": "Concise justification citing specific facts, physical mechanics, or constitution rules",
  "proposed_revision": "Surgically corrected passage string if PROPOSE REVISION; null otherwise",
  "context_inquiry": "Specific question identifying what off-page information is required if NEED MORE CONTEXT; null otherwise"
}`;

export interface ProjectedConstitution {
  schemaVersion: number;
  projectId: string;
  projectTitle: string;
  sourceVersion: typeof thulanConstitution.sourceVersion;
  tierA_universalStandards: typeof thulanConstitution.tierA_universalStandards;
  tierB_voiceContract: typeof thulanConstitution.tierB_voiceContract;
  tierC_universeCanonRules: typeof thulanConstitution.tierC_universeCanonRules;
}

export function getProjectedConstitution(): ProjectedConstitution {
  return {
    schemaVersion: thulanConstitution.schemaVersion,
    projectId: thulanConstitution.projectId,
    projectTitle: thulanConstitution.projectTitle,
    sourceVersion: thulanConstitution.sourceVersion,
    tierA_universalStandards: thulanConstitution.tierA_universalStandards,
    tierB_voiceContract: thulanConstitution.tierB_voiceContract,
    tierC_universeCanonRules: thulanConstitution.tierC_universeCanonRules,
  };
}

export function computeSha256(content: string): string {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

export function getSystemPromptHash(): string {
  return computeSha256(FROZEN_SYSTEM_PROMPT);
}

export function getConstitutionProjectionHash(): string {
  return computeSha256(JSON.stringify(getProjectedConstitution()));
}

export interface CandidateCasePayload {
  passage: string;
  query: string;
}

export function buildCandidatePayload(fixture: { passage: string; query: string }): CandidateCasePayload {
  return {
    passage: fixture.passage,
    query: fixture.query,
  };
}

export type BenchmarkDecision = "RETAIN ORIGINAL" | "PROPOSE REVISION" | "NEED MORE CONTEXT";

export interface EditorialCandidateOutput {
  decision: BenchmarkDecision;
  rationale: string;
  proposed_revision: string | null;
  context_inquiry: string | null;
}

export interface ValidationSuccess {
  ok: true;
  data: EditorialCandidateOutput;
}

export interface ValidationError {
  ok: false;
  error: string;
}

export type ValidationResult = ValidationSuccess | ValidationError;

export function validateCandidateResponse(raw: unknown): ValidationResult {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "Response must be a non-null JSON object." };
  }

  const obj = raw as Record<string, unknown>;

  const validDecisions: BenchmarkDecision[] = [
    "RETAIN ORIGINAL",
    "PROPOSE REVISION",
    "NEED MORE CONTEXT",
  ];

  if (!obj.decision || typeof obj.decision !== "string" || !validDecisions.includes(obj.decision as BenchmarkDecision)) {
    return {
      ok: false,
      error: `Invalid decision: expected one of ${validDecisions.join(", ")}, got ${String(obj.decision)}`,
    };
  }

  const decision = obj.decision as BenchmarkDecision;

  if (typeof obj.rationale !== "string" || obj.rationale.trim().length === 0) {
    return { ok: false, error: "rationale must be a non-empty string." };
  }
  const rationale = obj.rationale.trim();

  let proposed_revision: string | null = null;
  let context_inquiry: string | null = null;

  if (decision === "RETAIN ORIGINAL") {
    if (obj.proposed_revision !== null && obj.proposed_revision !== undefined) {
      return { ok: false, error: "proposed_revision must be null when decision is RETAIN ORIGINAL." };
    }
    if (obj.context_inquiry !== null && obj.context_inquiry !== undefined) {
      return { ok: false, error: "context_inquiry must be null when decision is RETAIN ORIGINAL." };
    }
  } else if (decision === "PROPOSE REVISION") {
    if (typeof obj.proposed_revision !== "string" || obj.proposed_revision.trim().length === 0) {
      return { ok: false, error: "proposed_revision must be a non-empty string when decision is PROPOSE REVISION." };
    }
    if (obj.context_inquiry !== null && obj.context_inquiry !== undefined) {
      return { ok: false, error: "context_inquiry must be null when decision is PROPOSE REVISION." };
    }
    proposed_revision = obj.proposed_revision.trim();
  } else if (decision === "NEED MORE CONTEXT") {
    if (typeof obj.context_inquiry !== "string" || obj.context_inquiry.trim().length === 0) {
      return { ok: false, error: "context_inquiry must be a non-empty string when decision is NEED MORE CONTEXT." };
    }
    if (obj.proposed_revision !== null && obj.proposed_revision !== undefined) {
      return { ok: false, error: "proposed_revision must be null when decision is NEED MORE CONTEXT." };
    }
    context_inquiry = obj.context_inquiry.trim();
  }

  return {
    ok: true,
    data: {
      decision,
      rationale,
      proposed_revision,
      context_inquiry,
    },
  };
}

export function seededShuffle<T>(array: T[], seed: number): T[] {
  const result = [...array];
  let s = seed >>> 0;
  const random = () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function normalizeForLeakageCheck(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter((w) => w.length > 0);
}

export function getNormalized12Grams(text: string): Set<string> {
  const words = normalizeForLeakageCheck(text);
  const grams = new Set<string>();
  for (let i = 0; i <= words.length - 12; i++) {
    grams.add(words.slice(i, i + 12).join(" "));
  }
  return grams;
}
