// routes/chat.routes.js
import express from "express";
import { getAllUsers, getMessages } from "../controller/chat.controller.js";
// middleware auth của Clerk đã gắn req.auth.userId
const router = express.Router();

router.get("/chat/users", getAllUsers);
router.get("/chat/messages/:userId", getMessages);

export default router;
