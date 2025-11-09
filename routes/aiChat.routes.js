import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { chatWithAI, getAiMessages } from "../controller/aiChat.controller.js";

const router = express.Router();

router.get("/messages", requireAuth, getAiMessages);
router.post("/chat", requireAuth, chatWithAI);

export default router;
