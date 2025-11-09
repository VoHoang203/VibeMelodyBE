// controllers/auth.controller.js
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { User } from "../models/user.model.js";
import { Song } from "../models/song.model.js";
import { Album } from "../models/album.model.js";
/* =========================
 *  RefreshToken Model
 * ========================= */
const refreshTokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    jti: { type: String, unique: true, index: true },
    revokedAt: { type: Date },
    ua: String,
    ip: String,
  },
  { timestamps: true }
);

const RefreshToken =
  mongoose.models.RefreshToken ||
  mongoose.model("RefreshToken", refreshTokenSchema);

/* =========================
 *  JWT Helpers
 * ========================= */
const ACCESS_SECRET = process.env.JWT_SECRET || "dev_access_secret";
const REFRESH_SECRET = process.env.JWT_SECRET || "dev_refresh_secret";

const signAccess = (userId) =>
  jwt.sign({ sub: userId }, ACCESS_SECRET, { expiresIn: "15m" });

const signRefresh = (userId, jti) =>
  jwt.sign({ sub: userId, jti }, REFRESH_SECRET, { expiresIn: "30d" });

const verifyAccess = (token) => jwt.verify(token, ACCESS_SECRET);
const verifyRefresh = (token) => jwt.verify(token, REFRESH_SECRET);

/* =========================
 *  Serialize user trả về client
 * ========================= */
const serializeUser = (u) => ({
  id: u._id,
  fullName: u.fullName,
  email: u.email,
  imageUrl: u.imageUrl || null,
  isArtist: !!u.isArtist,
  artistProfile: u.artistProfile || null,
  createdAt: u.createdAt,
  updatedAt: u.updatedAt,
});

/* =========================
 *  Middleware: requireAuth (Bearer)
 * ========================= */
export const requireAuth = async (req, res, next) => {
  const hdr = req.headers.authorization || "";
  const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const payload = verifyAccess(token); // { sub }
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

/* =========================
 *  Helper: issueTokens + lưu refresh (rotate-ready)
 * ========================= */
const issueTokens = async (user, meta = {}) => {
  const jti = crypto.randomBytes(16).toString("hex");
  await RefreshToken.create({
    user: user._id,
    jti,
    ua: meta.ua,
    ip: meta.ip,
  });

  const accessToken = signAccess(user._id.toString());
  const refreshToken = signRefresh(user._id.toString(), jti);
  return { accessToken, refreshToken };
};

/* =========================
 *  AUTH CONTROLLERS
 * ========================= */

// POST /auth/signup
export const signup = async (req, res) => {
  try {
    const { fullName, email, password } = req.body || {};
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const exists = await User.findOne({ email });
    if (exists)
      return res.status(409).json({ message: "Email already registered" });

    // pre('save') trong user.model sẽ hash
    const user = await User.create({ fullName, email, password });

    const tokens = await issueTokens(user, {
      ua: req.headers["user-agent"],
      ip: req.ip,
    });

    return res.status(201).json({ user: serializeUser(user), ...tokens });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server error", error: err?.message });
  }
};

// POST /auth/login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const user = await User.findOne({ email });
    if (!user || !user.password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const tokens = await issueTokens(user, {
      ua: req.headers["user-agent"],
      ip: req.ip,
    });
    return res.json({ user: serializeUser(user), ...tokens });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server error", error: err?.message });
  }
};

// POST /auth/refresh-token
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken: incoming } = req.body || {};
    if (!incoming) {
      return res.status(400).json({ message: "Missing refreshToken" });
    }

    const payload = verifyRefresh(incoming); // { sub, jti }
    const rec = await RefreshToken.findOne({
      jti: payload.jti,
      user: payload.sub,
    });
    if (!rec || rec.revokedAt) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    // rotate: revoke token cũ, phát token mới
    rec.revokedAt = new Date();
    await rec.save();

    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ message: "Invalid user" });

    const tokens = await issueTokens(user, {
      ua: req.headers["user-agent"],
      ip: req.ip,
    });

    return res.json(tokens); // { accessToken, refreshToken }
  } catch {
    return res.status(401).json({ message: "Invalid refresh token" });
  }
};

// GET /auth/profile
export const getProfile = async (req, res) => {
  return res.json(serializeUser(req.user));
};

