import { Server } from "socket.io";
import { Message } from "../models/message.model.js";

let ioRef = null;
const userSockets = new Map(); // { userId: socketId }
const userActivities = new Map(); // { userId: activity }

export const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: { origin: "http://localhost:3000", credentials: true },
  });
  ioRef = io;

  io.on("connection", (socket) => {
    socket.on("user_connected", (userId) => {
      userSockets.set(String(userId), socket.id);
      userActivities.set(String(userId), "Idle");

      io.emit("user_connected", String(userId));
      socket.emit("users_online", Array.from(userSockets.keys()));
      io.emit("activities", Array.from(userActivities.entries()));
      console.log(userActivities);
    });

    socket.on("update_activity", ({ userId, activity }) => {
      userActivities.set(String(userId), activity);
      io.emit("activity_updated", { userId: String(userId), activity });
    });

    socket.on("send_message", async ({ senderId, receiverId, content }) => {
      try {
        const message = await Message.create({ senderId, receiverId, content });

        const receiverSocketId = userSockets.get(String(receiverId));
        if (receiverSocketId)
          io.to(receiverSocketId).emit("receive_message", message);

        socket.emit("message_sent", message);
      } catch (err) {
        socket.emit("message_error", err.message);
      }
    });

    socket.on("disconnect", () => {
      let disconnectedUserId;
      for (const [userId, socketId] of userSockets.entries()) {
        if (socketId === socket.id) {
          disconnectedUserId = userId;
          userSockets.delete(userId);
          userActivities.delete(userId);
          break;
        }
      }
      if (disconnectedUserId) io.emit("user_disconnected", disconnectedUserId);
    });
  });
};

// 👇 helper để push notification realtime
export function emitToUser(userId, event, payload) {
  if (!ioRef) return;
  const sid = userSockets.get(String(userId));
  if (sid) ioRef.to(sid).emit(event, payload);
}
