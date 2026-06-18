// ═══════════════════════════════════════════════════════════════
// partnerController.js — Dashboard, ค่าคอม, สถิติของ Partner
// ═══════════════════════════════════════════════════════════════
const pool = require("../config/db");

// GET /api/partners/me/dashboard  (ใช้ req.user.id จาก JWT ของ Partner)
async function getDashboard(req, res) {
  const partnerId = req.user.id;
  try {
    const partner = await pool.query("SELECT * FROM partners WHERE id = $1", [partnerId]);
    if (!partner.rows[0]) return res.status(404).json({ error: "ไม่พบข้อมูล Partner" });

    const stats = await pool.query(
      `SELECT
        COALESCE(SUM(s.total), 0) AS total_sales,
        COALESCE(SUM(c.amount), 0) AS total_commission,
        COALESCE(SUM(c.amount) FILTER (WHERE c.status = 'pending'), 0) AS pending_commission,
        COALESCE(SUM(c.amount) FILTER (WHERE c.status = 'paid'), 0) AS paid_commission,
        COUNT(DISTINCT s.id) AS order_count
       FROM commissions c
       JOIN sales s ON s.id = c.sale_id
       WHERE c.partner_id = $1`,
      [partnerId]
    );

    const recentOrders = await pool.query(
      `SELECT s.sale_no, s.total, s.sold_at, c.amount AS commission, c.status,
              cu.full_name AS customer_name
       FROM commissions c
       JOIN sales s ON s.id = c.sale_id
       LEFT JOIN customers cu ON cu.id = s.customer_id
       WHERE c.partner_id = $1
       ORDER BY s.sold_at DESC LIMIT 10`,
      [partnerId]
    );

    res.json({
      partner: partner.rows[0],
      stats: stats.rows[0],
      recent_orders: recentOrders.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ไม่สามารถโหลดข้อมูล Dashboard ได้" });
  }
}

// GET /api/partners  (admin ดูรายชื่อ partner ทั้งหมด)
async function listPartners(req, res) {
  try {
    const { rows } = await pool.query("SELECT * FROM partners ORDER BY created_at DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "ไม่สามารถโหลดรายชื่อ Partner ได้" });
  }
}

// PATCH /api/partners/:id/commission-paid  — แอดมินกดยืนยันจ่ายค่าคอม
async function markCommissionsPaid(req, res) {
  try {
    const { rows } = await pool.query(
      `UPDATE commissions SET status = 'paid', paid_at = now()
       WHERE partner_id = $1 AND status IN ('pending','confirmed') RETURNING *`,
      [req.params.id]
    );
    res.json({ message: `จ่ายค่าคอมแล้ว ${rows.length} รายการ`, items: rows });
  } catch (err) {
    res.status(500).json({ error: "ไม่สามารถอัพเดตสถานะค่าคอมได้" });
  }
}

module.exports = { getDashboard, listPartners, markCommissionsPaid };
