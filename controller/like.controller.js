import { Like } from "../models/like.model.js";
import { Song } from "../models/song.model.js";
import { Album } from "../models/album.model.js";
import { notify } from "../services/notify.service.js";
import mongoose from "mongoose";
import { User } from "../models/user.model.js";

export const likeSong = async (req, res, next) => {
  try {
    const me = req.user; // từ middleware
    const { songId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(songId)) {
      return res.status(400).json({ message: "Invalid songId" });
    }

    // unique index sẽ ngăn trùng
    const created = await Like.create({
      user: me._id,
      targetType: "song",
      targetId: songId,
    }).catch(() => null);

    if (!created) {
      // đã like trước đó: đồng bộ likedSongs (phòng trường hợp thiếu)
      await User.updateOne(
        { _id: me._id },
        { $addToSet: { likedSongs: songId } }
      );
      const song = await Song.findById(songId).lean();
      return res.status(200).json({
        message: "Already liked",
        likesCount: song?.likesCount ?? 0,
        liked: true,
      });
    }

    const song = await Song.findByIdAndUpdate(
      songId,
      { $inc: { likesCount: 1 } },
      { new: true }
    ).lean();

    if (!song) return res.status(404).json({ message: "Song not found" });

    await User.updateOne(
      { _id: me._id },
      { $addToSet: { likedSongs: songId } }
    );

    if (song.artistId && String(song.artistId) !== String(me._id)) {
      await notify(song.artistId, {
        content: `${me.fullName || "Someone"} đã thích bài hát "${song.title}"`,
        imageUrl: song.imageUrl,
        meta: { type: "LIKE_SONG", songId },
      }).catch(() => {});
    }

    return res.json({
      message: "Liked",
      likesCount: song.likesCount,
      liked: true,
    });
  } catch (e) {
    next(e);
  }
};

export const unlikeSong = async (req, res, next) => {
  try {
    const me = req.user;
    const { songId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(songId)) {
      return res.status(400).json({ message: "Invalid songId" });
    }

    const removed = await Like.findOneAndDelete({
      user: me._id,
      targetType: "song",
      targetId: songId,
    });

    const song = await Song.findByIdAndUpdate(
      songId,
      { $inc: { likesCount: removed ? -1 : 0 } },
      { new: true }
    ).lean();

    if (!song) return res.status(404).json({ message: "Song not found" });

    await User.updateOne({ _id: me._id }, { $pull: { likedSongs: songId } });

    return res.json({
      message: removed ? "Unliked" : "Was not liked",
      likesCount: Math.max(0, song.likesCount || 0),
      liked: false,
    });
  } catch (e) {
    next(e);
  }
};

export const getSongLikeStatus = async (req, res, next) => {
  try {
    const me = req.user;
    const { songId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(songId)) {
      return res.status(400).json({ message: "Invalid songId" });
    }

    const liked = !!(await Like.exists({
      user: me._id,
      targetType: "song",
      targetId: songId,
    }));

    const song = await Song.findById(songId).select("likesCount").lean();

    return res.json({ liked, likesCount: song?.likesCount ?? 0 });
  } catch (e) {
    next(e);
  }
};

export const likeAlbum = async (req, res, next) => {
  try {
    const me = req.user;
    const { albumId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(albumId)) {
      return res.status(400).json({ message: "Invalid albumId" });
    }
    const created = await Like.create({
      user: me._id,
      targetType: "album",
      targetId: albumId,
    }).catch(() => null);
    if (!created) return res.status(200).json({ message: "Đã thích trước đó" });

    const album = await Album.findByIdAndUpdate(
      albumId,
      { $inc: { likesCount: 1 } },
      { new: true }
    ).lean();

    if (!album) return res.status(404).json({ message: "Album not found" });
    await User.updateOne(
      { _id: me._id },
      { $addToSet: { likedAlbums: albumId } }
    );

    // notify artist nếu không phải tự like
    if (album.artistId && String(album.artistId) !== String(me._id)) {
      await notify(album.artistId, {
        content: `${me.fullName} đã thích album "${album.title}"`,
        imageUrl: album.imageUrl,
        meta: { type: "LIKE_ALBUM", albumId },
      }).catch(() => {});
    }

    res.json({ message: "Liked", likesCount: album.likesCount });
  } catch (e) {
    next(e);
  }
};

export const unlikeAlbum = async (req, res, next) => {
  try {
    const me = req.user;
    const { albumId } = req.params;

    const removed = await Like.findOneAndDelete({
      user: me._id,
      targetType: "album",
      targetId: albumId,
    });
    if (!removed) return res.status(200).json({ message: "Chưa like để bỏ" });
    await User.updateOne({ _id: me._id }, { $pull: { likedAlbums: albumId } });
    const album = await Album.findByIdAndUpdate(
      albumId,
      { $inc: { likesCount: -1 } },
      { new: true }
    ).lean();

    if (!album) return res.status(404).json({ message: "Album not found" });
    res.json({ message: "Unliked", likesCount: Math.max(0, album.likesCount) });
  } catch (e) {
    next(e);
  }
};
export const getAlbumLikeStatus = async (req, res, next) => {
  try {
    const me = req.user;
    const { albumId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(albumId)) {
      return res.status(400).json({ message: "Invalid albumId" });
    }

    const liked = !!(await Like.exists({
      user: me._id,
      targetType: "album",
      targetId: albumId,
    }));

    const album = await Album.findById(albumId).select("likesCount").lean();

    return res.json({
      liked,
      likesCount: album?.likesCount ?? 0,
    });
  } catch (e) {
    next(e);
  }
};
