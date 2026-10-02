// ═══════════════════════════════════════════════════════════════
// receiptController.js — ใบเสร็จรับเงิน (ออกจากการขายที่มีอยู่)
// ═══════════════════════════════════════════════════════════════
const pool = require("../config/db");
const { nextHashNumber } = require("../utils/docNumber");

// ── แปลงเป็นตัวเลขแบบปลอดภัย (กัน NaN ที่ Postgres NUMERIC เก็บได้) ──
function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// ── sanitize: กัน NaN + alias grand_total ให้แอป Expo อ่านได้เหมือนเอกสารอื่น ──
function sanitizeReceipt(row) {
  const amount = toNum(row.amount) ?? toNum(row.total) ?? 0;
  // ส่วนลดมาจากบิลขาย (NUMERIC ของ pg ส่งมาเป็น string) — แปลงเป็นตัวเลขให้ใบเสร็จเอาไปโชว์
  return {
    ...row, amount, grand_total: amount, total: amount,
    subtotal:       toNum(row.subtotal) ?? 0,
    vip_discount:   toNum(row.vip_discount) ?? 0,
    extra_discount: toNum(row.extra_discount) ?? 0,
    vat_amount:     toNum(row.vat_amount) ?? 0,
  };
}

async function listReceipts(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT r.*, s.sale_no, s.total, s.subtotal, s.vip_discount, s.extra_discount, s.vat_amount,
              c.full_name AS customer_name
       FROM receipts r
       LEFT JOIN sales s ON s.id = r.sale_id
       LEFT JOIN customers c ON c.id = s.customer_id
       ORDER BY r.issued_at DESC`
    );
    res.json(rows.map(sanitizeReceipt));
  } catch (err) {
    res.status(500).json({ error: "ไม่สามารถโหลดรายการใบเสร็จได้" });
  }
}

async function getReceipt(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT r.*, s.sale_no, s.total, s.subtotal, s.vip_discount, s.extra_discount, s.vat_amount,
              c.full_name AS customer_name, c.phone
       FROM receipts r
       LEFT JOIN sales s ON s.id = r.sale_id
       LEFT JOIN customers c ON c.id = s.customer_id
       WHERE r.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "ไม่พบใบเสร็จ" });
    // ดึงรายการสินค้าจากการขาย เพื่อแสดงในรายละเอียด/ปริ้น
    const items = await pool.query(
      `SELECT si.qty, si.unit_price, si.line_total, p.name AS product_name, p.sku
       FROM sale_items si LEFT JOIN products p ON p.id = si.product_id
       WHERE si.sale_id = $1`,
      [rows[0].sale_id]
    );
    res.json(sanitizeReceipt({ ...rows[0], items: items.rows }));
  } catch (err) {
    res.status(500).json({ error: "เกิดข้อผิดพลาด" });
  }
}

// POST /api/receipts { sale_id, amount?, payment_method?, note? }
// ถ้าไม่ส่ง amount มา ใช้ยอด total ของการขายนั้น
async function createReceipt(req, res) {
  const { sale_id, amount, payment_method = "cash", note = "" } = req.body;
  if (!sale_id) return res.status(400).json({ error: "กรุณาระบุรายการขายที่จะออกใบเสร็จ" });

  try {
    const sale = await pool.query("SELECT * FROM sales WHERE id = $1", [sale_id]);
    if (!sale.rows[0]) return res.status(404).json({ error: "ไม่พบรายการขายนี้" });

    const amt = toNum(amount) ?? toNum(sale.rows[0].total) ?? 0;
    const receiptNo = await nextHashNumber("receipts", "receipt_no", "Receipt");

    const { rows } = await pool.query(
      `INSERT INTO receipts (receipt_no, sale_id, amount, payment_method, note, issued_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [receiptNo, sale_id, amt, payment_method, note, req.user.id]
    );
    // ส่งส่วนลด/ยอดก่อนส่วนลดของบิลกลับไปด้วย เผื่อหน้าจอสั่งปริ้นต่อทันทีโดยไม่ได้โหลดใบเสร็จใหม่
    const sl = sale.rows[0];
    res.status(201).json(sanitizeReceipt({
      ...rows[0], sale_no: sl.sale_no,
      subtotal: sl.subtotal, vip_discount: sl.vip_discount,
      extra_discount: sl.extra_discount, vat_amount: sl.vat_amount,
    }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ไม่สามารถออกใบเสร็จได้" });
  }
}

// DELETE /api/receipts/:id — ลบใบเสร็จ
async function deleteReceipt(req, res) {
  try {
    const { rowCount } = await pool.query("DELETE FROM receipts WHERE id = $1", [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: "ไม่พบใบเสร็จ" });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "ไม่สามารถลบใบเสร็จได้" });
  }
}

module.exports = { listReceipts, getReceipt, createReceipt, deleteReceipt };
