// ═══════════════════════════════════════════════════════════════
// purchaseOrderController.js — ใบสั่งซื้อ (PO)
// ═══════════════════════════════════════════════════════════════
const pool = require("../config/db");
const { nextDocNumber } = require("../utils/docNumber");

async function listPOs(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT po.*, s.name AS supplier_name FROM purchase_orders po
       LEFT JOIN suppliers s ON s.id = po.supplier_id
       ORDER BY po.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "ไม่สามารถโหลดรายการใบสั่งซื้อได้" });
  }
}

async function getPO(req, res) {
  try {
    const po = await pool.query(
      `SELECT po.*, s.name AS supplier_name, s.phone FROM purchase_orders po
       LEFT JOIN suppliers s ON s.id = po.supplier_id WHERE po.id = $1`,
      [req.params.id]
    );
    if (!po.rows[0]) return res.status(404).json({ error: "ไม่พบใบสั่งซื้อ" });

    const items = await pool.query("SELECT * FROM po_items WHERE po_id = $1", [req.params.id]);
    res.json({ ...po.rows[0], items: items.rows });
  } catch (err) {
    res.status(500).json({ error: "เกิดข้อผิดพลาด" });
  }
}

// POST /api/purchase-orders  { supplier_id, items:[{item_name,unit,qty,unit_price}], needed_by, vat_enabled }
async function createPO(req, res) {
  const { supplier_id, items, needed_by, vat_enabled = true } = req.body;
  if (!items || items.length === 0) {
    return res.status(400).json({ error: "กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const subtotal = items.reduce((sum, it) => sum + it.unit_price * it.qty, 0);
    const vatAmount = vat_enabled ? Math.round(subtotal * 0.07) : 0;
    const total = subtotal + vatAmount;
    const poNo = await nextDocNumber("purchase_orders", "po_no", "PO");

    const poResult = await client.query(
      `INSERT INTO purchase_orders (po_no, supplier_id, subtotal, vat_amount, total, needed_by, approved_by, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'pending') RETURNING *`,
      [poNo, supplier_id, subtotal, vatAmount, total, needed_by, req.user.id]
    );
    const po = poResult.rows[0];

    for (const it of items) {
      await client.query(
        `INSERT INTO po_items (po_id, item_name, unit, qty, unit_price, line_total)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [po.id, it.item_name, it.unit, it.qty, it.unit_price, it.unit_price * it.qty]
      );
    }

    await client.query("COMMIT");
    res.status(201).json(po);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "ไม่สามารถสร้างใบสั่งซื้อได้" });
  } finally {
    client.release();
  }
}

// PATCH /api/purchase-orders/:id/status  { status: "sent" | "received" | "cancelled" }
async function updatePOStatus(req, res) {
  const { status } = req.body;
  try {
    const { rows } = await pool.query(
      "UPDATE purchase_orders SET status = $1 WHERE id = $2 RETURNING *",
      [status, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "ไม่พบใบสั่งซื้อ" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "ไม่สามารถอัพเดตสถานะได้" });
  }
}

module.exports = { listPOs, getPO, createPO, updatePOStatus };
