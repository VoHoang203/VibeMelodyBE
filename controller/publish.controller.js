import { User } from "../models/user.model.js";
import { Song } from "../models/song.model.js";
import { Album } from "../models/album.model.js";
import { notify } from "../services/notify.service.js";

export const createSong = async (req, res, next) => {
  try {
    const me = req.user;
    const { title, imageUrl, audioUrl, duration, albumId } = req.body;

    const song = await Song.create({
      title, imageUrl, audioUrl, duration, albumId,
      artist: me.artistProfile?.stageName || me.fullName,
      artistId: me._id
    });

    // notify followers
    const artist = await User.findById(me._id).select("followers fullName imageUrl").lean();
    const followerIds = artist?.followers || [];
    await Promise.all(followerIds.map(uid => notify(uid, {
      content: `${artist.fullName} vừa đăng bài hát mới: "${song.title}"`,
      imageUrl: song.imageUrl,
      meta: { type: "NEW_SONG", songId: song._id, actorId: me._id }
    })));

    res.status(201).json(song);
  } catch (e) { next(e); }
};

export const createAlbum = async (req, res, next) => {
  try {
    const me = req.user;
    const { title, imageUrl, releaseYear, songs = [] } = req.body;

    const album = await Album.create({
      title, imageUrl, releaseYear, songs,
      artist: me.artistProfile?.stageName || me.fullName,
      artistId: me._id
    });

    await User.findByIdAndUpdate(me._id, { $addToSet: { albums: album._id } });

    const artist = await User.findById(me._id).select("followers fullName imageUrl").lean();
    const followerIds = artist?.followers || [];
    await Promise.all(followerIds.map(uid => notify(uid, {
      content: `${artist.fullName} vừa phát hành album: "${album.title}"`,
      imageUrl: album.imageUrl,
      meta: { type: "NEW_ALBUM", albumId: album._id, actorId: me._id }
    })));

    res.status(201).json(album);
  } catch (e) { next(e); }
};
