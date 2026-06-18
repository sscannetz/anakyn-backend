// ═══════════════════════════════════════════════════════════════
// invoiceController.js — ใบกำกับภาษี (ออกจากการขายที่มีอยู่)
// ═══════════════════════════════════════════════════════════════
const pool = require("../config/db");
const { nextDocNumber } = require("../utils/docNumber");

async function listInvoices(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT i.*, s.sale_no, c.full_name AS customer_name
       FROM invoices i
       LEFT JOIN sales s ON s.id = i.sale_id
       LEFT JOIN customers c ON c.id = s.customer_id
       ORDER BY i.issued_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "ไม่สามารถโหลดรายการใบกำกับภาษีได้" });
  }
}

async function getInvoice(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT i.*, s.sale_no, s.subtotal, c.full_name AS customer_name, c.phone
       FROM invoices i
       LEFT JOIN sales s ON s.id = i.sale_id
       LEFT JOIN customers c ON c.id = s.customer_id
       WHERE i.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "ไม่พบใบกำกับภาษี" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "เกิดข้อผิดพลาด" });
  }
}

// POST /api/invoices  { sale_id, wht_amount, due_date, vat_applied }
// vat_applied: true|false — ค่าเริ่มต้นตอนออกใบ (แก้ไขเพิ่มเติมได้ทีหลังผ่าน PATCH)
async function createInvoice(req, res) {
  const { sale_id, wht_amount = 0, due_date, vat_applied = true } = req.body;
  if (!sale_id) return res.status(400).json({ error: "กรุณาระบุรายการขายที่จะออกใบกำกับภาษี" });

  try {
    const sale = await pool.query("SELECT * FROM sales WHERE id = $1", [sale_id]);
    if (!sale.rows[0]) return res.status(404).json({ error: "ไม่พบรายการขายนี้" });

    const s = sale.rows[0];
    const taxBase  = Number(s.subtotal);
    const vatAmt   = vat_applied ? Math.round(taxBase * 0.07 * 100) / 100 : 0;
    const grand    = taxBase + vatAmt;
    const netPayable = grand - Number(wht_amount || 0);
    const invoiceNo = await nextDocNumber("invoices", "invoice_no", "INV");

    const { rows } = await pool.query(
      `INSERT INTO invoices
        (invoice_no, sale_id, tax_base, vat_amount, vat_applied, wht_amount, net_payable, due_date, payment_methods, issued_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [invoiceNo, sale_id, taxBase, vatAmt, vat_applied, wht_amount, netPayable, due_date || null, JSON.stringify([]), req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ไม่สามารถออกใบกำกับภาษีได้" });
  }
}

// PATCH /api/invoices/:id  { vat_applied, due_date, payment_methods }
// ใช้สำหรับแก้ไขในตัวเอกสาร (toggle VAT / เลือกวันกำหนดชำระ / เลือกช่องทางชำระเงิน) ตามต้นฉบับ
async function updateInvoice(req, res) {
  const { id } = req.params;
  const { vat_applied, due_date, payment_methods } = req.body;

  try {
    const existing = await pool.query("SELECT * FROM invoices WHERE id = $1", [id]);
    if (!existing.rows[0]) return res.status(404).json({ error: "ไม่พบใบกำกับภาษี" });
    const inv = existing.rows[0];

    // ถ้ามีการเปลี่ยน vat_applied ต้องคำนวณ vat_amount และ net_payable ใหม่
    const newVatApplied = vat_applied !== undefined ? vat_applied : inv.vat_applied;
    const taxBase = Number(inv.tax_base);
    const newVatAmt = newVatApplied ? Math.round(taxBase * 0.07 * 100) / 100 : 0;
    const grand = taxBase + newVatAmt;
    const newNetPayable = grand - Number(inv.wht_amount || 0);

    const newDueDate = due_date !== undefined ? due_date : inv.due_date;
    const newPaymentMethods = payment_methods !== undefined ? JSON.stringify(payment_methods) : JSON.stringify(inv.payment_methods || []);

    const { rows } = await pool.query(
      `UPDATE invoices
       SET vat_applied = $1, vat_amount = $2, net_payable = $3, due_date = $4, payment_methods = $5
       WHERE id = $6 RETURNING *`,
      [newVatApplied, newVatAmt, newNetPayable, newDueDate || null, newPaymentMethods, id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ไม่สามารถแก้ไขใบกำกับภาษีได้" });
  }
}

module.exports = { listInvoices, getInvoice, createInvoice, updateInvoice };
