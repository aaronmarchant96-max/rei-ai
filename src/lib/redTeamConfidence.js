export function baseConfidence(signalStrength, coverage, evidenceQuality, agreement) {
  const clampedSignal = Math.max(0, Math.min(1, signalStrength));
  const clampedCoverage = Math.max(0, Math.min(1, coverage));
  const clampedEvidence = Math.max(0, Math.min(1, evidenceQuality));
  const clampedAgreement = Math.max(0, Math.min(1, agreement));

  const product = clampedSignal * clampedCoverage * clampedEvidence * clampedAgreement;
  return Math.max(0, Math.min(1, product));
}

export function diminishingReturns(probeIndex) {
  if (probeIndex <= 10) return 1.0;
  const decay = Math.pow(0.9, probeIndex - 10);
  return Math.max(0.1, decay);
}

export function d1SpanConfidence(match) {
  if (!match || !match.matchedKeywords || match.matchedKeywords.length === 0) {
    return 0;
  }

  const signalStrength = Math.min(1, match.score / 1.5);
  const coverage = Math.min(1, match.matchedKeywords.length / 2);
  const evidenceQuality = match.severity === "critical" ? 1.0 : 0.9;
  const agreement = 1.0;

  const product = signalStrength * coverage * evidenceQuality * agreement;
  return Math.max(0, Math.min(1, product * 3));
}

export function d2SpanConfidence(d1SpanConfidence, agreement, coverage, probeIndex) {
  const d1Factor = d1SpanConfidence;
  const agreementFactor = Math.max(0, Math.min(1, agreement));
  const coverageFactor = Math.max(0, Math.min(1, coverage));
  const decayFactor = diminishingReturns(probeIndex);

  const product = d1Factor * agreementFactor * coverageFactor * decayFactor;
  return Math.max(0, Math.min(1, product));
}

export function aggregateConfidence(confidences) {
  if (!confidences || confidences.length === 0) return 0;

  const maxConfidence = Math.max(...confidences);
  const avgConfidence = confidences.reduce((sum, c) => sum + c, 0) / confidences.length;

  return (maxConfidence + avgConfidence) / 2;
}
