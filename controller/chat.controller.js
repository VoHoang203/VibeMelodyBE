import { User } from "../models/user.model.js";
import { Message } from "../models/message.model.js";

/**
 * GET /chat/users?q=
 * - Lấy tất cả user (trừ current)
 * - Optional q: tìm theo fullName / username (regex, i)
 */
export const getAllUsers = async (req, res, next) => {
  try {
    const currentUserId = req.auth?.userId;
    const { q = "" } = req.query;

    const filter = {};
    if (currentUserId) filter.clerkId = { $ne: currentUserId };
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
    const myId = req.auth?.userId; // Clerk user id (string)
    const { userId } = req.params; // Clerk user id (string)

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
