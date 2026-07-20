// ═══════════════════════════════════════════════════════════════
// serviceOrderController.js — ใบสั่งซ่อม
// ═══════════════════════════════════════════════════════════════
const pool = require("../config/db");
const { nextDocNumber } = require("../utils/docNumber");

// ── แปลงเป็นตัวเลขแบบปลอดภัย (กัน NaN ที่ Postgres NUMERIC เก็บได้) ──
function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// ── sanitize ใบสั่งซ่อม: กัน NaN + alias ให้ตรงกับที่แอป Expo อ่าน ──
// - estimated_cost = total_cost
// - ใบที่สร้างจากแอป (กรอกชื่ออิสระ ไม่มี customer_id/product_id) เก็บไว้ใน condition_notes JSONB
//   จึงดึง customer_name / customer_phone / product_name / issue_description จาก notes เป็น fallback
function sanitizeServiceOrder(row) {
  const cost = toNum(row.total_cost) ?? 0;
  let notes = row.condition_notes;
  if (typeof notes === "string") { try { notes = JSON.parse(notes); } catch (_) { notes = {}; } }
  notes = notes || {};
  return {
    ...row,
    total_cost: cost,
    estimated_cost: cost,
    customer_name: row.customer_name || notes.customer_name || null,
    customer_phone: row.phone || notes.customer_phone || null,
    product_name: row.product_name || notes.product_name || null,
    issue_description: notes.issue_description || null,
  };
}

async function listServiceOrders(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT so.*, c.full_name AS customer_name, p.name AS product_name, p.sku
       FROM service_orders so
       LEFT JOIN customers c ON c.id = so.customer_id
       LEFT JOIN products p ON p.id = so.product_id
       ORDER BY so.received_at DESC`
    );
    res.json(rows.map(sanitizeServiceOrder));
  } catch (err) {
    res.status(500).json({ error: "ไม่สามารถโหลดรายการใบสั่งซ่อมได้" });
  }
}

async function getServiceOrder(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT so.*, c.full_name AS customer_name, c.phone, p.name AS product_name, p.sku
       FROM service_orders so
       LEFT JOIN customers c ON c.id = so.customer_id
       LEFT JOIN products p ON p.id = so.product_id
       WHERE so.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "ไม่พบใบสั่งซ่อม" });
    res.json(sanitizeServiceOrder(rows[0]));
  } catch (err) {
    res.status(500).json({ error: "เกิดข้อผิดพลาด" });
  }
}

// POST /api/service-orders
// รองรับ 2 รูปแบบ:
//  1) แบบอ้างอิง id: { customer_id, product_id, condition_notes, services, pickup_date, technician }
//  2) แบบแอป Expo (กรอกชื่ออิสระ): { customer_name, customer_phone, product_name, issue_description,
//     estimated_cost, expected_completion_date } → เก็บลง condition_notes JSONB (ไม่ต้องแก้ schema)
async function createServiceOrder(req, res) {
  const {
    customer_id = null, product_id = null, condition_notes = {}, services = [],
    pickup_date, technician = null,
    customer_name, customer_phone, product_name, issue_description,
    estimated_cost, expected_completion_date,
  } = req.body;

  try {
    const notes = { ...(condition_notes || {}) };
    if (customer_name)    notes.customer_name = customer_name;
    if (customer_phone)   notes.customer_phone = customer_phone;
    if (product_name)     notes.product_name = product_name;
    if (issue_description) notes.issue_description = issue_description;

    const totalCost = services.length
      ? services.reduce((sum, s) => sum + (s.is_warranty ? 0 : (toNum(s.price) ?? 0)), 0)
      : (toNum(estimated_cost) ?? 0);
    const pickup = pickup_date || expected_completion_date || null;
    const serviceNo = await nextDocNumber("service_orders", "service_no", "SRV");

    const { rows } = await pool.query(
      `INSERT INTO service_orders
        (service_no, customer_id, product_id, condition_notes, services, total_cost, pickup_date, technician, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'received') RETURNING *`,
      [serviceNo, customer_id, product_id, JSON.stringify(notes), JSON.stringify(services), totalCost, pickup, technician]
    );
    res.status(201).json(sanitizeServiceOrder(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ไม่สามารถสร้างใบสั่งซ่อมได้" });
  }
}

// DELETE /api/service-orders/:id — ลบใบสั่งซ่อม
async function deleteServiceOrder(req, res) {
  try {
    const { rowCount } = await pool.query("DELETE FROM service_orders WHERE id = $1", [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: "ไม่พบใบสั่งซ่อม" });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "ไม่สามารถลบใบสั่งซ่อมได้" });
  }
}

// PATCH /api/service-orders/:id/status { status: "repairing"|"qc"|"notified"|"picked_up" }
async function updateServiceStatus(req, res) {
  const { status } = req.body;
  try {
    const { rows } = await pool.query(
      "UPDATE service_orders SET status = $1 WHERE id = $2 RETURNING *",
      [status, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "ไม่พบใบสั่งซ่อม" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "ไม่สามารถอัพเดตสถานะได้" });
  }
}

module.exports = { listServiceOrders, getServiceOrder, createServiceOrder, updateServiceStatus, deleteServiceOrder };
