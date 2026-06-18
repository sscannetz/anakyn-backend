// ═══════════════════════════════════════════════════════════════
// migrate.js — รัน schema.sql เข้า database (npm run migrate)
// ═══════════════════════════════════════════════════════════════
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const pool = require("../config/db");

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf-8");
  console.log("⏳ กำลังสร้างตารางตาม schema.sql ...");
  try {
    await pool.query(sql);
    console.log("✅ สร้างตารางสำเร็จทั้งหมด 13 ตาราง");
  } catch (err) {
    console.error("❌ Migration ล้มเหลว:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
