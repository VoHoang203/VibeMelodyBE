// routes/artist.js hoặc controllers/artistController.js
import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { Song } from "../models/song.model.js";
import { Album } from "../models/album.model.js"

// GET /artist/check
export const checkArtistStatus = async (req, res) => {
  try {
    // req.user được gán từ middleware requireAuth (JWT)
    const userId = req.user._id;

    const user = await User.findById(userId).select("isArtist artistProfile.subscription.status");
    console.log("Check artist:", req.user._id, "→ isArtist:", req.user.isArtist);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Điều kiện để là Artist:
    const isArtist = user.isArtist === true &&
                     user.artistProfile?.subscription?.status === "active";

    return res.json({
      artist: isArtist
    });

  } catch (error) {
    console.error("checkArtistStatus error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};


/**
 * GET /artists/:artistId/main
 * Public: trả về info artist + top 4 tracks + top 4 albums
 */
export const getArtistMain = async (req, res, next) => {
  try {
    const { artistId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(artistId)) {
      return res.status(400).json({ message: "Invalid artistId" });
    }

    const artist = await User.findById(artistId)
      .select("fullName email imageUrl artistProfile followers following isArtist")
      .lean();

    if (!artist || !artist.isArtist) {
      return res.status(404).json({ message: "Artist not found" });
    }

    const [topSongs, topAlbums, tracksCount] = await Promise.all([
      Song.find({ artistId, isHidden: { $ne: true } })
        .sort({ likesCount: -1, createdAt: -1 })
        .limit(4)
        .select("_id title imageUrl audioUrl likesCount")
        .lean(),
      Album.find({ artistId, isHidden: { $ne: true } })
        .sort({ likesCount: -1, createdAt: -1 })
        .limit(4)
        .select("_id title imageUrl likesCount releaseYear")
        .lean(),
      Song.countDocuments({ artistId, isHidden: { $ne: true } }),
    ]);

    const followersCount = Array.isArray(artist.followers)
      ? artist.followers.length
      : 0;
    const followingCount = Array.isArray(artist.following)
      ? artist.following.length
      : 0;

    const displayName = artist.artistProfile?.stageName || artist.fullName;
    const usernameFromEmail = artist.email
      ? "@" + artist.email.split("@")[0]
      : "";
    const username =
      artist.artistProfile?.stageName
        ? "@" + artist.artistProfile.stageName.replace(/\s+/g, "").toLowerCase()
        : usernameFromEmail;

    return res.json({
      artist: {
        _id: artist._id,
        name: displayName,
        username,
        avatar: artist.imageUrl,
        bio: artist.artistProfile?.bio || "",
        followersCount,
        followingCount,
        tracksCount,
        isVerified: true, // luôn true như yêu cầu
      },
      topTracks: topSongs,
      topAlbums,
    });
  } catch (e) {
    next(e);
  }
};

/**
 * PUT /artists/me/profile
 * Update stageName, bio, imageUrl của artist hiện tại
 */
export const updateArtistProfile = async (req, res, next) => {
  try {
    const me = req.user;
    if (!me.isArtist) {
      return res.status(403).json({ message: "Not an artist" });
    }

    const { stageName, bio, imageUrl } = req.body;

    const update = {};

    if (typeof imageUrl === "string") {
      update.imageUrl = imageUrl;
    }
    if (typeof stageName === "string") {
      update["artistProfile.stageName"] = stageName;
    }
    if (typeof bio === "string") {
      update["artistProfile.bio"] = bio;
    }

    const updated = await User.findByIdAndUpdate(
      me._id,
      { $set: update },
      { new: true }
    ).lean();

    if (!updated) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      _id: updated._id,
      name: updated.artistProfile?.stageName || updated.fullName,
      avatar: updated.imageUrl,
      bio: updated.artistProfile?.bio || "",
    });
  } catch (e) {
    next(e);
  }
};

/**
 * GET /artists/search?q=
 * Public: tìm artist theo tên / stageName / email
 */
export const searchArtists = async (req, res, next) => {
  try {
    const q = (req.query.q || "").trim();

    const filter = { isArtist: true };

    if (q) {
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [
        { "artistProfile.stageName": regex },
        { fullName: regex },
        { email: regex },
      ];
    }

    const artists = await User.find(filter)
      .select("fullName email imageUrl artistProfile followers isArtist")
      .limit(20)
      .lean();

    const mapped = artists.map((a) => {
      const name = a.artistProfile?.stageName || a.fullName;
      const followersCount = Array.isArray(a.followers)
        ? a.followers.length
        : 0;

      const usernameFromEmail = a.email
        ? "@" + a.email.split("@")[0]
        : "";

      const username = a.artistProfile?.stageName
        ? "@" +
          a.artistProfile.stageName.replace(/\s+/g, "").toLowerCase()
        : usernameFromEmail;

      return {
        _id: a._id,
        name,
        username,
        avatar: a.imageUrl,
        followersCount,
        isVerified: true, // như yêu cầu: verified luôn true
      };
    });

    return res.json(mapped);
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server error", error: err?.message });
  }
};