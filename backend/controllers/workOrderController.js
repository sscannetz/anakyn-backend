// ═══════════════════════════════════════════════════════════════
// workOrderController.js — ใบสั่งทำ (Work Order)
//
// คนละเรื่องกับใบสั่งซ่อม: ใบสั่งซ่อม = ของลูกค้าเอามาซ่อม
//                          ใบสั่งทำ   = เราสั่งช่างผลิตใหม่ ส่งทอง+เพชรออกไป แล้วรับเข้าสต๊อก
// เลขเอกสารรันแยกชุด: JOB-2026-00001
// ═══════════════════════════════════════════════════════════════
const fs = require("fs");
const path = require("path");
const pool = require("../config/db");
const { nextDocNumber } = require("../utils/docNumber");

// ── สร้างตารางให้เองตอนถูกเรียกครั้งแรก ──
// Render แพลนฟรีไม่มี Shell จึงรัน migration มือไม่ได้ และ hook ตอน server start
// ก็พึ่งไม่ได้ (instance หลับแล้วตื่นใหม่ / deploy ไม่ทันเห็น log ว่าพังตรงไหน)
// เช็คที่ handler เลยจบปัญหา: เปิดหน้าใบสั่งทำครั้งแรก ตารางก็มา
// CREATE TABLE IF NOT EXISTS เป็น idempotent เรียกซ้ำไม่เสียหาย และแคชด้วย flag
let tablesReady = false;
async function ensureTables() {
  if (tablesReady) return;
  const file = path.join(__dirname, "..", "db", "migration_007_work_orders.sql");
  const sql = fs.readFileSync(file, "utf-8");
  await pool.query(sql);
  tablesReady = true;
  console.log("✅ ตาราง work_orders พร้อมใช้งาน");
}

// ── ความบริสุทธิ์ของทองตามกะรัต — ใช้แปลงน้ำหนักโลหะเป็น "ทองแท้ 100%"
//    ช่างกับร้านทองใช้เลขนี้ชั่งกันตอนรับ-ส่งงาน ต้องคิดฝั่ง server ที่เดียว
//    จะได้ไม่มีทางที่หน้าจอกับเอกสารคิดคนละแบบ
const PURITY = { "9K": 9 / 24, "14K": 14 / 24, "18K": 18 / 24, silver: 0 };

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const round2 = (n) => Math.round(n * 100) / 100;

// เพชร 1 กะรัต = 0.2 กรัม
const stoneGrams = (stones) =>
  (Array.isArray(stones) ? stones : []).reduce((sum, s) => sum + num(s.carat) * 0.2, 0);

// ── คำนวณยอดรวมของ 1 รายการ ──
function itemTotals(it) {
  const qty        = Math.max(1, parseInt(it.qty, 10) || 1);
  const unitWeight = num(it.unit_weight_g);
  const totalWeight = unitWeight * qty;
  const stoneG      = stoneGrams(it.stones) * qty;
  const metalG      = Math.max(0, totalWeight - stoneG);
  const purity      = PURITY[it.metal_type] ?? 0;
  return {
    qty,
    weight_g:    round2(totalWeight),
    stone_g:     round2(stoneG),
    metal_g:     round2(metalG),
    pure_gold_g: round2(metalG * purity),
    labor_total: round2((num(it.labor_cost) + num(it.plating_cost)) * qty),
  };
}

function orderTotals(items = []) {
  return items.reduce((acc, it) => {
    const t = itemTotals(it);
    acc.total_qty         += t.qty;
    acc.total_weight_g    += t.weight_g;
    acc.total_stone_g     += t.stone_g;
    acc.total_metal_g     += t.metal_g;
    acc.total_pure_gold_g += t.pure_gold_g;
    acc.total_labor_cost  += t.labor_total;
    return acc;
  }, { total_qty: 0, total_weight_g: 0, total_stone_g: 0, total_metal_g: 0, total_pure_gold_g: 0, total_labor_cost: 0 });
}

// เติมยอดรวมรายบรรทัดกลับไปให้หน้าจอ/เอกสารใช้ ไม่ต้องคิดเอง
const withItemTotals = (it) => ({
  ...it,
  stones: typeof it.stones === "string" ? safeJson(it.stones) : (it.stones || []),
  totals: itemTotals({ ...it, stones: typeof it.stones === "string" ? safeJson(it.stones) : it.stones }),
});

function safeJson(v) { try { return JSON.parse(v); } catch (_) { return []; } }

