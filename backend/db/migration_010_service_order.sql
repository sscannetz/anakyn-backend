-- ═══════════════════════════════════════════════════════════════
-- migration_010_service_order.sql — ใบสั่งซ่อมชุดข้อมูลใหม่
--
-- ของเดิมยัดข้อมูลที่แอปกรอก (ชื่อลูกค้า เบอร์ อาการ) ไว้ใน condition_notes JSONB
-- ทำให้ค้นหา/เรียงไม่ได้ และเอกสารต้องเดาว่าอะไรอยู่ตรงไหน
-- รอบนี้ยกขึ้นมาเป็นคอลัมน์จริง แล้วย้ายข้อมูลเดิมตามขึ้นมาให้
--
-- ADD COLUMN IF NOT EXISTS + COALESCE → รันซ้ำได้ ไม่ทับของใหม่
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS customer_name  TEXT;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS job_type       TEXT;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS job_qty        INTEGER DEFAULT 1;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS photos         JSONB DEFAULT '[]';
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS repair_detail  TEXT;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS note           TEXT;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS price          NUMERIC(12,2) DEFAULT 0;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS deposit        NUMERIC(12,2) DEFAULT 0;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS balance        NUMERIC(12,2) DEFAULT 0;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS received_by    TEXT;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS due_date       DATE;

-- รหัสใหม่ SERVICE#00001 ยาวกว่าเดิม เผื่อความยาวไว้
ALTER TABLE service_orders ALTER COLUMN service_no TYPE VARCHAR(40);

-- ── ย้ายข้อมูลเดิมที่ฝังอยู่ใน condition_notes ขึ้นมาเป็นคอลัมน์ ──
UPDATE service_orders SET
  customer_name  = COALESCE(customer_name,  condition_notes->>'customer_name'),
  customer_phone = COALESCE(customer_phone, condition_notes->>'customer_phone'),
  repair_detail  = COALESCE(repair_detail,  condition_notes->>'issue_description'),
  job_type       = COALESCE(job_type,       condition_notes->>'product_name'),
  price          = CASE WHEN COALESCE(price, 0) = 0 THEN COALESCE(total_cost, 0) ELSE price END,
  due_date       = COALESCE(due_date, pickup_date)
WHERE condition_notes IS NOT NULL;

-- คงเหลือของใบเก่า = ราคา − มัดจำ
UPDATE service_orders SET balance = GREATEST(COALESCE(price, 0) - COALESCE(deposit, 0), 0)
 WHERE COALESCE(balance, 0) = 0;
