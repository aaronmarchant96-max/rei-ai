import { CODING_PROMPT } from "../systemPrompts.js";
import { extractDeliverableAndScaffolding } from "../lib/replyParser.js";

// Custom typed domain errors
export class DomainError extends Error {
  constructor(message, code) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
  }
}
export class InsufficientFundsError extends DomainError {
  constructor(senderId, requestedCents, availableCents) {
    super(`Insufficient funds for sender ${senderId}: requested ${requestedCents} cents, available ${availableCents} cents`, "INSUFFICIENT_FUNDS");
  }
}
export class ReconciliationRequiredError extends DomainError {
  constructor(operationId, reason) {
    super(`Operation ${operationId} requires manual or asynchronous reconciliation: ${reason}`, "RECONCILIATION_REQUIRED");
  }
}
export class DuplicateOperationError extends DomainError {
  constructor(idempotencyKey) {
    super(`Duplicate operation with key: ${idempotencyKey}`, "DUPLICATE_OPERATION");
  }
}

/**
 * Reference robust distributed wallet transfer state machine with fault injection support.
 */
export async function executeDistributedTransfer({
  idempotencyKey,
  senderId,
  recipientId,
  amountCents,
  ledgerDb,
  stripeApi,
  faultInject = {},
}) {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new DomainError("Amount must be a positive integer in minor units (cents)", "INVALID_AMOUNT");
  }

  // 1. Atomically create or retrieve existing operation (DB-enforced unique constraint)
  let op = await ledgerDb.getOperationByIdempotencyKey(idempotencyKey);
  if (!op) {
    op = await ledgerDb.createOperation({
      idempotencyKey,
      senderId,
      recipientId,
      amountCents,
      state: "created",
    });
  }

  if (op.state === "completed") {
    return { success: true, payoutId: op.payoutId, alreadyCompleted: true };
  }

  if (op.state === "reconciliation_required") {
    throw new ReconciliationRequiredError(op.id, "Operation in ambiguous state requiring reconciliation");
  }

  // 2. Atomic Balance Reservation
  if (op.state === "created") {
    if (faultInject.concurrentBalanceRace) {
      // Simulate another thread having drained the balance
      throw new InsufficientFundsError(senderId, amountCents, 0);
    }
    const reserved = await ledgerDb.atomicReserveFunds(op.id, senderId, amountCents);
    if (!reserved) {
      await ledgerDb.updateState(op.id, "failed");
      throw new InsufficientFundsError(senderId, amountCents, 0);
    }
    await ledgerDb.updateState(op.id, "funds_reserved");
    op.state = "funds_reserved";
  }

  if (faultInject.crashAfterDebit) {
    throw new Error("Simulated system crash immediately after debit reservation");
  }

  // 3. External Stripe Transfer (using operation ID as external idempotency key)
  if (op.state === "funds_reserved" || op.state === "payout_pending") {
    await ledgerDb.updateState(op.id, "payout_pending");
    op.state = "payout_pending";

    let payout;
    try {
      if (faultInject.stripeTimeout) {
        throw new Error("Stripe network timeout / connection reset");
      }
      if (faultInject.confirmedStripeFailure) {
        const err = new Error("Stripe card declined / invalid destination account");
        err.code = "payout_declined";
        throw err;
      }
      payout = await stripeApi.transfers.create({
        amount: amountCents,
        currency: "usd",
        destination: recipientId,
        idempotencyKey: `transfer-${op.id}`,
      });
      await ledgerDb.updateOperationPayout(op.id, payout.id, "payout_confirmed");
      op.state = "payout_confirmed";
      op.payoutId = payout.id;
    } catch (err) {
      if (err.code === "payout_declined" || faultInject.confirmedStripeFailure) {
        // Confirmed external failure: safe to release reserved funds once
        await ledgerDb.atomicReleaseReservation(op.id, senderId, amountCents);
        await ledgerDb.updateState(op.id, "compensated");
        throw err;
      } else {
        // Ambiguous timeout / network error: DO NOT refund sender. Transition to reconciliation_required
        await ledgerDb.updateState(op.id, "reconciliation_required");
        throw new ReconciliationRequiredError(op.id, err.message);
      }
    }
  }

  if (faultInject.crashBeforeRecipientCredit) {
    throw new Error("Simulated system crash before recipient credit");
  }

  // 4. Idempotent Recipient Credit
  if (op.state === "payout_confirmed") {
    await ledgerDb.atomicCreditRecipient(op.id, recipientId, amountCents);
    await ledgerDb.updateState(op.id, "completed");
    op.state = "completed";
  }

  return { success: true, payoutId: op.payoutId };
}

