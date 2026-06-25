// ═══════════════════════════════════════════════════════════════
// invoiceController.js — ใบกำกับภาษี (ออกจากการขายที่มีอยู่)
// ═══════════════════════════════════════════════════════════════
const pool = require("../config/db");
const { nextDocNumber } = require("../utils/docNumber");

// ── แปลงเป็นตัวเลขแบบปลอดภัย: คืน null ถ้าไม่ใช่ตัวเลขจริง (รวมถึงค่า NaN ที่ Postgres NUMERIC เก็บได้) ──
function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// ── sanitize แถวใบกำกับภาษี: กันค่า NaN/null ที่เคยถูกเก็บผิดในอดีต โดยคำนวณใหม่จาก sales.subtotal ──
// ต้องการ field เสริม row.subtotal (มาจาก LEFT JOIN sales) เพื่อใช้เป็น fallback ของ tax_base
function sanitizeInvoice(row) {
  const base = toNum(row.tax_base) ?? toNum(row.subtotal) ?? 0;
  const wht  = toNum(row.wht_amount) ?? 0;
  const vatApplied = row.vat_applied !== false;
  const vat  = toNum(row.vat_amount) ?? (vatApplied ? Math.round(base * 0.07 * 100) / 100 : 0);
  const net  = toNum(row.net_payable) ?? (base + vat - wht);
  const grand = base + vat;   // ยอดรวมทั้งสิ้น (ก่อนหัก ณ ที่จ่าย)
  // grand_total / subtotal เป็น alias ให้ frontend (เช่นแอป Expo AnakynMobile) ที่อ่านชื่อ field ต่างจาก schema
  return {
    ...row,
    tax_base: base, vat_amount: vat, wht_amount: wht, net_payable: net,
    grand_total: grand,
    subtotal: toNum(row.subtotal) ?? base,
  };
}

async function listInvoices(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT i.*, s.sale_no, s.subtotal, c.full_name AS customer_name
       FROM invoices i
       LEFT JOIN sales s ON s.id = i.sale_id
       LEFT JOIN customers c ON c.id = s.customer_id
       ORDER BY i.issued_at DESC`
    );
    res.json(rows.map(sanitizeInvoice));
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
    // ดึงรายการสินค้าจากการขายที่ใบกำกับอ้างอิง เพื่อให้หน้ารายละเอียด/ปริ้น แสดงรายการได้
    const items = await pool.query(
      `SELECT si.qty, si.unit_price, si.line_total, p.name AS product_name, p.sku
       FROM sale_items si LEFT JOIN products p ON p.id = si.product_id
       WHERE si.sale_id = $1`,
      [rows[0].sale_id]
    );
    res.json(sanitizeInvoice({ ...rows[0], items: items.rows }));
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
    const taxBase  = toNum(s.subtotal) ?? 0;
    const whtVal   = toNum(wht_amount) ?? 0;
    const vatAmt   = vat_applied ? Math.round(taxBase * 0.07 * 100) / 100 : 0;
    const grand    = taxBase + vatAmt;
    const netPayable = grand - whtVal;
    const invoiceNo = await nextDocNumber("invoices", "invoice_no", "INV");

    const { rows } = await pool.query(
      `INSERT INTO invoices
        (invoice_no, sale_id, tax_base, vat_amount, vat_applied, wht_amount, net_payable, due_date, payment_methods, issued_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [invoiceNo, sale_id, taxBase, vatAmt, vat_applied, whtVal, netPayable, due_date || null, JSON.stringify([]), req.user.id]
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
    const existing = await pool.query(
      `SELECT i.*, s.subtotal FROM invoices i
       LEFT JOIN sales s ON s.id = i.sale_id
       WHERE i.id = $1`,
      [id]
    );
    if (!existing.rows[0]) return res.status(404).json({ error: "ไม่พบใบกำกับภาษี" });
    const inv = existing.rows[0];

    // ถ้ามีการเปลี่ยน vat_applied ต้องคำนวณ vat_amount และ net_payable ใหม่
    // ใช้ toNum กัน NaN และ fallback ไปที่ sales.subtotal สำหรับใบเดิมที่ tax_base เคยเพี้ยน
    const newVatApplied = vat_applied !== undefined ? vat_applied : inv.vat_applied;
    const taxBase = toNum(inv.tax_base) ?? toNum(inv.subtotal) ?? 0;
    const whtVal = toNum(inv.wht_amount) ?? 0;
    const newVatAmt = newVatApplied ? Math.round(taxBase * 0.07 * 100) / 100 : 0;
    const grand = taxBase + newVatAmt;
    const newNetPayable = grand - whtVal;

    const newDueDate = due_date !== undefined ? due_date : inv.due_date;
    const newPaymentMethods = payment_methods !== undefined ? JSON.stringify(payment_methods) : JSON.stringify(inv.payment_methods || []);

    const { rows } = await pool.query(
      `UPDATE invoices
       SET vat_applied = $1, vat_amount = $2, net_payable = $3, due_date = $4, payment_methods = $5
       WHERE id = $6 RETURNING *`,
      [newVatApplied, newVatAmt, newNetPayable, newDueDate || null, newPaymentMethods, id]
    );
    res.json(sanitizeInvoice({ ...rows[0], subtotal: inv.subtotal }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ไม่สามารถแก้ไขใบกำกับภาษีได้" });
  }
}

module.exports = { listInvoices, getInvoice, createInvoice, updateInvoice };
