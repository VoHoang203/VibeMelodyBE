// routes/payos.route.js
import express from "express";
import { createPayment, getPaymentStatus } from "../services/payos.service.js";
import { Payment } from "../models/payment.model.js";
import { planFromAmount, addMonths } from "../utils/artist-plan.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { User } from "../models/user.model.js";
const router = express.Router();

/**
 * POST /payos/create-payment
 * body: { orderCode, amount, description, cancelUrl, returnUrl }
 * - Tạo link thanh toán PayOS
 * - Upsert bản ghi Payment với trạng thái "pending"
 */
router.post("/payos/create-payment", requireAuth,async (req, res) => {
  try {
    console.log('req.user', req.user );
    const userId = req.user?._id || req.user?.id; // tuỳ middleware auth của bạn
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { orderCode, amount, description, cancelUrl, returnUrl } = req.body || {};
    if (!orderCode || !amount || !cancelUrl || !returnUrl) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const result = await createPayment({ orderCode, amount, description, cancelUrl, returnUrl });

    // Lưu/ cập nhật Payment -> pending
    const { plan, months } = planFromAmount(Number(amount));
    await Payment.findOneAndUpdate(
      { orderCode: String(orderCode) },
      {
        orderCode: String(orderCode),
        user: userId,
        amount: Number(amount),
        currency: "VND",
        provider: "PayOS",
        status: "pending",
        plan,
        periodMonths: months,
        description: description || `Artist subscription ${plan}`,
        raw: { createPaymentRes: result },
      },
      { upsert: true, new: true }
    );

    return res.json(result);
  } catch (err) {
    console.error("[PayOS] create-payment error:", err?.response?.data || err.message);
    return res.status(400).json({ message: "PayOS create payment failed", error: err?.response?.data || err.message });
  }
});

/**
 * GET /payos/status/:orderCode
 * - Gọi PayOS lấy trạng thái
 * - Đồng thời CẬP NHẬT DB (Payment + User) theo kết quả
 * - Idempotent: nếu đã paid thì bỏ qua
 */
router.get("/payos/status/:orderCode", async (req, res) => {
  try {
    const { orderCode } = req.params || {};
    if (!orderCode) return res.status(400).json({ message: "Missing orderCode" });

    // 1) Lấy trạng thái từ PayOS
    const result = await getPaymentStatus(orderCode);
    const statusRaw =
      result?.status ??
      result?.data?.status ??
      result?.raw?.status ??
      "";
    const status = String(statusRaw).toUpperCase();

    // 2) Lưu trace trạng thái vào Payment.raw
    const payment = await Payment.findOneAndUpdate(
      { orderCode: String(orderCode) },
      { $set: { "raw.lastStatusRes": result } },
      { new: true }
    );

    // Nếu không có payment trong DB (không tạo trước đó), trả trạng thái cho client là đủ
    if (!payment) return res.json(result);

    // 3) Idempotent: nếu đã paid thì không làm gì thêm
    if (payment.status === "paid") return res.json(result);

    // 4) Phân nhánh cập nhật
    if (status === "PAID" || status === "SUCCESS") {
      // Cập nhật Payment -> paid
      await Payment.updateOne(
        { _id: payment._id },
        { $set: { status: "paid" } }
      );

      // Cập nhật User -> bật artist + gia hạn subscription
      const months = payment.periodMonths || 1;

      // Lấy user hiện tại để xác định base time gia hạn
      const userDoc = await User.findById(payment.user).lean();
      const now = new Date();
      const currentEnd = userDoc?.artistProfile?.subscription?.currentPeriodEnd
        ? new Date(userDoc.artistProfile.subscription.currentPeriodEnd)
        : null;

      // Nếu còn hạn, cộng dồn từ currentEnd; nếu hết hạn/không có, bắt đầu từ now
      const base = currentEnd && currentEnd > now ? currentEnd : now;
      const periodEnd = addMonths(base, months);

      await User.updateOne(
        { _id: payment.user },
        {
          $set: {
            isArtist: true,
            "artistProfile.subscription.status": "active",
            "artistProfile.subscription.plan": "artist_monthly", // hoặc map từ payment.plan
            "artistProfile.subscription.currentPeriodEnd": periodEnd,
            "artistProfile.subscription.lastPaymentAt": now,
          },
        }
      );

      return res.json(result);
    }

    if (status === "CANCELLED" || status === "CANCELED") {
      await Payment.updateOne(
        { _id: payment._id },
        { $set: { status: "canceled" } }
      );
      return res.json(result);
    }

    if (status === "FAILED") {
      await Payment.updateOne(
        { _id: payment._id },
        { $set: { status: "failed" } }
      );
      return res.json(result);
    }

    // Trạng thái khác (PENDING/PROCESSING/...) -> giữ nguyên pending
    return res.json(result);
  } catch (err) {
    console.error("[PayOS] status error:", err?.response?.data || err.message);
    return res.status(400).json({ message: "PayOS check status failed", error: err?.response?.data || err.message });
  }
});

export default router;
