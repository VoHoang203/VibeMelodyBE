// controllers/song.controller.js
import { Song } from "../models/song.model.js";
import { Album } from "../models/album.model.js";
import { User } from "../models/user.model.js";
import { uploadToCloudinary } from "../config/cloudinary.js";
import { notify } from "../services/notify.service.js";
import { Comment } from "../models/comment.model.js"; // giả định bạn có model này
import mongoose from "mongoose";

/**
 * Helper: đảm bảo field có thể là 1 file hoặc mảng file → trả về mảng
 */
function toArray(v) {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

/**
 * POST /songs
 */
export const createSong = async (req, res) => {
  try {
    console.log("Content-Type:", req.headers["content-type"]);
    console.log("BODY:", req.body);
    console.log("FILES:", req.files);
    const { artistId, artistName, albumId } = req.body;

    if (!artistId || !artistName)
      return res.status(400).json({ message: "Missing artistId / artistName" });

    // ép các field thành mảng để xử lý đồng nhất
    const titles = [].concat(req.body.title || []);
    const durations = [].concat(req.body.duration || []);
    const audioFiles = [].concat(req.files?.audioFile || []);
    const imageFiles = [].concat(req.files?.imageFile || []);

    if (audioFiles.length === 0)
      return res.status(400).json({ message: "No audio file(s) uploaded" });

    const created = [];

    // chạy lần lượt từng file để tránh lỗi Cloudinary race
    for (let i = 0; i < audioFiles.length; i++) {
      const title = titles[i] || `Untitled ${i + 1}`;
      const duration = Number(durations[i] || 0);
      const audioFile = audioFiles[i];
      const imageFile = imageFiles[i];

      console.log(`→ Uploading song #${i + 1}: ${title}`);

      const audioUrl = await uploadToCloudinary(
        audioFile,
        "spotify_clone/audios"
      );
      const imageUrl = imageFile
        ? await uploadToCloudinary(imageFile, "spotify_clone/covers")
        : null;

      const song = await Song.create({
        title,
        artist: artistName,
        artistId,
        duration,
        audioUrl,
        imageUrl,
        albumId: albumId || null,
      });

      if (albumId) {
        await Album.findByIdAndUpdate(albumId, { $push: { songs: song._id } });
      }

      created.push(song);
    }

    console.log(
      "✅ Created songs:",
      created.map((s) => s.title)
    );
    res.status(201).json({ created });
  } catch (err) {
    console.error("❌ Error in createSong:", err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /songs?artistId=...&unassigned=true|false
 * - Trả danh sách bài hát của nghệ sĩ (có thể lọc "chưa thuộc album").
 */
export const listArtistSongs = async (req, res, next) => {
  try {
    const { artistId, unassigned } = req.query;
    if (!artistId) return res.status(400).json({ message: "Missing artistId" });

    const filter = { artistId };
    if (String(unassigned) === "true") filter.albumId = null;

    const songs = await Song.find(filter).sort({ createdAt: -1 });
    res.json(songs);
  } catch (e) {
    next(e);
    res.status(500).json({ message: e.message });
  }
};

const isId = (v) => mongoose.Types.ObjectId.isValid(v);

/**
 * GET /songs?artistId=&albumId=&unassigned=true&q=
 * - Không paginate, sort mới → cũ
 * - Nếu có q: tìm theo title hoặc artist (regex, case-insensitive)
 */
export const getAllSongs = async (req, res, next) => {
  try {
    const { artistId, albumId, unassigned, q = "" } = req.query;

    const filter = {};
    if (artistId) {
      if (!isId(artistId)) return res.status(400).json({ message: "Invalid artistId" });
      filter.artistId = artistId;
    }
    if (albumId) {
      if (!isId(albumId)) return res.status(400).json({ message: "Invalid albumId" });
      filter.albumId = albumId;
    }
    if (String(unassigned) === "true") {
      filter.albumId = null;
    }
    if (q.trim()) {
      const rx = new RegExp(q.trim(), "i");
      filter.$or = [{ title: rx }, { artist: rx }];
    }

    const songs = await Song.find(filter)
      .sort({ createdAt: -1 })
      .select("_id title artist artistId imageUrl audioUrl duration likesCount albumId createdAt")
      .lean();

    res.json(songs);
  } catch (error) {
    next(error);
  }
};


/**
 * GET /songs/:id
 * Trả: { song, artist, comments }
 * - song: thông tin bài hát
 * - artist: thông tin nghệ sĩ (từ song.artistId)
 * - comments: list bình luận (mới → cũ), kèm user của comment
 */
export const getSongById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isId(id)) return res.status(400).json({ message: "Invalid song id" });

    const song = await Song.findById(id).lean();
    if (!song) return res.status(404).json({ message: "Song not found" });

    // lấy song.artistId -> artist
    const artistPromise = User.findById(song.artistId)
      .select("_id fullName username imageUrl clerkId")
      .lean();

    // comments theo songId, populate user
    const commentsPromise = Comment.find({ songId: id })
      .sort({ createdAt: -1 })
      .populate("userId", "_id fullName username imageUrl clerkId")
      .lean();

    const [artist, comments] = await Promise.all([artistPromise, commentsPromise]);

    return res.json({ song, artist, comments });
  } catch (err) {
    next(err);
  }
};