// ─────────────────────────────────────────────
async function listWorkOrders(req, res) {
  try {
    await ensureTables();
    const { rows } = await pool.query(
      `SELECT wo.*, COALESCE(c.full_name, wo.customer_name) AS customer_name,
              (SELECT COUNT(*) FROM work_order_items i WHERE i.work_order_id = wo.id) AS item_count
         FROM work_orders wo
         LEFT JOIN customers c ON c.id = wo.customer_id
        ORDER BY wo.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    // ส่ง detail กลับไปด้วย — แอปนี้ต้องล็อกอินอยู่แล้ว และช่วยให้ debug ได้โดยไม่ต้องเปิด log ที่ Render
    res.status(500).json({ error: "ไม่สามารถโหลดรายการใบสั่งทำได้", detail: err.message });
  }
}

async function getWorkOrder(req, res) {
  try {
    await ensureTables();
    const { rows } = await pool.query(
      `SELECT wo.*, COALESCE(c.full_name, wo.customer_name) AS customer_name,
              COALESCE(c.phone, wo.customer_phone) AS customer_phone
         FROM work_orders wo
         LEFT JOIN customers c ON c.id = wo.customer_id
        WHERE wo.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "ไม่พบใบสั่งทำ" });

    const items = await pool.query(
      "SELECT * FROM work_order_items WHERE work_order_id = $1 ORDER BY line_no",
      [req.params.id]
    );
    res.json({ ...rows[0], items: items.rows.map(withItemTotals) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "เกิดข้อผิดพลาด" });
  }
}

