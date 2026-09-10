// ═══════════════════════════════════════════════════════════════
// webhookController.js — รับ event จาก Omise
//
// ⚠️ route นี้ต้องต่อ "ก่อน" express.json() ใน server.js
//    เพราะการตรวจลายเซ็นต้องใช้ body ดิบ ถ้าถูกแปลงเป็น object ไปแล้ว
//    ค่า HMAC จะไม่มีวันตรง
// ═══════════════════════════════════════════════════════════════
const crypto = require("crypto");
const { getCharge } = require("../utils/omise");
const { applyChargeStatus } = require("./paymentController");

// payload ที่ Omise เซ็น = "<timestamp>.<raw body>" ด้วย HMAC-SHA256
function signatureOk(req) {
  const secret = process.env.OMISE_WEBHOOK_SECRET;
  if (!secret) return null;        // null = ไม่ได้ตั้งคีย์ไว้ → ข้ามการตรวจ (ดูหมายเหตุด้านล่าง)

  const sig = req.headers["omise-signature"];
  const ts  = req.headers["omise-signature-timestamp"];
  if (!sig || !ts) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(ts + "." + req.body.toString("utf8"))
    .digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(String(sig), "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function omiseWebhook(req, res) {
  // ตอบ 200 ให้ไวที่สุดแล้วค่อยทำงานต่อ — Omise ไม่ retry ถ้าเราตอบช้าหรือพลาด
  res.status(200).json({ received: true });

  try {
    const verdict = signatureOk(req);
    if (verdict === false) {
      console.warn("[omise webhook] ลายเซ็นไม่ผ่าน — ทิ้ง event");
      return;
    }
    // verdict === null คือยังไม่ได้ตั้ง OMISE_WEBHOOK_SECRET
    // ยังปลอดภัยอยู่ เพราะขั้นตอนถัดไปเราไม่เชื่อ payload ที่ส่งมา
    // แต่ไปดึง charge จาก Omise มายืนยันเองอีกที (วิธีสำรองที่เอกสาร Omise แนะนำ)

    const event = JSON.parse(req.body.toString("utf8"));
    const chargeId = event?.data?.id;
    if (!chargeId || !String(chargeId).startsWith("chrg_")) return;
    if (!["charge.complete", "charge.update", "charge.expire", "charge.create"].includes(event.key)) return;

    const charge = await getCharge(chargeId);     // ← แหล่งความจริงเดียว
    if (charge.status === "pending") return;
    await applyChargeStatus(charge);
  } catch (err) {
    console.error("[omise webhook]", err);
  }
}

module.exports = { omiseWebhook };
