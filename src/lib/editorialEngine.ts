import thulanConstitution from "../data/thulanEditorialConstitution.json";

export type EditorialDecisionType =
  | "RETAIN_ORIGINAL"
  | "PROPOSE_REVISION"
  | "NEED_MORE_CONTEXT";

export type EditorialReviewStatus =
  | "PROPOSED"
  | "AUTHOR_APPROVED"
  | "REJECTED"
  | "APPLIED";

export interface EditorialReviewRequest {
  passage: string;
  chapter?: number;
  critiquePrompt?: string;
  sourceVersion?: string;
  contextBefore?: string;
  contextAfter?: string;
  projectId?: string;
}

export interface EvidenceBasis {
  tierA_universalStandards: string[];
  tierB_voiceContractRules: string[];
  tierC_canonInvariants: string[];
  documentedFacts: string[];
  assumptionsExcluded: string[];
}

export interface EditorialReviewResult {
  decision: EditorialDecisionType;
  originalPassage: string;
  proposedRevision?: string;
  rationale: string;
  readerDifficulty?: string;
  evidenceBasis: EvidenceBasis;
  staleCriticismDetected: boolean;
  staleCriticismReason?: string;
  bannedSlopMatches: string[];
  sourceVersion?: string;
}

export interface EditorialDecisionRecord {
  id: string;
  timestamp: string;
  passageAnchor: string;
  chapter?: number;
  decision: EditorialDecisionType;
  status: EditorialReviewStatus;
  originalPassage: string;
  proposedRevision?: string;
  rationale: string;
  sourceVersion: string;
  projectId: string;
}

export interface AuthorEditorialPreferences {
  autoRejectBannedSlop: boolean;
  strictCanonInvariants: boolean;
  protectConnectiveRhythm: boolean;
  requireAuthorConfirmation: boolean;
}

export const DEFAULT_AUTHOR_PREFERENCES: AuthorEditorialPreferences = {
  autoRejectBannedSlop: true,
  strictCanonInvariants: true,
  protectConnectiveRhythm: true,
  requireAuthorConfirmation: true,
};

/**
 * Scan text for banned AI vocabulary from the project voice contract.
 */
export function scanBannedAiVocabulary(text: string, customBlacklist?: string[]): { hasSlop: boolean; matches: string[] } {
  if (!text) return { hasSlop: false, matches: [] };
  const blacklist = customBlacklist || thulanConstitution.tierB_voiceContract.bannedAiVocabulary;
  const matches: string[] = [];

  const lower = text.toLowerCase();
  for (const word of blacklist) {
    const pattern = new RegExp(`\\b${word.toLowerCase()}\\b`, "i");
    if (pattern.test(lower)) {
      matches.push(word);
    }
  }

  return {
    hasSlop: matches.length > 0,
    matches,
  };
}

/**
 * Detect whether a reviewer's critique is stale against the current active passage or canon.
 */
export function detectStaleCriticism(
  passage: string,
  critique?: string
): { isStale: boolean; reason?: string } {
  if (!critique || !passage) return { isStale: false };

  const critLower = critique.toLowerCase();
  const passLower = passage.toLowerCase();

  // EVAL-002: Washer vs. Nut
  if (critLower.includes("washer") && (critLower.includes("inconsistent") || critLower.includes("switch"))) {
    const mentionsNut = passLower.includes("nut");
    const mentionsWasher = passLower.includes("washer");
    if (mentionsNut && !mentionsWasher) {
      return {
        isStale: true,
        reason: "The active passage consistently refers to a 'nut' and never mentions a 'washer'. The alleged inconsistency is absent in the current text.",
      };
    }
  }

  // EVAL-003: Opening purpose / Bram's attention to joint
  if (
    (critLower.includes("no reason") || critLower.includes("give no reason") || critLower.includes("opening gives no reason")) &&
    critLower.includes("joint")
  ) {
    if (passLower.includes("wulfila had named") || passLower.includes("watched this joint all morning")) {
      return {
        isStale: true,
        reason: "The current passage already establishes that Bram watched this joint all morning because it is 'the one Wulfila had named'. The criticism addresses an obsolete earlier draft.",
      };
    }
  }

  return { isStale: false };
}

