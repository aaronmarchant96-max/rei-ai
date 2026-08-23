export interface StrategicDetection {
  detected: boolean;
  actorSignals: string[];
  interdependenceSignals: string[];
  incentiveConflictSignals: string[];
  reason: string;
}

const ACTOR_TERMS = [
  "management", "manager", "employees", "employee", "salespeople", "sales",
  "developers", "developer", "engineering", "finance", "security", "regulator",
  "competitor", "competitors", "customer", "customers", "vendor", "vendors",
  "union", "board", "investor", "investors", "government", "company",
] as const;

const INTERDEPENDENCE_PATTERNS = [
  /\bwhat (?:will|would|happens? if)\b/i,
  /\b(?:respond|react|adopt|compete|negotiate|retaliate|cooperate|require|requires|required)\b/i,
  /\b(?:stakeholder|who benefits|why (?:won't|will not|hasn't|has not))\b/i,
  /\b(?:each|both|between)\b/i,
];

const CONFLICT_PATTERNS = [
  /\b(?:but|versus|vs\.?|although|despite|conflict|refuse|refuses|won't|will not)\b/i,
  /\b(?:cheaper|cost|control|authority|reward|penalty|incentive|veto|override)\b/i,
];

export function detectStrategicSituation(input: string): StrategicDetection {
  const text = String(input || "");
  const lower = text.toLowerCase();
  const actorSignals = [...new Set(ACTOR_TERMS.filter((term) => {
    const pattern = new RegExp(`(^|[^a-z])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`, "i");
    return pattern.test(lower);
  }))];
  const interdependenceSignals = INTERDEPENDENCE_PATTERNS
    .filter((pattern) => pattern.test(text))
    .map((pattern) => pattern.source);
  const incentiveConflictSignals = CONFLICT_PATTERNS
    .filter((pattern) => pattern.test(text))
    .map((pattern) => pattern.source);
  const detected = actorSignals.length >= 2 && interdependenceSignals.length > 0 && incentiveConflictSignals.length > 0;

  return {
    detected,
    actorSignals,
    interdependenceSignals,
    incentiveConflictSignals,
    reason: detected
      ? "Multiple actors have interdependent outcomes and differing incentives or constraints."
      : "Insufficient evidence of a multi-actor, incentive-dependent situation.",
  };
}
