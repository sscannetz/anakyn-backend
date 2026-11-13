// ═══════════════════════════════════════════════════════════════
// receiptController.js — ใบเสร็จรับเงิน (ออกจากการขายที่มีอยู่)
// ═══════════════════════════════════════════════════════════════
const pool = require("../config/db");
const { nextHashNumber } = require("../utils/docNumber");
const { ensureSaleItemColumns } = require("../utils/saleItemColumns");

// ── แปลงเป็นตัวเลขแบบปลอดภัย (กัน NaN ที่ Postgres NUMERIC เก็บได้) ──
function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// ── sanitize: กัน NaN + alias grand_total ให้แอป Expo อ่านได้เหมือนเอกสารอื่น ──
function sanitizeReceipt(row) {
  const amount = toNum(row.amount) ?? toNum(row.total) ?? 0;
  // ส่วนลดมาจากบิลขาย (NUMERIC ของ pg ส่งมาเป็น string) — แปลงเป็นตัวเลขให้ใบเสร็จเอาไปโชว์
  return {
    ...row, amount, grand_total: amount, total: amount,
    subtotal:       toNum(row.subtotal) ?? 0,
    vip_discount:   toNum(row.vip_discount) ?? 0,
    extra_discount: toNum(row.extra_discount) ?? 0,
    vat_amount:     toNum(row.vat_amount) ?? 0,
  };
}

