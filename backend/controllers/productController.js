// ═══════════════════════════════════════════════════════════════
// productController.js — CRUD สินค้า/สต๊อก
// ═══════════════════════════════════════════════════════════════
const pool = require("../config/db");
const { ensureProductPhotosColumn } = require("../utils/productPhotosColumn");

// คอลัมน์ที่แก้ผ่าน PUT /api/products/:id ได้ (ไม่รวม id, created_by, created_at)
const UPDATABLE_FIELDS = new Set([
  "sku", "name", "category", "photo_url", "photos",
  "metal_type", "metal_weight_g", "metal_weight_adj_g",
  "gold_price_at_creation", "silver_price_at_creation", "metal_cost",
  "labor_cost", "diamonds", "diamond_total_cost",
  "has_certificate", "certificate_no",
  "cost_price", "sale_price", "stock_qty", "is_available",
  "partner_commission_pct",
]);

// รายการคอลัมน์แบบไม่เอา photo_url — ใช้กับ ?light=true
// (photo_url เก็บรูป base64 ก้อนละ ~60-100KB หน้าไหนไม่ได้โชว์รูปไม่ต้องลากมา)
const LIGHT_COLUMNS = [
  "id", "sku", "name", "category",
  "metal_type", "metal_weight_g", "metal_weight_adj_g",
  "gold_price_at_creation", "silver_price_at_creation", "metal_cost",
  "labor_cost", "diamonds", "diamond_total_cost",
  "has_certificate", "certificate_no",
  "cost_price", "sale_price", "stock_qty", "is_available",
  "partner_commission_pct", "created_by", "created_at", "updated_at",
  "(photo_url IS NOT NULL) AS has_photo",
].join(", ");

// เหมือน LIGHT แต่เอารูปหลักมาด้วย — ใช้กับ list/insert/update ที่ต้องโชว์รูปย่อ
// ★ ไม่มี photos (อาเรย์ 4 รูป) เด็ดขาด ไม่งั้นหน้าสต๊อกจะลากรูปมามากกว่าเดิม 4 เท่า
//   อยากได้ photos ให้ยิง GET /api/products/:id ทีละชิ้น (ตอนเปิดฟอร์มแก้ไข)
const FULL_COLUMNS = LIGHT_COLUMNS.replace("(photo_url IS NOT NULL) AS has_photo", "photo_url");

// GET /api/products?category=ring&search=แหวน&available=true
async function listProducts(req, res) {
  const { category, search, available, partner_view, light } = req.query;
  const conditions = [];
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
  if (available !== undefined) {
    conditions.push(`is_available = $${i++}`);
    values.push(available === "true");
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const columns = light === "true" ? LIGHT_COLUMNS : FULL_COLUMNS;
    const { rows } = await pool.query(
      `SELECT ${columns} FROM products ${where} ORDER BY created_at DESC`,
      values
    );

    // ถ้าเป็น Partner เข้าดู — ซ่อน cost_price ไม่ให้เห็นต้นทุน
    if (partner_view === "true") {
      rows.forEach((r) => delete r.cost_price);
    }

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ไม่สามารถโหลดรายการสินค้าได้" });
  }
}

// GET /api/products/:id
async function getProduct(req, res) {
  try {
    const { rows } = await pool.query("SELECT * FROM products WHERE id = $1", [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: "ไม่พบสินค้า" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "เกิดข้อผิดพลาด" });
  }
}

