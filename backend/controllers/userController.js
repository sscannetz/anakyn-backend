// ═══════════════════════════════════════════════════════════════
// userController.js — จัดการผู้ใช้งานในระบบ (admin/staff)
// ═══════════════════════════════════════════════════════════════
const bcrypt = require("bcryptjs");
const pool = require("../config/db");

async function listUsers(req, res) {
  try {
    const { rows } = await pool.query(
      "SELECT id, email, full_name, nickname, phone, role, permissions, is_active, created_at FROM users ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "ไม่สามารถโหลดรายชื่อผู้ใช้ได้" });
  }
}

// POST /api/users  { email, password, full_name, nickname, phone, role, permissions, note }
// เฉพาะ admin เท่านั้น (จำกัดด้วย requireRole ที่ route)
async function createUser(req, res) {
  const { email, password, full_name, nickname, phone, role, permissions = [] } = req.body;

  if (!email || !password || !full_name || !role) {
    return res.status(400).json({ error: "กรุณากรอกอีเมล รหัสผ่าน ชื่อ-นามสกุล และระดับการใช้งานให้ครบ" });
  }
  if (!["admin", "staff"].includes(role)) {
    return res.status(400).json({ error: "ระดับการใช้งานไม่ถูกต้อง" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    // admin ได้รับสิทธิ์ทั้งหมดเสมอ ไม่ว่า client จะส่งอะไรมา
    const finalPerms = role === "admin"
      ? ["sale","stock","doc","crm","report","finance","setting","user"]
      : permissions;

    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, nickname, phone, role, permissions)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, email, full_name, nickname, phone, role, permissions, is_active, created_at`,
      [email, passwordHash, full_name, nickname || null, phone || null, role, JSON.stringify(finalPerms)]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "อีเมลนี้มีผู้ใช้งานอยู่แล้วในระบบ" });
    }
    console.error(err);
    res.status(500).json({ error: "ไม่สามารถเพิ่มผู้ใช้งานได้" });
  }
}

module.exports = { listUsers, createUser };
