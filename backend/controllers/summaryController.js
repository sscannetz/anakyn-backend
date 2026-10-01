// ═══════════════════════════════════════════════════════════════
// summaryController.js — สรุปยอดสำหรับหน้า Summary / Home Dashboard
// ═══════════════════════════════════════════════════════════════
const pool = require("../config/db");
const { ensureSaleItemColumns } = require("../utils/saleItemColumns");

// GET /api/summary?period=month          (period: today|week|month|year)
// GET /api/summary?from=2026-09-01&to=2026-09-30   ← เลือกช่วงวันที่เองได้ (รวมวันสุดท้าย)
async function getSummary(req, res) {
  const period = req.query.period || "month";
  const intervalMap = { today: "1 day", week: "7 days", month: "1 month", year: "1 year" };
  const interval = intervalMap[period] || "1 month";

  // ── ช่วงเวลาที่ใช้คิดยอด ─────────────────────────────────────
  // ส่ง from/to (YYYY-MM-DD) มา → ใช้ช่วงวันที่นั้น (นับวันสุดท้ายเต็มวัน)
  // ไม่ส่งมา → ใช้ period เดิมแบบย้อนหลังจากวันนี้ (ของเดิม ไม่เปลี่ยนพฤติกรรม)
  const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ""));
  let from = isDate(req.query.from) ? req.query.from : null;
  let to   = isDate(req.query.to)   ? req.query.to   : null;
  if (from && to && from > to) { const t = from; from = to; to = t; }   // สลับให้ถ้าใส่กลับด้าน
  const useRange = !!(from && to);
  const params = useRange ? [from, to] : [interval];
  // คอลัมน์วันที่ของแต่ละตารางไม่เหมือนกัน จึงรับชื่อคอลัมน์เข้ามา
  const inRange = (col) => useRange
    ? `${col} >= $1::date AND ${col} < ($2::date + interval '1 day')`
    : `${col} >= now() - $1::interval`;

  // ── ยอดที่ใช้คิดกำไร ─────────────────────────────────────────
  // line_net     = ราคาหลังหักส่วนลดที่ปันลงรายชิ้นแล้ว (ถ้าไม่ปัน กำไรจะเกินจริง)
  // cost_at_sale = ต้นทุน ณ วันขาย (ถ้าไปดึงจาก products กำไรบิลเก่าจะเปลี่ยนย้อนหลัง
  //                เมื่อมีการแก้ต้นทุนสินค้า เช่นตอนราคาทองขึ้น)
  // ถ้าคอลัมน์ยังสร้างไม่สำเร็จ ถอยไปใช้สูตรเดิม — รายงานต้องขึ้นเสมอ ห้ามพังทั้งหน้า
  const hasProfitCols = await ensureSaleItemColumns();
  const NET  = hasProfitCols ? "COALESCE(si.line_net, si.line_total)"     : "si.line_total";
  const COST = hasProfitCols ? "COALESCE(si.cost_at_sale, p.cost_price)"  : "p.cost_price";

  try {
    const sales = await pool.query(
      `SELECT COALESCE(SUM(total),0) AS total_sales, COUNT(*) AS order_count,
              COALESCE(SUM(vat_amount),0) AS vat_collected
       FROM sales WHERE ${inRange("sold_at")} AND status = 'completed'`,
      params
    );

    // stock_count  = จำนวน "รายการ" สินค้าที่เปิดขายอยู่
    // total_pieces = จำนวน "ชิ้น" รวมทุกรายการในร้าน (รวมที่ปิดขายด้วย)
    // total_items  = จำนวนรายการสินค้าทั้งหมดในร้าน
    const stockCount = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE is_available = true)        AS stock_count,
         COUNT(*)                                           AS total_items,
         COALESCE(SUM(stock_qty), 0)                        AS total_pieces
       FROM products`
    );

    const pendingPO = await pool.query(
      "SELECT COUNT(*) AS cnt FROM purchase_orders WHERE status = 'pending'"
    );

    const pendingService = await pool.query(
      "SELECT COUNT(*) AS cnt FROM service_orders WHERE status NOT IN ('picked_up')"
    );

    const pendingQuotation = await pool.query(
      "SELECT COUNT(*) AS cnt FROM quotations WHERE status = 'pending'"
    );

    // ใบสั่งทำที่ยังไม่ส่งมอบ (สถานะ: ordered | in_production | qc | delivered)
    // .catch กัน DB ที่ยังไม่ได้รัน migration ใบสั่งทำ — รายงานทั้งหน้าต้องไม่พังเพราะตัวเลขเดียว
    const pendingWork = await pool.query(
      "SELECT COUNT(*) AS cnt FROM work_orders WHERE status <> 'delivered'"
    ).catch(() => ({ rows: [{ cnt: 0 }] }));

    // ต้นทุนรวม + กำไร (= ยอดขายไม่รวม VAT − ต้นทุน) จากคิวรีเดียว
    const profitEstimate = await pool.query(
      `SELECT COALESCE(SUM(${NET} - ${COST} * si.qty), 0) AS profit,
              COALESCE(SUM(${COST} * si.qty), 0)          AS cost
       FROM sale_items si
       LEFT JOIN products p ON p.id = si.product_id
       JOIN sales s ON s.id = si.sale_id
       WHERE ${inRange("s.sold_at")} AND s.status = 'completed'`,
      params
    );

    // สินค้าขายดี (top 5 ตามยอดขายรวมในช่วงเวลานี้)
    const topItems = await pool.query(
      `SELECT p.name, p.sku, SUM(si.qty) AS qty, SUM(${NET}) AS amount
       FROM sale_items si
       JOIN products p ON p.id = si.product_id
       JOIN sales s ON s.id = si.sale_id
       WHERE ${inRange("s.sold_at")} AND s.status = 'completed'
       GROUP BY p.id, p.name, p.sku
       ORDER BY amount DESC LIMIT 5`,
      params
    );

    // รายงานยอดขายฉบับเต็ม (ทุกรายการที่ขายได้ในช่วงนี้) — ใช้ในไฟล์ PDF
    // หน้าจอยังใช้ top_items (5 อันดับ) เหมือนเดิม จะได้ไม่ยาวเกินไป
    const salesItems = await pool.query(
      `SELECT p.name, p.sku, SUM(si.qty) AS qty, SUM(${NET}) AS amount
       FROM sale_items si
       JOIN products p ON p.id = si.product_id
       JOIN sales s ON s.id = si.sale_id
       WHERE ${inRange("s.sold_at")} AND s.status = 'completed'
       GROUP BY p.id, p.name, p.sku
       ORDER BY amount DESC`,
      params
    );

    // รายบรรทัดขาย — 1 บรรทัด = สินค้า 1 รายการในบิล 1 ใบ (เลขที่บิลซ้ำกันได้)
    // หน้าสรุปรายงานเอาไปโชว์แยกบรรทัด ไม่รวมยอดข้ามบิลแล้ว
    const saleLines = await pool.query(
      `SELECT s.sale_no, s.sold_at, p.name, p.sku, si.qty, ${NET} AS amount
       FROM sale_items si
       JOIN products p ON p.id = si.product_id
       JOIN sales s ON s.id = si.sale_id
       WHERE ${inRange("s.sold_at")} AND s.status = 'completed'
       ORDER BY amount DESC`,
      params
    );

    // สัดส่วนช่องทางชำระเงิน (payment_methods เป็น JSONB array [{method,amount}])
    const paymentRows = await pool.query(
      `SELECT payment_methods FROM sales
       WHERE ${inRange("sold_at")} AND status = 'completed'`,
      params
    );
    const paymentTotals = {};
    for (const row of paymentRows.rows) {
      const methods = Array.isArray(row.payment_methods) ? row.payment_methods : [];
      for (const m of methods) {
        paymentTotals[m.method] = (paymentTotals[m.method] || 0) + Number(m.amount || 0);
      }
    }

    // ยอดขายรายวัน 7 วันล่าสุด (สำหรับกราฟแท่ง) — เติมวันที่ไม่มียอดขายด้วย 0 เสมอ ให้ได้ 7 แท่งครบทุกครั้ง
    const dailyChart = await pool.query(
      `SELECT to_char(d.day, 'YYYY-MM-DD') AS day, COALESCE(SUM(s.total), 0) AS total
       FROM generate_series(
              (now() - interval '6 days')::date,
              now()::date,
              interval '1 day'
            ) AS d(day)
       LEFT JOIN sales s
              ON s.sold_at::date = d.day AND s.status = 'completed'
       GROUP BY d.day
       ORDER BY d.day ASC`
    );

    res.json({
      period: useRange ? "range" : period,
      from: useRange ? from : null,
      to:   useRange ? to   : null,
      total_sales: Number(sales.rows[0].total_sales),
      order_count: Number(sales.rows[0].order_count),
      vat_collected: Number(sales.rows[0].vat_collected),
      stock_count: Number(stockCount.rows[0].stock_count),
      total_items: Number(stockCount.rows[0].total_items),
      total_pieces: Number(stockCount.rows[0].total_pieces),
      pending_po: Number(pendingPO.rows[0].cnt),
      pending_service: Number(pendingService.rows[0].cnt),
      pending_quotation: Number(pendingQuotation.rows[0].cnt),
      pending_work: Number(pendingWork.rows[0].cnt),
      // ต้นทุนรวมของสินค้าที่ขายได้ในช่วงนี้ (กำไร = ยอดขายไม่รวม VAT − ต้นทุนรวม)
      total_cost: Number(profitEstimate.rows[0].cost),
      // กำไรคำนวณจากราคาขายที่ยังไม่รวม VAT (VAT บวกเพิ่มบนบิล ไม่ใช่รายได้ร้าน)
      // profit_incl_vat = กำไร + VAT ที่เก็บมา = เงินส่วนเกินที่รับเข้าจริงก่อนนำส่ง VAT
      estimated_profit: Number(profitEstimate.rows[0].profit),
      profit_incl_vat: Number(profitEstimate.rows[0].profit) + Number(sales.rows[0].vat_collected),
      top_items: topItems.rows.map(r => ({ name: r.name, sku: r.sku, qty: Number(r.qty), amount: Number(r.amount) })),
      sales_items: salesItems.rows.map(r => ({ name: r.name, sku: r.sku, qty: Number(r.qty), amount: Number(r.amount) })),
      sale_lines: saleLines.rows.map(r => ({
        sale_no: r.sale_no, sold_at: r.sold_at, name: r.name, sku: r.sku,
        qty: Number(r.qty), amount: Number(r.amount),
      })),
      payment_breakdown: paymentTotals,
      daily_chart: dailyChart.rows.map(r => ({ day: r.day, total: Number(r.total) })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ไม่สามารถโหลดข้อมูลสรุปได้" });
  }
}

module.exports = { getSummary };
