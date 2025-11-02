import express from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import {
  requireAuth,
  signup,
  login,
  refreshToken,
  getProfile,
  updateProfile,
  changePassword,
  logout,
  artistRegister,
  artistUpdateProfile,
  artistGetSubscription,
} from "../controller/auth.controller.js";
const router = express.Router();
// Google Login Start
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

// Google OAuth Callback
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/login" }),
  (req, res) => {
    // Issue JWT
    const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    // Send token or redirect
    res.redirect(`/auth/success?token=${token}`);
  }
);

router.post("/auth/signup", signup);
router.post("/auth/login", login);
router.post("/auth/refresh-token", refreshToken);
router.get("/auth/profile", requireAuth, getProfile);
router.patch("/auth/profile", requireAuth, updateProfile);
router.post("/auth/change-password", requireAuth, changePassword);
router.post("/auth/logout", requireAuth, logout);

router.post("/artist/register", requireAuth, artistRegister);
router.patch("/artist/profile", requireAuth, artistUpdateProfile);
router.get("/artist/subscription", requireAuth, artistGetSubscription);

export default router;
