// routes/media.routes.js
import express from "express";

import {
  listArtistSongs,
  createSong,
  getAllSongs,
  getSongDetail,
  addComment,
  toggleAlbumVisibility,
  deleteAlbum,
  getSongById,
} from "../controller/song.controller.js";

import {
  createAlbum,
  updateAlbum,
  toggleHideAlbum,
  listAlbumsByArtist,
  getAlbumById,
  getAllAlbums,
} from "../controller/album.controller.js";
import multer from "multer";
import path from "path";
import fs from "fs";
const router = express.Router();

// ✅ cấu hình multer riêng cho route này
const uploadPath = path.join(process.cwd(), "uploads/tmp");
fs.mkdirSync(uploadPath, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadPath),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({ storage });
/**
 * @swagger
 * tags:
 *   - name: Songs
 *     description: API quản lý bài hát
 *   - name: Albums
 *     description: API quản lý album
 */

/**
 * @swagger
 * /api/songs:
 *   post:
 *     summary: Tạo mới bài hát
 *     tags: [Songs]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               artistId:
 *                 type: string
 *               artistName:
 *                 type: string
 *               audioFile:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               imageFile:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Bài hát được tạo thành công
 *       400:
 *         description: Thiếu dữ liệu hoặc lỗi định dạng
 */
// ✅ Dùng multer cho route này
router.post(
  "/songs",
  upload.fields([
    { name: "audioFile", maxCount: 10 },
    { name: "imageFile", maxCount: 10 },
  ]),
  createSong
);
/**
 * @swagger
 * /api/songs:
 *   get:
 *     summary: Lấy danh sách bài hát của nghệ sĩ
 *     tags: [Songs]
 *     parameters:
 *       - in: query
 *         name: artistId
 *         schema:
 *           type: string
 *         description: ID của nghệ sĩ
 *       - in: query
 *         name: unassigned
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Danh sách bài hát
 */
router.get("/songs", listArtistSongs); // ?artistId=...&unassigned=true
/**
 * @swagger
 * /api/all:
 *   get:
 *     summary: Lấy tất cả bài hát trong hệ thống
 *     tags: [Songs]
 *     responses:
 *       200:
 *         description: Danh sách tất cả bài hát
 */
router.get("/all", getAllSongs);

router.get("/albums", getAllAlbums);
// POST create new album
router.post("/albums", upload.single("coverImage"), createAlbum);
/**
 * @swagger
 * /api/albums/{id}/visibility:
 *   patch:
 *     summary: Chuyển đổi hiển thị album (visible/hidden)
 *     tags: [Albums]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
// PATCH toggle visibility
router.patch("/albums/:id/visibility", toggleAlbumVisibility);
/**
 * @swagger
 * /api/albums/{id}:
 *   delete:
 *     summary: Xóa album
 *     tags: [Albums]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Xóa album thành công
 */
// DELETE album
router.delete("/albums/:id", deleteAlbum);
/**
 * @swagger
 * /api/songs/{id}:
 *   get:
 *     summary: Xem chi tiết một bài hát
 *     tags: [Songs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID bài hát
 *     responses:
 *       200:
 *         description: Thông tin chi tiết bài hát
 */
router.get("/songs/:id", getSongDetail);
router.post("/songs/:id/like", toggleHideAlbum);
/**
 * @swagger
 * /api/songs/{id}/comment:
 *   post:
 *     summary: Bình luận vào bài hát
 *     tags: [Songs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Thêm bình luận thành công
 */
router.post("/songs/:id/comment", addComment);

// ALBUMS
// form-data: imageFile + fields khác
router.post("/albums", upload.fields([{ name: "imageFile" }]), createAlbum);

/**
 * @swagger
 * /api/albums/{albumId}:
 *   put:
 *     summary: Cập nhật album
 *     tags: [Albums]
 *     parameters:
 *       - in: path
 *         name: albumId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               imageFile:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
// Cập nhật toàn bộ album (ghi đè mọi field, cả songs)
router.put(
  "/albums/:albumId",
  upload.fields([{ name: "imageFile" }]),
  updateAlbum
);
/**
 * @swagger
 * /api/albums/{albumId}/hide:
 *   patch:
 *     summary: Ẩn hoặc hiện album
 *     tags: [Albums]
 *     parameters:
 *       - in: path
 *         name: albumId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cập nhật trạng thái thành công
 */
// Ẩn/hiện album
router.patch("/albums/:albumId/hide", toggleHideAlbum);
/**
 * @swagger
 * /api/albums:
 *   get:
 *     summary: Lấy danh sách album của nghệ sĩ
 *     tags: [Albums]
 *     parameters:
 *       - in: query
 *         name: artistId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Danh sách album
 */
router.get("/albums", listAlbumsByArtist);
/**
 * @swagger
 * /api/albums/{albumId}:
 *   get:
 *     summary: Xem chi tiết album
 *     tags: [Albums]
 *     parameters:
 *       - in: path
 *         name: albumId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Chi tiết album
 */
router.get("/albums/:albumId", getAlbumById);
/**
 * @swagger
 * /api/allsongs:
 *   get:
 *     summary: Lấy tất cả bài hát trong hệ thống
 *     tags: [Songs]
 *     responses:
 *       200:
 *         description: Danh sách tất cả bài hát
 */
router.get("/allsongs", getAllSongs);

// ALBUMS
router.get("/allalbums", getAllAlbums);

router.get("/songs/:id", getSongById);
export default router;
