// ═══════════════════════════════════════════════════════════════
// paymentController.js — รับชำระเงินผ่าน Omise (PromptPay QR)
//
// flow: สร้างบิล → สร้าง QR → ลูกค้าสแกนจ่าย → webhook และ/หรือ polling
//       → sale = completed  (จ่ายสำเร็จ)
//       → sale = cancelled + คืนสต๊อก (หมดอายุ / จ่ายไม่สำเร็จ)
// ═══════════════════════════════════════════════════════════════
const pool = require("../config/db");
const { createPromptPayCharge, getCharge, fetchQrDataUri, isConfigured } = require("../utils/omise");

// เพดานของ PromptPay ผ่าน Omise
const MIN_SATANG  = 2000;        // 20 บาท
const MAX_SATANG  = 15000000;    // 150,000 บาท
const QR_MINUTES  = 15;          // ลูกค้ายืนรอหน้าร้าน ไม่ต้องค้างถึง 24 ชม.

const toClient = (p) => ({
  id: p.id,
  sale_id: p.sale_id,
  status: p.status,
  amount: Number(p.amount_satang) / 100,
  qr_image_url: p.qr_image_url,
  expires_at: p.expires_at,
  failure_code: p.failure_code,
});

// ── POST /api/payments/promptpay ──────────────────────────────
async function createPromptPay(req, res) {
  if (!isConfigured()) {
    return res.status(503).json({ error: "ยังไม่ได้ตั้งค่าคีย์ Omise ที่เซิร์ฟเวอร์" });
  }

  const { sale_id, amount } = req.body;   // amount = บาท

  const { rows } = await pool.query("SELECT * FROM sales WHERE id = $1", [sale_id]);
  const sale = rows[0];
  if (!sale) return res.status(404).json({ error: "ไม่พบบิลนี้" });

  // ปัดเป็นสตางค์ — ห้ามคำนวณเงินด้วยทศนิยมลอย ๆ
  const amountSatang = Math.round(Number(amount) * 100);
  if (!Number.isFinite(amountSatang) || amountSatang < MIN_SATANG) {
    return res.status(400).json({ error: "ยอดชำระผ่าน QR ต้องไม่ต่ำกว่า 20 บาท" });
  }
  if (amountSatang > MAX_SATANG) {
    return res.status(400).json({
      error: "ยอดเกิน 150,000 บาท ซึ่งเกินเพดานของ PromptPay — กรุณาแบ่งจ่ายหรือใช้ช่องทางอื่น",
    });
  }

  const expiresAt = new Date(Date.now() + QR_MINUTES * 60 * 1000).toISOString();

  try {
    const charge = await createPromptPayCharge({
      amountSatang, saleNo: sale.sale_no, expiresAt,
    });

    // เอกสาร Omise ไม่ได้บอกว่า download_uri เปิดตรงได้ไหม → ดึงมาเป็น base64 ไว้เลย
    // ถ้าดึงไม่ได้ค่อย fallback ไปใช้ URL ตรง
    const downloadUri = charge.source?.scannable_code?.image?.download_uri || null;
    const qrImage     = (await fetchQrDataUri(downloadUri)) || downloadUri;

    const saved = await pool.query(
      `INSERT INTO payments
        (sale_id, method, charge_id, source_id, amount_satang, status,
         qr_image_url, expires_at, raw, created_by)
       VALUES ($1,'promptpay',$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [sale_id, charge.id, charge.source?.id || null, amountSatang, charge.status,
       qrImage, charge.expires_at || expiresAt, JSON.stringify(charge), req.user?.id || null]
    );

    await pool.query(
      "UPDATE sales SET status = 'pending', payment_status = 'pending' WHERE id = $1",
      [sale_id]
    );

    res.status(201).json(toClient(saved.rows[0]));
  } catch (err) {
    console.error("omise createPromptPay:", err);
    res.status(502).json({ error: "สร้าง QR ไม่สำเร็จ: " + err.message });
  }
}

// ── GET /api/payments/:id ─────────────────────────────────────
// แอปเรียกทุก 3 วิ — ถาม Omise ตรง ๆ ไม่รอ webhook อย่างเดียว
// (Omise ไม่การันตี retry ของ webhook + Render free tier หลับได้)
async function getPayment(req, res) {
  const { rows } = await pool.query("SELECT * FROM payments WHERE id = $1", [req.params.id]);
  const p = rows[0];
  if (!p) return res.status(404).json({ error: "ไม่พบรายการชำระเงิน" });

  if (p.status === "pending" && p.charge_id) {
    try {
      const charge = await getCharge(p.charge_id);
      if (charge.status !== "pending") {
        await applyChargeStatus(charge);
        const fresh = await pool.query("SELECT * FROM payments WHERE id = $1", [p.id]);
        return res.json(toClient(fresh.rows[0]));
      }
      // QR หมดอายุแล้วแต่ Omise ยังไม่เปลี่ยนสถานะ → ปิดเองฝั่งเรา
      if (p.expires_at && new Date(p.expires_at) < new Date()) {
        await applyChargeStatus({ ...charge, status: "expired" });
        const fresh = await pool.query("SELECT * FROM payments WHERE id = $1", [p.id]);
        return res.json(toClient(fresh.rows[0]));
      }
    } catch (err) {
      console.error("omise getPayment:", err.message);   // Omise ล่ม → คืนค่าที่เก็บไว้ไปก่อน
    }
  }
  res.json(toClient(p));
}

// ── จุดเดียวที่เปลี่ยนสถานะ — ทั้ง webhook และ polling เรียกตัวนี้ ──
async function applyChargeStatus(charge) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // ล็อกแถวไว้ กัน webhook กับ polling เข้ามาพร้อมกันแล้วอัปเดตซ้ำ
    const { rows } = await client.query(
      "SELECT * FROM payments WHERE charge_id = $1 FOR UPDATE", [charge.id]
    );
    const p = rows[0];

    // ไม่รู้จัก charge นี้ หรืออัปเดตไปแล้ว → จบเงียบ ๆ (idempotent)
    if (!p || p.status !== "pending") {
      await client.query("COMMIT");
      return;
    }

    const ok = charge.status === "successful";

    await client.query(
      `UPDATE payments
          SET status = $1, failure_code = $2, paid_at = $3, raw = $4, updated_at = now()
        WHERE id = $5`,
      [charge.status, charge.failure_code || null, ok ? new Date() : null,
       JSON.stringify(charge), p.id]
    );

    if (ok) {
      await client.query(
        "UPDATE sales SET status = 'completed', payment_status = 'paid' WHERE id = $1",
        [p.sale_id]
      );
    } else {
      // failed / expired → ยกเลิกบิล + คืนสต๊อกที่ตัดไว้ตอนสร้างบิล
      await client.query(
        "UPDATE sales SET status = 'cancelled', payment_status = 'failed' WHERE id = $1",
        [p.sale_id]
      );
      await client.query(
        `UPDATE products p
            SET stock_qty = p.stock_qty + si.qty, is_available = true
           FROM sale_items si
          WHERE si.sale_id = $1 AND si.product_id = p.id`,
        [p.sale_id]
      );
    }

    await client.query("COMMIT");
    console.log(`[omise] charge ${charge.id} → ${charge.status} (sale ${p.sale_id})`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { createPromptPay, getPayment, applyChargeStatus };
