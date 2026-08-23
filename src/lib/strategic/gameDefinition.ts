import { STRATEGIC_SCHEMA_VERSION, type StrategicClaim, type StrategicSituation } from "./strategicTypes";

export interface GameDefinitionValidation {
  valid: boolean;
  errors: string[];
  value?: StrategicSituation;
}

const CLAIM_STATUSES = new Set(["observed", "stated", "inferred", "unknown", "counterfactual"]);
const CONFIDENCE = new Set(["weak", "moderate", "strong", "dominant", "unknown"]);
const REQUIRED_ARRAYS = [
  "evidence", "players", "rules", "objectives", "incentives", "constraints", "strategies",
  "conflicts", "alternatives", "falsificationConditions",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function rejectUnknownKeys(value: Record<string, unknown>, allowed: readonly string[], path: string, errors: string[]): void {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!allowedSet.has(key)) errors.push(`${path}.${key} is not allowed`);
  }
}

function validateClaim(value: unknown, path: string, errors: string[]): value is StrategicClaim {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`);
    return false;
  }
  rejectUnknownKeys(value, ["id", "statement", "epistemicStatus", "evidenceRefs", "confidence"], path, errors);
  if (typeof value.id !== "string" || !value.id.trim()) errors.push(`${path}.id is required`);
  if (typeof value.statement !== "string" || !value.statement.trim()) errors.push(`${path}.statement is required`);
  if (!CLAIM_STATUSES.has(String(value.epistemicStatus))) errors.push(`${path}.epistemicStatus is invalid`);
  if (!Array.isArray(value.evidenceRefs) || value.evidenceRefs.some((ref) => typeof ref !== "string")) {
    errors.push(`${path}.evidenceRefs must be strings`);
  }
  if ((value.epistemicStatus === "observed" || value.epistemicStatus === "stated") && (!Array.isArray(value.evidenceRefs) || value.evidenceRefs.length === 0)) {
    errors.push(`${path}: observed claims require evidence; stated claims require a statement reference`);
  }
  if (!CONFIDENCE.has(String(value.confidence))) errors.push(`${path}.confidence is invalid`);
  return errors.length === 0;
}

export function validateGameDefinition(input: unknown): GameDefinitionValidation {
  const errors: string[] = [];
  if (!isRecord(input)) return { valid: false, errors: ["strategic situation must be an object"] };
  rejectUnknownKeys(input, [
    "schemaVersion", "detected", "evidence", "players", "rules", "objectives", "incentives",
    "constraints", "strategies", "conflicts", "alignment", "strategicHinge",
    "convergenceZone", "intervention", "prediction", "alternatives",
    "falsificationConditions", "gameStateId", "gameStateVersion",
  ], "strategicSituation", errors);
  if (input.schemaVersion !== STRATEGIC_SCHEMA_VERSION) errors.push("unsupported strategic schemaVersion");
  if (input.detected !== true) errors.push("canonical strategic situations require detected=true");
  for (const key of REQUIRED_ARRAYS) {
    if (!Array.isArray(input[key])) errors.push(`${key} must be an array`);
  }

  const players = Array.isArray(input.players) ? input.players : [];
  const evidence = Array.isArray(input.evidence) ? input.evidence : [];
  const evidenceIds = new Set<string>();
  const evidenceSourceById = new Map<string, string>();
  for (const [index, item] of evidence.entries()) {
    if (!isRecord(item)) {
      errors.push(`evidence[${index}] must be an object`);
      continue;
    }
    rejectUnknownKeys(item, ["id", "statement", "sourceType", "sourceRef", "relation", "claimRefs"], `evidence[${index}]`, errors);
    if (typeof item.id !== "string" || !item.id.trim()) errors.push(`evidence[${index}].id is required`);
    else if (evidenceIds.has(item.id)) errors.push(`evidence[${index}].id must be unique`);
    else {
      evidenceIds.add(item.id);
      evidenceSourceById.set(item.id, String(item.sourceType));
    }
    if (!Array.isArray(item.claimRefs)) errors.push(`evidence[${index}].claimRefs must be an array`);
  }
  const playerIds = new Set<string>();
  for (const [index, player] of players.entries()) {
    if (!isRecord(player) || typeof player.id !== "string" || !player.id.trim()) {
      errors.push(`players[${index}].id is required`);
      continue;
    }
    rejectUnknownKeys(player, ["id", "name", "role", "power", "vetoCapability", "exitCapability", "objectives"], `players[${index}]`, errors);
    if (playerIds.has(player.id)) errors.push(`players[${index}].id must be unique`);
    playerIds.add(player.id);
    if (!Array.isArray(player.objectives)) errors.push(`players[${index}].objectives must be an array`);
    else player.objectives.forEach((claim, claimIndex) => validateClaim(claim, `players[${index}].objectives[${claimIndex}]`, errors));
  }

  const claimCollections = ["rules", "objectives", "constraints", "strategies", "conflicts", "alternatives"] as const;
  for (const collection of claimCollections) {
    const values = Array.isArray(input[collection]) ? input[collection] : [];
    values.forEach((claim, index) => validateClaim(claim, `${collection}[${index}]`, errors));
  }

  const incentives = Array.isArray(input.incentives) ? input.incentives : [];
  for (const [index, incentive] of incentives.entries()) {
    if (!isRecord(incentive)) {
      errors.push(`incentives[${index}] must be an object`);
      continue;
    }
    rejectUnknownKeys(incentive, ["actorId", "claim", "direction", "strength"], `incentives[${index}]`, errors);
    if (typeof incentive.actorId !== "string" || !playerIds.has(incentive.actorId)) {
      errors.push(`incentives[${index}].actorId must reference a known player`);
    }
    validateClaim(incentive.claim, `incentives[${index}].claim`, errors);
  }

  if (input.strategicHinge !== undefined) validateClaim(input.strategicHinge, "strategicHinge", errors);
  const validateEvidenceRefs = (claim: unknown, path: string) => {
    if (!isRecord(claim) || !Array.isArray(claim.evidenceRefs)) return;
    for (const ref of claim.evidenceRefs) {
      if (typeof ref === "string" && !evidenceIds.has(ref)) errors.push(`${path}.evidenceRefs contains unknown evidence ${ref}`);
    }
    const sources = claim.evidenceRefs.map((ref) => evidenceSourceById.get(String(ref)));
    if (claim.epistemicStatus === "stated" && !sources.includes("user_statement")) {
      errors.push(`${path}: stated claims require user_statement evidence`);
    }
    if (claim.epistemicStatus === "observed" && !sources.some((source) => source === "runtime_observation" || source === "external_source")) {
      errors.push(`${path}: observed claims require runtime_observation or external_source evidence`);
    }
  };
  for (const collection of claimCollections) {
    const values = Array.isArray(input[collection]) ? input[collection] : [];
    values.forEach((claim, index) => validateEvidenceRefs(claim, `${collection}[${index}]`));
  }
  incentives.forEach((item, index) => isRecord(item) && validateEvidenceRefs(item.claim, `incentives[${index}].claim`));
  players.forEach((player, playerIndex) => isRecord(player) && Array.isArray(player.objectives) && player.objectives.forEach((claim, claimIndex) => validateEvidenceRefs(claim, `players[${playerIndex}].objectives[${claimIndex}]`)));
  if (input.strategicHinge !== undefined) validateEvidenceRefs(input.strategicHinge, "strategicHinge");
  return errors.length
    ? { valid: false, errors }
    : { valid: true, errors: [], value: input as unknown as StrategicSituation };
}
