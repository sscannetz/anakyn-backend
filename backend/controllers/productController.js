// ═══════════════════════════════════════════════════════════════
// productController.js — CRUD สินค้า/สต๊อก
// ═══════════════════════════════════════════════════════════════
const pool = require("../config/db");

// GET /api/products?category=ring&search=แหวน&available=true
async function listProducts(req, res) {
  const { category, search, available, partner_view } = req.query;
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
    const { rows } = await pool.query(
      `SELECT * FROM products ${where} ORDER BY created_at DESC`,
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
    sku, name, category, photo_url,
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

  try {
    const { rows } = await pool.query(
      `INSERT INTO products
        (sku, name, category, photo_url, metal_type, metal_weight_g, metal_weight_adj_g,
         gold_price_at_creation, silver_price_at_creation, metal_cost,
         labor_cost, diamonds, diamond_total_cost,
         has_certificate, certificate_no,
         cost_price, sale_price, stock_qty,
         partner_commission_pct, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       RETURNING *`,
      [
        sku, name, category, photo_url || null,
        metal_type, metal_weight_g || null, metal_weight_adj_g || null,
        gold_price_at_creation || null, silver_price_at_creation || null, metal_cost || 0,
        labor_cost || 0, JSON.stringify(diamonds || []), diamond_total_cost || 0,
        has_certificate || false, certificate_no || null,
        cost_price, sale_price, stock_qty || 1,
        partner_commission_pct || 0, req.user.id,
      ]
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
  const fields = req.body;
  const keys = Object.keys(fields);
  if (keys.length === 0) return res.status(400).json({ error: "ไม่มีข้อมูลที่จะอัพเดต" });

  const setClause = keys.map((k, idx) => `${k} = $${idx + 1}`).join(", ");
  const values = keys.map((k) => fields[k]);

  try {
    const { rows } = await pool.query(
      `UPDATE products SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`,
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
