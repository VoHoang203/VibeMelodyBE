import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { likeSong, unlikeSong, getSongLikeStatus } from "../controller/like.controller.js";

const router = Router();

/**
 * @swagger
 * /songs/{songId}/like-status:
 *   get:
 *     summary: Kiểm tra trạng thái like của người dùng với bài hát
 *     description: Kiểm tra xem người dùng hiện tại đã like bài hát này hay chưa. Cần xác thực bằng JWT.
 *     tags: [Songs - Likes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: songId
 *         in: path
 *         required: true
 *         description: ID của bài hát
 *         schema:
 *           type: string
 *           example: 6738c5f2a03ab4c47bf0a1d2
 *     responses:
 *       200:
 *         description: Trạng thái like của người dùng
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 liked:
 *                   type: boolean
 *                   example: true
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy bài hát
 */
router.get("/songs/:songId/like-status", requireAuth, getSongLikeStatus);
/**
 * @swagger
 * /songs/{songId}/like:
 *   post:
 *     summary: Like bài hát
 *     description: Người dùng đã đăng nhập có thể like một bài hát. Cần xác thực bằng JWT.
 *     tags: [Songs - Likes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: songId
 *         in: path
 *         required: true
 *         description: ID của bài hát cần like
 *         schema:
 *           type: string
 *           example: 6738c5f2a03ab4c47bf0a1d2
 *     responses:
 *       200:
 *         description: Like bài hát thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Song liked successfully
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy bài hát
 */
router.post("/songs/:songId/like", requireAuth, likeSong);
/**
 * @swagger
 * /songs/{songId}/like:
 *   delete:
 *     summary: Bỏ like bài hát
 *     description: Người dùng đã đăng nhập có thể bỏ like một bài hát. Cần xác thực bằng JWT.
 *     tags: [Songs - Likes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: songId
 *         in: path
 *         required: true
 *         description: ID của bài hát cần bỏ like
 *         schema:
 *           type: string
 *           example: 6738c5f2a03ab4c47bf0a1d2
 *     responses:
 *       200:
 *         description: Bỏ like bài hát thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Song unliked successfully
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy bài hát
 */


router.delete("/songs/:songId/like", requireAuth, unlikeSong);


export default router;
