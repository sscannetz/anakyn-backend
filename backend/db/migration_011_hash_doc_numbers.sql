-- ═══════════════════════════════════════════════════════════════
-- migration_011_hash_doc_numbers.sql — เลขเอกสารแบบ Prefix#00001
--
--   ใบแจ้งหนี้    INV-2026-00341  → INV#00001
--   ใบเสนอราคา   QT-2026-00089   → QT#00001
--   ใบสั่งซื้อ     PO-2026-00112   → PO#00001
--   บิลขาย       SALE-2026-00001 → Sale#00001
--   ใบเสร็จ      RCP-2026-00001  → Receipt#00001
--
-- แค่ขยายความยาวคอลัมน์ให้พอ — ของเก่าไม่ถูกแก้ ใบใหม่ถึงจะเป็นรูปแบบใหม่
-- โค้ด ensureWidth() ใน utils/docNumber.js ทำให้เองตอนออกใบแรกอยู่แล้ว
-- ไฟล์นี้เก็บไว้รันมือ/ย้อนดูประวัติ
--
-- ห่อด้วย DO block กันพังถ้าตารางยังไม่มีในบางสภาพแวดล้อม
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
  t text;
  c text;
  pairs text[][] := ARRAY[
    ARRAY['invoices',        'invoice_no'],
    ARRAY['quotations',      'quote_no'],
    ARRAY['purchase_orders', 'po_no'],
    ARRAY['sales',           'sale_no'],
    ARRAY['receipts',        'receipt_no']
  ];
  i int;
BEGIN
  FOR i IN 1 .. array_length(pairs, 1) LOOP
    t := pairs[i][1];
    c := pairs[i][2];
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = t AND column_name = c) THEN
      EXECUTE format('ALTER TABLE %I ALTER COLUMN %I TYPE VARCHAR(40)', t, c);
    END IF;
  END LOOP;
END $$;