// PATCH /auth/profile
export const updateProfile = async (req, res) => {
  const { fullName, imageUrl } = req.body || {};
  if (fullName !== undefined) req.user.fullName = fullName;
  if (imageUrl !== undefined) req.user.imageUrl = imageUrl;
  await req.user.save();
  return res.json({ user: serializeUser(req.user) });
};

// POST /auth/change-password
// export const changePassword = async (req, res) => {
//   const { oldPassword, newPassword } = req.body || {};
//   if (!oldPassword || !newPassword) {
//     return res.status(400).json({ message: "Missing fields" });
//   }

//   if (!req.user.password) {
//     return res.status(400).json({ message: "Password login not enabled" });
//   }
//   const ok = await bcrypt.compare(oldPassword, req.user.password);
//   if (!ok) return res.status(401).json({ message: "Old password incorrect" });

//   req.user.password = newPassword; // pre('save') sẽ hash
//   await req.user.save();
//   return res.json({ ok: true });
// };

// POST /auth/logout
export const logout = async (req, res) => {
  await RefreshToken.updateMany(
    { user: req.user._id, revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date() } }
  );
  return res.json({ ok: true });
};

/* =========================
 *  ARTIST CONTROLLERS
 * ========================= */

// POST /artist/register
export const artistRegister = async (req, res) => {
  const { stageName, plan = "artist_monthly" } = req.body || {};
  req.user.isArtist = true;
  req.user.artistProfile = {
    ...(req.user.artistProfile || {}),
    stageName,
    subscription: {
      plan,
      status: "active",
      currentPeriodEnd: null,
      lastPaymentAt: new Date(),
    },
  };
  await req.user.save();
  return res.json({
    user: {
      id: req.user._id,
      isArtist: req.user.isArtist,
      artistProfile: req.user.artistProfile,
    },
  });
};

// PATCH /artist/profile
export const artistUpdateProfile = async (req, res) => {
  const { stageName, bio } = req.body || {};
  if (!req.user.isArtist)
    return res.status(400).json({ message: "Not an artist" });
  req.user.artistProfile = req.user.artistProfile || {};
  if (stageName !== undefined) req.user.artistProfile.stageName = stageName;
  if (bio !== undefined) req.user.artistProfile.bio = bio;
  await req.user.save();
  return res.json({ artistProfile: req.user.artistProfile });
};

// GET /artist/subscription
export const artistGetSubscription = async (req, res) => {
  if (!req.user.isArtist)
    return res.status(400).json({ message: "Not an artist" });
  return res.json(req.user.artistProfile?.subscription || null);
};
/**
 * 🔥 NEW: GET /me/main
 * Trả về info user + likedSongs + likedAlbums cho trang Profile
 */
export const getMeMain = async (req, res, next) => {
  try {
    const meId = req.user._id;

    const me = await User.findById(meId)
      .select("fullName email imageUrl likedSongs likedAlbums isArtist")
      .lean();

    if (!me) {
      return res.status(404).json({ message: "User not found" });
    }

    const likedSongIds = me.likedSongs || [];
    const likedAlbumIds = me.likedAlbums || [];

    const [songs, albums] = await Promise.all([
      Song.find({
        _id: { $in: likedSongIds },
        isHidden: { $ne: true },
      })
        .select("_id title imageUrl artist artistName artistId")
        .lean(),
      Album.find({
        _id: { $in: likedAlbumIds },
        isHidden: { $ne: true },
      })
        .select("_id title imageUrl artist artistId releaseYear")
        .lean(),
    ]);

    const likedSongs = songs.map((s) => ({
      _id: s._id,
      title: s.title,
      imageUrl: s.imageUrl,
      artistName: s.artistName || s.artist,
    }));

    const likedAlbums = albums.map((a) => ({
      _id: a._id,
      title: a.title,
      imageUrl: a.imageUrl,
      releaseYear: a.releaseYear,
      artistName: a.artist,
    }));

    return res.json({
      user: {
        _id: me._id,
        fullName: me.fullName,
        email: me.email,
        imageUrl: me.imageUrl,
        isArtist: me.isArtist,
      },
      likedSongs,
      likedAlbums,
    });
  } catch (e) {
    next(e);
  }
};

/**
 * 🔥 NEW: PUT /me/profile
 * Update profile user thường: fullName, imageUrl (KHÔNG có bio)
 */
