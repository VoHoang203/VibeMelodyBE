// models/RefreshToken.js
import mongoose from "mongoose";
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  jti: { type: String, unique: true },     // token id
  revokedAt: Date,
  ua: String, ip: String,
}, { timestamps: true });

export const RefreshToken = mongoose.model("RefreshToken", schema);
