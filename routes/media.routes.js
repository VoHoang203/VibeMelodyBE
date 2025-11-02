// routes/media.routes.js
import express from "express";
import { listArtistSongs, createSong } from "../controller/song.controller.js";
import {
  createAlbum,
  updateAlbum,
  toggleHideAlbum,
  listAlbumsByArtist,
  getAlbumById
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

// ✅ Dùng multer cho route này
router.post(
  "/songs",
  upload.fields([
    { name: "audioFile", maxCount: 10 },
    { name: "imageFile", maxCount: 10 },
  ]),
  createSong
);

router.get("/songs", listArtistSongs); // ?artistId=...&unassigned=true

// ALBUMS
// form-data: imageFile + fields khác
router.post("/albums", upload.fields([
    { name: "imageFile"},
  ]), createAlbum);

// Cập nhật toàn bộ album (ghi đè mọi field, cả songs)
router.put("/albums/:albumId", upload.fields([
    { name: "imageFile"},
  ]), updateAlbum);

// Ẩn/hiện album
router.patch("/albums/:albumId/hide", toggleHideAlbum);

router.get("/albums", listAlbumsByArtist);
router.get("/albums/:albumId", getAlbumById);   

export default router;
