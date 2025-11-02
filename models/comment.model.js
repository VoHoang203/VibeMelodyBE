import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    song: { type: mongoose.Schema.Types.ObjectId, ref: "Song", required: true },
    content: { type: String, required: true },
    timestamp: { type: Number },
  },
  { timestamps: true }
);

export const Comment = mongoose.model("Comment", commentSchema);
