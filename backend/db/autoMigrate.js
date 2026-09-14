// ═══════════════════════════════════════════════════════════════
// autoMigrate.js — รัน migration ที่ค้างอยู่ตอน server start
//
// ทำไมต้องมี: Render แพลนฟรีไม่มี Shell จึงเข้าไปรัน psql เองไม่ได้
// พอ deploy ขึ้นไปแล้ว server จะรัน migration ที่ยังไม่เคยรันให้เองรอบเดียว
//
// กติกา 3 ข้อที่ทำให้ปลอดภัย
//   1. รันเฉพาะไฟล์ที่อยู่ใน AUTO_RUN ข้างล่างเท่านั้น — ไม่ได้กวาดทั้งโฟลเดอร์
//      ของเก่า (002–006) เคยรันมือไปแล้ว ถ้าเผลอรันซ้ำอาจพัง จึงไม่แตะ
//   2. จำว่ารันอะไรไปแล้วในตาราง schema_migrations — deploy ซ้ำไม่รันซ้ำ
//   3. ถ้า migration พัง จะ log ไว้แล้วปล่อยให้ API ทำงานต่อ
//      ไม่ปล่อยให้ server crash-loop จนเว็บล่มทั้งระบบเพราะ SQL ผิดบรรทัดเดียว
//
// เพิ่ม migration ใหม่: เอาชื่อไฟล์ใส่ท้าย AUTO_RUN แล้ว push — แค่นั้น
// ═══════════════════════════════════════════════════════════════
const fs = require("fs");
const path = require("path");
const pool = require("../config/db");

const AUTO_RUN = [
  "migration_007_work_orders.sql",   // ใบสั่งทำ (work_orders + work_order_items)
];

async function autoMigrate() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name       TEXT PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT NOW()
      )`);

    const { rows } = await pool.query("SELECT name FROM schema_migrations");
    const done = new Set(rows.map((r) => r.name));

    for (const file of AUTO_RUN) {
      if (done.has(file)) continue;

      const full = path.join(__dirname, file);
      if (!fs.existsSync(full)) {
        console.warn(`⚠️  ไม่พบไฟล์ migration: ${file} (ข้ามไปก่อน)`);
        continue;
      }

      const sql = fs.readFileSync(full, "utf-8");
      console.log(`⏳ กำลังรัน migration: ${file}`);
      try {
        await pool.query(sql);
        await pool.query("INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT DO NOTHING", [file]);
        console.log(`✅ migration สำเร็จ: ${file}`);
      } catch (err) {
        // ไม่ mark ว่าสำเร็จ — deploy รอบหน้าจะลองใหม่
        console.error(`❌ migration ล้มเหลว: ${file} — ${err.message}`);
      }
    }
  } catch (err) {
    console.error("❌ autoMigrate ทำงานไม่ได้:", err.message);
  }
}

module.exports = { autoMigrate };
