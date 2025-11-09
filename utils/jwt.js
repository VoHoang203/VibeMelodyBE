// utils/jwt.js
import jwt from "jsonwebtoken";

export const signAccess = (userId) =>
  jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
    expiresIn: "15m",
  });

export const signRefresh = (userId, jti) =>
  jwt.sign({ sub: userId, jti }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });

export const verifyAccess = (token) =>
  jwt.verify(token, process.env.JWT_SECRET);

export const verifyRefresh = (token) =>
  jwt.verify(token, process.env.JWT_SECRET);

// utils/serialize.js
export const serializeUser = (u) => ({
  id: u._id,
  fullName: u.fullName,
  email: u.email,
  imageUrl: u.imageUrl || null,
  isArtist: u.isArtist,
  artistProfile: u.artistProfile ?? null,
  createdAt: u.createdAt,
});
