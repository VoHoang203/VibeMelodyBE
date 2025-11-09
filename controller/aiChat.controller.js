import { GoogleGenerativeAI } from "@google/generative-ai";
import { Message } from "../models/message.model.js";
import { User } from "../models/user.model.js";
import { Album } from "../models/album.model.js";
import { Song } from "../models/song.model.js";
import { Like } from "../models/like.model.js";
// ----- Khởi tạo Gemini -----
let genAI = null;
let geminiModel = null;

try {
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "demo-key") {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    geminiModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    console.log("✅ Gemini AI chat initialized");
  } else {
    console.warn("⚠️ GEMINI_API_KEY not set, AI chat will use fallback");
  }
} catch (err) {
  console.error("❌ Gemini init error:", err.message || err);
}

async function callGemini(prompt) {
  if (!geminiModel) {
    return "Xin chào! Hiện tại AI đang bận một chút, nhưng mình vẫn có thể giúp bạn tìm nhạc và nghệ sĩ trên VibeMelody nhé 🎧";
  }

  const result = await geminiModel.generateContent(prompt);
  const response = result.response;
  return response.text();
}

function getUserIdFromReq(req) {
  return (
    req.user?._id?.toString() ||
    req.user?.id?.toString() ||
    req.body?.userId?.toString() ||
    req.query?.userId?.toString() ||
    null
  );
}
function mapSongCard(s) {
  const album = s.album || s.albumId || {};
  const artistObj = s.artistId && typeof s.artistId === "object" ? s.artistId : null;
  const artistName =
    s.artist ||
    artistObj?.artistProfile?.stageName ||
    artistObj?.fullName ||
    album?.artist ||
    "Unknown Artist";

  return {
    id: s._id?.toString(),
    title: s.title,
    artist: artistName,
    artistId: s.artistId?.toString?.() || s.artistId,
    imageUrl: s.imageUrl || album?.imageUrl || null,
    audioUrl: s.audioUrl,
    duration: s.duration,
    likesCount: s.likesCount ?? 0,
    album: album?._id
      ? { id: album._id?.toString(), title: album.title, imageUrl: album.imageUrl }
      : null,
  };
}

// ---- Intent detection (rất nhẹ, rule-based) ----
function detectIntent(text) {
  const t = (text || "").toLowerCase();
  const moodKeywords = [
    "buồn","sad","quên","buông","giết","thất","muộn màng","vài lần",
    "vui","happy","energetic","mệt","tired","chill","lofi","calm",
    "ngủ","sleep","tập trung","focus","lonely","broken"
  ];
  const followingKeywords = [
    "following","theo dõi","người mình theo","nghệ sĩ mình theo",
    "followed artists","artist i follow"
  ];
  if (followingKeywords.some(k => t.includes(k))) return { type: "following" };
  if (moodKeywords.some(k => t.includes(k))) return { type: "mood", keyword: t };
  return { type: "general" };
}

// ---- Query 1: 5 bài mới nhất từ artists mà user đang follow ----
async function getFollowingSongs(userId, limit = 5) {
  const me = await User.findById(userId).select("following").lean();
  const following = me?.following || [];
  if (!following.length) return [];
  const songs = await Song.find({ artistId: { $in: following } })
    .populate({ path: "albumId", select: "title imageUrl artist" })
    .populate({ path: "artistId", select: "fullName artistProfile.stageName" })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  return songs.map(s => ({ ...s, album: s.albumId }));
}

// ---- mood search: regex title + album.title (NO aggregate) ----
async function searchSongsByMood(rawKeyword, limit = 5) {
  const keyMap = [
    {
      keys: ["buồn","sad","quên","buông","giết","thất","muộn màng","vài lần","lonely","broken"],
      rx: /(buồn|buon|quên|quen|buông|buong|giết|giet|thất|that|muộn màng|muon mang|muộn|muon|cô đơn|co don|đơn côi|don coi|tan vỡ|tan vo|vỡ|vo|nhớ|nho|lạc trôi|lac troi|vài lần|vai lan|chênh vênh|chenh venh|u sầu|u sau|sad|broken|lonely)/i
    },
    { keys: ["vui","happy","energetic"], rx: /(vui|happy|party|dance|sôi động|soi dong|rộn ràng|ron rang|tưng bừng|tung bung)/i },
    { keys: ["mệt","tired"], rx: /(mệt|met|tired|uể oải|ue oai|kiệt sức|kiet suc|đuối|duoi|mỏi mệt|moi met)/i },
    { keys: ["chill","lofi","calm"], rx: /(chill|lofi|thư giãn|thu gian|calm|relax|êm dịu|em diu)/i },
    { keys: ["ngủ","sleep"], rx: /(ngủ|ngu|sleep|ru ngủ|ru ngu|bedtime|midnight|đêm|dem)/i },
    { keys: ["tập trung","focus"], rx: /(tập trung|tap trung|focus|study|work|deep|concentration)/i },
  ];

  let rx = null;
  const t = (rawKeyword || "").toLowerCase();
  for (const { keys, rx: r } of keyMap) {
    if (keys.some(k => t.includes(k))) { rx = r; break; }
  }
  if (!rx) {
    const safe = (t.match(/[a-zA-ZÀ-ỹ0-9 ]+/g) || [t]).join(" ");
    rx = new RegExp(safe.split(/\s+/).filter(Boolean).join("|"), "i");
  }

  const byTitle = await Song.find({ title: { $regex: rx } })
    .populate({ path: "albumId", select: "title imageUrl artist" })
    .populate({ path: "artistId", select: "fullName artistProfile.stageName" })
    .sort({ likesCount: -1, createdAt: -1 })
    .limit(limit)
    .lean();

  if (byTitle.length >= limit) return byTitle.map(s => ({ ...s, album: s.albumId }));

  const albums = await Album.find({ title: { $regex: rx } })
    .select("_id title imageUrl artist")
    .limit(20)
    .lean();

  let byAlbum = [];
  if (albums.length) {
    const albumIds = albums.map(a => a._id);
    byAlbum = await Song.find({ albumId: { $in: albumIds } })
      .populate({ path: "albumId", select: "title imageUrl artist" })
      .populate({ path: "artistId", select: "fullName artistProfile.stageName" })
      .sort({ likesCount: -1, createdAt: -1 })
      .limit(limit)
      .lean();
  }

  const uniq = new Map();
  [...byTitle, ...byAlbum].forEach(s => uniq.set(String(s._id), s));
  let merged = Array.from(uniq.values());

  if (merged.length < limit) {
    const more = await Song.find({})
      .populate({ path: "albumId", select: "title imageUrl artist" })
      .populate({ path: "artistId", select: "fullName artistProfile.stageName" })
      .sort({ likesCount: -1, createdAt: -1 })
      .limit(limit - merged.length)
      .lean();
    merged = [...merged, ...more];
  }
  return merged.slice(0, limit).map(s => ({ ...s, album: s.albumId }));
}

