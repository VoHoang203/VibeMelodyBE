import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import cron from "node-cron";
import morgan from "morgan";
import connectDB from "./config/db.js";
import albumUpdateRoutes from "./routes/media.routes.js";
import chatRoute from "./routes/chat.routes.js"
import bodyParser from "body-parser";
import { initializeSocket } from "./sockets/socket.js";
import { createServer } from "http";
dotenv.config();
connectDB();

const app = express();

// ✅ CORS
app.use(
  cors({
    origin: ["http://localhost:3000" , "*"],
    credentials: true,
  })
);
app.use(bodyParser.json());

// ✅ Logging
app.use(morgan("dev"));

// ✅ Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: "100mb" }));



// ✅ Gắn route chính (chứa controller createSong)
app.use("/api", albumUpdateRoutes);
app.use("/api", (await import("./routes/auth.route.js")).default);
app.use("/api", (await import("./routes/payos.routes.js")).default);
app.use("/api", chatRoute);
app.use("/api/artist", (await import("./routes/artist.route.js")).default);

// ✅ Root
app.get("/", (req, res) => {
  res.send("API is running...");
});

// ✅ Socket.io
const server = http.createServer(app);
initializeSocket(server);

// ✅ Start
const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
