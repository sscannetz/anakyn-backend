// ═══════════════════════════════════════════════════════════════
// serviceOrderController.js — ใบสั่งซ่อม (Service Order)
//
// โครงใหม่ (ก.ย. 2569): รหัส SERVICE#00001 รันเอง พิมพ์ทับได้
// ข้อมูลที่เคยฝังอยู่ใน condition_notes JSONB ถูกยกขึ้นมาเป็นคอลัมน์จริงแล้ว
// (ดู migration_010) — ตัวอ่านยังรองรับของเก่าไว้ กันใบที่ยังไม่ถูกย้าย
//
// ผู้รับออเดอร์มาจากคนที่ล็อกอินเสมอ ไม่รับค่าจากหน้าจอ
// ═══════════════════════════════════════════════════════════════
const fs = require("fs");
const path = require("path");
const pool = require("../config/db");

let ready = false;
async function ensureColumns() {
  if (ready) return;
  const file = path.join(__dirname, "..", "db", "migration_010_service_order.sql");
  await pool.query(fs.readFileSync(file, "utf-8"));
  ready = true;
  console.log("✅ ใบสั่งซ่อม: คอลัมน์ใหม่พร้อมใช้งาน");
}

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const round2 = (n) => Math.round(n * 100) / 100;

const SERVICE_PREFIX = "SERVICE#";
async function nextServiceNo() {
  const { rows } = await pool.query(
    `SELECT service_no FROM service_orders WHERE service_no LIKE $1
      ORDER BY NULLIF(regexp_replace(service_no, '\\D', '', 'g'), '')::bigint DESC NULLS LAST LIMIT 1`,
    [`${SERVICE_PREFIX}%`]
  );
  let seq = 1;
  if (rows[0]) seq = (parseInt(String(rows[0].service_no).replace(/\D/g, ""), 10) || 0) + 1;
  return `${SERVICE_PREFIX}${String(seq).padStart(5, "0")}`;
}

async function loginName(req) {
  if (!req.user?.id) return null;
  try {
    const { rows } = await pool.query(
      "SELECT COALESCE(NULLIF(nickname,''), full_name) AS name FROM users WHERE id = $1",
      [req.user.id]
    );
    return rows[0]?.name || null;
  } catch (_) { return null; }
}

// GET /api/service-orders/next-no
async function peekNextServiceNo(req, res) {
  try {
    await ensureColumns();
    res.json({
      service_no: await nextServiceNo(),
      prefix: SERVICE_PREFIX,
      received_by: await loginName(req),
    });
  } catch (err) {
    res.status(500).json({ error: "อ่านเลขที่ถัดไปไม่ได้", detail: err.message });
  }
}

// ใบเก่าที่ยังไม่ถูกย้าย ข้อมูลอยู่ใน condition_notes — เติมกลับให้หน้าจออ่านได้เหมือนกัน
function shape(row) {
  let notes = row.condition_notes;
  if (typeof notes === "string") { try { notes = JSON.parse(notes); } catch (_) { notes = {}; } }
  notes = notes || {};
  const price = num(row.price) || num(row.total_cost);
  const deposit = num(row.deposit);
  return {
    ...row,
    customer_name: row.customer_name || notes.customer_name || null,
    customer_phone: row.customer_phone || row.phone || notes.customer_phone || null,
    job_type: row.job_type || notes.product_name || null,
    repair_detail: row.repair_detail || notes.issue_description || null,
    price,
    deposit,
    balance: num(row.balance) || Math.max(0, price - deposit),
    total_cost: price,
    estimated_cost: price,
  };
}

function fields(b = {}, receivedBy) {
  const price = num(b.price);
  const deposit = num(b.deposit);
  return {
    customer_name: b.customer_name || null,
    customer_phone: b.customer_phone || null,
    job_type: b.job_type || null,
    job_qty: Math.max(1, parseInt(b.job_qty, 10) || 1),
    photos: (Array.isArray(b.photos) ? b.photos : []).filter(Boolean).slice(0, 4),
    repair_detail: b.repair_detail || null,
    note: b.note || null,
    price,
    deposit,
    balance: round2(Math.max(0, price - deposit)),
    total_cost: price,
    received_at: b.received_at || null,   // วันที่รับงาน
    due_date: b.due_date || null,         // วันที่ส่งงาน
    pickup_date: b.due_date || null,      // คอลัมน์เดิม เก็บให้ตรงกันไว้
    received_by: receivedBy,
  };
}

