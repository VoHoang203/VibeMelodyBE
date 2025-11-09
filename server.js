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
import swaggerDocs from "./config/swagger.js";
import { initializeSocket } from "./sockets/socket.js";
import commentsRouter from "./routes/comment.routes.js";
import likeRoutes from "./routes/like.routes.js";
import followRoutes from "./routes/follow.routes.js";
import aiChatRoutes from "./routes/aiChat.routes.js";
import passport from "passport";
import "./config/passport.js";

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
app.use(passport.initialize());
// ✅ Logging
app.use(morgan("dev"));

// ✅ Body parsers
app.use(
  express.json({
    limit: "100mb",
  })
);
app.use(
  express.urlencoded({
    extended: true,
    limit: "100mb",
  })
);
app.use(express.urlencoded({ extended: true, limit: "100mb" }));



// ✅ Gắn route chính (chứa controller createSong)
app.use("/api", albumUpdateRoutes);
app.use("/api", (await import("./routes/auth.route.js")).default);
app.use("/api", (await import("./routes/payos.routes.js")).default);
app.use("/api", chatRoute);

app.use("/api", (await import("./routes/artist.route.js")).default);
app.use("/api/songs/:songId/comments", commentsRouter);
app.use("/api", likeRoutes);
app.use("/api", followRoutes);
app.use("/api/ai", aiChatRoutes);
// ✅ Root
swaggerDocs(app);
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
