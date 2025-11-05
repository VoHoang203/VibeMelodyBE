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
    console.log(artistId);

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

export const getSongDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const song = await Song.findById(id);
    if (!song) return res.status(404).json({ message: "Song not found" });
    res.json(song);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// LIKE / UNLIKE 1 BÀI HÁT
export const toggleLikeSong = async (req, res) => {
  try {
    const { id } = req.params;
    const song = await Song.findById(id);
    if (!song) return res.status(404).json({ message: "Song not found" });

    song.likesCount = (song.likesCount || 0) + 1;
    await song.save();

    res.json({ message: "Liked", likesCount: song.likesCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// THÊM BÌNH LUẬN
export const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { userName, content } = req.body;

    const song = await Song.findById(id);
    if (!song) return res.status(404).json({ message: "Song not found" });

    const newComment = {
      userName: userName || "Anonymous",
      content,
      createdAt: new Date(),
    };

    song.comments.push(newComment);
    await song.save();

    res.json({ message: "Comment added", comments: song.comments });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
/**
 * GET /albums
 * → Lấy danh sách tất cả album, có kèm thông tin bài hát
 */
export const getAllAlbums = async (req, res) => {
  try {
    const albums = await Album.find({})
      .populate("songs", "title artist imageUrl duration audioUrl") // lấy danh sách bài hát
      .populate("artistId", "name") // nếu muốn có thông tin nghệ sĩ
      .sort({ createdAt: -1 });

    res.status(200).json(albums);
  } catch (error) {
    console.error("❌ Error in getAllAlbums:", error);
    res.status(500).json({ message: error.message });
  }
};

export const createAlbum = async (req, res) => {
  try {
    const { title, artistId, artistName, year } = req.body;

    if (!title || !artistId || !artistName)
      return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });

    let coverImage = null;
    if (req.file) {
      coverImage = await uploadToCloudinary(req.file, "spotify_clone/albums");
    }

    const album = await Album.create({
      title,
      artistId,
      artistName,
      year,
      coverImage,
      songs: [],
      visible: true,
    });

    res.status(201).json(album);
  } catch (err) {
    console.error("❌ Error in createAlbum:", err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * PATCH /albums/:id/visibility
 * → Ẩn / hiện album
 */
export const toggleAlbumVisibility = async (req, res) => {
  try {
    const { id } = req.params;
    const album = await Album.findById(id);
    if (!album) return res.status(404).json({ message: "Album không tồn tại" });

    album.visible = !album.visible;
    await album.save();

    res.json({ message: "Cập nhật thành công", album });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * DELETE /albums/:id
 * → Xóa album và cập nhật lại các bài hát liên quan
 */
export const deleteAlbum = async (req, res) => {
  try {
    const { id } = req.params;

    const album = await Album.findById(id);
    if (!album) return res.status(404).json({ message: "Album không tồn tại" });

    // Bỏ liên kết album trong các bài hát
    await Song.updateMany({ albumId: id }, { $unset: { albumId: "" } });
    await Album.findByIdAndDelete(id);

    res.json({ message: "Đã xóa album thành công" });
  } catch (err) {
    console.error("❌ Error in deleteAlbum:", err);
    res.status(500).json({ message: err.message });
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
      if (!isId(artistId))
        return res.status(400).json({ message: "Invalid artistId" });
      filter.artistId = artistId;
    }
    if (albumId) {
      if (!isId(albumId))
        return res.status(400).json({ message: "Invalid albumId" });
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
      .select(
        "_id title artist artistId imageUrl audioUrl duration likesCount albumId createdAt"
      )
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
    const artistPromise = await User.findById(song.artistId)
      .select("_id fullName username imageUrl")
      .lean();

    // comments theo songId, populate user
    const commentsPromise = await Comment.find({ songId: id })
      .sort({ createdAt: -1 })
      .populate("userId", "_id fullName username imageUrl")
      .lean();

    const [artist, comments] = await Promise.all([
      artistPromise,
      commentsPromise,
    ]);

    return res.json({ song, artist, comments });
  } catch (err) {
    console.error("❌ Error in deleteAlbum:", err);
    res.status(500).json({ message: err.message });
  }
};
