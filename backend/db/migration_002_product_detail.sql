-- ═══════════════════════════════════════════════════════════════
-- migration_002_product_detail.sql
-- เพิ่ม column ใหม่ใน products เพื่อรองรับฟอร์ม AddStock แบบละเอียด
-- (เพชรหลายเม็ด, ราคาทอง/เงินที่กรอกจริง, ค่าแรงช่าง, รูปสินค้า)
-- รันไฟล์นี้ถ้า products ถูกสร้างไปแล้วด้วย schema.sql เวอร์ชันเก่า
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS metal_weight_g DECIMAL(8,2),
  ADD COLUMN IF NOT EXISTS metal_weight_adj_g DECIMAL(8,2),
  ADD COLUMN IF NOT EXISTS metal_cost DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS labor_cost DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS diamonds JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS diamond_total_cost DECIMAL(12,2) DEFAULT 0;

-- ย้ายข้อมูลเก่า (ถ้ามี column weight_g / gem_* จากเวอร์ชันก่อนหน้า) เข้า column ใหม่
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='weight_g') THEN
    UPDATE products SET metal_weight_g = weight_g WHERE metal_weight_g IS NULL;
  END IF;
END $$;

-- ลบ CHECK constraint เดิมของ category ถ้ามี (ตอนนี้ category เป็นข้อความเสรีตามภาษาไทย/อังกฤษ)
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_check;
