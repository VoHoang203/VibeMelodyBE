import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  followArtist,
  unfollowArtist,
  getArtistFollowStatus,
} from "../controller/follow.controller.js";

const router = Router();

router.get("/artists/:artistId/follow-status", requireAuth, getArtistFollowStatus);
router.post("/artists/:artistId/follow", requireAuth, followArtist);
router.delete("/artists/:artistId/follow", requireAuth, unfollowArtist);

export default router;
