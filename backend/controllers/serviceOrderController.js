// ═══════════════════════════════════════════════════════════════
// serviceOrderController.js — ใบสั่งซ่อม
// ═══════════════════════════════════════════════════════════════
const pool = require("../config/db");
const { nextDocNumber } = require("../utils/docNumber");

async function listServiceOrders(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT so.*, c.full_name AS customer_name, p.name AS product_name, p.sku
       FROM service_orders so
       LEFT JOIN customers c ON c.id = so.customer_id
       LEFT JOIN products p ON p.id = so.product_id
       ORDER BY so.received_at DESC`
    );
    res.json(rows);
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
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "เกิดข้อผิดพลาด" });
  }
}

// POST /api/service-orders { customer_id, product_id, condition_notes, services, pickup_date, technician }
async function createServiceOrder(req, res) {
  const { customer_id, product_id, condition_notes = {}, services = [], pickup_date, technician } = req.body;

  try {
    const totalCost = services.reduce((sum, s) => sum + (s.is_warranty ? 0 : s.price), 0);
    const serviceNo = await nextDocNumber("service_orders", "service_no", "SRV");

    const { rows } = await pool.query(
      `INSERT INTO service_orders
        (service_no, customer_id, product_id, condition_notes, services, total_cost, pickup_date, technician, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'received') RETURNING *`,
      [serviceNo, customer_id, product_id, JSON.stringify(condition_notes), JSON.stringify(services), totalCost, pickup_date, technician]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ไม่สามารถสร้างใบสั่งซ่อมได้" });
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

module.exports = { listServiceOrders, getServiceOrder, createServiceOrder, updateServiceStatus };
