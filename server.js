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
dotenv.config();
connectDB();

const app = express();

// ✅ CORS
app.use(
  cors({
    origin: "http://localhost:3000",
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
app.use("/api", chatRoute);

// ✅ Root
app.get("/", (req, res) => {
  res.send("API is running...");
});

// ✅ Socket.io
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
io.on("connection", (socket) => {
  console.log("🟢 New client connected:", socket.id);
  socket.on("disconnect", () =>
    console.log(" Client disconnected:", socket.id)
  );
});

// ✅ Start
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
