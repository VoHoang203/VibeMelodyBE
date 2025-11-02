import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String }, // nếu login truyền thống
    imageUrl: { type: String },
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    likedSongs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Song" }],
    likedAlbums: [{ type: mongoose.Schema.Types.ObjectId, ref: "Album" }],
    albums: [{ type: mongoose.Schema.Types.ObjectId, ref: "Album" }],

    isArtist: { type: Boolean, default: false },
    artistProfile: {
      stageName: String,
      bio: String,
      subscription: {
        plan: {
          type: String,
          enum: ["artist_monthly"],
          default: "artist_monthly",
        },
        status: {
          type: String,
          enum: ["active", "inactive", "canceled"],
          default: "inactive",
        },
        currentPeriodEnd: { type: Date },
        lastPaymentAt: { type: Date },
      },
    },

    notificationTokens: [{ type: String }],
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model("User", userSchema);
