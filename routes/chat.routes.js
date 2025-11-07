// routes/chat.routes.js
import express from "express";
import { getAllUsers, getMessages } from "../controller/chat.controller.js";
// middleware auth của Clerk đã gắn req.auth.userId
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
router.get("/chat/users", getAllUsers);

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
router.get("/chat/messages/:userId", getMessages);

export default router;
