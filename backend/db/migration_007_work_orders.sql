-- ═══════════════════════════════════════════════════════════════
-- migration_007_work_orders.sql — ใบสั่งทำ (Work Order)
--
-- คนละเรื่องกับ service_orders (ใบสั่งซ่อม) — ใบสั่งซ่อมคือของลูกค้าที่เอามาซ่อม
-- ใบสั่งทำคืองานที่เราสั่งช่างผลิตใหม่ ส่งทองกับเพชรออกไปให้ช่าง แล้วรับของกลับมาเข้าสต๊อก
--
-- Render แพลนฟรีไม่มี Shell — ไฟล์นี้ถูกรันอัตโนมัติโดย db/autoMigrate.js ตอน server start
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS work_orders (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_no           VARCHAR(32) UNIQUE NOT NULL,          -- JOB-2026-00001
  customer_id       UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name     TEXT,                                 -- กรอกอิสระได้ ไม่ต้องมีในตารางลูกค้า
  customer_phone    TEXT,
  workshop          TEXT,                                 -- ช่าง / โรงงานที่รับงาน
  ordered_by        TEXT,                                 -- ชื่อคนสั่งฝั่งร้าน
  quotation_ref     TEXT,                                 -- อ้างอิงใบเสนอราคา
  is_urgent         BOOLEAN     DEFAULT FALSE,
  job_note          TEXT,                                 -- หมายเหตุระดับใบ
  ordered_at        DATE        DEFAULT CURRENT_DATE,
  due_date          DATE,                                 -- กำหนดส่ง
  returned_at       DATE,                                 -- วันรับของคืนจากช่าง
  status            VARCHAR(20) DEFAULT 'ordered',        -- ordered | in_production | qc | delivered

  -- ยอดรวมทั้งใบ — คำนวณจาก items ตอนบันทึก เก็บไว้เพื่อให้หน้ารายการโหลดเร็ว
  total_qty         INTEGER       DEFAULT 0,
  total_weight_g    NUMERIC(10,2) DEFAULT 0,              -- น้ำหนักรวม (โลหะ + เพชร)
  total_stone_g     NUMERIC(10,2) DEFAULT 0,
  total_metal_g     NUMERIC(10,2) DEFAULT 0,
  total_pure_gold_g NUMERIC(10,2) DEFAULT 0,              -- เทียบทองแท้ 100%
  total_labor_cost  NUMERIC(12,2) DEFAULT 0,              -- ค่าแรง + ค่าชุบ

  created_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS work_order_items (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_order_id       UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  line_no             INTEGER NOT NULL,

  -- ดึงจากสต๊อก: เก็บ product_id ไว้อ้างอิงต้นแบบ · กรอกมือ: เป็น NULL
  product_id          UUID REFERENCES products(id) ON DELETE SET NULL,
  design_code         TEXT,                               -- รหัส / แบบ
  name                TEXT NOT NULL,
  photo_url           TEXT,                               -- base64 หรือ URL รูปที่เลือกเอง

  metal_type          VARCHAR(20),                        -- 9K | 14K | 18K | silver
  metal_color         VARCHAR(20),                        -- yellow | white | pink
  unit_weight_g       NUMERIC(10,2),                      -- น้ำหนักต่อชิ้น (รวมเพชร)
  qty                 INTEGER       DEFAULT 1,
  loss_pct            NUMERIC(5,2)  DEFAULT 10,           -- เผื่อสูญเสีย
  ring_size           TEXT,

  labor_cost          NUMERIC(12,2) DEFAULT 0,            -- ค่าแรงต่อชิ้น
  plating_cost        NUMERIC(12,2) DEFAULT 0,            -- ค่าชุบต่อชิ้น
  note                TEXT,                               -- หมายเหตุช่าง (บรรทัดสีแดงบนเอกสาร)

  -- [{ desc, qty, carat, shape, color, clarity, cert_no, size_mm }]
  stones              JSONB DEFAULT '[]',

  -- สินค้าที่สร้างเข้าสต๊อกจากรายการนี้แล้ว — มีค่า = กดเข้าสต๊อกไปแล้ว กันกดซ้ำ
  stocked_product_id  UUID REFERENCES products(id) ON DELETE SET NULL,

  created_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_order_items_order ON work_order_items(work_order_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status     ON work_orders(status);