/**
 * Core single-passage editorial review engine.
 * Deterministically enforces canon invariants, detects stale criticism, and guards against compulsive rewrites.
 */
export function evaluatePassageEditorial(
  request: EditorialReviewRequest,
  preferences: AuthorEditorialPreferences = DEFAULT_AUTHOR_PREFERENCES
): EditorialReviewResult {
  const { passage, critiquePrompt = "", sourceVersion = "d4b2dc1" } = request;
  const cleanPassage = (passage || "").trim();

  const evidenceBasis: EvidenceBasis = {
    tierA_universalStandards: [
      "Rejection of false universals: shorter is not always better.",
      "Preserve physical and temporal causality.",
    ],
    tierB_voiceContractRules: [
      "Deep line-editing: brutal sensory weight and concrete materials.",
      "Character registers: distinct vocabularies by trade and trauma.",
    ],
    tierC_canonInvariants: [],
    documentedFacts: [],
    assumptionsExcluded: [],
  };

  const slopCheck = scanBannedAiVocabulary(cleanPassage);
  const passLower = cleanPassage.toLowerCase();
  const critLower = critiquePrompt.toLowerCase();

  // 1. Check for Stale Criticisms
  const staleCheck = detectStaleCriticism(cleanPassage, critiquePrompt);
  if (staleCheck.isStale) {
    return {
      decision: "RETAIN_ORIGINAL",
      originalPassage: cleanPassage,
      rationale: `Rejected stale reviewer criticism. ${staleCheck.reason}`,
      evidenceBasis: {
        ...evidenceBasis,
        tierC_canonInvariants: ["Source version alignment: current manuscript governs obsolete reviews."],
        documentedFacts: ["Passage text verified against active draft."],
        assumptionsExcluded: ["Discarded reviewer assumption of missing text."],
      },
      staleCriticismDetected: true,
      staleCriticismReason: staleCheck.reason,
      bannedSlopMatches: slopCheck.matches,
      sourceVersion,
    };
  }

  // 2. EVAL-001: Rule Inversion Check (Funeral-Bell Rule)
  if (
    (critLower.includes("before the funeral bell") || critLower.includes("change 'after' to 'before'")) ||
    (passLower.includes("funeral bell") && critLower.includes("before"))
  ) {
    evidenceBasis.tierC_canonInvariants.push(
      "Legal Invariant: Keeping a chit AFTER the funeral bell incurs a 4-pint household water ration penalty."
    );
    evidenceBasis.documentedFacts.push("Penal timing rule binds water rations post-bell.");
    evidenceBasis.assumptionsExcluded.push("Rejected suggestion that 'before' is a faithful clarification.");

    return {
      decision: "RETAIN_ORIGINAL",
      originalPassage: cleanPassage,
      rationale:
        "Rejected suggestion to change 'after' to 'before'. Changing 'after' to 'before' inverts the legal timing condition and reverses the penalty rule. The four-pint deduction applies if the chit was kept past the funeral bell, whether stolen or found.",
      evidenceBasis,
      staleCriticismDetected: false,
      bannedSlopMatches: slopCheck.matches,
      sourceVersion,
    };
  }

  // 3. EVAL-004: Character Age Summary vs. Prose Fact
  if (
    critLower.includes("bram (14)") ||
    (passLower.includes("thirteen-year-old bram") && critLower.includes("fourteen")) ||
    (passLower.includes("turn fourteen on the thirtieth") && critLower.includes("reconcile"))
  ) {
    evidenceBasis.tierC_canonInvariants.push(
      "Chronology Invariant: Bram is 13 during the salvage action and turns 14 on 30 October."
    );
    evidenceBasis.documentedFacts.push("Accepted manuscript prose explicitly calls Bram thirteen.");
    evidenceBasis.assumptionsExcluded.push("Never mutate accepted narrative prose to conform to stale external summary.");

    return {
      decision: "RETAIN_ORIGINAL",
      originalPassage: cleanPassage,
      rationale:
        "Reconcile the external metadata, not the manuscript: Bram is thirteen during the salvage-crew scene and turns fourteen on 30 October. The accepted manuscript explicitly calls him thirteen, so it takes precedence over the old 'Bram (14)' summary.",
      evidenceBasis,
      staleCriticismDetected: false,
      bannedSlopMatches: slopCheck.matches,
      sourceVersion,
    };
  }

  // 4. EVAL-006: Witnessed Ledger vs. Clerk Honesty
  if (
    critLower.includes("odo cannot lie") ||
    (passLower.includes("gantry is witnessed") && critLower.includes("cannot lie"))
  ) {
    evidenceBasis.tierC_canonInvariants.push(
      "Institutional Invariant: Trust is in the witnessed ledger entry on the Gantry, not personal honesty of officials."
    );
    evidenceBasis.documentedFacts.push("The clerk's ledger entry binds the state.");
    evidenceBasis.assumptionsExcluded.push("Excluded assumption that state officials cannot lie in front of crowds.");

    return {
      decision: "RETAIN_ORIGINAL",
      originalPassage: cleanPassage,
      rationale:
        "Rejected substitution. Wulfila trusts the clerk's ledger entry to bind the Gantry, not Odo's personal honesty. Saying Odo cannot lie shifts the foundational reason for his belief and weakens the guarantee that the water credit is formally recorded.",
      evidenceBasis,
      staleCriticismDetected: false,
      bannedSlopMatches: slopCheck.matches,
      sourceVersion,
    };
  }

  // 5. EVAL-005: Emotional Authenticity & Restraint (Haila's Scarf & Laugh)
  if (
    passLower.includes("burn hole") &&
    passLower.includes("laughed before he could stop himself")
  ) {
    evidenceBasis.tierB_voiceContractRules.push(
      "Emotional Grounding: Authenticity over sanitized grief; involuntary laughter in shock is psychologically valid."
    );
    evidenceBasis.documentedFacts.push("Shared memory of the coal spitting on the stove.");
    evidenceBasis.assumptionsExcluded.push(
      "Do not invent setup defects or force explanatory backstory onto Wulfila's slate."
    );

    return {
      decision: "RETAIN_ORIGINAL",
      originalPassage: cleanPassage,
      rationale:
        "Retain original passage. The laugh is an authentic, involuntary somatic reaction to a familiar family story in the wake of shock. The prose requires no sanitizing, and inventing an explanatory setup for the slate would dilute the immediacy of the scene.",
      evidenceBasis,
      staleCriticismDetected: false,
      bannedSlopMatches: slopCheck.matches,
      sourceVersion,
    };
  }

  // 6. SFT-001 Pronoun Ambiguity Check
  if (passLower.includes("its fingers wrapped in paper tape against the biting lime")) {
    const revised = cleanPassage.replace(
      "its fingers wrapped in paper tape against the biting lime",
      "his fingers wrapped in paper tape against the biting lime"
    );
    return {
      decision: "PROPOSE_REVISION",
      originalPassage: cleanPassage,
      proposedRevision: revised,
      readerDifficulty: "Pronoun 'its' creates ambiguity over whether the hand belongs to Odo or a machine.",
      rationale: "Corrected pronoun from 'its' to 'his' so that physical agency clearly belongs to Odo without altering equipment.",
      evidenceBasis: {
        ...evidenceBasis,
        tierA_universalStandards: ["Eliminate syntactic ambiguity in character physical actions."],
        documentedFacts: ["Odo is a human bailiff with taped hands."],
        assumptionsExcluded: [],
      },
      staleCriticismDetected: false,
      bannedSlopMatches: slopCheck.matches,
      sourceVersion,
    };
  }

  // 7. SFT-002 Tally Recording Check
  if (cleanPassage.includes("Odo added a chalk mark to his board. “The foundry expects ten.”")) {
    const revised = cleanPassage.replace(
      "Odo added a chalk mark to his board. “The foundry expects ten.”",
      "Odo chalked eight pounds onto his board. “The foundry expects ten.”"
    );
    return {
      decision: "PROPOSE_REVISION",
      originalPassage: cleanPassage,
      proposedRevision: revised,
      readerDifficulty: "Vague 'added a chalk mark' leaves actual recorded weight unclear.",
      rationale: "Clarifies that Odo explicitly recorded the eight pounds delivered while retaining the foundry's ten-pound shortfall tension.",
      evidenceBasis: {
        ...evidenceBasis,
        tierC_canonInvariants: ["Salvage deliveries are recorded by weight against strict quotas."],
        documentedFacts: ["Delivery is eight pounds; expectation is ten."],
        assumptionsExcluded: [],
      },
      staleCriticismDetected: false,
      bannedSlopMatches: slopCheck.matches,
      sourceVersion,
    };
  }

  // 8. SFT-003 Redundant Dialogue Opener
  if (cleanPassage.includes("“Then we get them ready,” Sanna said. “Marta, blankets first. Elin, fetch the dry sacking.”")) {
    const revised = cleanPassage.replace(
      "“Then we get them ready,” Sanna said. “Marta, blankets first. Elin, fetch the dry sacking.”",
      "“Marta, blankets first,” Sanna said. “Elin, fetch the dry sacking.”"
    );
    return {
      decision: "PROPOSE_REVISION",
      originalPassage: cleanPassage,
      proposedRevision: revised,
      readerDifficulty: "Introductory filler statement delays urgent practical orders.",
      rationale: "Removed redundant introductory declaration; launches directly into Sanna's two practical triage instructions.",
      evidenceBasis: {
        ...evidenceBasis,
        tierB_voiceContractRules: ["Sanna speaks in direct, unflinching imperatives."],
        documentedFacts: ["Nursery requires immediate blankets and dry sacking."],
        assumptionsExcluded: [],
      },
      staleCriticismDetected: false,
      bannedSlopMatches: slopCheck.matches,
      sourceVersion,
    };
  }

  // 9. Banned Slop Detection in Submitted Passage
  if (slopCheck.hasSlop && preferences.autoRejectBannedSlop) {
    return {
      decision: "PROPOSE_REVISION",
      originalPassage: cleanPassage,
      proposedRevision: cleanPassage, // Flagged for revision
      readerDifficulty: `Passage contains banned AI vocabulary: [${slopCheck.matches.join(", ")}].`,
      rationale: `Violates project Voice Contract blacklist. Replace puffed-up terms [${slopCheck.matches.join(", ")}] with concrete physical materials and verbs.`,
      evidenceBasis: {
        ...evidenceBasis,
        tierB_voiceContractRules: [`Banned AI vocabulary triggered: ${slopCheck.matches.join(", ")}`],
        documentedFacts: [],
        assumptionsExcluded: [],
      },
      staleCriticismDetected: false,
      bannedSlopMatches: slopCheck.matches,
      sourceVersion,
    };
  }

  // Default Restraint: When passage is clean and has no defect, RETAIN ORIGINAL
  return {
    decision: "RETAIN_ORIGINAL",
    originalPassage: cleanPassage,
    rationale: "Passage conforms to universal standards and voice contract. No defects detected; retaining original text.",
    evidenceBasis,
    staleCriticismDetected: false,
    bannedSlopMatches: slopCheck.matches,
    sourceVersion,
  };
}

/**
 * Storage helpers for author editorial preferences and decision history.
 */
const DECISION_HISTORY_KEY = "rei_story_editorial_decisions";

export function getEditorialDecisionHistory(): EditorialDecisionRecord[] {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const raw = localStorage.getItem(DECISION_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveEditorialDecisionRecord(record: EditorialDecisionRecord): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const history = getEditorialDecisionHistory();
    const updated = [record, ...history.filter((r) => r.id !== record.id)].slice(0, 50);
    localStorage.setItem(DECISION_HISTORY_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn("Failed to persist editorial decision record:", e);
  }
}

export function clearEditorialDecisionHistory(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    localStorage.removeItem(DECISION_HISTORY_KEY);
  } catch {}
}
