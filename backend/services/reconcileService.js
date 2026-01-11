const redis = require("../config/redis");
const Transaction = require("../models/Transaction");

/**
 * Detect reconciliation scenario from buffered events
 */
function detectScenario(events) {
  const sources = Object.keys(events);

  // Missing event
  if (!events.bank) {
    return {
      scenario: "MISSING_EVENT",
      final_status: "MISMATCH",
      mismatch_reason: "Bank confirmation missing"
    };
  }

  // Collect amounts and statuses
  const amounts = {};
  const statuses = {};

  for (const src of sources) {
    amounts[src] = events[src].amount;
    statuses[src] = events[src].status;
  }

  // Amount mismatch
  const uniqueAmounts = new Set(Object.values(amounts));
  if (uniqueAmounts.size > 1) {
    return {
      scenario: "AMOUNT_MISMATCH",
      final_status: "MISMATCH",
      mismatch_reason: "Amounts differ across sources"
    };
  }

  // Status conflict
  const uniqueStatuses = new Set(Object.values(statuses));
  if (uniqueStatuses.size > 1) {
    return {
      scenario: "STATUS_CONFLICT",
      final_status: "MISMATCH",
      mismatch_reason: "Status conflict between sources"
    };
  }

  // Delayed bank (all match, but arrived late)
  if (events.bank.delayed === true) {
    return {
      scenario: "DELAYED_BANK",
      final_status: "MATCHED",
      mismatch_reason: null
    };
  }

  // Duplicate event (implicitly handled by Redis dedup)
  if (events.gateway && events.gateway.duplicate === true) {
    return {
      scenario: "DUPLICATE_EVENT",
      final_status: "MATCHED",
      mismatch_reason: null
    };
  }

  // Perfect match
  return {
    scenario: "PERFECT_MATCH",
    final_status: "MATCHED",
    mismatch_reason: null
  };
}

/**
 * Attempt reconciliation for a transaction
 */
exports.tryReconcile = async (txnId, app) => {
  const key = `txn:${txnId}`;
  const raw = await redis.get(key);

  if (!raw) return;

  const { events } = JSON.parse(raw);
  const sources = Object.keys(events);

  // Incomplete → still pending
  if (sources.length < 2) return;

  // Detect scenario from actual data
  const {
    scenario,
    final_status,
    mismatch_reason
  } = detectScenario(events);

  // Persist final transaction
  const saved = await Transaction.create({
    txn_id: txnId,
    amount: events.merchant?.amount || 0,
    final_status,
    scenario,
    mismatch_reason,
    merchant: events.merchant || null,
    gateway: events.gateway || null,
    bank: events.bank || null
  });

  // Cleanup Redis buffer
  await redis.del(key);

  // 🔴 Emit real-time update to frontend
  if (app) {
    const io = app.get("io");
    if (io) {
      io.emit("reconciliation_update", {
        transactionId: saved.txn_id,
        result: saved.final_status,
        scenario: saved.scenario
      });
    }
  }
};
