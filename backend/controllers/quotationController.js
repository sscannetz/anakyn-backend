// ═══════════════════════════════════════════════════════════════
// quotationController.js — ใบเสนอราคา
// ═══════════════════════════════════════════════════════════════
const pool = require("../config/db");
const { nextDocNumber } = require("../utils/docNumber");

async function listQuotations(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT q.*, c.full_name AS customer_name FROM quotations q
       LEFT JOIN customers c ON c.id = q.customer_id
       ORDER BY q.issued_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "ไม่สามารถโหลดรายการใบเสนอราคาได้" });
  }
}

async function getQuotation(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT q.*, c.full_name AS customer_name, c.phone, c.email, c.is_vip
       FROM quotations q
       LEFT JOIN customers c ON c.id = q.customer_id WHERE q.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "ไม่พบใบเสนอราคา" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "เกิดข้อผิดพลาด" });
  }
}

// POST /api/quotations  { customer_id, items:[{name,sku,detail,specs,qty,price}], valid_days, vat_enabled, notes }
async function createQuotation(req, res) {
  const { customer_id, items, valid_days = 30, vat_enabled = true, notes = "" } = req.body;
  if (!items || items.length === 0) {
    return res.status(400).json({ error: "กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ" });
  }

  try {
    const subtotal = items.reduce((sum, it) => sum + it.price * (it.qty || 1), 0);
    const vatAmount = vat_enabled ? Math.round(subtotal * 0.07) : 0;
    const total = subtotal + vatAmount;

    const quoteNo = await nextDocNumber("quotations", "quote_no", "QT");
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + valid_days);

    const { rows } = await pool.query(
      `INSERT INTO quotations
        (quote_no, customer_id, items, subtotal, vat_amount, vat_applied, total, valid_until, notes, issued_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [quoteNo, customer_id, JSON.stringify(items), subtotal, vatAmount, vat_enabled, total, validUntil, notes, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ไม่สามารถสร้างใบเสนอราคาได้" });
  }
}

// PATCH /api/quotations/:id/status  { status: "accepted" | "rejected" | "expired" }
async function updateQuotationStatus(req, res) {
  const { status } = req.body;
  try {
    const { rows } = await pool.query(
      "UPDATE quotations SET status = $1 WHERE id = $2 RETURNING *",
      [status, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "ไม่พบใบเสนอราคา" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "ไม่สามารถอัพเดตสถานะได้" });
  }
}

// PATCH /api/quotations/:id  { vat_applied, notes, valid_until }
// ใช้สำหรับแก้ไขในตัวเอกสาร (toggle VAT / แก้หมายเหตุ / เปลี่ยนวันหมดอายุ) ตามต้นฉบับ
async function updateQuotation(req, res) {
  const { id } = req.params;
  const { vat_applied, notes, valid_until } = req.body;

  try {
    const existing = await pool.query("SELECT * FROM quotations WHERE id = $1", [id]);
    if (!existing.rows[0]) return res.status(404).json({ error: "ไม่พบใบเสนอราคา" });
    const q = existing.rows[0];

    const newVatApplied = vat_applied !== undefined ? vat_applied : q.vat_applied;
    const newVatAmt = newVatApplied ? Math.round(Number(q.subtotal) * 0.07) : 0;
    const newTotal = Number(q.subtotal) + newVatAmt;
    const newNotes = notes !== undefined ? notes : q.notes;
    const newValidUntil = valid_until !== undefined ? valid_until : q.valid_until;

    const { rows } = await pool.query(
      `UPDATE quotations
       SET vat_applied = $1, vat_amount = $2, total = $3, notes = $4, valid_until = $5
       WHERE id = $6 RETURNING *`,
      [newVatApplied, newVatAmt, newTotal, newNotes, newValidUntil, id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ไม่สามารถแก้ไขใบเสนอราคาได้" });
  }
}

module.exports = { listQuotations, getQuotation, createQuotation, updateQuotationStatus, updateQuotation };
