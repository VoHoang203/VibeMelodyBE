import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import fileUpload from "express-fileupload";
import cloudinary from "cloudinary";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import cron from "node-cron";

// Load env variables
dotenv.config();

// Init express app
const app = express();
const server = http.createServer(app); // For socket.io
const io = new SocketIOServer(server, {
	cors: {
		origin: "*", // Cấu hình cụ thể theo frontend của bạn
		methods: ["GET", "POST"],
	},
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({ useTempFiles: true }));

// Cloudinary config
cloudinary.v2.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
});

// MongoDB connection
mongoose
	.connect(process.env.MONGODB_URI, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	})
	.then(() => console.log(" Connected to MongoDB"))
	.catch((err) => console.error(" MongoDB connection error:", err));

// Routes (example)
app.get("/", (req, res) => {
	res.send("API is running...");
});

// Socket.io
io.on("connection", (socket) => {
	console.log("🟢 New client connected:", socket.id);

	socket.on("disconnect", () => {
		console.log(" Client disconnected:", socket.id);
	});
});

// Cron job example (runs every minute)
cron.schedule("* * * * *", () => {
	console.log("⏰ Cron job executed at", new Date().toLocaleString());
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
	console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
