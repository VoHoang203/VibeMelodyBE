import express from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import {
  requireAuth,
  signup,
  login,
  refreshToken,
  getProfile,
  updateProfile,
  changePassword,
  logout,
  artistRegister,
  artistUpdateProfile,
  artistGetSubscription,
} from "../controller/auth.controller.js";
const router = express.Router();
// Google Login Start
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Google OAuth Callback
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/login",
  }),
  (req, res) => {
    // Issue JWT
    const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    // Send token or redirect
    res.redirect(`/auth/success?token=${token}`);
  }
);
/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: User authentication & profile
 *   - name: Artist
 *     description: Artist-specific endpoints
 */

/**
 * @swagger
 * /auth/signup:
 *   post:
 *     summary: Đăng ký tài khoản mới
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: "Nguyen Van A"
 *               email:
 *                 type: string
 *                 example: "a@gmail.com"
 *               password:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       201:
 *         description: Tạo tài khoản thành công
 */
router.post("/auth/signup", signup);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Đăng nhập
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: "a@gmail.com"
 *               password:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Đăng nhập thành công
 */
router.post("/auth/login", login);

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     summary: Refresh access token
 *     description: Dùng refreshToken hợp lệ để nhận accessToken và refreshToken mới.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       200:
 *         description: Thành công – trả về token mới
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       401:
 *         description: Refresh token không hợp lệ
 */


router.post("/auth/refresh-token", refreshToken);

/**
 * @swagger
 * /auth/profile:
 *   get:
 *     summary: Get current user's profile
 *     description: |
 *       Lấy thông tin người dùng hiện tại dựa trên access token.
 *       Cần gửi token hợp lệ trong header:  
 *       **Authorization: Bearer <accessToken>**
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trả về thông tin người dùng hiện tại
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   example: 6541b2f58d8f0f001234abcd
 *                 fullName:
 *                   type: string
 *                   example: Nguyễn Văn A
 *                 email:
 *                   type: string
 *                   example: nguyenvana@gmail.com
 *                 imageUrl:
 *                   type: string
 *                   example: https://example.com/avatar.jpg
 *                 isArtist:
 *                   type: boolean
 *                   example: false
 *                 artistProfile:
 *                   type: object
 *                   nullable: true
 *                 createdAt:
 *                   type: string
 *                   example: 2025-11-07T08:25:42.187Z
 *                 updatedAt:
 *                   type: string
 *                   example: 2025-11-07T08:25:42.187Z
 *       401:
 *         description: Không có hoặc token không hợp lệ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Unauthorized
 */

router.get("/auth/profile", requireAuth, getProfile);

/**
 * @swagger
 * /auth/profile:
 *   patch:
 *     summary: Cập nhật thông tin cá nhân
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               imageUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.patch("/auth/profile", requireAuth, updateProfile);

/**
 * @swagger
 * /auth/change-password:
 *   post:
 *     summary: Đổi mật khẩu
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               oldPassword:
 *                 type: string
 *                 example: "123456"
 *               newPassword:
 *                 type: string
 *                 example: "abcdef"
 *     responses:
 *       200:
 *         description: Đổi mật khẩu thành công
 */
router.post("/auth/change-password", requireAuth, changePassword);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Đăng xuất (revoke refresh token)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Đăng xuất thành công
 */
router.post("/auth/logout", requireAuth, logout);

/**
 * @swagger
 * /artist/register:
 *   post:
 *     summary: Đăng ký làm nghệ sĩ
 *     tags: [Artist]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               stageName:
 *                 type: string
 *                 example: "DJ Remix"
 *               plan:
 *                 type: string
 *                 example: "artist_monthly"
 *     responses:
 *       200:
 *         description: Trở thành artist thành công
 */
router.post("/artist/register", requireAuth, artistRegister);

/**
 * @swagger
 * /artist/profile:
 *   patch:
 *     summary: Cập nhật hồ sơ nghệ sĩ
 *     tags: [Artist]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               stageName:
 *                 type: string
 *               bio:
 *                 type: string
 *     responses:
 *       200:
 *         description: Hồ sơ nghệ sĩ đã cập nhật
 */
router.patch("/artist/profile", requireAuth, artistUpdateProfile);

/**
 * @swagger
 * /artist/subscription:
 *   get:
 *     summary: Xem thông tin gói đăng ký của nghệ sĩ
 *     tags: [Artist]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trả về thông tin gói
 */
router.get("/artist/subscription", requireAuth, artistGetSubscription);

export default router;