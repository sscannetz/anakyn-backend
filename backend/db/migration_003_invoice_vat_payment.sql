-- ═══════════════════════════════════════════════════════════════
-- migration_003_invoice_vat_payment.sql
-- อัพเดตตาราง invoices ให้รองรับ:
--   1. vat_applied  — toggle มี/ไม่มี VAT แก้ไขได้ในตัวเอกสาร
--   2. payment_methods (JSONB array) — เลือกได้หลายช่องทางพร้อมกัน (โอนเงิน/เงินสด/สแกน QR/บัตรเครดิต)
-- ใช้ ADD COLUMN IF NOT EXISTS เพื่อไม่ลบข้อมูลเดิมที่มีอยู่แล้ว
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS vat_applied BOOLEAN DEFAULT true;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_methods JSONB DEFAULT '[]';

-- ย้ายข้อมูลเดิมจากคอลัมน์ payment_method (ถ้ามี) เข้า payment_methods แบบ array ก่อนลบ
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

-- ตั้งค่า vat_applied ของใบกำกับภาษีเดิมตามข้อมูล vat_amount ที่มีอยู่จริง (ถ้า vat_amount > 0 ถือว่ามี VAT)
UPDATE invoices SET vat_applied = (vat_amount > 0) WHERE vat_applied IS NULL;
