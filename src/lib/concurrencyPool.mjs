/**
 * @file src/lib/concurrencyPool.mjs
 * @description Bounded Semaphore & Provider Concurrency Queue Primitive.
 * Supports maxConcurrent, maxQueueDepth, acquireDeadlineMs, and permit release in finally.
 */

export class BoundedConcurrencyPool {
  constructor(options = {}) {
    this.name = options.name || "default";
    this.maxConcurrent = options.maxConcurrent || 4;
    this.maxQueueDepth = options.maxQueueDepth || 20;
    this.acquireDeadlineMs = options.acquireDeadlineMs || 10000;

    this.activeCount = 0;
    this.queue = [];
  }

  get stats() {
    return {
      name: this.name,
      activeCount: this.activeCount,
      queueDepth: this.queue.length,
      maxConcurrent: this.maxConcurrent,
      maxQueueDepth: this.maxQueueDepth
    };
  }

  async acquire() {
    if (this.activeCount < this.maxConcurrent) {
      this.activeCount++;
      return this._createReleaseHandle();
    }

    if (this.queue.length >= this.maxQueueDepth) {
      const err = new Error(`Provider queue depth limit (${this.maxQueueDepth}) exceeded for pool ${this.name}`);
      err.code = "POOL_QUEUE_OVERFLOW";
      err.status = 429;
      err.retryable = true;
      throw err;
    }

    return new Promise((resolve, reject) => {
      let timer = null;

      const queueEntry = {
        resolve: (releaseHandle) => {
          if (timer) clearTimeout(timer);
          resolve(releaseHandle);
        },
        reject: (err) => {
          if (timer) clearTimeout(timer);
          reject(err);
        }
      };

      if (this.acquireDeadlineMs > 0) {
        timer = setTimeout(() => {
          const idx = this.queue.indexOf(queueEntry);
          if (idx !== -1) {
            this.queue.splice(idx, 1);
          }
          const err = new Error(`Acquire deadline (${this.acquireDeadlineMs}ms) expired for pool ${this.name}`);
          err.code = "POOL_ACQUIRE_TIMEOUT";
          err.status = 503;
          err.retryable = true;
          reject(err);
        }, this.acquireDeadlineMs);
      }

      this.queue.push(queueEntry);
    });
  }

  _createReleaseHandle() {
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.activeCount--;

      if (this.queue.length > 0) {
        const next = this.queue.shift();
        this.activeCount++;
        next.resolve(this._createReleaseHandle());
      }
    };
  }

  async run(taskFn) {
    const release = await this.acquire();
    try {
      return await taskFn();
    } finally {
      release();
    }
  }
}
