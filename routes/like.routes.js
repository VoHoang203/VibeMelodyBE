import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { likeSong, unlikeSong, getSongLikeStatus } from "../controller/like.controller.js";

const router = Router();

router.get("/songs/:songId/like-status",requireAuth, getSongLikeStatus);
router.post("/songs/:songId/like",requireAuth, likeSong);
router.delete("/songs/:songId/like",requireAuth, unlikeSong);

export default router;
