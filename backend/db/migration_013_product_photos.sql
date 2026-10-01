-- ═══════════════════════════════════════════════════════════════
-- migration_013_product_photos.sql — รูปสินค้าหลายรูป (สูงสุด 4)
--
-- ปกติ backend รันให้เองตอนเพิ่ม/แก้สินค้าครั้งแรก (utils/productPhotosColumn.js)
-- ไฟล์นี้ไว้รันมือใน Supabase ถ้าอยากให้มีคอลัมน์ก่อนเลย
--
-- photos[0] = รูปหลักเสมอ และถูก sync ลง photo_url
-- หน้าที่โชว์รูปเดียว (สต๊อกสินค้า/ขาย) จึงอ่าน photo_url เหมือนเดิม
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE products ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb;

-- สินค้าเดิมที่มีรูปเดียว → ยกไปเป็นรูปที่ 1
UPDATE products
   SET photos = jsonb_build_array(photo_url)
 WHERE photo_url IS NOT NULL
   AND (photos IS NULL OR jsonb_array_length(photos) = 0);
