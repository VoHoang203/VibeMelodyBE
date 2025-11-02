import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    orderCode: { type: String, unique: true, index: true },
    user:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount:    { type: Number, required: true },
    currency:  { type: String, default: "VND" },
    raw:       { type: Object }, 
  },
  { timestamps: true }
);

export const Payment = mongoose.model("Payment", paymentSchema);