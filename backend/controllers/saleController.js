// ═══════════════════════════════════════════════════════════════
// saleController.js — บันทึกการขาย (ตัดสต๊อก + สร้างค่าคอม Partner อัตโนมัติ)
// ═══════════════════════════════════════════════════════════════
const pool = require("../config/db");
const { nextDocNumber } = require("../utils/docNumber");

// GET /api/sales?limit=20
async function listSales(req, res) {
  const limit = parseInt(req.query.limit) || 50;
  try {
    const { rows } = await pool.query(
      `SELECT s.*, c.full_name AS customer_name, u.full_name AS staff_name
       FROM sales s
       LEFT JOIN customers c ON c.id = s.customer_id
       LEFT JOIN users u ON u.id = s.user_id
       ORDER BY s.sold_at DESC LIMIT $1`,
      [limit]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ไม่สามารถโหลดรายการขายได้" });
  }
}

// GET /api/sales/:id  (พร้อมรายการสินค้า)
async function getSale(req, res) {
  try {
    const sale = await pool.query("SELECT * FROM sales WHERE id = $1", [req.params.id]);
    if (!sale.rows[0]) return res.status(404).json({ error: "ไม่พบรายการขาย" });

    const items = await pool.query(
      `SELECT si.*, p.name, p.sku FROM sale_items si
       JOIN products p ON p.id = si.product_id WHERE si.sale_id = $1`,
      [req.params.id]
    );
    res.json({ ...sale.rows[0], items: items.rows });
  } catch (err) {
    res.status(500).json({ error: "เกิดข้อผิดพลาด" });
  }
}

// POST /api/sales — สร้างการขายใหม่ (transaction: หักสต๊อก + สร้างคอมมิชชั่น)
// body: { customer_id, partner_id, items:[{product_id,qty,unit_price}], vip_discount, extra_discount, vat_enabled, payment_methods }
async function createSale(req, res) {
  const {
    customer_id, partner_id, items,
    vip_discount = 0, extra_discount = 0,
    vat_enabled = true, payment_methods = [],
  } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: "กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการ" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // คำนวณยอดรวม
    const subtotal = items.reduce((sum, it) => sum + it.unit_price * it.qty, 0);
    const afterDiscount = subtotal - vip_discount - extra_discount;
    const vatAmount = vat_enabled ? Math.round(afterDiscount * 0.07) : 0;
    const total = afterDiscount + vatAmount;

    const saleNo = await nextDocNumber("sales", "sale_no", "SALE");

    const saleResult = await client.query(
      `INSERT INTO sales
        (sale_no, customer_id, user_id, partner_id, subtotal, vip_discount,
         extra_discount, vat_enabled, vat_amount, total, payment_methods, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'completed')
       RETURNING *`,
      [saleNo, customer_id, req.user.id, partner_id || null, subtotal, vip_discount,
       extra_discount, vat_enabled, vatAmount, total, JSON.stringify(payment_methods)]
    );
    const sale = saleResult.rows[0];

    // เพิ่ม sale_items + หักสต๊อก
    for (const it of items) {
      await client.query(
        `INSERT INTO sale_items (sale_id, product_id, qty, unit_price, line_total)
         VALUES ($1,$2,$3,$4,$5)`,
        [sale.id, it.product_id, it.qty, it.unit_price, it.unit_price * it.qty]
      );

      const stockResult = await client.query(
        `UPDATE products SET stock_qty = stock_qty - $1
         WHERE id = $2 AND stock_qty >= $1 RETURNING stock_qty`,
        [it.qty, it.product_id]
      );
      if (stockResult.rowCount === 0) {
        throw new Error(`สต๊อกสินค้าไม่พอ (product_id: ${it.product_id})`);
      }
      // ถ้าสต๊อกหมด → ตั้ง is_available = false
      await client.query(
        `UPDATE products SET is_available = false WHERE id = $1 AND stock_qty = 0`,
        [it.product_id]
      );
    }

    // ถ้ามี partner แนะนำ → สร้างค่าคอมอัตโนมัติ
    if (partner_id) {
      const partnerResult = await client.query(
        "SELECT comm_rate_pct FROM partners WHERE id = $1", [partner_id]
      );
      const commPct = partnerResult.rows[0]?.comm_rate_pct || 0;
      const commAmount = Math.round(total * commPct / 100);

      await client.query(
        `INSERT INTO commissions (partner_id, sale_id, comm_pct, amount, status)
         VALUES ($1,$2,$3,$4,'pending')`,
        [partner_id, sale.id, commPct, commAmount]
      );
    }

    await client.query("COMMIT");
    res.status(201).json(sale);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(400).json({ error: err.message || "ไม่สามารถบันทึกการขายได้" });
  } finally {
    client.release();
  }
}

module.exports = { listSales, getSale, createSale };
