// src/server.js
require("dotenv").config();
const express = require("express");
const { createServer } = require("node:http");
const cors = require("cors");
const { initSocket } = require("./sockets");

const app = express();
const server = createServer(app);

const PORT = process.env.PORT || 3000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

initSocket(server, CLIENT_ORIGIN);

server.listen(PORT, () => {
  console.log(`server running at http://localhost:${PORT}`);
});
