// routes/artist.js hoặc controllers/artistController.js
import { User } from "../models/user.model.js";

// GET /artist/check
export const checkArtistStatus = async (req, res) => {
  try {
    // req.user được gán từ middleware requireAuth (JWT)
    const userId = req.user._id;

    const user = await User.findById(userId).select("isArtist artistProfile.subscription.status");
    console.log("Check artist:", req.user._id, "→ isArtist:", req.user.isArtist);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Điều kiện để là Artist:
    const isArtist = user.isArtist === true &&
                     user.artistProfile?.subscription?.status === "active";

    return res.json({
      artist: isArtist
    });

  } catch (error) {
    console.error("checkArtistStatus error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};