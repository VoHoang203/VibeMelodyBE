// routes/chat.routes.js
import express from "express";
import { checkArtistStatus } from "../controller/artist.controller.js";
import { requireAuth } from "../middleware/requireAuth.js"; // bạn đã có middleware này rồi đúng không?

const router = express.Router();

/**
 * @swagger
 * /artist/check:
 *   get:
 *     summary: Kiểm tra trạng thái nghệ sĩ (artist)
 *     description: Trả về thông tin xác nhận xem người dùng hiện tại có phải là nghệ sĩ hay không. Cần đăng nhập bằng token JWT.
 *     tags: [Artists]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trả về trạng thái nghệ sĩ của người dùng hiện tại
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isArtist:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Bạn là nghệ sĩ hợp lệ
 *       401:
 *         description: Không có quyền truy cập (chưa đăng nhập hoặc token không hợp lệ)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Unauthorized
 *       500:
 *         description: Lỗi server
 */
router.get("/check", requireAuth, checkArtistStatus);


export default router;
