-- ═══════════════════════════════════════════════════════════════
-- migration_004_quotation_notes_vat.sql
-- เพิ่มคอลัมน์ที่จำเป็นสำหรับใบเสนอราคาให้ตรงต้นฉบับ AnakynAppPreview:
--   1. notes        — หมายเหตุ/เงื่อนไขพิเศษ แก้ไขได้ในตัวเอกสาร
--   2. vat_applied  — toggle มี/ไม่มี VAT แก้ไขได้ในตัวเอกสาร (เหมือน invoice)
-- ใช้ ADD COLUMN IF NOT EXISTS เพื่อไม่ลบข้อมูลเดิมที่มีอยู่แล้ว
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE quotations ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS vat_applied BOOLEAN DEFAULT true;

-- ตั้งค่า vat_applied ของใบเสนอราคาเดิมตามข้อมูล vat_amount ที่มีอยู่จริง (ถ้า vat_amount > 0 ถือว่ามี VAT)
UPDATE quotations SET vat_applied = (vat_amount > 0) WHERE vat_applied IS NULL;
