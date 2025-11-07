// routes/chat.routes.js
import express from "express";
import { checkArtistStatus } from "../controller/artist.controller.js";
import { requireAuth } from "../middleware/requireAuth.js"; // bạn đã có middleware này rồi đúng không?

const router = express.Router();

router.get("/check",requireAuth, checkArtistStatus);

export default router;
