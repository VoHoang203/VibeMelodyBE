import { Like } from "../models/like.model.js";
import { Song } from "../models/song.model.js";
import { Album } from "../models/album.model.js";
import { notify } from "../services/notify.service.js";

export const likeSong = async (req, res, next) => {
  try {
    const me = req.user;
    const { songId } = req.params;

    const created = await Like.create({ user: me._id, targetType: "song", targetId: songId }).catch(() => null);
    if (!created) return res.status(200).json({ message: "Đã thích trước đó" });

    const song = await Song.findByIdAndUpdate(
      songId,
      { $inc: { likesCount: 1 } },
      { new: true }
    ).lean();

    if (!song) return res.status(404).json({ message: "Song not found" });

    // thông báo cho artist (nếu người like khác artist)
    if (String(song.artistId) !== String(me._id)) {
      await notify(song.artistId, {
        content: `${me.fullName} đã thích bài hát "${song.title}"`,
        imageUrl: song.imageUrl,
        meta: { type: "LIKE_SONG", songId }
      });
    }

    res.json({ message: "Liked", likesCount: song.likesCount });
  } catch (e) { next(e); }
};

export const unlikeSong = async (req, res, next) => {
  try {
    const me = req.user; const { songId } = req.params;

    const removed = await Like.findOneAndDelete({ user: me._id, targetType: "song", targetId: songId });
    if (!removed) return res.status(200).json({ message: "Chưa like để bỏ" });

    const song = await Song.findByIdAndUpdate(
      songId,
      { $inc: { likesCount: -1 } },
      { new: true }
    ).lean();

    if (!song) return res.status(404).json({ message: "Song not found" });
    res.json({ message: "Unliked", likesCount: Math.max(0, song.likesCount) });
  } catch (e) { next(e); }
};

export const likeAlbum = async (req, res, next) => {
  try {
    const me = req.user; const { albumId } = req.params;

    const created = await Like.create({ user: me._id, targetType: "album", targetId: albumId }).catch(() => null);
    if (!created) return res.status(200).json({ message: "Đã thích trước đó" });

    const album = await Album.findByIdAndUpdate(
      albumId,
      { $inc: { likesCount: 1 } },
      { new: true }
    ).lean();

    if (!album) return res.status(404).json({ message: "Album not found" });

    if (String(album.artistId) !== String(me._id)) {
      await notify(album.artistId, {
        content: `${me.fullName} đã thích album "${album.title}"`,
        imageUrl: album.imageUrl,
        meta: { type: "LIKE_ALBUM", albumId }
      });
    }

    res.json({ message: "Liked", likesCount: album.likesCount });
  } catch (e) { next(e); }
};

export const unlikeAlbum = async (req, res, next) => {
  try {
    const me = req.user; const { albumId } = req.params;

    const removed = await Like.findOneAndDelete({ user: me._id, targetType: "album", targetId: albumId });
    if (!removed) return res.status(200).json({ message: "Chưa like để bỏ" });

    const album = await Album.findByIdAndUpdate(
      albumId,
      { $inc: { likesCount: -1 } },
      { new: true }
    ).lean();

    if (!album) return res.status(404).json({ message: "Album not found" });
    res.json({ message: "Unliked", likesCount: Math.max(0, album.likesCount) });
  } catch (e) { next(e); }
};
