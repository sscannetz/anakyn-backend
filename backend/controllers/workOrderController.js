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
  const dir = path.join(__dirname, "..", "db");
  // 007 สร้างตาราง · 008 เพิ่มคอลัมน์ของใบสั่งทำโครงใหม่ (1 ใบ = 1 งาน)
  for (const f of ["migration_007_work_orders.sql", "migration_008_work_order_job.sql"]) {
    await pool.query(fs.readFileSync(path.join(dir, f), "utf-8"));
  }
  tablesReady = true;
  console.log("✅ ตาราง work_orders พร้อมใช้งาน");
}

// ── ความบริสุทธิ์ของทองตามกะรัต — ใช้แปลงน้ำหนักโลหะเป็น "ทองแท้ 100%"
//    ช่างกับร้านทองใช้เลขนี้ชั่งกันตอนรับ-ส่งงาน ต้องคิดฝั่ง server ที่เดียว
//    จะได้ไม่มีทางที่หน้าจอกับเอกสารคิดคนละแบบ
const PURITY = { "9K": 9 / 24, "14K": 14 / 24, "18K": 18 / 24, silver: 0 };

// ── เลขที่ใบสั่งทำ: JOB-2569-0007 (ปี พ.ศ. + ลำดับ 4 หลัก) ──
// แยกจาก nextDocNumber() ของเอกสารใบอื่น เพราะใบอื่นใช้ปี ค.ศ. + 5 หลัก
// และใบสั่งทำต้องให้พนักงานพิมพ์เลขทับเองได้ด้วย
function thaiYear() { return new Date().getFullYear() + 543; }
async function nextWorkNo() {
  const by = thaiYear();
  const { rows } = await pool.query(
    `SELECT work_no FROM work_orders WHERE work_no LIKE $1 ORDER BY work_no DESC LIMIT 1`,
    [`JOB-${by}-%`]
  );
  let seq = 1;
  if (rows[0]) seq = (parseInt(String(rows[0].work_no).split("-")[2], 10) || 0) + 1;
  return `JOB-${by}-${String(seq).padStart(4, "0")}`;
}

// GET /api/work-orders/next-no — ให้หน้าจอเอาไปโชว์เลขถัดไปก่อนกดบันทึก
async function peekNextWorkNo(req, res) {
  try {
    await ensureTables();
    res.json({ work_no: await nextWorkNo(), prefix: `JOB-${thaiYear()}-` });
  } catch (err) {
    res.status(500).json({ error: "ไม่สามารถอ่านเลขที่ถัดไปได้", detail: err.message });
  }
}

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

// ── แปลง body ของฟอร์มใหม่ให้เป็นค่าที่พร้อมลงตาราง ──
// 1 ใบ = 1 งาน แต่ยังเขียน work_order_items 1 แถวไว้ด้วย
// เพราะปุ่ม "เพิ่มเข้าสต๊อก" ทำงานกับตารางนั้น และคอลัมน์เก่ายังต้องมีที่อยู่
function jobFields(b = {}) {
  const qty = Math.max(1, parseInt(b.job_qty, 10) || 1);
  const price = num(b.price);
  const stones = (Array.isArray(b.stones) ? b.stones : []).filter(
    (st) => st && (st.shape || st.carat || st.cert_no)
  ).map((st) => ({
    shape: st.shape || "",
    color: st.color || "",      // สีเพชร D–M / Fancy
    clarity: st.clarity || "",  // ความสะอาด FL–I3
    carat: num(st.carat),
    qty: Math.max(1, parseInt(st.qty, 10) || 1),
    has_cert: !!st.has_cert,
    cert_no: st.cert_no || "",
  }));
  const photos = (Array.isArray(b.photos) ? b.photos : []).filter(Boolean).slice(0, 4);
  return {
    customer_id: b.customer_id || null,
    customer_name: b.customer_name || null,
    customer_phone: b.customer_phone || null,
    job_type: b.job_type || null,
    job_qty: qty,
    workshop: b.workshop || null,
    ordered_at: b.ordered_at || null,      // วันที่รับงาน
    due_date: b.due_date || null,          // วันที่ส่งงาน
    metal_color: b.metal_color || null,
    metal_type: b.metal_type || null,
    ring_size: b.ring_size || null,
    engrave: b.engrave || null,
    job_note: b.job_note || null,
    stones,
    photos,
    price,
    deposit: num(b.deposit),
    grand_total: round2(price * qty),
    received_by: b.received_by || null,
    is_urgent: !!b.is_urgent,
    quotation_ref: b.quotation_ref || null,
  };
}

