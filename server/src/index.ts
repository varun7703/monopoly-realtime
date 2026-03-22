import "dotenv/config";
import cors from "cors";
import express from "express";
import http from "http";
import mongoose from "mongoose";
import { Server } from "socket.io";
import { registerSocketHandlers } from "./network/socketHandlers";

const PORT = Number(process.env.PORT ?? 4000);
const MONGO_URI = process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/monopoly";

const start = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected.");
  } catch (error) {
    // Keep server available for gameplay even when local Mongo is not running.
    // Save/load endpoints will return errors until Mongo is reachable.
    console.warn(`MongoDB unavailable at ${MONGO_URI}. Running without persistence.`);
    console.warn((error as Error).message);
  }

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/health", (_, res) => res.json({ ok: true }));

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: "*" }
  });

  io.on("connection", (socket) => registerSocketHandlers(io, socket));

  server.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
  });
};

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
