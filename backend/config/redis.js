const { createClient } = require("redis");

const client = createClient();

client.connect();
client.on("connect", () => console.log("✅ Redis connected"));

module.exports = client;
