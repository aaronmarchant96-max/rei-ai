import {
  cosineSimilarity,
  embedText,
  clearEmbeddingCache,
} from "./semanticEmbedder.js";

describe("semanticEmbedder (v4 ONNX Harness)", () => {
  beforeEach(() => {
    clearEmbeddingCache();
  });

  describe("cosineSimilarity", () => {
    test("returns 1.0 for identical non-zero vectors", () => {
      const vecA = [0.5, 0.5, 0.5, 0.5];
      const vecB = [0.5, 0.5, 0.5, 0.5];
      expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(1.0, 5);
    });

    test("returns -1.0 for exactly opposite vectors", () => {
      const vecA = [1, 0, 0];
      const vecB = [-1, 0, 0];
      expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(-1.0, 5);
    });

    test("returns 0.0 for orthogonal vectors", () => {
      const vecA = [1, 0];
      const vecB = [0, 1];
      expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(0.0, 5);
    });

    test("returns 0.0 for zero vectors or invalid inputs", () => {
      expect(cosineSimilarity([0, 0], [0, 0])).toBe(0);
      expect(cosineSimilarity(null, [1, 2])).toBe(0);
      expect(cosineSimilarity([1, 2], [1])).toBe(0);
    });
  });

  describe("embedText & Caching", () => {
    test("handles empty or invalid text gracefully with 384-dim zero vector", async () => {
      const result = await embedText("");
      expect(result.vector).toHaveLength(384);
      expect(result.vector.every((v) => v === 0)).toBe(true);
      expect(result.latencyMs).toBe(0);
    });

    test("caches repeated queries and returns 0ms cache latency", async () => {
      const res1 = await embedText("test query string");
      expect(res1).toHaveProperty("vector");
      expect(res1.vector).toHaveLength(384);

      const res2 = await embedText("test query string");
      expect(res2.latencyMs).toBe(0);
      expect(res2.vector).toEqual(res1.vector);
    });
  });
});
