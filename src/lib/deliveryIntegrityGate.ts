/**
 * @file src/lib/deliveryIntegrityGate.ts
 * @description Delivery Integrity Gate — evaluates transport, termination, parsing, and explicit artifact contracts.
 * Proves delivery completeness, NOT universal algorithm quality.
 */

import { detectUnfinishedNarration, missingRequiredSections } from "./acceptanceContract";

export interface ArtifactRequirements {
  language?: string;
  functionName?: string;
  typeHints?: boolean;
  docstring?: boolean;
  complexityDiscussion?: boolean;
  briefExplanation?: boolean;
  [key: string]: any;
}

export interface DeliveryGateInput {
  prompt?: string;
  rawContent?: string;
  displayContent?: string;
  finishReason?: string | null;
  providerFinishReason?: string | null;
  transportCompleted?: boolean;
  requiredArtifacts?: ArtifactRequirements | null;
  /** Domain acceptance contract: section labels that MUST be present in the answer. */
  requiredSections?: string[] | null;
}

export interface DeliveryGateResult {
  transportIntegrityPassed: boolean;
  terminationIntegrityPassed: boolean;
  parseIntegrityPassed: boolean;
  markdownIntegrityPassed: boolean;
  explicitArtifactsPassed: boolean;
  requiredSectionsPassed: boolean;
  narrationPassed: boolean;
  deliveryGatePassed: boolean;
  failureReasons: string[];
}

export function normalizeFinishReason(rawReason?: string | null, status: number = 200, error?: any): string {
  if (error) {
    if (error.name === "AbortError" || error.message?.includes("cancel")) return "cancelled";
    return "transport_error";
  }
  if (status >= 400) return "provider_error";
  if (!rawReason) return "unknown";

  const norm = String(rawReason).toLowerCase().trim();
  if (norm === "stop" || norm === "end_turn" || norm === "stop_sequence") return "stop";
  if (norm === "length" || norm === "max_tokens" || norm === "token_limit") return "length";
  if (norm === "content_filter" || norm === "safety" || norm === "filtered") return "content_filter";
  if (norm === "cancelled" || norm === "abort") return "cancelled";
  return "unknown";
}

export function evaluateDeliveryIntegrity(input: DeliveryGateInput): DeliveryGateResult {
  const failureReasons: string[] = [];

  const rawContent = input.rawContent ?? "";
  const displayContent = input.displayContent ?? "";
  const normalizedFinish = normalizeFinishReason(input.finishReason);

  // 1. Transport Integrity
  const transportIntegrityPassed = input.transportCompleted !== false;
  if (!transportIntegrityPassed) {
    failureReasons.push("transport_interrupted");
  }

  // 2. Termination Integrity
  const terminationIntegrityPassed = normalizedFinish === "stop";
  if (!terminationIntegrityPassed) {
    if (normalizedFinish === "length") {
      failureReasons.push("provider_length_termination");
    } else if (normalizedFinish === "cancelled") {
      failureReasons.push("stream_cancelled");
    } else if (normalizedFinish === "content_filter") {
      failureReasons.push("content_filtered");
    } else {
      failureReasons.push("missing_terminal_event");
    }
  }

  // 3. Parse Integrity (raw vs display parity, content loss check)
  const parseIntegrityPassed = rawContent.length === 0 || displayContent.length > 0;
  if (!parseIntegrityPassed) {
    failureReasons.push("parser_content_loss");
  }

  // 4. Markdown Fence Balance Integrity
  const openFences = (displayContent.match(/```/g) || []).length;
  const markdownIntegrityPassed = openFences % 2 === 0;
  if (!markdownIntegrityPassed) {
    failureReasons.push("unclosed_code_fence");
  }

  // 5. Explicit Artifacts Presence
  let explicitArtifactsPassed = true;
  if (input.requiredArtifacts && Object.keys(input.requiredArtifacts).length > 0) {
    const reqs = input.requiredArtifacts;
    if (reqs.language && !new RegExp("```" + reqs.language, "i").test(displayContent)) {
      explicitArtifactsPassed = false;
      failureReasons.push("missing_required_artifact_language");
    }
    if (reqs.functionName && !displayContent.includes(reqs.functionName)) {
      explicitArtifactsPassed = false;
      failureReasons.push("missing_required_artifact_function");
    }
    if (reqs.typeHints && !/:\s*[A-Za-z0-9_\[\]\(\), ]+\s*->\s*[A-Za-z0-9_]+/.test(displayContent)) {
      explicitArtifactsPassed = false;
      failureReasons.push("missing_required_artifact_type_hints");
    }
    if (reqs.docstring && !(/"""[\s\S]*?"""/.test(displayContent) || /'''[\s\S]*?'''/.test(displayContent))) {
      explicitArtifactsPassed = false;
      failureReasons.push("missing_required_artifact_docstring");
    }
  }

  // 6. Domain Acceptance Contract (required sections present)
  let requiredSectionsPassed = true;
  if (input.requiredSections && input.requiredSections.length > 0) {
    const missing = missingRequiredSections(displayContent, input.requiredSections);
    if (missing.length > 0) {
      requiredSectionsPassed = false;
      failureReasons.push(`missing_required_section:${missing.join(",")}`);
    }
  }

  // 7. Unfinished-work narration suppression
  const narrationPassed = !detectUnfinishedNarration(displayContent);
  if (!narrationPassed) {
    failureReasons.push("unfinished_work_narration");
  }

  const deliveryGatePassed =
    transportIntegrityPassed &&
    terminationIntegrityPassed &&
    parseIntegrityPassed &&
    markdownIntegrityPassed &&
    explicitArtifactsPassed &&
    requiredSectionsPassed &&
    narrationPassed;

  return {
    transportIntegrityPassed,
    terminationIntegrityPassed,
    parseIntegrityPassed,
    markdownIntegrityPassed,
    explicitArtifactsPassed,
    requiredSectionsPassed,
    narrationPassed,
    deliveryGatePassed,
    failureReasons
  };
}