// ---- summarize bằng AI ----
async function summarizeSongsWithAI({ user, songs, mode, originalText }) {
  const list = songs.map((s, i) => {
    const alb = s.album || s.albumId;
    return `${i + 1}. ${s.title} – ${s.artist}${alb?.title ? ` (album: ${alb.title})` : ""}`;
  }).join("\n");

  const base = `
Bạn là trợ lý âm nhạc của VibeMelody. Trả lời 1–4 câu, tiếng Việt casual, emoji vừa đủ.
- Chế độ: ${mode}
- User: ${user ? JSON.stringify({ id: user._id, fullName: user.fullName, isArtist: user.isArtist }) : "n/a"}
- Tin nhắn: "${(originalText || "").slice(0, 400)}"
- Gợi ý:
${list || "(chưa có bài nào)"} `.trim();

  try {
    const text = await callGemini(base + "\n\nViết lời gợi ý mời nghe các bài trên.");
    return text;
  } catch {
    if (!songs.length) return "Hình như chưa tìm thấy bài phù hợp. Bạn thử mô tả mood/kiểu nhạc rõ hơn nhé!";
    return `Bạn thử nghe: ${songs.slice(0,3).map(s=>s.title).join(", ")} xem có hợp mood không nha!`;
  }
}

/**
 * GET /ai/messages
 * -> Lấy toàn bộ lịch sử chat giữa user hiện tại và AI (senderId/receiverId = 'ai')
 */
export const getAiMessages = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized",
      });
    }

    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: "ai" },
        { senderId: "ai", receiverId: userId },
      ],
    })
      .sort({ createdAt: 1 })
      .lean();

    return res.json({
      status: "success",
      data: { messages },
    });
  } catch (error) {
    console.error("getAiMessages error:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to load AI messages",
    });
  }
};

/**
 * POST /ai/chat
 * body: { message }
 * -> Lưu message user -> AI, gọi Gemini, lưu AI -> user, trả về aiMessage
 */
export const chatWithAI = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    const { message } = req.body || {};
    if (!userId) return res.status(401).json({ status: "error", message: "Unauthorized" });
    if (!message?.trim()) return res.status(400).json({ status: "error", message: "Message is required" });

    const me = await User.findById(userId).lean();

    // lưu tin nhắn user -> AI
    await Message.create({ senderId: userId, receiverId: "ai", content: message.trim() });

    const intent = detectIntent(message);
    let songs = [];
    let aiText = "";

    if (intent.type === "following") {
      const raw = await getFollowingSongs(userId, 5);
      songs = raw.map(mapSongCard);
      aiText = await summarizeSongsWithAI({ user: me, songs, mode: "recommend_from_following", originalText: message });
    } else if (intent.type === "mood") {
      const raw = await searchSongsByMood(message, 5);
      songs = raw.map(mapSongCard);
      aiText = await summarizeSongsWithAI({ user: me, songs, mode: "recommend_by_mood", originalText: message });
    } else {
      const history = await Message.find({
        $or: [
          { senderId: userId, receiverId: "ai" },
          { senderId: "ai", receiverId: userId },
        ],
      }).sort({ createdAt: 1 }).limit(20).lean();

      const historyText = history.map(m => `${m.senderId === "ai" ? "AI" : "User"}: ${m.content}`).join("\n");

      const prompt = `
Bạn là trợ lý AI của VibeMelody (web nghe nhạc).
- Trò chuyện thân thiện, Việt casual (1–4 câu), có thể gợi ý nhạc khi phù hợp.

User: ${JSON.stringify(me ? { id: me._id, fullName: me.fullName, isArtist: me.isArtist } : null)}
Lịch sử:
${historyText || "(chưa có lịch sử)"}

Tin nhắn:
"${message.trim()}"`.trim();

      aiText = await callGemini(prompt);
    }

    // lưu AI -> user
    const aiMessage = await Message.create({ senderId: "ai", receiverId: userId, content: aiText });

    return res.json({
      status: "success",
      data: { intent: intent.type, aiMessage, songs },
    });
  } catch (e) {
    console.error("chatWithAI error:", e);
    return res.status(500).json({ status: "error", message: "Failed to process AI chat" });
  }
};