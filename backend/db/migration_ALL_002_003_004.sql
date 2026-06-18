-- ═══════════════════════════════════════════════════════════════
-- migration_ALL_002_003_004.sql
-- รวม migration 002 + 003 + 004 ไว้ในไฟล์เดียว สำหรับวางใน Supabase SQL Editor แล้วกด Run ครั้งเดียว
-- ทุกคำสั่งใช้ IF NOT EXISTS / IF EXISTS — ปลอดภัย รันซ้ำได้ ไม่ลบข้อมูลเดิม
-- ═══════════════════════════════════════════════════════════════

-- ───────── 002: products (รายละเอียดสินค้า) ─────────
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS metal_weight_g DECIMAL(8,2),
  ADD COLUMN IF NOT EXISTS metal_weight_adj_g DECIMAL(8,2),
  ADD COLUMN IF NOT EXISTS metal_cost DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS labor_cost DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS diamonds JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS diamond_total_cost DECIMAL(12,2) DEFAULT 0;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='weight_g') THEN
    UPDATE products SET metal_weight_g = weight_g WHERE metal_weight_g IS NULL;
  END IF;
END $$;

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_check;

-- ───────── 003: invoices (VAT + payment methods) ─────────
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS vat_applied BOOLEAN DEFAULT true;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_methods JSONB DEFAULT '[]';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='payment_method') THEN
    UPDATE invoices
    SET payment_methods = CASE
      WHEN payment_method IS NOT NULL AND payment_method <> '' THEN jsonb_build_array(payment_method)
      ELSE '[]'::jsonb
    END
    WHERE payment_methods = '[]'::jsonb OR payment_methods IS NULL;

    ALTER TABLE invoices DROP COLUMN payment_method;
  END IF;
END $$;

UPDATE invoices SET vat_applied = (vat_amount > 0) WHERE vat_applied IS NULL;

-- ───────── 004: quotations (notes + VAT) ─────────
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS vat_applied BOOLEAN DEFAULT true;

UPDATE quotations SET vat_applied = (vat_amount > 0) WHERE vat_applied IS NULL;

-- ═══════════════════════════════════════════════════════════════
-- เสร็จแล้ว — เช็คได้ที่ Table Editor ว่า products / invoices / quotations มีคอลัมน์ใหม่ครบ
-- ═══════════════════════════════════════════════════════════════
