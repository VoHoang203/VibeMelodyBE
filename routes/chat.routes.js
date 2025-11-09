// routes/chat.routes.js
import express from "express";
import { getAllUsers, getMessages,getAllNotifications } from "../controller/chat.controller.js";
import { requireAuth } from "../controller/auth.controller.js";

const router = express.Router();
/**
 * @swagger
 * tags:
 *   name: Chat
 *   description: API cho tính năng chat giữa người dùng
 */

/**
 * @swagger
 * /chat/users:
 *   get:
 *     summary: Lấy danh sách người dùng có thể chat
 *     tags: [Chat]
 *     description: Trả về danh sách tất cả người dùng (trừ người đang đăng nhập). Có thể tìm kiếm theo tên hoặc email.
 *     parameters:
 *       - name: q
 *         in: query
 *         description: Từ khóa tìm kiếm theo tên hoặc email
 *         required: false
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thành công - trả về danh sách người dùng
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                     example: 64a12f7b3c1e5f001f77c123
 *                   clerkId:
 *                     type: string
 *                     example: user_2Hs3ABXYZ
 *                   fullName:
 *                     type: string
 *                     example: Nguyễn Văn A
 *                   username:
 *                     type: string
 *                     example: nguyenvana
 *                   email:
 *                     type: string
 *                     example: user@example.com
 *                   imageUrl:
 *                     type: string
 *                     example: https://example.com/avatar.jpg
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Không có quyền truy cập
 */
router.get("/chat/users",requireAuth, getAllUsers);

/**
 * @swagger
 * /chat/messages/{userId}:
 *   get:
 *     summary: Lấy tin nhắn giữa người dùng hiện tại và userId
 *     tags: [Chat]
 *     description: Lấy danh sách tin nhắn giữa người đang đăng nhập và userId, sắp xếp theo thời gian tăng dần.
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         description: Clerk userId của người dùng cần lấy tin nhắn
 *         schema:
 *           type: string
 *           example: user_1AbCdEfGhiJ
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thành công - trả về danh sách tin nhắn
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                     example: 64b2a9e1f8b7b001fa1e5678
 *                   senderId:
 *                     type: string
 *                     example: user_2Hs3ABXYZ
 *                   receiverId:
 *                     type: string
 *                     example: user_1AbCdEfGhiJ
 *                   message:
 *                     type: string
 *                     example: "Xin chào, bạn khỏe không?"
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *       400:
 *         description: Thiếu userId hoặc không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 */
router.get("/chat/messages/:userId",requireAuth, getMessages);
// 🆕 Route lấy danh sách thông báo
/**
 * @swagger
 * /chat/allnoti:
 *   get:
 *     summary: Lấy danh sách thông báo của người dùng hiện tại
 *     tags: [Chat]
 *     description: Trả về danh sách các thông báo (notification) từ cơ sở dữ liệu
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thành công - trả về danh sách thông báo
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   content:
 *                     type: string
 *                     example: "Your song was liked by user123"
 *                   imageUrl:
 *                     type: string
 *                     example: "https://example.com/image.jpg"
 *                   at:
 *                     type: string
 *                     format: date-time
 *                   meta:
 *                     type: object
 *                     example: { type: "LIKE_SONG", songId: "abc123" }
 *       401:
 *         description: Không có quyền truy cập
 */
router.get("/chat/allnoti", requireAuth, getAllNotifications);
export default router;