const COLS = `customer_name, customer_phone, job_type, job_qty, photos, repair_detail, note,
  price, deposit, balance, total_cost, received_at, due_date, pickup_date, received_by`;
const values = (f) => [
  f.customer_name, f.customer_phone, f.job_type, f.job_qty, JSON.stringify(f.photos),
  f.repair_detail, f.note, f.price, f.deposit, f.balance, f.total_cost,
  f.received_at, f.due_date, f.pickup_date, f.received_by,
];

async function listServiceOrders(req, res) {
  try {
    await ensureColumns();
    const { rows } = await pool.query(
      `SELECT so.*, COALESCE(so.customer_name, c.full_name) AS customer_name, p.sku
         FROM service_orders so
         LEFT JOIN customers c ON c.id = so.customer_id
         LEFT JOIN products p ON p.id = so.product_id
        ORDER BY so.received_at DESC NULLS LAST, so.created_at DESC`
    );
    res.json(rows.map(shape));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ไม่สามารถโหลดรายการใบสั่งซ่อมได้", detail: err.message });
  }
}

async function getServiceOrder(req, res) {
  try {
    await ensureColumns();
    const { rows } = await pool.query(
      `SELECT so.*, COALESCE(so.customer_name, c.full_name) AS customer_name, p.sku
         FROM service_orders so
         LEFT JOIN customers c ON c.id = so.customer_id
         LEFT JOIN products p ON p.id = so.product_id
        WHERE so.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "ไม่พบใบสั่งซ่อม" });
    res.json(shape(rows[0]));
  } catch (err) {
    res.status(500).json({ error: "เกิดข้อผิดพลาด", detail: err.message });
  }
}

// POST /api/service-orders
async function createServiceOrder(req, res) {
  try {
    await ensureColumns();
    const f = fields(req.body, await loginName(req));
    const serviceNo = (req.body.service_no || "").trim() || (await nextServiceNo());
    const cols = COLS.split(",").map((c) => c.trim()).filter(Boolean);
    const holders = cols.map((_, i) => `$${i + 2}`).join(",");

    const { rows } = await pool.query(
      `INSERT INTO service_orders (service_no, ${cols.join(", ")}, status)
       VALUES ($1, ${holders}, 'received') RETURNING *`,
      [serviceNo, ...values(f)]
    );
    res.status(201).json(shape(rows[0]));
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "รหัสใบสั่งซ่อมนี้ถูกใช้ไปแล้ว" });
    console.error(err);
    res.status(500).json({ error: "ไม่สามารถสร้างใบสั่งซ่อมได้", detail: err.message });
  }
}

// PUT /api/service-orders/:id
async function updateServiceOrder(req, res) {
  try {
    await ensureColumns();
    const f = fields(req.body, await loginName(req));
    const cols = COLS.split(",").map((c) => c.trim()).filter(Boolean);
    const sets = cols.map((c, i) => `${c} = $${i + 2}`).join(", ");
    const params = [req.params.id, ...values(f)];

    let sql = `UPDATE service_orders SET ${sets}`;
    const serviceNo = (req.body.service_no || "").trim();
    if (serviceNo) { params.push(serviceNo); sql += `, service_no = $${params.length}`; }
    sql += " WHERE id = $1 RETURNING *";

    const { rows } = await pool.query(sql, params);
    if (!rows[0]) return res.status(404).json({ error: "ไม่พบใบสั่งซ่อม" });
    res.json(shape(rows[0]));
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "รหัสใบสั่งซ่อมนี้ถูกใช้ไปแล้ว" });
    console.error(err);
    res.status(500).json({ error: "ไม่สามารถแก้ไขใบสั่งซ่อมได้", detail: err.message });
  }
}

async function deleteServiceOrder(req, res) {
  try {
    const { rowCount } = await pool.query("DELETE FROM service_orders WHERE id = $1", [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: "ไม่พบใบสั่งซ่อม" });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "ไม่สามารถลบใบสั่งซ่อมได้" });
  }
}

async function updateServiceStatus(req, res) {
  const { status } = req.body;
  try {
    const { rows } = await pool.query(
      "UPDATE service_orders SET status = $1 WHERE id = $2 RETURNING *",
      [status, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "ไม่พบใบสั่งซ่อม" });
    res.json(shape(rows[0]));
  } catch (err) {
    res.status(500).json({ error: "ไม่สามารถอัพเดตสถานะได้", detail: err.message });
  }
}

module.exports = {
  listServiceOrders, getServiceOrder, createServiceOrder, updateServiceOrder,
  peekNextServiceNo, updateServiceStatus, deleteServiceOrder,
};
