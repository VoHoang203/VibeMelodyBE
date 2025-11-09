// controllers/album.controller.js
import { Album } from "../models/album.model.js";
import { User } from "../models/user.model.js";
import { Song } from "../models/song.model.js";
import { Like } from "../models/like.model.js";
import { uploadToCloudinary } from "../config/cloudinary.js";
import { notify } from "../services/notify.service.js";
import mongoose from "mongoose";

/**
 * POST /albums
 * Form-data:
 *  - artistId, artistName, title, releaseYear
 *  - imageFile (hoặc imageUrl nếu bạn muốn, nhưng ở đây theo file)
 *  - songIds (JSON string array)  → FE sắp xếp trước, BE giữ nguyên thứ tự
 *
 * Trả: album
 */
export const createAlbum = async (req, res, next) => {
  try {
    const { artistId, artistName, title, releaseYear } = req.body;
    if (!artistId || !artistName || !title || !releaseYear) {
      return res
        .status(400)
        .json({ message: "Missing artistId/artistName/title/releaseYear" });
    }

    if (!req.files?.imageFile) {
      console.log("Please upload cover imageFile");
      return res.status(400).json({ message: "Please upload cover imageFile" });
    }

    let songIds = [];
    if (req.body.songIds) {
      try {
        const parsed = JSON.parse(req.body.songIds);
        if (Array.isArray(parsed)) songIds = parsed;
      } catch (_) {}
    }

    // up ảnh cover
    const coverUrl = await uploadToCloudinary(
      req.files.imageFile[0],
      "spotify_clone/covers"
    );

    const album = await Album.create({
      title,
      artist: artistName,
      artistId,
      imageUrl: coverUrl,
      releaseYear: Number(releaseYear),
      songs: songIds, // giữ đúng thứ tự FE
    });

    await User.findByIdAndUpdate(artistId, {
      $addToSet: { albums: album._id },
    });

    const artist = await User.findById(artistId)
      .select("followers fullName imageUrl")
      .lean();
    const followerIds = artist?.followers || [];
    await Promise.all(
      followerIds.map((uid) =>
        notify(uid, {
          content: `${artist.fullName} vừa phát hành album: "${album.title}"`,
          imageUrl: album.imageUrl,
          meta: { type: "NEW_ALBUM", actorId: artistId, albumId: album._id },
        })
      )
    );

    res.status(201).json(album);
  } catch (error) {
    console.log("Error in createAlbum", error);
    next(error);
  }
};
export const updateAlbum = async (req, res, next) => {
  try {
    const { albumId } = req.params;
    console.log("Content-Type:", req.headers["content-type"]);
    console.log("BODY:", req.body);
    console.log("FILES:", req.files);
    let { title, artistName, artistId, releaseYear, imageUrl } = req.body;
    if (!title || !artistName || !artistId || !releaseYear) {
      return res
        .status(400)
        .json({ message: "Missing title/artistName/artistId/releaseYear" });
    }

    // songIds có thể là JSON string
    let songIds = [];
    if (req.body.songIds) {
      try {
        const parsed = JSON.parse(req.body.songIds);
        if (Array.isArray(parsed)) songIds = parsed;
      } catch (_) {}
    }

    const album = await Album.findById(albumId);
    if (!album) return res.status(404).json({ message: "Album not found" });

    // Upload cover nếu có file
    if (req.files?.imageFile) {
      imageUrl = await uploadToCloudinary(
        req.files.imageFile,
        "spotify_clone/covers"
      );
    }
    if (!imageUrl) imageUrl = album.imageUrl; // giữ ảnh cũ nếu không gửi mới

    // Tính phần chênh lệch songs để cập nhật albumId ở Song
    const oldSongIds = (album.songs || []).map((id) => String(id));
    const newSongIds = songIds.map(String);

    const removed = oldSongIds.filter((id) => !newSongIds.includes(id));
    const added = newSongIds.filter((id) => !oldSongIds.includes(id));

    // Gỡ albumId khỏi các bài bị loại
    if (removed.length) {
      await Song.updateMany(
        { _id: { $in: removed }, albumId: album._id },
        { $set: { albumId: null } }
      );
    }
    // Gán albumId cho các bài mới thêm
    if (added.length) {
      await Song.updateMany(
        { _id: { $in: added } },
        { $set: { albumId: album._id } }
      );
    }

    // Ghi đè toàn bộ trường (giữ likesCount & isHidden)
    album.title = title;
    album.artist = artistName;
    album.artistId = artistId;
    album.imageUrl = imageUrl;
    album.releaseYear = Number(releaseYear);
    album.songs = newSongIds; // giữ đúng thứ tự FE
    await album.save();

    const populated = await Album.findById(album._id).populate("songs");
    res.json(populated);
  } catch (err) {
    console.error("updateAlbum error:", err.message);
    next(err);
  }
};

/**
 * PATCH /albums/:albumId/hide
 * Body: { hidden: true|false }
 * Tác dụng: bật/tắt cờ isHidden
 */
export const toggleHideAlbum = async (req, res, next) => {
  try {
    const { albumId } = req.params;
    const { hidden } = req.body;

    if (typeof hidden === "undefined") {
      return res.status(400).json({ message: "Missing 'hidden' boolean" });
    }

    const album = await Album.findByIdAndUpdate(
      albumId,
      { $set: { isHidden: !!hidden } },
      { new: true }
    ).populate("songs");

    if (!album) return res.status(404).json({ message: "Album not found" });

    res.json({
      message: hidden ? "Album has been hidden" : "Album is visible",
      album,
    });
  } catch (error) {
    console.error("toggleHideAlbum error:", error);
    return res
      .status(500)
      .json({ message: error.message || "Internal Server Error" });
  }
};
const isId = (v) => mongoose.Types.ObjectId.isValid(v);

