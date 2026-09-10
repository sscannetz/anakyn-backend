-- ═══════════════════════════════════════════════════════════════
-- migration_006_payments.sql
-- ตารางการชำระเงินผ่าน payment gateway (Omise) — สำหรับช่อง "โอน / QR"
-- รันซ้ำได้ปลอดภัย (IF NOT EXISTS ทุกจุด)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS payments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- sales.id เป็น UUID ไม่ใช่ INTEGER
  sale_id         UUID REFERENCES sales(id) ON DELETE CASCADE,
  provider        VARCHAR(20)  NOT NULL DEFAULT 'omise',
  method          VARCHAR(20)  NOT NULL DEFAULT 'promptpay',   -- promptpay | card
  charge_id       VARCHAR(64)  UNIQUE,          -- chrg_xxx (unique = กัน webhook ยิงซ้ำ)
  source_id       VARCHAR(64),                  -- src_xxx
  amount_satang   BIGINT       NOT NULL,        -- เก็บเป็น "สตางค์" ให้ตรงกับ Omise
  currency        VARCHAR(3)   NOT NULL DEFAULT 'THB',
  status          VARCHAR(20)  NOT NULL DEFAULT 'pending',     -- pending|successful|failed|expired
  failure_code    VARCHAR(50),
  qr_image_url    TEXT,                         -- download_uri ของรูป QR จาก Omise
  expires_at      TIMESTAMPTZ,
  paid_at         TIMESTAMPTZ,
  raw             JSONB,                        -- charge object ดิบ ไว้สอบทานย้อนหลัง
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_sale   ON payments(sale_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- สถานะการชำระเงินของบิล
-- หมายเหตุ: sales.status มี CHECK อยู่แล้ว อนุญาตแค่ completed / pending / cancelled
-- จึงใช้ 'pending' ระหว่างรอจ่าย แล้วเก็บรายละเอียดไว้ที่คอลัมน์นี้แทน
ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'paid';   -- paid | pending | failed

-- บิลเก่าทั้งหมดถือว่าจ่ายแล้ว
UPDATE sales SET payment_status = 'paid' WHERE payment_status IS NULL;
