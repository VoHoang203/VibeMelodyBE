import { Router } from "express";
import {
  getCommentsBySong,
  createComment,
} from "../controller/comment.controller.js";

const router = Router({ mergeParams: true });

// GET /api/songs/:songId/comments
router.get("/", getCommentsBySong);

// POST /api/songs/:songId/comments
// Body cần: { userId, content, timestamp? }
/**
 * @swagger
 * /songs/{songId}/comments:
 *   post:
 *     summary: Thêm bình luận mới cho bài hát
 *     description: Người dùng có thể thêm một bình luận mới cho một bài hát cụ thể. Cần xác thực bằng JWT.
 *     tags: [Songs - Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: songId
 *         in: path
 *         required: true
 *         description: ID của bài hát cần bình luận
 *         schema:
 *           type: string
 *           example: 6738c5f2a03ab4c47bf0a1d2
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 example: "Tôi rất thích giai điệu của bài này!"
 *               timestamp:
 *                 type: string
 *                 example: "2025-11-07T10:15:00.000Z"
 *     responses:
 *       201:
 *         description: Bình luận được tạo thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Comment created successfully"
 *                 comment:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: 6740b3c1e91a5c81236bfab2
 *                     content:
 *                       type: string
 *                       example: "Tôi rất thích bài hát này!"
 *                     createdAt:
 *                       type: string
 *                       example: "2025-11-07T10:15:00.000Z"
 *       400:
 *         description: Thiếu dữ liệu hoặc request không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 */
router.post("/", createComment);

export default router;
