import crypto from "crypto";
import axios from "axios";

const PAYOS_BASE = "https://api-merchant.payos.vn/v2";

const requiredEnv = ["CHECKSUM_KEY", "CLIENT_KEY", "API_KEY", "CANCEL_URL", "RETURN_URL"];
for (const k of requiredEnv) {
  if (!process.env[k]) {
    console.warn(`[payos.service] Missing env ${k} — make sure it's set!`);
  }
}

const { CHECKSUM_KEY, CLIENT_KEY, API_KEY, CANCEL_URL, RETURN_URL } = process.env;

function createSignature(dataString, key) {
  return crypto.createHmac("sha256", key).update(dataString).digest("hex");
}

// --- helper: build dataString theo docs webhook payOS ---
function buildDataStringFromObject(obj) {
  // Lưu ý: sắp xếp key theo alphabet; giá trị null/undefined -> ""
  const keys = Object.keys(obj || {}).sort();
  const parts = [];
  for (const k of keys) {
    let v = obj[k];
    if (v === null || v === undefined) v = "";
    else if (typeof v === "object") v = JSON.stringify(v); // data webhook thường phẳng; phòng hờ object lồng
    else v = String(v);
    parts.push(`${k}=${encodeURIComponent(v)}`);
  }
  return parts.join("&");
}

/**
 * Tạo payment request tới PayOS
 * @param {Object} args
 * @param {number|string} args.orderCode - Mã đơn (duy nhất)
 * @param {number} args.amount - Số tiền (VND)
 * @param {string} args.description - Mô tả đơn hàng
 * @param {string} [args.cancelUrl=process.env.CANCEL_URL]
 * @param {string} [args.returnUrl=process.env.RETURN_URL]
 */
export async function createPayment({
  orderCode,
  amount,
  description,
  cancelUrl = CANCEL_URL,
  returnUrl = RETURN_URL,
}) {
  if (!orderCode || !amount || !description) {
    throw new Error("Missing required fields: orderCode, amount, description");
  }
  if (!CLIENT_KEY || !API_KEY || !CHECKSUM_KEY) {
    throw new Error("Missing PayOS credentials in env");
  }

  // dataString theo định dạng PayOS (tạo signature)
  const dataString =
    `amount=${amount}` +
    `&cancelUrl=${cancelUrl}` +
    `&description=${description}` +
    `&orderCode=${orderCode}` +
    `&returnUrl=${returnUrl}`;

  const signature = createSignature(dataString, CHECKSUM_KEY);

  const { data } = await axios.post(
    `${PAYOS_BASE}/payment-requests`,
    {
      orderCode,
      amount,
      description,
      cancelUrl,
      returnUrl,
      signature,
    },
    {
      headers: {
        "Content-Type": "application/json",
        "x-client-id": CLIENT_KEY,
        "x-api-key": API_KEY,
      },
      timeout: 10000,
    }
  );

  return data; // response chuẩn của PayOS
}

/**
 * Kiểm tra trạng thái thanh toán
 * @param {number|string} orderCode
 */
export async function getPaymentStatus(orderCode) {
  if (!orderCode) throw new Error("Missing orderCode");
  if (!CLIENT_KEY || !API_KEY) throw new Error("Missing PayOS credentials in env");

  const { data } = await axios.get(
    `${PAYOS_BASE}/payment-requests/${orderCode}`,
    {
      headers: {
        "x-client-id": CLIENT_KEY,
        "x-api-key": API_KEY,
      },
      timeout: 10000,
    }
  );

  return {
    status: data?.data?.status,
    raw: data?.data,
  };
}

/**
 * XÁC THỰC WEBHOOK:
 * - body: payload JSON payOS gửi tới endpoint webhook của bạn
 * - return: true/false
 *
 * Theo docs: signature = HMAC_SHA256(dataString, CHECKSUM_KEY)
 * với dataString được ghép từ body.data theo dạng key=value&..., key sort alphabet, value encodeURI.
 */
export function verifyWebhook(body) {
  try {
    if (!CHECKSUM_KEY) return false;
    if (!body || typeof body !== "object") return false;

    const signature = body?.signature;
    const data = body?.data;

    if (!signature || !data) return false;

    const dataString = buildDataStringFromObject(data);
    const expected = createSignature(dataString, CHECKSUM_KEY);

    // so sánh chữ ký
    return expected === signature;
  } catch {
    return false;
  }
}
