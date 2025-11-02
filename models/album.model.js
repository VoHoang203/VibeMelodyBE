import mongoose from "mongoose";

const albumSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    artist: { type: String, required: true },
    artistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    imageUrl: { type: String, required: true },
    releaseYear: { type: Number, required: true },
    songs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Song" }],
    likesCount: { type: Number, default: 0 },
    isHidden:    { type: Boolean, default: false } 
  },
  { timestamps: true }
); //  createdAt, updatedAt

export const Album = mongoose.model("Album", albumSchema);
