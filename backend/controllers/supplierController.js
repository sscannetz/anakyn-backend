// ═══════════════════════════════════════════════════════════════
// supplierController.js — ผู้จัดส่งวัตถุดิบ (สำหรับใบสั่งซื้อ)
// ═══════════════════════════════════════════════════════════════
const pool = require("../config/db");

async function listSuppliers(req, res) {
  try {
    const { rows } = await pool.query("SELECT * FROM suppliers ORDER BY name ASC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "ไม่สามารถโหลดรายชื่อผู้จัดส่งได้" });
  }
}

// POST /api/suppliers  { name, phone, address }
async function createSupplier(req, res) {
  const { name, phone, address } = req.body;
  if (!name) return res.status(400).json({ error: "กรุณากรอกชื่อผู้จัดส่ง" });
  try {
    const { rows } = await pool.query(
      "INSERT INTO suppliers (name, phone, address) VALUES ($1,$2,$3) RETURNING *",
      [name, phone || null, address || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "ไม่สามารถเพิ่มผู้จัดส่งได้" });
  }
}

module.exports = { listSuppliers, createSupplier };
