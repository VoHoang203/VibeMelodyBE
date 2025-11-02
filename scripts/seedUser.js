import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";


import { User } from "../models/user.model.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI ;

function addOneMonth(from = new Date()) {
  const d = new Date(from);
  d.setMonth(d.getMonth() + 1);
  return d;
}

async function main() {
  console.log("[seed] Connecting Mongo…", MONGO_URI);
  await mongoose.connect(MONGO_URI);

  const passwordHash = await bcrypt.hash("123456", 10);

  const users = [
    // Artist: Sơn Tùng M-TP
    {
      fullName: "Sơn Tùng M-TP",
      email: "sontung.mtp@example.com",
      password: passwordHash,
      imageUrl: "https://ui-avatars.com/api/?name=Son+Tung+MTP",
      isArtist: true,
      artistProfile: {
        stageName: "Sơn Tùng M-TP",
        bio: "Ca sĩ/nhạc sĩ.",
        subscription: {
          plan: "artist_monthly",
          status: "active",
          currentPeriodEnd: addOneMonth(),
          lastPaymentAt: new Date()
        }
      }
    },

    // 3 users: Võ Hoàng 1,2,3
    {
      fullName: "Võ Hoàng 1",
      email: "vohoang1@example.com",
      password: passwordHash,
      imageUrl: "https://ui-avatars.com/api/?name=Vo+Hoang+1",
      isArtist: false
    },
    {
      fullName: "Võ Hoàng 2",
      email: "vohoang2@example.com",
      password: passwordHash,
      imageUrl: "https://ui-avatars.com/api/?name=Vo+Hoang+2",
      isArtist: false
    },
    {
      fullName: "Võ Hoàng 3",
      email: "vohoang3@example.com",
      password: passwordHash,
      imageUrl: "https://ui-avatars.com/api/?name=Vo+Hoang+3",
      isArtist: false
    }
  ];

  // Upsert theo email để tránh trùng
  for (const u of users) {
    const { email, ...rest } = u;
    const updated = await User.updateOne(
      { email },
      { $set: rest, $setOnInsert: { email } },
      { upsert: true }
    );
    console.log(`[seed] Upsert ${email}:`, updated.acknowledged ? "OK" : "FAILED");
  }

  await mongoose.disconnect();
  console.log("[seed] Done.");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

//node scripts/seedUser.js