/**
 * @file src/lib/batchRunner.mjs
 * @description Node-compatible Bounded Batch Worker Queue with Promise.allSettled() and ordered reconstruction.
 * Safe for offline replay scripts and multi-task evaluation workloads.
 */

import { BoundedConcurrencyPool } from "./concurrencyPool.mjs";

export async function executeBatchWithConcurrency(tasks = [], options = {}) {
  const {
    concurrency = 4,
    timeoutMs = 15000,
    name = "batch-runner"
  } = options;

  if (!Array.isArray(tasks) || tasks.length === 0) {
    return [];
  }

  const pool = new BoundedConcurrencyPool({
    name,
    maxConcurrent: concurrency,
    maxQueueDepth: tasks.length + 10,
    acquireDeadlineMs: timeoutMs
  });

  const wrappedPromises = tasks.map((task, index) => {
    return pool.run(async () => {
      let timer = null;
      try {
        if (timeoutMs > 0) {
          const timeoutPromise = new Promise((_, reject) => {
            timer = setTimeout(() => {
              const err = new Error(`Task ${index} timed out after ${timeoutMs}ms`);
              err.code = "BATCH_TASK_TIMEOUT";
              reject(err);
            }, timeoutMs);
          });
          const result = await Promise.race([
            typeof task === "function" ? task(index) : task,
            timeoutPromise
          ]);
          return { index, result };
        } else {
          const result = await (typeof task === "function" ? task(index) : task);
          return { index, result };
        }
      } finally {
        if (timer) clearTimeout(timer);
      }
    });
  });

  const settled = await Promise.allSettled(wrappedPromises);

  // Preserve 100% input task ordering
  const orderedResults = new Array(tasks.length);

  settled.forEach((item, idx) => {
    if (item.status === "fulfilled") {
      orderedResults[item.value.index] = {
        status: "fulfilled",
        value: item.value.result
      };
    } else {
      orderedResults[idx] = {
        status: "rejected",
        reason: item.reason
      };
    }
  });

  return orderedResults;
}