describe("Adversarial Engineer Quality Gate: Distributed Wallet Transfer Fault Matrix", () => {
  let ledgerDb;
  let stripeApi;

  beforeEach(() => {
    const balances = { "usr_sender_1": 10000, "usr_recipient_2": 0 };
    const operations = new Map();
    const stripeCalls = [];

    ledgerDb = {
      balances,
      operations,
      getOperationByIdempotencyKey: async (key) => operations.get(key) || null,
      createOperation: async (data) => {
        const record = { id: `op_${operations.size + 1}`, ...data };
        operations.set(data.idempotencyKey, record);
        return record;
      },
      updateState: async (id, state) => {
        for (const record of operations.values()) {
          if (record.id === id) record.state = state;
        }
      },
      updateOperationPayout: async (id, payoutId, state) => {
        for (const record of operations.values()) {
          if (record.id === id) {
            record.payoutId = payoutId;
            record.state = state;
          }
        }
      },
      atomicReserveFunds: async (opId, senderId, amount) => {
        if (balances[senderId] >= amount) {
          balances[senderId] -= amount;
          return true;
        }
        return false;
      },
      atomicReleaseReservation: async (opId, senderId, amount) => {
        balances[senderId] += amount;
      },
      atomicCreditRecipient: async (opId, recipientId, amount) => {
        balances[recipientId] = (balances[recipientId] || 0) + amount;
      },
    };

    stripeApi = {
      stripeCalls,
      transfers: {
        create: async (params) => {
          stripeCalls.push(params);
          return { id: `tr_${Date.now()}` };
        },
      },
    };
  });

  it("Boundary 1: Concurrent balance checks - only one reservation succeeds", async () => {
    // Both try to transfer 8,000 cents with 10,000 balance
    const p1 = executeDistributedTransfer({
      idempotencyKey: "tx_conc_1",
      senderId: "usr_sender_1",
      recipientId: "usr_recipient_2",
      amountCents: 8000,
      ledgerDb,
      stripeApi,
    });

    const p2 = executeDistributedTransfer({
      idempotencyKey: "tx_conc_2",
      senderId: "usr_sender_1",
      recipientId: "usr_recipient_2",
      amountCents: 8000,
      ledgerDb,
      stripeApi,
    });

    const results = await Promise.allSettled([p1, p2]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
    expect(rejected[0].reason).toBeInstanceOf(InsufficientFundsError);
    expect(ledgerDb.balances["usr_sender_1"]).toBe(2000); // 10000 - 8000
  });

  it("Boundary 2: Crash after debit - operation resumes without another debit", async () => {
    const key = "tx_crash_debit";
    // First attempt crashes after debit
    await expect(
      executeDistributedTransfer({
        idempotencyKey: key,
        senderId: "usr_sender_1",
        recipientId: "usr_recipient_2",
        amountCents: 5000,
        ledgerDb,
        stripeApi,
        faultInject: { crashAfterDebit: true },
      })
    ).rejects.toThrow("Simulated system crash immediately after debit reservation");

    expect(ledgerDb.balances["usr_sender_1"]).toBe(5000);

    // Second retry should resume without double debiting
    const res = await executeDistributedTransfer({
      idempotencyKey: key,
      senderId: "usr_sender_1",
      recipientId: "usr_recipient_2",
      amountCents: 5000,
      ledgerDb,
      stripeApi,
    });

    expect(res.success).toBe(true);
    expect(ledgerDb.balances["usr_sender_1"]).toBe(5000); // Still 5000, NOT 0
    expect(ledgerDb.balances["usr_recipient_2"]).toBe(5000);
  });

  it("Boundary 3: Stripe timeout after acceptance - no sender refund, reconciliation begins", async () => {
    const key = "tx_stripe_timeout";
    await expect(
      executeDistributedTransfer({
        idempotencyKey: key,
        senderId: "usr_sender_1",
        recipientId: "usr_recipient_2",
        amountCents: 5000,
        ledgerDb,
        stripeApi,
        faultInject: { stripeTimeout: true },
      })
    ).rejects.toThrow(ReconciliationRequiredError);

    // CRITICAL: Sender balance MUST NOT be prematurely restored on ambiguous timeout
    expect(ledgerDb.balances["usr_sender_1"]).toBe(5000);
    const op = await ledgerDb.getOperationByIdempotencyKey(key);
    expect(op.state).toBe("reconciliation_required");
  });

  it("Boundary 4: Retry after successful payout - no duplicate Stripe transfer", async () => {
    const key = "tx_stripe_retry";
    const res1 = await executeDistributedTransfer({
      idempotencyKey: key,
      senderId: "usr_sender_1",
      recipientId: "usr_recipient_2",
      amountCents: 3000,
      ledgerDb,
      stripeApi,
    });

    expect(res1.success).toBe(true);
    expect(stripeApi.stripeCalls.length).toBe(1);

    // Duplicate retry
    const res2 = await executeDistributedTransfer({
      idempotencyKey: key,
      senderId: "usr_sender_1",
      recipientId: "usr_recipient_2",
      amountCents: 3000,
      ledgerDb,
      stripeApi,
    });

    expect(res2.success).toBe(true);
    expect(res2.alreadyCompleted).toBe(true);
    expect(stripeApi.stripeCalls.length).toBe(1); // Exact same 1 call
  });

  it("Boundary 5: Crash before recipient credit - credit resumes exactly once", async () => {
    const key = "tx_crash_before_credit";
    await expect(
      executeDistributedTransfer({
        idempotencyKey: key,
        senderId: "usr_sender_1",
        recipientId: "usr_recipient_2",
        amountCents: 4000,
        ledgerDb,
        stripeApi,
        faultInject: { crashBeforeRecipientCredit: true },
      })
    ).rejects.toThrow("Simulated system crash before recipient credit");

    expect(ledgerDb.balances["usr_recipient_2"]).toBe(0);

    // Resume
    const res = await executeDistributedTransfer({
      idempotencyKey: key,
      senderId: "usr_sender_1",
      recipientId: "usr_recipient_2",
      amountCents: 4000,
      ledgerDb,
      stripeApi,
    });

    expect(res.success).toBe(true);
    expect(ledgerDb.balances["usr_recipient_2"]).toBe(4000);
  });

  it("Boundary 6: Confirmed payout failure - reserved funds released once", async () => {
    const key = "tx_stripe_declined";
    await expect(
      executeDistributedTransfer({
        idempotencyKey: key,
        senderId: "usr_sender_1",
        recipientId: "usr_recipient_2",
        amountCents: 4000,
        ledgerDb,
        stripeApi,
        faultInject: { confirmedStripeFailure: true },
      })
    ).rejects.toThrow("Stripe card declined / invalid destination account");

    // Funds safely returned on confirmed failure
    expect(ledgerDb.balances["usr_sender_1"]).toBe(10000);
    const op = await ledgerDb.getOperationByIdempotencyKey(key);
    expect(op.state).toBe("compensated");
  });

  it("evaluates prompt enforcement of distributed atomic invariants", () => {
    expect(CODING_PROMPT).toContain("Atomic Balance & Reservation");
    expect(CODING_PROMPT).toContain("Database-Enforced Idempotency");
    expect(CODING_PROMPT).toContain("Durable Transaction State Machine");
    expect(CODING_PROMPT).toContain("Ambiguous Network Failures & Never Blindly Compensate");
    expect(CODING_PROMPT).toContain("Integer Minor Units");
    expect(CODING_PROMPT).toContain("Typed Domain Errors");
  });

  it("un-escapes accidental backslash markdown tokens in deliverable parser", () => {
    const rawMarkdownWithEscapes = "\\### Distributed State Machine\n\n\\*\\*Phase 1\\*\\*: The operation creates a durable WAL entry.\n\n\\`\\`\\`javascript\nconsole.log('clean code');\n\\`\\`\\`";
    const { deliverable } = extractDeliverableAndScaffolding(rawMarkdownWithEscapes);
    expect(deliverable).toContain("### Distributed State Machine");
    expect(deliverable).toContain("**Phase 1**:");
    expect(deliverable).toContain("```javascript");
    expect(deliverable).not.toContain("\\###");
    expect(deliverable).not.toContain("\\**");
  });
});
