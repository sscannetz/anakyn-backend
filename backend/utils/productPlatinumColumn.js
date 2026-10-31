// ═══════════════════════════════════════════════════════════════
// productPlatinumColumn.js — เพิ่มคอลัมน์ platinum_price_at_creation ให้ products
//
//   ราคาแพลตินัมต่อกรัม ณ วันที่เพิ่มสินค้า (คิดต้นทุนแบบเดียวกับเงิน 925)
//   ต้องเก็บไว้ ไม่งั้นเปิดแก้ไขแล้วกดบันทึก ต้นทุนโลหะจะถูกคิดใหม่จากช่องว่าง
//
// Render แผนฟรีไม่มี Shell จึงรันไมเกรชันตอนเพิ่ม/แก้สินค้าครั้งแรก
// แบบเดียวกับ productPhotosColumn / productPublishedColumn
// ═══════════════════════════════════════════════════════════════
const pool = require("../config/db");

// คืน true = คอลัมน์พร้อมใช้ · false = สร้างไม่สำเร็จ ผู้เรียกต้องไม่อ้างคอลัมน์นี้
let done = false;
let running = null;

async function ensureProductPlatinumColumn() {
  if (done) return true;
  if (running) return running;   // หลายคำขอพร้อมกัน รอตัวเดียวกัน ไม่ ALTER ซ้อน

  running = (async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL lock_timeout = '4s'");
      await client.query(
        `ALTER TABLE products ADD COLUMN IF NOT EXISTS platinum_price_at_creation NUMERIC(12,2)`
      );
      await client.query("COMMIT");
      done = true;
      return true;
    } catch (err) {
      try { await client.query("ROLLBACK"); } catch (_) {}
      console.error("ensureProductPlatinumColumn:", err.message);
      return false;
    } finally {
      client.release();
      running = null;
    }
  })();

  return running;
}

module.exports = { ensureProductPlatinumColumn };
