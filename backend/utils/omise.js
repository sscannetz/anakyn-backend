// ═══════════════════════════════════════════════════════════════
// utils/omise.js — ตัวเรียก Omise API
//
// ใช้ fetch ของ Node 18+ ตรง ๆ ไม่ต้องลง SDK เพิ่ม
// (รูปแบบตรงกับตัวอย่าง curl ในเอกสาร Omise เป๊ะ ตรวจสอบง่าย)
//
// คีย์อยู่ใน env ฝั่ง backend เท่านั้น — ห้ามใส่ในแอป Expo เด็ดขาด
// เพราะโค้ดเว็บที่ deploy ขึ้น Vercel เปิดอ่านได้หมด
// ═══════════════════════════════════════════════════════════════
const API = "https://api.omise.co";

// Omise ใช้ HTTP Basic auth: secret key เป็น username, รหัสผ่านว่าง
function authHeader() {
  const key = process.env.OMISE_SECRET_KEY;
  if (!key) throw new Error("ยังไม่ได้ตั้งค่า OMISE_SECRET_KEY ในเซิร์ฟเวอร์");
  return "Basic " + Buffer.from(key + ":").toString("base64");
}

async function omiseRequest(path, { method = "GET", form } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: {
      Authorization: authHeader(),
      "Omise-Version": "2019-05-29",
      ...(form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: form ? new URLSearchParams(form).toString() : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.object === "error") {
    const msg = data.message || data.code || `Omise ตอบกลับ ${res.status}`;
    const err = new Error(msg);
    err.omiseCode = data.code;
    throw err;
  }
  return data;
}

// สร้าง source + charge ในคำขอเดียว (ตามหัวข้อ "Combined Source & Charge" ในเอกสาร)
// จึงไม่ต้องใช้ public key ที่ฝั่งแอปเลย
function createPromptPayCharge({ amountSatang, saleNo, expiresAt }) {
  const form = {
    amount: String(amountSatang),
    currency: "THB",
    "source[type]": "promptpay",
  };
  if (expiresAt) form.expires_at = expiresAt;         // ไม่เกิน 24 ชม. นับจากตอนสร้าง
  if (saleNo)    form["metadata[sale_no]"] = saleNo;  // ไว้ตามรอยตอนกระทบยอดกับ Omise

  return omiseRequest("/charges", { method: "POST", form });
}

const getCharge = (chargeId) => omiseRequest(`/charges/${chargeId}`);

// ดึงรูป QR มาเป็น base64 — เผื่อ download_uri เปิดตรงจากเบราว์เซอร์ไม่ได้
// (เอกสาร Omise ไม่ได้ระบุว่า URL นี้เปิดสาธารณะหรือต้องใส่คีย์)
async function fetchQrDataUri(downloadUri) {
  if (!downloadUri) return null;
  try {
    const res = await fetch(downloadUri, { headers: { Authorization: authHeader() } });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") || "image/png";
    const buf  = Buffer.from(await res.arrayBuffer());
    return `data:${type};base64,${buf.toString("base64")}`;
  } catch (_) {
    return null;
  }
}

const isConfigured = () => Boolean(process.env.OMISE_SECRET_KEY);

module.exports = {
  omiseRequest, createPromptPayCharge, getCharge, fetchQrDataUri, isConfigured,
};
