const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const connectMongo = require("./config/mongo");
const ingestRoute = require("./routes/ingest");
const reconciliationRoute = require("./routes/reconciliation");

const app = express();
const server = http.createServer(app);

// 🔴 CORS MUST COME FIRST
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

// Routes
app.use("/ingest", ingestRoute);
app.use("/api/reconciliation", reconciliationRoute);

// Socket.IO
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.set("io", io);

// DB
connectMongo();

// Start server
server.listen(5000, () => {
  console.log("🚀 Backend running on http://localhost:5000");
});