// POST /api/work-orders
async function createWorkOrder(req, res) {
  const {
    customer_id = null, customer_name = null, customer_phone = null,
    workshop = null, ordered_by = null, quotation_ref = null,
    is_urgent = false, job_note = null, due_date = null,
    items = [],
  } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "ใบสั่งทำต้องมีอย่างน้อย 1 รายการ" });
  }

  const client = await pool.connect();
  try {
    await ensureTables();
    await client.query("BEGIN");
    const workNo = await nextDocNumber("work_orders", "work_no", "JOB");
    const t = orderTotals(items);

    const { rows } = await client.query(
      `INSERT INTO work_orders
        (work_no, customer_id, customer_name, customer_phone, workshop, ordered_by,
         quotation_ref, is_urgent, job_note, due_date, status,
         total_qty, total_weight_g, total_stone_g, total_metal_g, total_pure_gold_g, total_labor_cost, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'ordered',$11,$12,$13,$14,$15,$16,$17)
       RETURNING *`,
      [workNo, customer_id, customer_name, customer_phone, workshop, ordered_by,
       quotation_ref, !!is_urgent, job_note, due_date || null,
       t.total_qty, t.total_weight_g, t.total_stone_g, t.total_metal_g, t.total_pure_gold_g, t.total_labor_cost,
       req.user?.id || null]
    );
    const order = rows[0];

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      await client.query(
        `INSERT INTO work_order_items
          (work_order_id, line_no, product_id, design_code, name, photo_url,
           metal_type, metal_color, unit_weight_g, qty, loss_pct, ring_size,
           labor_cost, plating_cost, note, stones)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
        [order.id, i + 1, it.product_id || null, it.design_code || null,
         it.name || "งานสั่งทำ", it.photo_url || null,
         it.metal_type || null, it.metal_color || null,
         it.unit_weight_g || null, Math.max(1, parseInt(it.qty, 10) || 1),
         it.loss_pct ?? 10, it.ring_size || null,
         num(it.labor_cost), num(it.plating_cost), it.note || null,
         JSON.stringify(it.stones || [])]
      );
    }

    await client.query("COMMIT");
    const full = await pool.query("SELECT * FROM work_order_items WHERE work_order_id = $1 ORDER BY line_no", [order.id]);
    res.status(201).json({ ...order, items: full.rows.map(withItemTotals) });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "ไม่สามารถสร้างใบสั่งทำได้", detail: err.message });
  } finally {
    client.release();
  }
}

// PATCH /api/work-orders/:id/status { status }
async function updateWorkOrderStatus(req, res) {
  await ensureTables();
  const { status, returned_at } = req.body;
  const allowed = ["ordered", "in_production", "qc", "delivered"];
  if (!allowed.includes(status)) return res.status(400).json({ error: "สถานะไม่ถูกต้อง" });
  try {
    // ห้ามใช้ $1 ซ้ำทั้งใน SET และใน CASE — Postgres จะเดาชนิดขัดกันเอง
    // (ช่อง status เป็น VARCHAR แต่ในการเทียบเป็น TEXT) แยกเป็นพารามิเตอร์ของใครของมัน
    const { rows } = await pool.query(
      `UPDATE work_orders
          SET status = $1,
              returned_at = CASE WHEN $2::boolean THEN COALESCE($3::date, CURRENT_DATE) ELSE returned_at END,
              updated_at = NOW()
        WHERE id = $4 RETURNING *`,
      [status, status === "delivered", returned_at || null, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "ไม่พบใบสั่งทำ" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ไม่สามารถอัพเดตสถานะได้", detail: err.message });
  }
}

async function deleteWorkOrder(req, res) {
  try {
    const { rowCount } = await pool.query("DELETE FROM work_orders WHERE id = $1", [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: "ไม่พบใบสั่งทำ" });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "ไม่สามารถลบใบสั่งทำได้" });
  }
}

// ── POST /api/work-orders/:id/items/:itemId/to-stock ──
// สร้างสินค้าในสต๊อกจากรายการงานที่ทำเสร็จแล้ว
// กันกดซ้ำด้วย stocked_product_id — กดสองครั้งจะได้สินค้าตัวเดิม ไม่ใช่สองตัว
async function workItemToStock(req, res) {
  const { id, itemId } = req.params;
  const { sku, sale_price } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      "SELECT * FROM work_order_items WHERE id = $1 AND work_order_id = $2",
      [itemId, id]
    );
    const it = rows[0];
    if (!it) { await client.query("ROLLBACK"); return res.status(404).json({ error: "ไม่พบรายการงาน" }); }

    if (it.stocked_product_id) {
      const existing = await client.query("SELECT * FROM products WHERE id = $1", [it.stocked_product_id]);
      await client.query("ROLLBACK");
      return res.status(200).json({ already: true, product: existing.rows[0] || null });
    }

    if (!sku) { await client.query("ROLLBACK"); return res.status(400).json({ error: "กรุณาระบุรหัสสินค้า (SKU)" }); }

    const stones = typeof it.stones === "string" ? safeJson(it.stones) : (it.stones || []);
    const t = itemTotals({ ...it, stones });
    const unitMetal = t.qty ? round2(t.metal_g / t.qty) : 0;

    // เพชรในใบสั่งทำ → รูปแบบ diamonds ของสินค้า (ต่อ 1 ชิ้น)
    const diamonds = stones.map((s) => ({
      weight: num(s.carat) / Math.max(1, num(s.qty) || 1),
      qty: Math.max(1, parseInt(s.qty, 10) || 1),
      shape: s.shape || "", color: s.color || "", clarity: s.clarity || "",
      hasCert: !!s.cert_no, certLab: s.cert_lab || "IGI", certNo: s.cert_no || "",
      cost: 0,
    }));

    const costPrice = round2(num(it.labor_cost) + num(it.plating_cost));
    const { rows: created } = await client.query(
      `INSERT INTO products
        (sku, name, category, photo_url, metal_type, metal_weight_g, metal_weight_adj_g,
         metal_cost, labor_cost, diamonds, diamond_total_cost,
         has_certificate, certificate_no, cost_price, sale_price, stock_qty, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       RETURNING *`,
      [sku, it.name, "other", it.photo_url || null, it.metal_type || null,
       unitMetal, round2(unitMetal * 1.1),
       0, num(it.labor_cost), JSON.stringify(diamonds), 0,
       diamonds.some((d) => d.hasCert), diamonds.find((d) => d.certNo)?.certNo || null,
       costPrice || 1, num(sale_price) || costPrice || 1, t.qty,
       req.user?.id || null]
    );

    await client.query("UPDATE work_order_items SET stocked_product_id = $1 WHERE id = $2", [created[0].id, itemId]);
    await client.query("COMMIT");
    res.status(201).json({ already: false, product: created[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.code === "23505") return res.status(409).json({ error: "SKU นี้มีอยู่แล้วในระบบ" });
    console.error(err);
    res.status(500).json({ error: "ไม่สามารถเพิ่มสินค้าเข้าสต๊อกได้" });
  } finally {
    client.release();
  }
}

module.exports = {
  listWorkOrders, getWorkOrder, createWorkOrder,
  updateWorkOrderStatus, deleteWorkOrder, workItemToStock,
};
