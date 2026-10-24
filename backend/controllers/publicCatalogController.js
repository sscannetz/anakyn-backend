// ═══════════════════════════════════════════════════════════════
// publicCatalogController.js — แคตตาล็อกสาธารณะสำหรับเว็บร้าน (otw2you)
//
//   ไม่ต้องล็อกอิน — ใครเปิดเว็บก็เห็น
//   ★ ส่งเฉพาะสินค้าที่ติ๊ก "Show in catalog" (is_published = true)
//   ★ ห้ามส่ง cost_price / metal_cost / labor_cost / diamond_total_cost
//     / partner_commission_pct / created_by ออกไปเด็ดขาด (ข้อมูลต้นทุนร้าน)
// ═══════════════════════════════════════════════════════════════
const pool = require("../config/db");
const { ensureProductPhotosColumn } = require("../utils/productPhotosColumn");
const { ensureProductPublishedColumn } = require("../utils/productPublishedColumn");

// คอลัมน์ที่เปิดให้คนนอกเห็นได้ — เขียนเป็นลิสต์ตายตัว ไม่ใช่ SELECT *
// (SELECT * แล้วมาลบทีหลัง = วันไหนเพิ่มคอลัมน์ต้นทุนใหม่จะหลุดออกเว็บทันที)
const SAFE_COLUMNS = [
  "id", "sku", "name", "category",
  "metal_type", "metal_weight_g",
  "diamonds", "has_certificate", "certificate_no",
  "sale_price", "stock_qty", "is_available",
  "created_at",
];

// GET /api/public/products?category=ring&search=ring
// รูป: ส่งรูปหลัก (photo_url) มาด้วยเพื่อโชว์ในกริด — รูปที่เหลือไปเอาที่ /:id
async function listPublicProducts(req, res) {
  try {
    const hasPublished = await ensureProductPublishedColumn();
    // ยังไม่มีคอลัมน์ = ยังไม่เคยติ๊กอะไรเลย → ส่งลิสต์ว่าง ดีกว่าเปิดสต๊อกทั้งร้านออกเว็บ
    if (!hasPublished) return res.json([]);

    const { category, search } = req.query;
    const conditions = ["is_published = true"];
    const values = [];
    let i = 1;

    if (category && category !== "all") {
      conditions.push(`category = $${i++}`);
      values.push(category);
    }
    if (search) {
      conditions.push(`(name ILIKE $${i} OR sku ILIKE $${i})`);
      values.push(`%${search}%`);
      i++;
    }

    const { rows } = await pool.query(
      `SELECT ${SAFE_COLUMNS.join(", ")}, photo_url AS photo
         FROM products
        WHERE ${conditions.join(" AND ")}
        ORDER BY created_at DESC`,
      values
    );
    res.json(rows);
  } catch (err) {
    console.error("listPublicProducts:", err.message);
    res.status(500).json({ error: "ไม่สามารถโหลดรายการสินค้าได้" });
  }
}

// GET /api/public/products/:id — รายละเอียด + รูปครบทุกมุม
async function getPublicProduct(req, res) {
  try {
    const hasPublished = await ensureProductPublishedColumn();
    if (!hasPublished) return res.status(404).json({ error: "ไม่พบสินค้า" });

    const hasPhotos = await ensureProductPhotosColumn();
    const photoCols = hasPhotos ? "photo_url AS photo, photos" : "photo_url AS photo";

    const { rows } = await pool.query(
      `SELECT ${SAFE_COLUMNS.join(", ")}, ${photoCols}
         FROM products
        WHERE id = $1 AND is_published = true`,
      [req.params.id]
    );
    // ไม่ได้ติ๊ก Show in catalog = ไม่มีตัวตนสำหรับคนนอก (404 ไม่ใช่ 403)
    if (!rows[0]) return res.status(404).json({ error: "ไม่พบสินค้า" });

    const p = rows[0];
    if (!Array.isArray(p.photos)) p.photos = p.photo ? [p.photo] : [];
    res.json(p);
  } catch (err) {
    console.error("getPublicProduct:", err.message);
    res.status(500).json({ error: "เกิดข้อผิดพลาด" });
  }
}

module.exports = { listPublicProducts, getPublicProduct };
