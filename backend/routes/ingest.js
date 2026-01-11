const express = require("express");
const normalize = require("../services/normalizeService");
const buffer = require("../services/bufferService");
const reconcile = require("../services/reconcileService");

const router = express.Router();

router.post("/", async (req, res) => {
  const normalized = normalize(req.body);
  await buffer.store(normalized);
  await reconcile.tryReconcile(
    normalized.transaction_id,
    req.app
  );
  res.send({ status: "received" });
});

module.exports = router;
