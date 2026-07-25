import domainCentroids from "../../data/ml/domain_centroids.json";
import { embedText, cosineSimilarity } from "./semanticEmbedder.js";

// Calibrated temperature (tau) and OOD threshold (theta_ood)
export const CALIBRATED_TAU = 0.50;
export const CALIBRATED_THETA_OOD = 0.25;

/**
 * Computes semantic cosine similarity, Softmax probabilities, DAS entropy,
 * and OOD status for input prompt text.
 * 
 * @param {string} text 
 * @param {object} options 
 * @returns {Promise<{
 *   topDomain: string,
 *   topSimilarity: number,
 *   topProbability: number,
 *   das: number,
 *   aps: number,
 *   isOOD: boolean,
 *   semanticVector: number[],
 *   hingeScore: number,
 *   cheapRouteConfidence: number,
 *   probabilities: Record<string, number>
 * }>}
 */
export async function computeSemanticHingeScore(text, options = {}) {
  const tau = options.tau || CALIBRATED_TAU;
  const thetaOod = options.thetaOod || CALIBRATED_THETA_OOD;

  // 1. Embed text to 384-dim dense vector u
  const embedRes = await embedText(text);
  const userVec = embedRes.vector;

  // 2. Compute max sub-centroid cosine similarity per domain
  const domainSimilarities = {};
  const domains = Object.keys(domainCentroids.domains);

  for (const domain of domains) {
    const subCentroids = domainCentroids.domains[domain] || [];
    let maxSim = -1.0;
    for (const centroidVec of subCentroids) {
      const sim = cosineSimilarity(userVec, centroidVec);
      if (sim > maxSim) maxSim = sim;
    }
    domainSimilarities[domain] = maxSim;
  }

  // 3. Compute Softmax probabilities with calibrated temperature tau
  let expSum = 0;
  const expSims = {};
  for (const domain of domains) {
    const expVal = Math.exp(domainSimilarities[domain] / tau);
    expSims[domain] = expVal;
    expSum += expVal;
  }

  const probabilities = {};
  let topDomain = domains[0];
  let maxProb = 0;

  for (const domain of domains) {
    const prob = expSum > 0 ? expSims[domain] / expSum : 1 / domains.length;
    probabilities[domain] = prob;
    if (prob > maxProb) {
      maxProb = prob;
      topDomain = domain;
    }
  }

  // 4. Compute Normalized Shannon Entropy for Domain Ambiguity Score (DAS)
  let entropySum = 0;
  for (const domain of domains) {
    const p = probabilities[domain];
    if (p > 1e-9) {
      entropySum -= p * Math.log2(p);
    }
  }
  const maxEntropy = Math.log2(domains.length);
  const das = Math.max(0.0, Math.min(1.0, entropySum / maxEntropy));

  // 5. Evaluate Out-Of-Distribution (OOD) Gate
  const isOOD = maxProb < thetaOod;

  // 6. Calculate Hinge Score & Cheap Route Confidence
  // HS is driven by ambiguity (DAS) and OOD status
  const topSim = domainSimilarities[topDomain] || 0;
  const hingeScore = isOOD ? 0.95 : Math.max(0.05, Math.min(0.95, das * 0.7 + (1.0 - topSim) * 0.3));
  const cheapRouteConfidence = Math.max(0.0, Math.min(1.0, 1.0 - hingeScore));

  return {
    topDomain,
    topSimilarity: topSim,
    topProbability: maxProb,
    das,
    isOOD,
    semanticVector: userVec.slice(0, 8), // Surface 8-dim preview for UI micro-bars
    hingeScore,
    cheapRouteConfidence,
    probabilities,
    latencyMs: embedRes.latencyMs,
    coldStartMs: embedRes.coldStartMs,
    // CRITICAL: propagate fallback state so consumers know whether real ONNX
    // embeddings or synthetic hash vectors were used. A result with
    // fallback: true has NOT been semantically classified.
    fallback: embedRes.fallback || false,
    fallbackError: embedRes.error || null,
  };
}
