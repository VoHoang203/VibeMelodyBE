// models/payment.model.js
import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    orderCode: { type: String, unique: true, index: true, required: true },
    user:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount:    { type: Number, required: true },
    currency:  { type: String, default: "VND" },

    // ✅ thêm (tuỳ chọn)
    provider:  { type: String, default: "PayOS" },
    status:    { type: String, enum: ["pending", "paid", "failed", "canceled"], default: "pending" },
    plan:      { type: String, enum: ["artist_1m", "artist_3m", "artist_6m"], default: "artist_1m" },
    periodMonths: { type: Number, default: 1 },
    description: { type: String },

    raw:       { type: Object }, // full payload (create/link/webhook/status)
  },
  { timestamps: true }
);

export const Payment = mongoose.model("Payment", paymentSchema);