export const updateMeProfile = async (req, res, next) => {
  try {
    const meId = req.user._id;
    const { fullName, imageUrl } = req.body;

    const update = {};

    if (typeof fullName === "string" && fullName.trim()) {
      update.fullName = fullName.trim();
    }
    if (typeof imageUrl === "string") {
      update.imageUrl = imageUrl;
    }

    const updated = await User.findByIdAndUpdate(
      meId,
      { $set: update },
      { new: true }
    ).lean();

    if (!updated) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      _id: updated._id,
      fullName: updated.fullName,
      email: updated.email,
      imageUrl: updated.imageUrl,
    });
  } catch (e) {
    next(e);
  }
};
/**
 * PUT /me/password
 * Đổi password cho user hiện tại
 */
export const changePassword = async (req, res, next) => {
  try {
    const me = await User.findById(req.user._id);
    if (!me) {
      return res.status(404).json({ message: "User not found" });
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "currentPassword and newPassword are required" });
    }

    if (!me.password) {
      return res
        .status(400)
        .json({ message: "Password login is not enabled for this account" });
    }

    const isMatch = await me.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    me.password = newPassword; // pre('save') sẽ hash
    await me.save();

    return res.json({ message: "Password updated successfully" });
  } catch (e) {
    next(e);
  }
};
export const getMyLikedSongs = async (req, res, next) => {
  try {
    const meId = req.user?._id;
    if (!meId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const me = await User.findById(meId)
      .select("likedSongs")
      .lean();

    if (!me) {
      return res.status(404).json({ message: "User not found" });
    }

    const likedIds = Array.isArray(me.likedSongs) ? me.likedSongs : [];
    if (!likedIds.length) {
      return res.json({ songs: [] });
    }

    const songs = await Song.find({
      _id: { $in: likedIds.map((id) => new mongoose.Types.ObjectId(id)) },
      isHidden: { $ne: true },
    })
      .populate({
        path: "artistId",
        model: "User",
        select: "fullName",
      })
      .populate({
        path: "albumId",
        model: "Album",
        select: "title",
      })
      .sort({ createdAt: -1 })
      .lean();

    const mapped = songs.map((s) => ({
      _id: s._id,
      title: s.title,
      artistName: s.artist || s.artistId?.fullName || "",
      albumTitle: s.albumId?.title || "",
      duration: s.duration || 0,
      imageUrl: s.imageUrl || "",
      audioUrl: s.audioUrl || "",
      likesCount: s.likesCount || 0,
      createdAt: s.createdAt,
    }));

    return res.json({ songs: mapped });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server error", error: err?.message });
  }
};

export const getMyLibrary = async (req, res, next) => {
  try {
    const meId = req.user?._id;
    if (!meId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const me = await User.findById(meId)
      .select("following likedAlbums likedSongs")
      .lean();

    if (!me) {
      return res.status(404).json({ message: "User not found" });
    }

    const followingIds = Array.isArray(me.following) ? me.following : [];
    const likedAlbumIds = Array.isArray(me.likedAlbums) ? me.likedAlbums : [];
    const likedSongsCount = Array.isArray(me.likedSongs)
      ? me.likedSongs.length
      : 0;

    const [artists, albums] = await Promise.all([
      // artists mà user đang follow
      User.find({
        _id: { $in: followingIds.map((id) => new mongoose.Types.ObjectId(id)) },
        isArtist: true,
      })
        .select("_id fullName imageUrl followers artistProfile")
        .lean(),

      // albums user đã like
      Album.find({
        _id: {
          $in: likedAlbumIds.map((id) => new mongoose.Types.ObjectId(id)),
        },
        isHidden: { $ne: true },
      })
        .select("_id title imageUrl artistId songs")
        .populate({
          path: "artistId",
          model: "User",
          select: "fullName artistProfile",
        })
        .lean(),
    ]);

    const mappedArtists = artists.map((a) => ({
      _id: a._id,
      name: a.artistProfile?.stageName || a.fullName,
      imageUrl: a.imageUrl,
      followersCount: Array.isArray(a.followers) ? a.followers.length : 0,
    }));

    const mappedAlbums = albums.map((al) => ({
      _id: al._id,
      title: al.title,
      artistName:
        al.artistId?.artistProfile?.stageName ||
        al.artistId?.fullName ||
        "Unknown",
      imageUrl: al.imageUrl,
      tracksCount: Array.isArray(al.songs) ? al.songs.length : 0,
    }));

    return res.json({
      artists: mappedArtists,
      albums: mappedAlbums,
      likedSongsCount,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server error", error: err?.message });
  }
};