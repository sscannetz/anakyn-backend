// ═══════════════════════════════════════════════════════════════
// productPhotosColumn.js — เพิ่มคอลัมน์ photos ให้ products
//
//   photos JSONB — รูปสินค้าสูงสุด 4 รูป (base64) เรียงตามลำดับ
//                  ★ ตัวแรกในอาเรย์ = รูปหลักเสมอ และ sync ลง photo_url
//                  หน้าไหนที่โชว์รูปเดียวจึงใช้ photo_url เหมือนเดิม ไม่ต้องแก้
//
// Render แผนฟรีไม่มี Shell จึงรันไมเกรชันตอนใช้งานจริงครั้งแรก
// จำไว้ในตัวแปรว่าทำไปแล้ว จะได้ไม่ยิงซ้ำทุกครั้งที่เพิ่ม/แก้สินค้า
// (ไฟล์ db/migration_013_product_photos.sql เก็บไว้รันมือได้เหมือนกัน)
// ═══════════════════════════════════════════════════════════════
const pool = require("../config/db");

// คืน true = คอลัมน์พร้อมใช้ · false = สร้างไม่สำเร็จ ให้ผู้เรียกถอยไปใช้ photo_url เดี่ยว
// (Postgres ฟ้อง error ทันทีถ้าอ้างคอลัมน์ที่ไม่มี ผู้เรียกจึงต้องแตกทางตามค่านี้)
let done = false;
let running = null;

async function ensureProductPhotosColumn() {
  if (done) return true;
  if (running) return running;   // มีหลายคำขอพร้อมกัน ให้รอตัวเดียวกัน ไม่ ALTER ซ้อน

  running = (async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL lock_timeout = '4s'");
      await client.query(
        `ALTER TABLE products ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb`
      );
      // ย้อนหลัง: สินค้าเดิมที่มีรูปเดียว → ยกไปเป็นรูปที่ 1
      await client.query(`
        UPDATE products
           SET photos = jsonb_build_array(photo_url)
         WHERE photo_url IS NOT NULL
           AND (photos IS NULL OR jsonb_array_length(photos) = 0)
      `);
      await client.query("COMMIT");
      done = true;
      return true;
    } catch (err) {
      try { await client.query("ROLLBACK"); } catch (_) {}
      console.error("ensureProductPhotosColumn:", err.message);
      return false;
    } finally {
      client.release();
      running = null;
    }
  })();

  return running;
}

module.exports = { ensureProductPhotosColumn };
