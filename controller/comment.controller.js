import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";

export async function getCommentsBySong(req, res) {
  const { songId } = req.params;
  try {
    const comments = await Comment.find({ song: songId })
      .sort({ createdAt: -1 })
      .populate("user", "username avatarUrl")
      .lean();

    return res.json(comments);
  } catch (err) {
    console.error("getCommentsBySong error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function createComment(req, res) {
  const { songId } = req.params;
  const { userId, content, timestamp } = req.body; 

  if (!userId || !content) {
    return res.status(400).json({ message: "userId and content are required" });
  }

  try {
    const doc = await Comment.create({
      user: new mongoose.Types.ObjectId(userId),
      song: new mongoose.Types.ObjectId(songId),
      content,
      timestamp,
    });

    const populated = await doc.populate("user", "fullname imageUrl");
    return res.status(201).json(populated);
  } catch (err) {
    console.error("createComment error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
