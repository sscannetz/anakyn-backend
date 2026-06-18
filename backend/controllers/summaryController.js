// ═══════════════════════════════════════════════════════════════
// summaryController.js — สรุปยอดสำหรับหน้า Summary / Home Dashboard
// ═══════════════════════════════════════════════════════════════
const pool = require("../config/db");

// GET /api/summary?period=month   (period: today|week|month|year)
async function getSummary(req, res) {
  const period = req.query.period || "month";
  const intervalMap = { today: "1 day", week: "7 days", month: "1 month", year: "1 year" };
  const interval = intervalMap[period] || "1 month";

  try {
    const sales = await pool.query(
      `SELECT COALESCE(SUM(total),0) AS total_sales, COUNT(*) AS order_count,
              COALESCE(SUM(vat_amount),0) AS vat_collected
       FROM sales WHERE sold_at >= now() - $1::interval AND status = 'completed'`,
      [interval]
    );

    const stockCount = await pool.query(
      "SELECT COUNT(*) AS stock_count FROM products WHERE is_available = true"
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

    const profitEstimate = await pool.query(
      `SELECT COALESCE(SUM(si.line_total - p.cost_price * si.qty), 0) AS profit
       FROM sale_items si
       JOIN products p ON p.id = si.product_id
       JOIN sales s ON s.id = si.sale_id
       WHERE s.sold_at >= now() - $1::interval AND s.status = 'completed'`,
      [interval]
    );

    // สินค้าขายดี (top 5 ตามยอดขายรวมในช่วงเวลานี้)
    const topItems = await pool.query(
      `SELECT p.name, p.sku, SUM(si.qty) AS qty, SUM(si.line_total) AS amount
       FROM sale_items si
       JOIN products p ON p.id = si.product_id
       JOIN sales s ON s.id = si.sale_id
       WHERE s.sold_at >= now() - $1::interval AND s.status = 'completed'
       GROUP BY p.id, p.name, p.sku
       ORDER BY amount DESC LIMIT 5`,
      [interval]
    );

    // สัดส่วนช่องทางชำระเงิน (payment_methods เป็น JSONB array [{method,amount}])
    const paymentRows = await pool.query(
      `SELECT payment_methods FROM sales
       WHERE sold_at >= now() - $1::interval AND status = 'completed'`,
      [interval]
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
      period,
      total_sales: Number(sales.rows[0].total_sales),
      order_count: Number(sales.rows[0].order_count),
      vat_collected: Number(sales.rows[0].vat_collected),
      stock_count: Number(stockCount.rows[0].stock_count),
      pending_po: Number(pendingPO.rows[0].cnt),
      pending_service: Number(pendingService.rows[0].cnt),
      pending_quotation: Number(pendingQuotation.rows[0].cnt),
      estimated_profit: Number(profitEstimate.rows[0].profit),
      top_items: topItems.rows.map(r => ({ name: r.name, sku: r.sku, qty: Number(r.qty), amount: Number(r.amount) })),
      payment_breakdown: paymentTotals,
      daily_chart: dailyChart.rows.map(r => ({ day: r.day, total: Number(r.total) })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ไม่สามารถโหลดข้อมูลสรุปได้" });
  }
}

module.exports = { getSummary };
