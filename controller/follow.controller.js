import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { notify } from "../services/notify.service.js";

export const followArtist = async (req, res, next) => {
  try {
    const me = req.user;
    const { artistId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(artistId)) {
      return res.status(400).json({ message: "Invalid artistId" });
    }

    if (String(artistId) === String(me._id)) {
      return res.status(400).json({ message: "Không thể follow chính mình" });
    }

    const artist = await User.findById(artistId);
    if (!artist || !artist.isArtist) {
      return res.status(404).json({ message: "Artist not found" });
    }

    await User.updateOne(
      { _id: me._id },
      { $addToSet: { following: artistId } }
    );
    await User.updateOne(
      { _id: artistId },
      { $addToSet: { followers: me._id } }
    );

    // lấy lại count
    const freshArtist = await User.findById(artistId)
      .select("followers")
      .lean();
    const followersCount = freshArtist?.followers?.length || 0;

    // notify nghệ sĩ
    await notify(artistId, {
      content: `${me.fullName || "Someone"} đã theo dõi bạn`,
      imageUrl: me.imageUrl,
      meta: { type: "FOLLOW_ARTIST", followerId: me._id },
    }).catch(() => {});

    return res.json({
      message: "Followed",
      following: true,
      followersCount,
    });
  } catch (e) {
    next(e);
  }
};

export const unfollowArtist = async (req, res, next) => {
  try {
    const me = req.user;
    const { artistId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(artistId)) {
      return res.status(400).json({ message: "Invalid artistId" });
    }

    const artist = await User.findById(artistId).select("followers").lean();
    if (!artist) {
      return res.status(404).json({ message: "Artist not found" });
    }

    await User.updateOne(
      { _id: me._id },
      { $pull: { following: artistId } }
    );
    await User.updateOne(
      { _id: artistId },
      { $pull: { followers: me._id } }
    );

    
    const freshArtist = await User.findById(artistId)
      .select("followers")
      .lean();
    const followersCount = freshArtist?.followers?.length || 0;

    return res.json({
      message: "Unfollowed",
      following: false,
      followersCount,
    });
  } catch (e) {
    next(e);
  }
};

export const getArtistFollowStatus = async (req, res, next) => {
  try {
    const me = req.user;
    const { artistId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(artistId)) {
      return res.status(400).json({ message: "Invalid artistId" });
    }

    const artist = await User.findById(artistId)
      .select("followers")
      .lean();
    if (!artist) {
      return res.status(404).json({ message: "Artist not found" });
    }

    const following = !!(await User.exists({
      _id: me._id,
      following: artistId,
    }));

    const followersCount = artist.followers?.length || 0;

    return res.json({
      following,
      followersCount,
    });
  } catch (e) {
    next(e);
  }
};