export const listAlbumsByArtist = async (req, res, next) => {
  try {
    const { artistId, visibleOnly, q = "" } = req.query;
    if (!artistId || !isId(artistId)) {
      return res.status(400).json({ message: "artistId is required/invalid" });
    }

    const filter = { artistId };
    if (visibleOnly === "true") filter.isHidden = false;
    if (q.trim()) filter.title = new RegExp(q.trim(), "i");

    const items = await Album.find(filter)
      .sort({ createdAt: -1 })
      .select("_id title artist artistId imageUrl releaseYear isHidden songs")
      .lean();

    res.json(items);
  } catch (err) {
    return res
      .status(500)
      .json({ message: err.message || "Internal Server Error" });
  }
};

export const getAlbumById = async (req, res, next) => {
  try {
    const { albumId } = req.params;
    if (!isId(albumId))
      return res.status(400).json({ message: "Invalid albumId" });

    const album = await Album.findById(albumId)
      .populate("songs", "_id title durationSec imageUrl")
      .lean();

    if (!album) return res.status(404).json({ message: "Album not found" });
    res.json(album);
  } catch (err) {
    next(err);
  }
};

export const getAllAlbums = async (req, res) => {
  try {
    const { artistId, q = "" } = req.query;

    const filter = {
      isHidden: false,
    };

    if (artistId) {
      if (!isId(artistId)) {
        return res.status(400).json({ message: "Invalid artistId" });
      }
      filter.artistId = artistId;
    }

    if (q.trim()) {
      const rx = new RegExp(q.trim(), "i");
      filter.$or = [{ title: rx }, { artist: rx }];
    }

    const albums = await Album.find(filter)
      .sort({ createdAt: -1 })
      .select(
        "_id title artist artistId imageUrl releaseYear isHidden songs createdAt"
      )
      .lean();

    return res.json(albums);
  } catch (error) {
    console.error("getAllAlbums error:", error);
    return res
      .status(500)
      .json({ message: error.message || "Internal Server Error" });
  }
};

export const getAlbumMain = async (req, res, next) => {
  try {
    const { albumId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(albumId)) {
      return res.status(400).json({ message: "Invalid albumId" });
    }

    // lấy album + artist + song
    const albumDoc = await Album.findById(albumId)
      .populate("artistId", "fullName imageUrl") // user artist
      .lean();

    if (!albumDoc || albumDoc.isHidden) {
      return res.status(404).json({ message: "Album not found" });
    }

    // lấy list bài hát trong album
    const songs = await Song.find({ _id: { $in: albumDoc.songs || [] } })
      .select("title artist imageUrl audioUrl duration createdAt")
      .lean();

    const artistUser = albumDoc.artistId; // vì đã populate
    const artistName = artistUser?.fullName || albumDoc.artist;

    return res.json({
      album: {
        _id: albumDoc._id,
        title: albumDoc.title,
        type: "Album",
        artistName,
        artistId: artistUser?._id || albumDoc.artistId,
        imageUrl: albumDoc.imageUrl,
        releaseYear: albumDoc.releaseYear,
        likesCount: albumDoc.likesCount || 0,
        totalTracks: (albumDoc.songs || []).length,
      },
      songs: songs?.map((s) => ({
        _id: s._id,
        title: s.title,
        artistName: s.artist || artistName,
        duration: s.duration || 0,
        imageUrl: s.imageUrl || albumDoc.imageUrl,
        audioUrl: s.audioUrl,
        createdAt: s.createdAt,
      })),
    });
  } catch (error) {
    console.error("getAllMainDetail error:", error);
    return res
      .status(500)
      .json({ message: error.message || "Internal Server Error" });
  }
};

/**
 * GET /main/home
 * Public: trả về trendingSongs, trendingAlbums, newestSongs
 */
export const getHomeMain = async (req, res, next) => {
  try {
    const songLimit = 12;
    const albumLimit = 12;

    const [trendingSongs, trendingAlbums, newestSongs] = await Promise.all([
      // Songs trending theo likesCount desc
      Song.find({ isHidden: { $ne: true } })
        .sort({ likesCount: -1, createdAt: -1 })
        .limit(songLimit)
        .select("_id title artistName imageUrl audioUrl likesCount createdAt")
        .lean(),

      // Albums trending theo likesCount desc
      Album.find({ isHidden: { $ne: true } })
        .sort({ likesCount: -1, createdAt: -1 })
        .limit(albumLimit)
        .select("_id title imageUrl likesCount artistId releaseYear songs")
        .populate({
          path: "artistId",
          model: "User",
          select: "fullName artistProfile",
        })
        .lean(),

      // Songs newest theo createdAt desc
      Song.find({ isHidden: { $ne: true } })
        .sort({ createdAt: -1 })
        .limit(songLimit)
        .select("_id title artistName imageUrl audioUrl likesCount createdAt")
        .lean(),
    ]);

    const mappedTrendingAlbums = trendingAlbums.map((a) => ({
      _id: a._id,
      title: a.title,
      imageUrl: a.imageUrl,
      likesCount: a.likesCount || 0,
      artistName:
        a.artistId?.artistProfile?.stageName ||
        a.artistId?.fullName ||
        "Unknown",
      tracksCount: Array.isArray(a.songs) ? a.songs.length : 0,
      releaseYear: a.releaseYear,
    }));

    return res.json({
      trendingSongs,
      trendingAlbums: mappedTrendingAlbums,
      newestSongs,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: error.message || "Internal Server Error" });
  }
};