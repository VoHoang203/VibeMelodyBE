import { Router } from "express";
import {
  getCommentsBySong,
  createComment,
} from "../controllers/comment.controller.js";

const router = Router({ mergeParams: true });

// GET /api/songs/:songId/comments
router.get("/", getCommentsBySong);

// POST /api/songs/:songId/comments
// Body cần: { userId, content, timestamp? }
router.post("/", createComment);

export default router;
