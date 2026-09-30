// ═══════════════════════════════════════════════════════════════
// saleItemColumns.js — เพิ่มคอลัมน์ที่ใช้คิดกำไรให้ sale_items
//
//   line_discount — ส่วนลดที่ปันลงรายการนี้
//   line_net      — ราคาหลังหักส่วนลด (ยอดที่ใช้คิดกำไร)
//   cost_at_sale  — ต้นทุน ณ วินาทีที่ขาย (ล็อกไว้ ไม่เปลี่ยนย้อนหลัง)
//
// Render แผนฟรีไม่มี Shell จึงรันไมเกรชันตอนใช้งานจริงครั้งแรก
// จำไว้ในตัวแปรว่าทำไปแล้ว จะได้ไม่ยิงซ้ำทุกครั้งที่บันทึกขาย/เปิดรายงาน
// (ไฟล์ db/migration_012_sale_item_profit.sql เก็บไว้รันมือได้เหมือนกัน)
// ═══════════════════════════════════════════════════════════════
const pool = require("../config/db");

// คืนค่า true = คอลัมน์พร้อมใช้ · false = สร้างไม่สำเร็จ ให้ผู้เรียกถอยไปใช้สูตรเดิม
// (Postgres ฟ้อง error ทันทีถ้าอ้างคอลัมน์ที่ไม่มี COALESCE ช่วยไม่ได้
//  ผู้เรียกจึงต้องเลือกสูตรตามค่านี้ ไม่ใช่เขียน SQL ตายตัว)
let done = false;
let running = null;

async function ensureSaleItemColumns() {
  if (done) return true;
  // ถ้ามีคำขอหลายอันเข้ามาพร้อมกัน ให้รอตัวเดียวกัน ไม่ ALTER ซ้อนกัน
  if (running) return running;

  running = (async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      // ถ้ามีใครล็อกตารางค้างอยู่ ยอมแพ้ใน 4 วิ ดีกว่าค้างจนคำขอ timeout
      await client.query("SET LOCAL lock_timeout = '4s'");
      await client.query(`
        ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS line_discount DECIMAL(12,2) DEFAULT 0;
        ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS line_net      DECIMAL(12,2);
        ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS cost_at_sale  DECIMAL(12,2);
      `);

      // ── ย้อนหลังให้ข้อมูลเก่า: ปันส่วนลดลงรายชิ้นตามสัดส่วนราคา ──
      await client.query(`
        WITH b AS (
          SELECT s.id,
                 COALESCE(s.vip_discount, 0) + COALESCE(s.extra_discount, 0) AS disc,
                 NULLIF(SUM(si.line_total), 0)                               AS gross
            FROM sales s
            JOIN sale_items si ON si.sale_id = s.id
           GROUP BY s.id, s.vip_discount, s.extra_discount
        )
        UPDATE sale_items si
           SET line_discount = ROUND(b.disc * (si.line_total / b.gross), 2),
               line_net      = si.line_total - ROUND(b.disc * (si.line_total / b.gross), 2)
          FROM b
         WHERE b.id = si.sale_id AND si.line_net IS NULL
      `);
      await client.query(`
        UPDATE sale_items
           SET line_discount = COALESCE(line_discount, 0), line_net = line_total
         WHERE line_net IS NULL
      `);
      await client.query(`
        UPDATE sale_items si SET cost_at_sale = p.cost_price
          FROM products p
         WHERE p.id = si.product_id AND si.cost_at_sale IS NULL
      `);

      await client.query("COMMIT");
      done = true;
      return true;
    } catch (err) {
      try { await client.query("ROLLBACK"); } catch (_) {}
      // ไม่โยนต่อ — ให้ผู้เรียกถอยไปใช้สูตรเดิมแทนที่จะพังทั้งคำขอ
      console.error("ensureSaleItemColumns:", err.message);
      return false;
    } finally {
      client.release();
      running = null;
    }
  })();

  return running;
}

module.exports = { ensureSaleItemColumns };
