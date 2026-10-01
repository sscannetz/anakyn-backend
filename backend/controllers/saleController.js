// ═══════════════════════════════════════════════════════════════
// saleController.js — บันทึกการขาย (ตัดสต๊อก + สร้างค่าคอม Partner อัตโนมัติ)
// ═══════════════════════════════════════════════════════════════
const pool = require("../config/db");
const { nextHashNumber } = require("../utils/docNumber");
const { ensureSaleItemColumns } = require("../utils/saleItemColumns");

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

    // แนบรายการสินค้าของแต่ละบิลมาด้วย — หน้าหลักเอาไปแตกเป็นบรรทัดละสินค้า
    // ดึงทีเดียวด้วย ANY(...) ไม่วนยิงทีละบิล (20 บิล = 20 คิวรี)
    const ids = rows.map(r => r.id);
    const itemsBySale = {};
    if (ids.length) {
      const hasProfitCols = await ensureSaleItemColumns();
      const NET = hasProfitCols ? "COALESCE(si.line_net, si.line_total)" : "si.line_total";
      const its = await pool.query(
        `SELECT si.id, si.sale_id, si.qty, si.unit_price, ${NET} AS amount, p.name, p.sku
         FROM sale_items si
         JOIN products p ON p.id = si.product_id
         WHERE si.sale_id = ANY($1::uuid[])
         ORDER BY p.name`,
        [ids]
      );
      for (const r of its.rows) {
        (itemsBySale[r.sale_id] = itemsBySale[r.sale_id] || []).push({
          id: r.id, name: r.name, sku: r.sku,
          qty: Number(r.qty), unit_price: Number(r.unit_price), amount: Number(r.amount),
        });
      }
    }

    res.json(rows.map(r => ({ ...r, items: itemsBySale[r.id] || [] })));
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
    customer_name, customer_phone,          // ลูกค้าที่พิมพ์ชื่อเอง (walk-in) — ไม่ต้องมีในระบบก่อน
  } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: "กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการ" });
  }

  // สร้างคอลัมน์ที่ใช้คิดกำไรให้พร้อมก่อน (ทำนอก transaction ของการขาย)
  const hasProfitCols = await ensureSaleItemColumns();

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // ── ถ้าไม่ได้เลือกลูกค้าจากระบบ แต่พิมพ์ชื่อมา → หาจากชื่อเดิม ถ้าไม่มีก็สร้างใหม่ ──
    let saleCustomerId = customer_id || null;
    if (!saleCustomerId && customer_name && String(customer_name).trim()) {
      const name = String(customer_name).trim();
      const found = await client.query(
        "SELECT id FROM customers WHERE lower(full_name) = lower($1) LIMIT 1",
        [name]
      );
      if (found.rows[0]) {
        saleCustomerId = found.rows[0].id;
      } else {
        const created = await client.query(
          "INSERT INTO customers (full_name, phone) VALUES ($1,$2) RETURNING id",
          [name, customer_phone || null]
        );
        saleCustomerId = created.rows[0].id;
      }
    }

    // คำนวณยอดรวม
    const subtotal = items.reduce((sum, it) => sum + it.unit_price * it.qty, 0);
    const afterDiscount = subtotal - vip_discount - extra_discount;
    const vatAmount = vat_enabled ? Math.round(afterDiscount * 0.07) : 0;
    const total = afterDiscount + vatAmount;

    // ── ปันส่วนลดลงรายชิ้นตามสัดส่วนราคา ────────────────────────
    // ส่วนลดถูกกรอกที่ระดับบิล แต่กำไรต้องคิดรายชิ้น ถ้าไม่ปันลงมา
    // หน้าสรุปจะบวกกำไรจากราคาเต็ม → กำไรเกินจริงเท่ากับส่วนลดพอดี
    //
    // เศษทศนิยมยกให้รายการสุดท้าย ผลรวมจะเท่ากับ afterDiscount เป๊ะเสมอ
    // ไม่งั้นปัดทีละบรรทัดแล้วรวมกันจะขาด/เกินไม่กี่สตางค์ แต่พอสะสมหลายบิลจะเพี้ยน
    const r2 = (n) => Math.round(n * 100) / 100;
    const grossLines = items.map((it) => it.unit_price * it.qty);
    // กันส่วนลดเกินราคารวม (จะทำให้ราคาสุทธิติดลบ)
    const discTotal = Math.min(Math.max(0, vip_discount + extra_discount), subtotal);
    let discLeft = discTotal;
    const lineDisc = grossLines.map((g, i) => {
      if (i === grossLines.length - 1) return r2(discLeft);
      const d = subtotal > 0 ? r2(discTotal * g / subtotal) : 0;
      discLeft = r2(discLeft - d);
      return d;
    });

    const saleNo = await nextHashNumber("sales", "sale_no", "Sale");

    const saleResult = await client.query(
      `INSERT INTO sales
        (sale_no, customer_id, user_id, partner_id, subtotal, vip_discount,
         extra_discount, vat_enabled, vat_amount, total, payment_methods, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'completed')
       RETURNING *`,
      [saleNo, saleCustomerId, req.user.id, partner_id || null, subtotal, vip_discount,
       extra_discount, vat_enabled, vatAmount, total, JSON.stringify(payment_methods)]
    );
    const sale = saleResult.rows[0];

    // เพิ่ม sale_items + หักสต๊อก
    // ★ หักสต๊อกก่อน INSERT เพราะคำสั่งเดียวกันคืนต้นทุน ณ วินาทีนี้มาด้วย
    //   (ต้นทุนต้องล็อกไว้ ไม่งั้นแก้ต้นทุนสินค้าทีหลัง กำไรบิลเก่าจะเปลี่ยนย้อนหลัง)
    for (let i = 0; i < items.length; i++) {
      const it = items[i];

      const stockResult = await client.query(
        `UPDATE products SET stock_qty = stock_qty - $1
         WHERE id = $2 AND stock_qty >= $1 RETURNING stock_qty, cost_price`,
        [it.qty, it.product_id]
      );
      if (stockResult.rowCount === 0) {
        throw new Error(`สต๊อกสินค้าไม่พอ (product_id: ${it.product_id})`);
      }
      const costAtSale = stockResult.rows[0].cost_price;
      const gross = it.unit_price * it.qty;

      if (hasProfitCols) {
        await client.query(
          `INSERT INTO sale_items
             (sale_id, product_id, qty, unit_price, line_total, line_discount, line_net, cost_at_sale)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [sale.id, it.product_id, it.qty, it.unit_price, gross,
           lineDisc[i], r2(gross - lineDisc[i]), costAtSale]
        );
      } else {
        // คอลัมน์ใหม่ยังสร้างไม่สำเร็จ — บันทึกขายต้องไปต่อได้ ห้ามพังทั้งบิล
        await client.query(
          `INSERT INTO sale_items (sale_id, product_id, qty, unit_price, line_total)
           VALUES ($1,$2,$3,$4,$5)`,
          [sale.id, it.product_id, it.qty, it.unit_price, gross]
        );
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
