-- ═══════════════════════════════════════════════════════════════
-- migration_012_sale_item_profit.sql — ทำให้กำไรคิดถูกต้อง
--
-- ปัญหาเดิม 2 ข้อ
--   1) ส่วนลดถูกหักที่ระดับบิล ไม่ได้ปันลงรายชิ้น
--      หน้าสรุปบวกกำไรจาก line_total (ราคาเต็ม) → กำไรเกินจริงเท่ากับส่วนลด
--   2) ต้นทุนดึงจาก products ตอนเปิดดูรายงาน ไม่ใช่ตอนขาย
--      แก้ต้นทุนสินค้าทีหลัง → กำไรของบิลเก่าเปลี่ยนย้อนหลัง
--
-- 3 คอลัมน์ใหม่บน sale_items
--   line_discount — ส่วนลดที่ปันมาลงรายการนี้
--   line_net      — ราคาหลังหักส่วนลด (ยอดที่ใช้คิดกำไรจริง)
--   cost_at_sale  — ต้นทุนสินค้า ณ วินาทีที่ขาย (ล็อกไว้ ไม่เปลี่ยนตามภายหลัง)
--
-- line_total คงความหมายเดิม (ราคาเต็ม x จำนวน) ใบเสร็จ/invoice จึงไม่เปลี่ยนหน้าตา
-- รันซ้ำได้ ไม่พัง
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS line_discount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS line_net      DECIMAL(12,2);
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS cost_at_sale  DECIMAL(12,2);

-- ── ย้อนหลัง: ปันส่วนลดของบิลเก่าลงรายชิ้นตามสัดส่วนราคา ──
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
 WHERE b.id = si.sale_id
   AND si.line_net IS NULL;

-- บิลที่ไม่มีส่วนลด (หรือคำนวณไม่ได้) → net = ราคาเต็ม
UPDATE sale_items SET line_discount = COALESCE(line_discount, 0), line_net = line_total
 WHERE line_net IS NULL;

-- ── ย้อนหลัง: ล็อกต้นทุนจากค่าปัจจุบันของสินค้า (ดีที่สุดเท่าที่มีข้อมูล) ──
UPDATE sale_items si
   SET cost_at_sale = p.cost_price
  FROM products p
 WHERE p.id = si.product_id
   AND si.cost_at_sale IS NULL;
