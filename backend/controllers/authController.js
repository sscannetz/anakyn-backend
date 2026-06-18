// ═══════════════════════════════════════════════════════════════
// authController.js — Login สำหรับ Admin/Staff และ Partner
// ═══════════════════════════════════════════════════════════════
const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// POST /api/auth/login   (สำหรับ admin / staff)
async function loginStaff(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "กรุณากรอกอีเมลและรหัสผ่าน" });
  }

  try {
    const { rows } = await pool.query(
      "SELECT * FROM users WHERE email = $1 AND is_active = true",
      [email]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ error: "ไม่พบผู้ใช้นี้ในระบบ" });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "รหัสผ่านไม่ถูกต้อง" });

    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        permissions: user.permissions,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในระบบ" });
  }
}

// POST /api/auth/partner-login   (สำหรับ Partner)
async function loginPartner(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "กรุณากรอกอีเมลและรหัสผ่าน" });
  }

  try {
    const { rows } = await pool.query(
      "SELECT * FROM partners WHERE email = $1 AND is_active = true",
      [email]
    );
    const partner = rows[0];
    if (!partner) return res.status(401).json({ error: "ไม่พบ Partner นี้ในระบบ" });

    const valid = await bcrypt.compare(password, partner.password_hash);
    if (!valid) return res.status(401).json({ error: "รหัสผ่านไม่ถูกต้อง" });

    const token = jwt.sign(
      { id: partner.id, role: "partner", email: partner.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    res.json({
      token,
      partner: {
        id: partner.id,
        email: partner.email,
        full_name: partner.full_name,
        ref_code: partner.ref_code,
        level: partner.level,
        comm_rate_pct: partner.comm_rate_pct,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในระบบ" });
  }
}

module.exports = { loginStaff, loginPartner };
