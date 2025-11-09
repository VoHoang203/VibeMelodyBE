import { User } from "../models/user.model.js";
import { Message } from "../models/message.model.js";
import { Notification } from "../models/notification.model.js";
import mongoose from "mongoose";

/**
 * GET /chat/users?q=
 * - Lấy tất cả user (trừ current)
 * - Optional q: tìm theo fullName / username (regex, i)
 */
export const getAllUsers = async (req, res, next) => {
  try {
    const currentUserId = req.auth?.userId || req.user?.id;
    const { q = "" } = req.query;

    const filter = {};
    if (currentUserId) filter._id = { $ne: new mongoose.Types.ObjectId(currentUserId)};
    if (q.trim()) {
      const rx = new RegExp(q.trim(), "i");
      filter.$or = [{ fullName: rx }, { username: rx }, { email: rx }];
    }

    const users = await User.find(filter)
      .select("_id fullName username imageUrl email createdAt")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json(users);
  } catch (error) {
    console.log({ message: error.message })
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /chat/messages/:userId
 * - Lấy toàn bộ tin nhắn giữa current (req.auth.userId) và userId (clerkId)
 * - Sort theo thời gian tăng dần để FE render theo dòng thời gian
 */
export const getMessages = async (req, res, next) => {
  try {
    const myId = req.auth?.userId || req.user?.id; 
    const { userId } = req.params; 

    if (!myId || !userId) {
      return res.status(400).json({ message: "Missing user ids" });
    }

    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: myId },
        { senderId: myId, receiverId: userId },
      ],
    })
      .sort({ createdAt: 1 })
      .lean();

    res.status(200).json(messages);
  } catch (error) {
    next(error);
  }
};
export const getAllNotifications = async (req, res, next) => {
  try {
    const userId = req.auth?.userId || req.user?._id; 

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const notifications = await Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(50); // Giới hạn 50 cái gần nhất (tuỳ chọn)

    res.status(200).json(notifications);
  } catch (error) {
    console.error("❌ getAllNotifications error:", error);
    next(error);
  }
};