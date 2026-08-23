export const STRATEGIC_SCHEMA_VERSION = 1 as const;

export type StrategicEpistemicStatus =
  | "observed"
  | "stated"
  | "inferred"
  | "unknown"
  | "counterfactual";

export type StrategicConfidence = "weak" | "moderate" | "strong" | "dominant" | "unknown";
export type IncentiveAlignment = "aligned" | "partially_aligned" | "conflicted" | "unknown";

export interface StrategicClaim {
  id: string;
  statement: string;
  epistemicStatus: StrategicEpistemicStatus;
  evidenceRefs: string[];
  confidence: StrategicConfidence;
}

export interface StrategicEvidence {
  id: string;
  statement: string;
  sourceType: "user_statement" | "runtime_observation" | "external_source" | "model_inference";
  sourceRef?: string;
  relation: "supports" | "contradicts" | "context";
  claimRefs: string[];
}

export interface StrategicPlayer {
  id: string;
  name: string;
  role: string;
  power: "low" | "medium" | "high" | "veto" | "unknown";
  vetoCapability: boolean | "unknown";
  exitCapability: boolean | "unknown";
  objectives: StrategicClaim[];
}

export interface StrategicIncentive {
  actorId: string;
  claim: StrategicClaim;
  direction: "toward" | "away" | "mixed" | "unknown";
  strength: StrategicConfidence;
}

export interface StrategicPrediction {
  proposition: string;
  expectedOutcome: string;
  confidence: StrategicConfidence;
  assumptions: StrategicClaim[];
  falsificationConditions: string[];
  timeHorizon?: string;
}

export interface StrategicSituation {
  schemaVersion: typeof STRATEGIC_SCHEMA_VERSION;
  detected: true;
  evidence: StrategicEvidence[];
  players: StrategicPlayer[];
  rules: StrategicClaim[];
  objectives: StrategicClaim[];
  incentives: StrategicIncentive[];
  constraints: StrategicClaim[];
  strategies: StrategicClaim[];
  conflicts: StrategicClaim[];
  alignment: IncentiveAlignment;
  strategicHinge?: StrategicClaim;
  convergenceZone?: {
    identified: boolean;
    description?: StrategicClaim;
    acceptableOutcomeRefsByActor: Record<string, string[]>;
  };
  intervention?: {
    type: "rule_change" | "incentive_alignment" | "information_disclosure" | "mechanism_change";
    targetRef: string;
    description: StrategicClaim;
    expectedBehavior: StrategicClaim;
  };
  prediction?: StrategicPrediction;
  alternatives: StrategicClaim[];
  falsificationConditions: string[];
  gameStateId?: string;
  gameStateVersion?: number;
}
