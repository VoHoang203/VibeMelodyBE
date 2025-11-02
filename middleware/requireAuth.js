// middleware/requireAuth.js
import { verifyAccess } from "../utils/jwt.js";
import { User } from "../models/user.model.js";

export const requireAuth = async (req, res, next) => {
  const hdr = req.headers.authorization || "";
  console.log("Authorization header:", hdr); // nên thấy "Bearer xxx.yyy.zzz"

  const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const payload = verifyAccess(token);
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};
