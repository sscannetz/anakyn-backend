// ═══════════════════════════════════════════════════════════════
// customerController.js — ลูกค้า/สมาชิก CRM
// ═══════════════════════════════════════════════════════════════
const pool = require("../config/db");

async function listCustomers(req, res) {
  const { search } = req.query;
  try {
    const { rows } = await pool.query(
      search
        ? "SELECT * FROM customers WHERE full_name ILIKE $1 OR phone ILIKE $1 ORDER BY created_at DESC"
        : "SELECT * FROM customers ORDER BY created_at DESC",
      search ? [`%${search}%`] : []
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "ไม่สามารถโหลดรายชื่อลูกค้าได้" });
  }
}

async function createCustomer(req, res) {
  const { full_name, phone, email, is_vip, referred_by_partner_id, notes } = req.body;
  if (!full_name) return res.status(400).json({ error: "กรุณากรอกชื่อลูกค้า" });

  try {
    const { rows } = await pool.query(
      `INSERT INTO customers (full_name, phone, email, is_vip, referred_by_partner_id, notes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [full_name, phone, email, is_vip || false, referred_by_partner_id || null, notes]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "ไม่สามารถเพิ่มลูกค้าได้" });
  }
}

module.exports = { listCustomers, createCustomer };