// POST /api/products — เพิ่มสินค้าใหม่ (รับราคาทอง/เงินที่กรอกจากหน้า AddStock พร้อมรายละเอียดเพชรหลายเม็ด)
async function createProduct(req, res) {
  const {
    sku, name, category, photo_url, photos,
    metal_type, metal_weight_g, metal_weight_adj_g,
    gold_price_at_creation, silver_price_at_creation, metal_cost,
    labor_cost, diamonds, diamond_total_cost,
    has_certificate, certificate_no,
    cost_price, sale_price, stock_qty,
    partner_commission_pct,
  } = req.body;

  if (!sku || !name || !cost_price || !sale_price) {
    return res.status(400).json({ error: "กรุณากรอกข้อมูลสินค้าให้ครบ (SKU, ชื่อ, ราคาทุน, ราคาขาย)" });
  }

  // คอลัมน์ photos ยังไม่มี (ยังไม่เคยไมเกรต) → ถอยไปบันทึกรูปหลักรูปเดียว
  // ห้ามปล่อยให้ INSERT พัง เพราะจะเพิ่มสินค้าไม่ได้ทั้งหน้า
  const hasPhotos = await ensureProductPhotosColumn();
  const photoList = Array.isArray(photos) ? photos.filter(Boolean).slice(0, 4) : [];
  const mainPhoto = photo_url || photoList[0] || null;

  // ชื่อคอลัมน์กับค่าเดินคู่กันเป็นคู่ ๆ แล้วค่อยสร้าง $1..$n ให้เอง
  // (เขียน $1,$2,... มือแล้วมี/ไม่มี photos สลับกัน เลขเลื่อนผิดง่ายมาก)
  const cols = [
    ["sku", sku], ["name", name], ["category", category], ["photo_url", mainPhoto],
    ...(hasPhotos ? [["photos", JSON.stringify(photoList)]] : []),
    ["metal_type", metal_type],
    ["metal_weight_g", metal_weight_g || null], ["metal_weight_adj_g", metal_weight_adj_g || null],
    ["gold_price_at_creation", gold_price_at_creation || null],
    ["silver_price_at_creation", silver_price_at_creation || null],
    ["metal_cost", metal_cost || 0], ["labor_cost", labor_cost || 0],
    ["diamonds", JSON.stringify(diamonds || [])], ["diamond_total_cost", diamond_total_cost || 0],
    ["has_certificate", has_certificate || false], ["certificate_no", certificate_no || null],
    ["cost_price", cost_price], ["sale_price", sale_price], ["stock_qty", stock_qty || 1],
    ["partner_commission_pct", partner_commission_pct || 0], ["created_by", req.user.id],
  ];

  try {
    const { rows } = await pool.query(
      `INSERT INTO products (${cols.map(([c]) => `"${c}"`).join(", ")})
       VALUES (${cols.map((_, i) => `$${i + 1}`).join(", ")})
       RETURNING ${FULL_COLUMNS}`,
      cols.map(([, v]) => v)
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "SKU นี้มีอยู่แล้วในระบบ" });
    }
    console.error(err);
    res.status(500).json({ error: "ไม่สามารถเพิ่มสินค้าได้" });
  }
}

// PUT /api/products/:id
async function updateProduct(req, res) {
  const fields = { ...req.body };

  // ส่ง photos มา → แปลงเป็น JSON string + บังคับรูปหลักให้ตรงกับ photos[0] เสมอ
  // (ถ้าปล่อยให้ 2 คอลัมน์หลุดกัน หน้าสต๊อกจะโชว์คนละรูปกับที่เลือกไว้)
  if (Array.isArray(fields.photos)) {
    const list = fields.photos.filter(Boolean).slice(0, 4);
    if (await ensureProductPhotosColumn()) {
      fields.photos = JSON.stringify(list);
    } else {
      delete fields.photos;              // ยังไม่มีคอลัมน์ → เก็บแค่รูปหลัก ไม่ให้ UPDATE พัง
    }
    fields.photo_url = list[0] || null;
  }

  // รับเฉพาะคอลัมน์ในลิสต์นี้ — ชื่อคอลัมน์ถูกต่อเข้า SQL ตรง ๆ ถ้าไม่กรอง
  // client ส่ง key อะไรมาก็เขียนทับได้หมด (รวม id / created_by) และแทรก SQL ได้
  const keys = Object.keys(fields).filter((k) => UPDATABLE_FIELDS.has(k));
  if (keys.length === 0) return res.status(400).json({ error: "ไม่มีข้อมูลที่จะอัพเดต" });

  const setClause = keys.map((k, idx) => `"${k}" = $${idx + 1}`).join(", ");
  const values = keys.map((k) => fields[k]);

  // ส่งรูปกลับเฉพาะตอนที่แก้รูปจริง — ปุ่ม +/- จำนวนคงเหลือยิง PUT ทุกครั้งที่กด
  // ถ้า RETURNING * ตลอด จะดาวน์โหลดรูป base64 กลับมาทุกครั้งที่กดปุ่มโดยไม่ได้ใช้
  // ★ ไม่ใช้ "*" เพราะจะลาก photos (สูงสุด 4 รูป base64) กลับมาด้วยโดยไม่ได้ใช้
  const returning = keys.includes("photo_url") || keys.includes("photos")
    ? FULL_COLUMNS
    : LIGHT_COLUMNS;

  try {
    const { rows } = await pool.query(
      `UPDATE products SET ${setClause} WHERE id = $${keys.length + 1} RETURNING ${returning}`,
      [...values, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "ไม่พบสินค้า" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ไม่สามารถอัพเดตสินค้าได้" });
  }
}

// DELETE /api/products/:id
async function deleteProduct(req, res) {
  try {
    const { rowCount } = await pool.query("DELETE FROM products WHERE id = $1", [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: "ไม่พบสินค้า" });
    res.json({ message: "ลบสินค้าเรียบร้อย" });
  } catch (err) {
    res.status(500).json({ error: "ไม่สามารถลบสินค้าได้ (อาจมีการขายที่เชื่อมโยงอยู่)" });
  }
}

module.exports = { listProducts, getProduct, createProduct, updateProduct, deleteProduct };
