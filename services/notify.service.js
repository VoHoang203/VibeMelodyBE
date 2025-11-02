import { Notification } from "../models/notification.model.js";
import { emitToUser } from "../sockets/socket.js";

export async function notify(userId, { content, imageUrl, meta }) {
  const doc = await Notification.create({
    user: userId,
    content,
    imageUrl,
    at: new Date(),
    meta,
  });
  emitToUser(userId, "notification:new", {
    _id: doc._id,
    content: doc.content,
    imageUrl: doc.imageUrl,
    at: doc.at,
    meta: doc.meta,
  });
  return doc;
}
