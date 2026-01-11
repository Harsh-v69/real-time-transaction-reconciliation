module.exports = (event) => {
  if (!event.transaction_id || !event.source)
    throw new Error("Invalid event");

  return {
    transaction_id: event.transaction_id,
    amount: Number(event.amount),
    status: event.status.toUpperCase(),
    source: event.source,
    timestamp: new Date(event.timestamp).toISOString()
  };
};
