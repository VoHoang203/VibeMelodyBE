import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // người nhận
    content:  { type: String, required: true },
    imageUrl: { type: String },
    at:       { type: Date, default: () => new Date() },
    meta:     { type: Object } // { type: "NEW_SONG"|"NEW_ALBUM"|"LIKE_SONG"|"LIKE_ALBUM"|"COMMENT_SONG", songId/albumId/actorId... }
  },
  { timestamps: true }
);

export const Notification = mongoose.model("Notification", notificationSchema);