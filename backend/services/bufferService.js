const redis = require("../config/redis");

const TTL = 30; // seconds

exports.store = async (event) => {
  const key = `txn:${event.transaction_id}`;

  const existing = await redis.get(key);
  const data = existing ? JSON.parse(existing) : { events: {} };

  // Deduplication
  if (data.events[event.source]) return;

  data.events[event.source] = {
    amount: event.amount,
    status: event.status
  };

  await redis.set(key, JSON.stringify(data), { EX: TTL });
};
