-- ═══════════════════════════════════════════════════════════════
-- migration_008_work_order_job.sql — ใบสั่งทำโครงใหม่ 1 ใบ = 1 งาน
--
-- ของเดิมเก็บงานหลายรายการต่อใบ (work_order_items) รอบนี้ย้ายข้อมูลงาน
-- ขึ้นมาอยู่ระดับใบแทน ตามฟอร์มที่เจ้าของร้านใช้จริงหน้าร้าน
--
-- คอลัมน์เดิม (น้ำหนัก · เผื่อสูญเสีย · ค่าแรง · ค่าชุบ · ทองแท้ 100%) ไม่ลบทิ้ง
-- ยังเก็บไว้เหมือนเดิม แค่ไม่แสดงบนหน้าจอกับเอกสาร เผื่อวันหลังอยากเปิดใช้อีก
--
-- ADD COLUMN IF NOT EXISTS ทั้งหมด → รันซ้ำได้ ไม่พัง
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS job_type    TEXT;            -- ประเภทงานสั่งทำ
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS job_qty     INTEGER DEFAULT 1;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS metal_color VARCHAR(20);     -- white | yellow | light | rose | silver
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS metal_type  VARCHAR(20);     -- 9K | 14K | 18K | silver
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS ring_size   TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS engrave     TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS stones      JSONB DEFAULT '[]';  -- [{ shape, carat, has_cert, cert_no, qty }]
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS photos      JSONB DEFAULT '[]';  -- ["data:image/jpeg;base64,..."] สูงสุด 4 รูป
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS price       NUMERIC(12,2) DEFAULT 0;  -- ราคา / ชิ้น
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS deposit     NUMERIC(12,2) DEFAULT 0;  -- มัดจำ
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS grand_total NUMERIC(12,2) DEFAULT 0;  -- รวมทั้งหมด = ราคา × จำนวน
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS received_by TEXT;            -- ผู้รับออเดอร์
