// ═══════════════════════════════════════════════════════════════
// userController.js — จัดการผู้ใช้งานในระบบ (admin/staff)
//   GET    /api/users       → รายชื่อผู้ใช้
//   POST   /api/users       → เพิ่มผู้ใช้ใหม่
//   PUT    /api/users/:id   → แก้ไขข้อมูลผู้ใช้ (ชื่อ/ชื่อเล่น/เบอร์/บทบาท/สถานะ/รหัสผ่าน)
//   DELETE /api/users/:id   → ลบผู้ใช้
// ═══════════════════════════════════════════════════════════════
const bcrypt = require("bcryptjs");
const pool = require("../config/db");

const ALL_PERMS = ["sale", "stock", "doc", "crm", "report", "finance", "setting", "user"];
const PUBLIC_COLS =
  "id, email, full_name, nickname, phone, role, permissions, is_active, created_at";

// นับ admin ที่ยัง active อยู่ (กันลบ/ปลด admin คนสุดท้ายจนล็อกตัวเองออกจากระบบ)
async function countActiveAdmins(excludeId) {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS n FROM users
     WHERE role = 'admin' AND is_active = true ${excludeId ? "AND id <> $1" : ""}`,
    excludeId ? [excludeId] : []
  );
  return rows[0].n;
}

async function listUsers(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT ${PUBLIC_COLS} FROM users ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "ไม่สามารถโหลดรายชื่อผู้ใช้ได้" });
  }
}

// POST /api/users  { email, password, full_name, nickname, phone, role, permissions }
// เฉพาะ admin เท่านั้น (จำกัดด้วย requireRole ที่ route)
async function createUser(req, res) {
  // รองรับทั้ง full_name และ name (เผื่อ client เก่าส่ง name มา)
  const {
    email,
    password,
    full_name,
    name,
    nickname,
    phone,
    role,
    permissions = [],
  } = req.body;
  const fullName = full_name || name;

  if (!email || !password || !fullName || !role) {
    return res.status(400).json({
      error: "กรุณากรอกอีเมล รหัสผ่าน ชื่อ-นามสกุล และระดับการใช้งานให้ครบ",
    });
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
    const finalPerms = role === "admin" ? ALL_PERMS : permissions;

    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, nickname, phone, role, permissions)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING ${PUBLIC_COLS}`,
      [
        email.trim().toLowerCase(),
        passwordHash,
        fullName,
        nickname || null,
        phone || null,
        role,
        JSON.stringify(finalPerms),
      ]
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

// PUT /api/users/:id
// body (ส่งเฉพาะ field ที่ต้องการแก้): { email, full_name, nickname, phone, role, permissions, is_active, password }
async function updateUser(req, res) {
  const { id } = req.params;
  const {
    email,
    full_name,
    name,
    nickname,
    phone,
    role,
    permissions,
    is_active,
    password,
  } = req.body;
  const fullName = full_name !== undefined ? full_name : name;

  try {
    const { rows: found } = await pool.query(
      "SELECT id, role, is_active FROM users WHERE id = $1",
      [id]
    );
    if (!found.length) {
      return res.status(404).json({ error: "ไม่พบผู้ใช้งานนี้" });
    }
    const target = found[0];

    // ── ตรวจความถูกต้องก่อนแก้ ──
    if (role !== undefined && !["admin", "staff"].includes(role)) {
      return res.status(400).json({ error: "ระดับการใช้งานไม่ถูกต้อง" });
    }
    if (password !== undefined && password !== "" && password.length < 8) {
      return res.status(400).json({ error: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" });
    }
    if (fullName !== undefined && !String(fullName).trim()) {
      return res.status(400).json({ error: "กรุณากรอกชื่อ-นามสกุล" });
    }
    if (email !== undefined && !String(email).trim()) {
      return res.status(400).json({ error: "กรุณากรอกอีเมล" });
    }

    // กันปลด admin คนสุดท้าย (เปลี่ยน role เป็น staff หรือ ระงับการใช้งาน)
    const willLoseAdmin =
      target.role === "admin" &&
      ((role !== undefined && role !== "admin") || is_active === false);
    if (willLoseAdmin && (await countActiveAdmins(id)) === 0) {
      return res.status(400).json({
        error: "ต้องมีผู้ดูแลระบบ (admin) ที่ใช้งานได้อย่างน้อย 1 คน",
      });
    }
    // กันระงับบัญชีตัวเอง
    if (is_active === false && req.user?.id === id) {
      return res.status(400).json({ error: "ไม่สามารถระงับบัญชีของตัวเองได้" });
    }

    // ── สร้าง SET แบบไดนามิก (แก้เฉพาะ field ที่ส่งมา) ──
    const sets = [];
    const vals = [];
    const push = (col, val) => {
      vals.push(val);
      sets.push(`${col} = $${vals.length}`);
    };

    if (email !== undefined) push("email", String(email).trim().toLowerCase());
    if (fullName !== undefined) push("full_name", String(fullName).trim());
    if (nickname !== undefined) push("nickname", nickname || null);
    if (phone !== undefined) push("phone", phone || null);
    if (is_active !== undefined) push("is_active", !!is_active);

    // role กับ permissions ผูกกัน — admin ได้สิทธิ์ครบเสมอ
    const finalRole = role !== undefined ? role : target.role;
    if (role !== undefined) push("role", role);
    if (role !== undefined || permissions !== undefined) {
      const finalPerms =
        finalRole === "admin" ? ALL_PERMS : permissions !== undefined ? permissions : [];
      push("permissions", JSON.stringify(finalPerms));
    }

    if (password) {
      push("password_hash", await bcrypt.hash(password, 10));
    }

    if (!sets.length) {
      return res.status(400).json({ error: "ไม่มีข้อมูลที่ต้องการแก้ไข" });
    }

    vals.push(id);
    const { rows } = await pool.query(
      `UPDATE users SET ${sets.join(", ")} WHERE id = $${vals.length}
       RETURNING ${PUBLIC_COLS}`,
      vals
    );
    res.json(rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "อีเมลนี้มีผู้ใช้งานอยู่แล้วในระบบ" });
    }
    console.error(err);
    res.status(500).json({ error: "ไม่สามารถแก้ไขข้อมูลผู้ใช้ได้" });
  }
}

// DELETE /api/users/:id
async function deleteUser(req, res) {
  const { id } = req.params;

  try {
    if (req.user?.id === id) {
      return res.status(400).json({ error: "ไม่สามารถลบบัญชีของตัวเองได้" });
    }

    const { rows: found } = await pool.query(
      "SELECT id, role, is_active FROM users WHERE id = $1",
      [id]
    );
    if (!found.length) {
      return res.status(404).json({ error: "ไม่พบผู้ใช้งานนี้" });
    }

    if (found[0].role === "admin" && (await countActiveAdmins(id)) === 0) {
      return res.status(400).json({
        error: "ต้องมีผู้ดูแลระบบ (admin) ที่ใช้งานได้อย่างน้อย 1 คน",
      });
    }

    await pool.query("DELETE FROM users WHERE id = $1", [id]);
    res.json({ success: true, id });
  } catch (err) {
    // ผู้ใช้ถูกอ้างอิงอยู่ในเอกสารอื่น (FK) → ระงับการใช้งานแทนการลบ
    if (err.code === "23503") {
      try {
        const { rows } = await pool.query(
          `UPDATE users SET is_active = false WHERE id = $1 RETURNING ${PUBLIC_COLS}`,
          [id]
        );
        return res.json({
          success: true,
          deactivated: true,
          user: rows[0],
          message: "ผู้ใช้นี้มีเอกสารในระบบ จึงเปลี่ยนเป็นระงับการใช้งานแทนการลบ",
        });
      } catch (_) {
        /* ตกลงไป error ด้านล่าง */
      }
    }
    console.error(err);
    res.status(500).json({ error: "ไม่สามารถลบผู้ใช้งานได้" });
  }
}

module.exports = { listUsers, createUser, updateUser, deleteUser };