// เขียน/เขียนทับรายการเดียวของใบ — ให้ระบบเพิ่มเข้าสต๊อกยังใช้ได้เหมือนเดิม
async function writeSingleItem(client, orderId, f) {
  const existing = await client.query(
    "SELECT id, stocked_product_id FROM work_order_items WHERE work_order_id = $1 ORDER BY line_no LIMIT 1",
    [orderId]
  );
  const vals = [
    f.job_type || "งานสั่งทำ", f.photos[0] || null, f.metal_type, f.metal_color,
    f.job_qty, f.ring_size, f.job_note, JSON.stringify(f.stones),
  ];
  if (existing.rows[0]) {
    await client.query(
      `UPDATE work_order_items
          SET name=$1, photo_url=$2, metal_type=$3, metal_color=$4,
              qty=$5, ring_size=$6, note=$7, stones=$8
        WHERE id=$9`,
      [...vals, existing.rows[0].id]
    );
  } else {
    await client.query(
      `INSERT INTO work_order_items
        (work_order_id, line_no, name, photo_url, metal_type, metal_color, qty, ring_size, note, stones)
       VALUES ($1,1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [orderId, ...vals]
    );
  }
}

const JOB_COLS = `customer_id, customer_name, customer_phone, job_type, job_qty, workshop,
  ordered_at, due_date, metal_color, metal_type, ring_size, engrave, job_note,
  stones, photos, price, deposit, grand_total, received_by, is_urgent, quotation_ref`;
const jobValues = (f) => [
  f.customer_id, f.customer_name, f.customer_phone, f.job_type, f.job_qty, f.workshop,
  f.ordered_at, f.due_date, f.metal_color, f.metal_type, f.ring_size, f.engrave, f.job_note,
  JSON.stringify(f.stones), JSON.stringify(f.photos), f.price, f.deposit, f.grand_total,
  f.received_by, f.is_urgent, f.quotation_ref,
];

// POST /api/work-orders
async function createWorkOrder(req, res) {
  const client = await pool.connect();
  try {
    await ensureTables();
    const f = jobFields(req.body);
    // พิมพ์เลขเองมาก็ใช้เลขนั้น ไม่ได้พิมพ์มาก็รันต่อให้
    const workNo = (req.body.work_no || "").trim() || (await nextWorkNo());

    await client.query("BEGIN");
    const { rows } = await client.query(
      `INSERT INTO work_orders (work_no, ${JOB_COLS}, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,'ordered',$23)
       RETURNING *`,
      [workNo, ...jobValues(f), req.user?.id || null]
    );
    const order = rows[0];
    await writeSingleItem(client, order.id, f);
    await client.query("COMMIT");

    const items = await pool.query("SELECT * FROM work_order_items WHERE work_order_id = $1 ORDER BY line_no", [order.id]);
    res.status(201).json({ ...order, items: items.rows.map(withItemTotals) });
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.code === "23505") {
      return res.status(409).json({ error: "รหัสงานสั่งทำนี้ถูกใช้ไปแล้ว กรุณาเปลี่ยนเลข" });
    }
    console.error(err);
    res.status(500).json({ error: "ไม่สามารถสร้างใบสั่งทำได้", detail: err.message });
  } finally {
    client.release();
  }
}

// PUT /api/work-orders/:id — แก้ไขใบที่บันทึกไปแล้ว แก้ได้ไม่จำกัดครั้ง
async function updateWorkOrder(req, res) {
  const client = await pool.connect();
  try {
    await ensureTables();
    const f = jobFields(req.body);
    const workNo = (req.body.work_no || "").trim();

    await client.query("BEGIN");
    const sets = JOB_COLS.split(",").map((c) => c.trim()).filter(Boolean)
      .map((c, i) => `${c} = $${i + 2}`).join(", ");
    const params = [req.params.id, ...jobValues(f)];
    let sql = `UPDATE work_orders SET ${sets}, updated_at = NOW()`;
    if (workNo) { params.push(workNo); sql += `, work_no = $${params.length}`; }
    sql += " WHERE id = $1 RETURNING *";

    const { rows } = await client.query(sql, params);
    if (!rows[0]) { await client.query("ROLLBACK"); return res.status(404).json({ error: "ไม่พบใบสั่งทำ" }); }
    await writeSingleItem(client, rows[0].id, f);
    await client.query("COMMIT");

    const items = await pool.query("SELECT * FROM work_order_items WHERE work_order_id = $1 ORDER BY line_no", [rows[0].id]);
    res.json({ ...rows[0], items: items.rows.map(withItemTotals) });
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.code === "23505") {
      return res.status(409).json({ error: "รหัสงานสั่งทำนี้ถูกใช้ไปแล้ว กรุณาเปลี่ยนเลข" });
    }
    console.error(err);
    res.status(500).json({ error: "ไม่สามารถแก้ไขใบสั่งทำได้", detail: err.message });
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
  listWorkOrders, getWorkOrder, createWorkOrder, updateWorkOrder,
  peekNextWorkNo, updateWorkOrderStatus, deleteWorkOrder, workItemToStock,
};
