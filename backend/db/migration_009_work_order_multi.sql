-- ═══════════════════════════════════════════════════════════════
-- migration_009_work_order_multi.sql — ใบสั่งทำ 1 ใบมีได้หลายงาน
--
-- ของ 008 ย้ายข้อมูลงานขึ้นมาอยู่ระดับใบ (1 ใบ = 1 งาน)
-- ร้านใช้จริงแล้วพบว่างานชุดเดียวของลูกค้าคนเดียวมักแบ่งเป็น 2-3 ชิ้น
-- รอบนี้จึงย้ายกลับลงไปอยู่ที่ work_order_items — ใบเก็บแค่ลูกค้า วันที่ เงิน
--
-- คอลัมน์ระดับใบของ 008 ไม่ลบทิ้ง ปล่อยไว้เฉย ๆ กันข้อมูลเก่าหาย
-- ADD COLUMN IF NOT EXISTS ทั้งหมด → รันซ้ำได้
-- ═══════════════════════════════════════════════════════════════

-- ระดับใบ: การชำระเงินหลายครั้ง
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS payments   JSONB DEFAULT '[]';   -- [{ amount, note }]
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS paid_total NUMERIC(12,2) DEFAULT 0;

-- ระดับงาน: ทุกอย่างที่เคยอยู่ระดับใบ ย้ายลงมาที่นี่
ALTER TABLE work_order_items ADD COLUMN IF NOT EXISTS job_code TEXT;              -- CUSTOM#00834
ALTER TABLE work_order_items ADD COLUMN IF NOT EXISTS job_type TEXT;
ALTER TABLE work_order_items ADD COLUMN IF NOT EXISTS engrave  TEXT;
ALTER TABLE work_order_items ADD COLUMN IF NOT EXISTS price    NUMERIC(12,2) DEFAULT 0;
ALTER TABLE work_order_items ADD COLUMN IF NOT EXISTS photos   JSONB DEFAULT '[]'; -- สูงสุด 4 รูป

-- รหัสงานห้ามซ้ำ แต่ยอมให้ว่างได้ (ใบเก่าที่ยังไม่มีรหัส)
CREATE UNIQUE INDEX IF NOT EXISTS idx_work_order_items_job_code
  ON work_order_items (job_code) WHERE job_code IS NOT NULL;

-- ── ย้ายข้อมูลใบเก่า (1 ใบ = 1 งาน) ลงไปที่รายการของมัน ──
-- COALESCE ทุกช่อง → รันซ้ำไม่ทับของใหม่
UPDATE work_order_items i SET
  job_type    = COALESCE(i.job_type, w.job_type),
  engrave     = COALESCE(i.engrave, w.engrave),
  metal_color = COALESCE(i.metal_color, w.metal_color),
  metal_type  = COALESCE(i.metal_type, w.metal_type),
  ring_size   = COALESCE(i.ring_size, w.ring_size),
  note        = COALESCE(i.note, w.job_note),
  price       = CASE WHEN COALESCE(i.price, 0) = 0 THEN COALESCE(w.price, 0) ELSE i.price END,
  photos      = CASE WHEN i.photos IS NULL OR i.photos = '[]'::jsonb
                     THEN COALESCE(w.photos, '[]'::jsonb) ELSE i.photos END,
  stones      = CASE WHEN i.stones IS NULL OR i.stones = '[]'::jsonb
                     THEN COALESCE(w.stones, '[]'::jsonb) ELSE i.stones END
FROM work_orders w
WHERE w.id = i.work_order_id;

-- ใบเก่าที่เคยมีมัดจำช่องเดียว → ย้ายเข้าเป็นการชำระครั้งแรก
UPDATE work_orders
   SET payments   = jsonb_build_array(jsonb_build_object('amount', deposit, 'note', 'มัดจำ')),
       paid_total = deposit
 WHERE COALESCE(deposit, 0) > 0
   AND (payments IS NULL OR payments = '[]'::jsonb);
