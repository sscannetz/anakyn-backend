// ═══════════════════════════════════════════════════════════════
// auth.js — ตรวจสอบ JWT token และแนบข้อมูล user ใส่ req.user
// ═══════════════════════════════════════════════════════════════
const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "ไม่พบ token กรุณาเข้าสู่ระบบใหม่" });
  }

  const token = header.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role, email }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token ไม่ถูกต้องหรือหมดอายุ" });
  }
}

// ใช้หลัง requireAuth — จำกัดเฉพาะ role ที่กำหนด
// ตัวอย่าง: requireRole("admin") หรือ requireRole("admin", "staff")
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "คุณไม่มีสิทธิ์เข้าถึงส่วนนี้" });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
