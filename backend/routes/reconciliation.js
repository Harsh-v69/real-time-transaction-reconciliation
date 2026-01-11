const express = require("express");
const Transaction = require("../models/Transaction");

const router = express.Router();

/**
 * GET /summary
 */
router.get("/summary", async (req, res) => {
  const total = await Transaction.countDocuments();
  const matched = await Transaction.countDocuments({ final_status: "MATCHED" });
  const mismatch = await Transaction.countDocuments({ final_status: "MISMATCH" });
  const pending = total - matched - mismatch;

  res.json({
    total,
    matched,
    pending,
    mismatch
  });
});

/**
 * GET /transactions
 */
router.get("/transactions", async (req, res) => {
  const { scenario } = req.query;

  const filter = scenario ? { scenario } : {};

  const txns = await Transaction.find(filter)
    .sort({ created_at: -1 })
    .limit(20);

  res.json(
    txns.map(t => ({
      transactionId: t.txn_id,
      amount: t.amount,
      result: t.final_status,
      scenario: t.scenario,
      timestamp: t.created_at
    }))
  );
});

/**
 * GET /transaction/:id
 */
router.get("/transaction/:id", async (req, res) => {
  const t = await Transaction.findOne({ txn_id: req.params.id });

  if (!t) {
    return res.status(404).json({ error: "Transaction not found" });
  }

  res.json({
    transactionId: t.txn_id,
    amount: t.amount,
    result: t.final_status,
    scenario: t.scenario,
    mismatch_reason: t.mismatch_reason,

    merchant: t.merchant,
    gateway: t.gateway,
    bank: t.bank
  });
});

router.get("/volume", async (req, res) => {
  const lastMinutes = 10;

  const since = new Date(Date.now() - lastMinutes * 60 * 1000);

  const data = await Transaction.aggregate([
    { $match: { created_at: { $gte: since } } },
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%H:%M",
            date: "$created_at"
          }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { "_id": 1 } }
  ]);

  res.json(
    data.map(d => ({
      time: d._id,
      count: d.count
    }))
  );
});

module.exports = router;