async function listReceipts(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT r.*, s.sale_no, s.total, s.subtotal, s.vip_discount, s.extra_discount, s.vat_amount,
              c.full_name AS customer_name
       FROM receipts r
       LEFT JOIN sales s ON s.id = r.sale_id
       LEFT JOIN customers c ON c.id = s.customer_id
       ORDER BY r.issued_at DESC`
    );
    res.json(rows.map(sanitizeReceipt));
  } catch (err) {
    res.status(500).json({ error: "ไม่สามารถโหลดรายการใบเสร็จได้" });
  }
}

// โหลดใบเสร็จพร้อมรายการสินค้า (ใช้ทั้งหน้าดูรายละเอียด และส่งกลับหลังแก้ไข)
async function loadReceipt(db, id) {
  const { rows } = await db.query(
    `SELECT r.*, s.sale_no, s.total, s.subtotal, s.vip_discount, s.extra_discount, s.vat_amount,
            s.vat_enabled, s.total AS sale_total, c.full_name AS customer_name, c.phone
     FROM receipts r
     LEFT JOIN sales s ON s.id = r.sale_id
     LEFT JOIN customers c ON c.id = s.customer_id
     WHERE r.id = $1`,
    [id]
  );
  if (!rows[0]) return null;
  // ดึงรายการสินค้าจากการขาย เพื่อแสดงในรายละเอียด/ปริ้น (product_id ใช้ตอนแก้ไขใบเสร็จ)
  const items = await db.query(
    `SELECT si.product_id, si.qty, si.unit_price, si.line_total, p.name AS product_name, p.sku
     FROM sale_items si LEFT JOIN products p ON p.id = si.product_id
     WHERE si.sale_id = $1`,
    [rows[0].sale_id]
  );
  // sanitizeReceipt เขียนทับ total ด้วยยอดใบเสร็จ — ยอดบิลขายจริงส่งแยกเป็น sale_total
  return { ...sanitizeReceipt({ ...rows[0], items: items.rows }), sale_total: toNum(rows[0].sale_total) };
}

async function getReceipt(req, res) {
  try {
    const rc = await loadReceipt(pool, req.params.id);
    if (!rc) return res.status(404).json({ error: "ไม่พบใบเสร็จ" });
    res.json(rc);
  } catch (err) {
    res.status(500).json({ error: "เกิดข้อผิดพลาด" });
  }
}

// POST /api/receipts { sale_id, amount?, payment_method?, note? }
// ถ้าไม่ส่ง amount มา ใช้ยอด total ของการขายนั้น
async function createReceipt(req, res) {
  const { sale_id, amount, payment_method = "cash", note = "" } = req.body;
  if (!sale_id) return res.status(400).json({ error: "กรุณาระบุรายการขายที่จะออกใบเสร็จ" });

  try {
    const sale = await pool.query("SELECT * FROM sales WHERE id = $1", [sale_id]);
    if (!sale.rows[0]) return res.status(404).json({ error: "ไม่พบรายการขายนี้" });

    const amt = toNum(amount) ?? toNum(sale.rows[0].total) ?? 0;
    const receiptNo = await nextHashNumber("receipts", "receipt_no", "Receipt");

    const { rows } = await pool.query(
      `INSERT INTO receipts (receipt_no, sale_id, amount, payment_method, note, issued_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [receiptNo, sale_id, amt, payment_method, note, req.user.id]
    );
    // ส่งส่วนลด/ยอดก่อนส่วนลดของบิลกลับไปด้วย เผื่อหน้าจอสั่งปริ้นต่อทันทีโดยไม่ได้โหลดใบเสร็จใหม่
    const sl = sale.rows[0];
    res.status(201).json(sanitizeReceipt({
      ...rows[0], sale_no: sl.sale_no,
      subtotal: sl.subtotal, vip_discount: sl.vip_discount,
      extra_discount: sl.extra_discount, vat_amount: sl.vat_amount,
    }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ไม่สามารถออกใบเสร็จได้" });
  }
}

// PATCH /api/receipts/:id — แก้ไขใบเสร็จ
// body (ส่งเฉพาะช่องที่แก้):
//   ของใบเสร็จ : issued_at (YYYY-MM-DD), payment_method, note, amount
//   ของบิลขาย  : customer_name, customer_phone, items:[{product_id,qty,unit_price}],
//                vip_discount, extra_discount
// ส่วนที่เป็นของบิลขายจะแก้ที่บิลขายต้นทางด้วย (ยอดขาย/สต๊อก/ค่าคอมที่ยังไม่จ่ายตามไปด้วย)
// ★ ใบกำกับภาษีที่ออกไปแล้วเก็บยอดของตัวเองไว้ จะไม่เปลี่ยนตาม
const PAY_KEYS = ["cash", "transfer", "card", "other"];

async function updateReceipt(req, res) {
  const b = req.body || {};
  const has = (k) => Object.prototype.hasOwnProperty.call(b, k);
  const r2 = (n) => Math.round(n * 100) / 100;

  // ── ตรวจค่าก่อนเปิด transaction ──
  if (has("payment_method") && !PAY_KEYS.includes(b.payment_method)) {
    return res.status(400).json({ error: "ช่องทางชำระเงินไม่ถูกต้อง" });
  }
  if (has("issued_at") && !/^\d{4}-\d{2}-\d{2}$/.test(String(b.issued_at || ""))) {
    return res.status(400).json({ error: "วันที่ไม่ถูกต้อง (รูปแบบ ปปปป-ดด-วว)" });
  }
  if (has("amount") && !(toNum(b.amount) >= 0)) {
    return res.status(400).json({ error: "จำนวนเงินไม่ถูกต้อง" });
  }
  for (const k of ["vip_discount", "extra_discount"]) {
    if (has(k) && !(toNum(b[k]) >= 0)) return res.status(400).json({ error: "ส่วนลดไม่ถูกต้อง" });
  }
  let items = null;
  if (has("items")) {
    if (!Array.isArray(b.items) || b.items.length === 0) {
      return res.status(400).json({ error: "ใบเสร็จต้องมีสินค้าอย่างน้อย 1 รายการ" });
    }
    items = b.items.map((it) => ({
      product_id: it.product_id, qty: Number(it.qty), unit_price: Number(it.unit_price),
    }));
    if (items.some((it) => !it.product_id || !Number.isInteger(it.qty) || it.qty < 1 || !(it.unit_price >= 0))) {
      return res.status(400).json({ error: "รายการสินค้าไม่ถูกต้อง (จำนวนต้องเป็นเลขเต็ม ≥ 1 และราคา ≥ 0)" });
    }
  }

  const hasProfitCols = await ensureSaleItemColumns();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const rcQ = await client.query("SELECT * FROM receipts WHERE id = $1 FOR UPDATE", [req.params.id]);
    const rc = rcQ.rows[0];
    if (!rc) { await client.query("ROLLBACK"); return res.status(404).json({ error: "ไม่พบใบเสร็จ" }); }

    // ── 1) ช่องของใบเสร็จเอง ──
    const sets = [], vals = [];
    const push = (col, v) => { vals.push(v); sets.push(`${col} = $${vals.length}`); };
    if (has("payment_method")) push("payment_method", b.payment_method);
    if (has("note"))           push("note", String(b.note ?? ""));
    if (has("amount"))         push("amount", toNum(b.amount));
    // เก็บเวลาเดิมไว้ เปลี่ยนแค่วันที่ (ตีความเป็นวันที่เวลาไทย)
    if (has("issued_at")) {
      vals.push(b.issued_at);
      sets.push(`issued_at = (($${vals.length}::date + (issued_at AT TIME ZONE 'Asia/Bangkok')::time) AT TIME ZONE 'Asia/Bangkok')`);
    }
    if (sets.length) {
      vals.push(rc.id);
      await client.query(`UPDATE receipts SET ${sets.join(", ")} WHERE id = $${vals.length}`, vals);
    }

    // ── 2) ช่องของบิลขาย ──
    const touchSale = has("customer_name") || has("customer_phone") || items || has("vip_discount") || has("extra_discount");
    if (touchSale) {
      if (!rc.sale_id) throw new Error("ใบเสร็จนี้ไม่ได้อ้างอิงบิลขาย จึงแก้ลูกค้า/สินค้าไม่ได้");
      const saleQ = await client.query("SELECT * FROM sales WHERE id = $1 FOR UPDATE", [rc.sale_id]);
      const sale = saleQ.rows[0];
      if (!sale) throw new Error("ไม่พบบิลขายที่อ้างอิง");

      // 2a) ลูกค้า — ชื่อเดิม = แก้เบอร์ของลูกค้าคนเดิม · ชื่อใหม่ = หาจากชื่อ ไม่มีก็สร้าง (เหมือนตอนบันทึกขาย)
      if (has("customer_name") || has("customer_phone")) {
        const cur = sale.customer_id
          ? (await client.query("SELECT id, full_name, phone FROM customers WHERE id = $1", [sale.customer_id])).rows[0]
          : null;
        const name = has("customer_name") ? String(b.customer_name || "").trim() : (cur?.full_name || "");
        const phone = has("customer_phone") ? (String(b.customer_phone || "").trim() || null) : undefined;
        let custId = null;
        if (name) {
          if (cur && String(cur.full_name || "").toLowerCase() === name.toLowerCase()) {
            custId = cur.id;
            if (cur.full_name !== name) await client.query("UPDATE customers SET full_name = $1 WHERE id = $2", [name, custId]);
          } else {
            const found = await client.query("SELECT id FROM customers WHERE lower(full_name) = lower($1) LIMIT 1", [name]);
            custId = found.rows[0]?.id
              || (await client.query("INSERT INTO customers (full_name, phone) VALUES ($1,$2) RETURNING id", [name, phone ?? null])).rows[0].id;
          }
          if (phone !== undefined) await client.query("UPDATE customers SET phone = $1 WHERE id = $2", [phone, custId]);
        }
        if (custId !== sale.customer_id) {
          await client.query("UPDATE sales SET customer_id = $1 WHERE id = $2", [custId, sale.id]);
        }
      }

      // 2b) รายการสินค้า / ส่วนลด → คิดยอดบิลใหม่
      if (items || has("vip_discount") || has("extra_discount")) {
        const old = (await client.query(
          "SELECT * FROM sale_items WHERE sale_id = $1", [sale.id]
        )).rows;
        const lines = items || old.map((o) => ({ product_id: o.product_id, qty: Number(o.qty), unit_price: Number(o.unit_price) }));
        const vip   = has("vip_discount")   ? toNum(b.vip_discount)   : (toNum(sale.vip_discount) || 0);
        const extra = has("extra_discount") ? toNum(b.extra_discount) : (toNum(sale.extra_discount) || 0);

        // ปรับสต๊อกเฉพาะส่วนต่าง (ของเดิมคืนเข้า · ของใหม่หักออก)
        if (items) {
          const delta = {};
          for (const o of old)   delta[o.product_id] = (delta[o.product_id] || 0) - Number(o.qty);
          for (const it of lines) delta[it.product_id] = (delta[it.product_id] || 0) + it.qty;
          for (const [pid, d] of Object.entries(delta)) {
            if (d > 0) {
              const r = await client.query(
                `UPDATE products SET stock_qty = stock_qty - $1 WHERE id = $2 AND stock_qty >= $1 RETURNING sku, stock_qty`,
                [d, pid]
              );
              if (!r.rowCount) {
                const p = (await client.query("SELECT sku FROM products WHERE id = $1", [pid])).rows[0];
                throw new Error(p ? `สต๊อกสินค้าไม่พอ (${p.sku})` : "ไม่พบสินค้าที่เลือก");
              }
              if (r.rows[0].stock_qty === 0) await client.query("UPDATE products SET is_available = false WHERE id = $1", [pid]);
            } else if (d < 0) {
              // คืนสต๊อก — ถ้าเดิมหมด (ถูกปิดเพราะขายหมด) ให้กลับมาขายได้
              await client.query(
                `UPDATE products SET is_available = CASE WHEN stock_qty = 0 THEN true ELSE is_available END,
                                     stock_qty = stock_qty + $1 WHERE id = $2`,
                [-d, pid]
              );
            }
          }
        }

        const subtotal = lines.reduce((sum, it) => sum + it.unit_price * it.qty, 0);
        const afterDiscount = subtotal - vip - extra;
        const vatAmount = sale.vat_enabled ? Math.round(afterDiscount * 0.07) : 0;
        const total = afterDiscount + vatAmount;

        // ปันส่วนลดลงรายชิ้น (สูตรเดียวกับตอนบันทึกขาย)
        const gross = lines.map((it) => it.unit_price * it.qty);
        const discTotal = Math.min(Math.max(0, vip + extra), subtotal);
        let discLeft = discTotal;
        const lineDisc = gross.map((g, i) => {
          if (i === gross.length - 1) return r2(discLeft);
          const d = subtotal > 0 ? r2(discTotal * g / subtotal) : 0;
          discLeft = r2(discLeft - d);
          return d;
        });

        // ต้นทุน: สินค้าเดิมใช้ต้นทุนที่ล็อกไว้ตอนขาย · สินค้าที่เพิ่มใหม่ใช้ต้นทุนปัจจุบัน
        const oldCost = {};
        for (const o of old) if (o.cost_at_sale != null) oldCost[o.product_id] = o.cost_at_sale;

        await client.query("DELETE FROM sale_items WHERE sale_id = $1", [sale.id]);
        for (let i = 0; i < lines.length; i++) {
          const it = lines[i];
          if (hasProfitCols) {
            let cost = oldCost[it.product_id];
            if (cost === undefined) {
              cost = (await client.query("SELECT cost_price FROM products WHERE id = $1", [it.product_id])).rows[0]?.cost_price ?? null;
            }
            await client.query(
              `INSERT INTO sale_items
                 (sale_id, product_id, qty, unit_price, line_total, line_discount, line_net, cost_at_sale)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
              [sale.id, it.product_id, it.qty, it.unit_price, gross[i], lineDisc[i], r2(gross[i] - lineDisc[i]), cost]
            );
          } else {
            await client.query(
              `INSERT INTO sale_items (sale_id, product_id, qty, unit_price, line_total) VALUES ($1,$2,$3,$4,$5)`,
              [sale.id, it.product_id, it.qty, it.unit_price, gross[i]]
            );
          }
        }

        await client.query(
          `UPDATE sales SET subtotal = $1, vip_discount = $2, extra_discount = $3, vat_amount = $4, total = $5
           WHERE id = $6`,
          [subtotal, vip, extra, vatAmount, total, sale.id]
        );
        // ค่าคอม Partner ที่ยังไม่จ่าย → คิดใหม่ตามยอดใหม่ (ที่ยืนยัน/จ่ายแล้วไม่แตะ)
        await client.query(
          `UPDATE commissions SET amount = ROUND($1 * comm_pct / 100) WHERE sale_id = $2 AND status = 'pending'`,
          [total, sale.id]
        );
      }
    }

    await client.query("COMMIT");
    res.json(await loadReceipt(pool, rc.id));
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error(err);
    // 22P02 = รหัส UUID ผิดรูปแบบ · 23503 = อ้างสินค้าที่ไม่มีอยู่
    const msg = err.code === "22P02" || err.code === "23503" ? "ไม่พบสินค้าที่เลือก" : (err.code ? "ไม่สามารถแก้ไขใบเสร็จได้" : err.message);
    res.status(400).json({ error: msg || "ไม่สามารถแก้ไขใบเสร็จได้" });
  } finally {
    client.release();
  }
}

// DELETE /api/receipts/:id — ลบใบเสร็จ
async function deleteReceipt(req, res) {
  try {
    const { rowCount } = await pool.query("DELETE FROM receipts WHERE id = $1", [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: "ไม่พบใบเสร็จ" });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "ไม่สามารถลบใบเสร็จได้" });
  }
}

module.exports = { listReceipts, getReceipt, createReceipt, updateReceipt, deleteReceipt };
