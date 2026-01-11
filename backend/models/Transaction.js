const mongoose = require("mongoose");

const SourceSchema = new mongoose.Schema(
  {
    amount: Number,
    status: String
  },
  { _id: false }
);

const TransactionSchema = new mongoose.Schema({
  txn_id: { type: String, index: true },

  amount: Number,
  final_status: String,              // MATCHED | MISMATCH | PENDING

  scenario: String,                  // PERFECT_MATCH | AMOUNT_MISMATCH | ...
  mismatch_reason: String,           // Human-readable root cause

  merchant: SourceSchema,
  gateway: SourceSchema,
  bank: SourceSchema,

  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Transaction", TransactionSchema);
