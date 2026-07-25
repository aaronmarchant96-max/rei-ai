// In-memory embedding cache for repeated queries
const embeddingCache = new Map();

let embedderPipelinePromise = null;
let isWarming = false;
let coldStartDurationMs = 0;

/**
 * Deterministic synthetic 384-dim embedding generator for fallback/testing environments.
 * @param {string} text 
 * @returns {number[]} 384-element float array
 */
export function generateSyntheticEmbedding(text) {
  const vec = new Array(384).fill(0);
  if (!text) return vec;

  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }

  for (let i = 0; i < 384; i++) {
    const val = Math.sin(hash + i * 0.1);
    vec[i] = val;
  }

  // Normalize unit vector
  let norm = 0;
  for (let i = 0; i < 384; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < 384; i++) vec[i] /= norm;
  }

  return vec;
}

/**
 * Lazy initializes the local ONNX embedding pipeline (all-MiniLM-L6-v2).
 * Model output: 384-dimensional normalized float vector.
 */
export async function getEmbedderPipeline() {
  if (!embedderPipelinePromise) {
    const startTime = Date.now();
    embedderPipelinePromise = (async () => {
      try {
        const { pipeline, env } = await import("@xenova/transformers");
        env.allowLocalModels = true;
        env.allowRemoteModels = true;

        const pipe = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
          quantized: true,
        });
        coldStartDurationMs = Date.now() - startTime;
        return pipe;
      } catch (err) {
        embedderPipelinePromise = null;
        throw err;
      }
    })();
  }
  return embedderPipelinePromise;
}

/**
 * Warm up the ONNX embedder model asynchronously in the background.
 */
export function warmEmbedder() {
  if (isWarming || embedderPipelinePromise) return;
  isWarming = true;
  getEmbedderPipeline()
    .then(() => {
      isWarming = false;
    })
    .catch(() => {
      isWarming = false;
    });
}

/**
 * Compute 384-dimensional dense vector embedding for input text.
 * @param {string} text 
 * @returns {Promise<{ vector: number[], latencyMs: number, coldStartMs: number, fallback?: boolean }>}
 */
export async function embedText(text) {
  if (!text || typeof text !== "string" || !text.trim()) {
    return { vector: new Array(384).fill(0), latencyMs: 0, coldStartMs: 0 };
  }

  const normalized = text.trim().toLowerCase();
  if (embeddingCache.has(normalized)) {
    return {
      vector: embeddingCache.get(normalized),
      latencyMs: 0,
      coldStartMs: 0,
    };
  }

  const startTime = Date.now();
  const isCold = !embedderPipelinePromise;
  
  try {
    const pipe = await getEmbedderPipeline();
    const output = await pipe(normalized, { pooling: "mean", normalize: true });
    const vector = Array.from(output.data);
    const latencyMs = Date.now() - startTime;

    if (embeddingCache.size < 500) {
      embeddingCache.set(normalized, vector);
    }

    return {
      vector,
      latencyMs,
      coldStartMs: isCold ? coldStartDurationMs : 0,
    };
  } catch (err) {
    // LOUD WARNING: synthetic fallback produces hash-based noise vectors, not
    // real semantic embeddings. Any accuracy measurement using these results
    // is meaningless. This path exists only so the pipeline doesn't crash
    // in environments where ONNX/WASM cannot load (e.g., some CI runners).
    console.warn(
      `[semanticEmbedder] ⚠️  ONNX model unavailable — using synthetic hash fallback. ` +
      `Reason: ${err.message}. Downstream accuracy numbers are NOT real semantic measurements.`
    );
    const vector = generateSyntheticEmbedding(normalized);
    const latencyMs = Date.now() - startTime;

    if (embeddingCache.size < 500) {
      embeddingCache.set(normalized, vector);
    }

    return {
      vector,
      latencyMs,
      coldStartMs: 0,
      fallback: true,
      error: err.message,
    };
  }
}

/**
 * Calculate Cosine Similarity between two 384-dimensional vectors.
 * @param {number[]} vecA 
 * @param {number[]} vecB 
 * @returns {number} [-1.0, 1.0]
 */
export function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Clear the in-memory embedding cache.
 */
export function clearEmbeddingCache() {
  embeddingCache.clear();
}
