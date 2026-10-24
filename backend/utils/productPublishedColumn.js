// ═══════════════════════════════════════════════════════════════
// productPublishedColumn.js — เพิ่มคอลัมน์ is_published ให้ products
//
//   is_published BOOLEAN — ติ๊ก "Show in catalog" ในหน้าสต๊อก
//                          true = เอาขึ้นแคตตาล็อกหน้าเว็บร้าน
//                          ★ DEFAULT false — สินค้าเก่าทั้งหมดไม่ขึ้นเอง
//                            ต้องมาติ๊กทีละชิ้น (ส่วนใหญ่ยังไม่มีรูป)
//
// Render แผนฟรีไม่มี Shell จึงรันไมเกรชันตอนใช้งานจริงครั้งแรก
// จำไว้ในตัวแปรว่าทำไปแล้ว จะได้ไม่ยิงซ้ำทุกครั้งที่เรียกรายการสินค้า
// ═══════════════════════════════════════════════════════════════
const pool = require("../config/db");

// คืน true = คอลัมน์พร้อมใช้ · false = สร้างไม่สำเร็จ ผู้เรียกต้องไม่อ้างคอลัมน์นี้
// (Postgres ฟ้อง error ทันทีถ้า SELECT คอลัมน์ที่ไม่มี หน้าสต๊อกจะพังทั้งหน้า)
let done = false;
let running = null;

async function ensureProductPublishedColumn() {
  if (done) return true;
  if (running) return running;   // มีหลายคำขอพร้อมกัน ให้รอตัวเดียวกัน ไม่ ALTER ซ้อน

  running = (async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL lock_timeout = '4s'");
      await client.query(
        `ALTER TABLE products ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT false`
      );
      await client.query("COMMIT");
      done = true;
      return true;
    } catch (err) {
      try { await client.query("ROLLBACK"); } catch (_) {}
      console.error("ensureProductPublishedColumn:", err.message);
      return false;
    } finally {
      client.release();
      running = null;
    }
  })();

  return running;
}

module.exports = { ensureProductPublishedColumn };
