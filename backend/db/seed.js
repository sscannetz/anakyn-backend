// ═══════════════════════════════════════════════════════════════
// seed.js — เติมข้อมูลตัวอย่าง (จำลองจาก mock data ในหน้า UI)
// รัน: npm run seed
// ═══════════════════════════════════════════════════════════════
require("dotenv").config();
const bcrypt = require("bcryptjs");
const pool = require("../config/db");

async function seed() {
  console.log("⏳ กำลังเติมข้อมูลตัวอย่าง ...");
  try {
    // ── Users ──
    const adminPass = await bcrypt.hash("admin1234", 10);
    const staffPass = await bcrypt.hash("staff1234", 10);

    const admin = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role, permissions)
       VALUES ('admin@anakyngems.com', $1, 'คุณอนกิน เพชรดี', 'admin',
       '["sale","stock","doc","crm","report","finance","setting","user"]')
       RETURNING id`, [adminPass]
    );
    const staff = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role, permissions)
       VALUES ('staff@anakyngems.com', $1, 'คุณสมศรี ขายดี', 'staff', '["sale","stock","doc"]')
       RETURNING id`, [staffPass]
    );

    // ── Partner ──
    const partnerPass = await bcrypt.hash("partner1234", 10);
    const partner = await pool.query(
      `INSERT INTO partners (ref_code, email, password_hash, full_name, phone, level, comm_rate_pct)
       VALUES ('PTN-2024-0042', 'partner@example.com', $1, 'คุณสมชัย ทองดี', '0812345678', 'gold', 4.00)
       RETURNING id`, [partnerPass]
    );

    // ── Customers ──
    const cust1 = await pool.query(
      `INSERT INTO customers (full_name, phone, is_vip, vip_discount_pct)
       VALUES ('คุณสมศรี', '0891112222', true, 5) RETURNING id`
    );
    const cust2 = await pool.query(
      `INSERT INTO customers (full_name, phone, is_vip)
       VALUES ('คุณมาลี', '0892223333', false) RETURNING id`
    );

    // ── Suppliers ──
    const supplier1 = await pool.query(
      `INSERT INTO suppliers (name, phone) VALUES ('Diamond House Co.', '021234567') RETURNING id`
    );

    // ── Products (ราคาทอง/เงิน ตามที่กรอกในหน้า AddStock) ──
    const goldPrice = 67300;
    const silverPrice = 33.50;

    const products = [
      ["ANAKYN#0143", "แหวนเพชร Solitaire 0.5ct", "ring", "18K", 3.8, "Round Brilliant", "F", "VVS1", 0.5, true, "GIA-2141592653", 38000, 55000, 1, 4],
      ["ANAKYN#0201", "สร้อยคอเพชร Tennis 1ct", "necklace", "18K", 8.2, "Round Brilliant", "G", "VS2", 1.0, true, "GIA-2141592654", 48000, 65000, 1, 4],
      ["ANAKYN#0071", "ต่างหูเพชร Princess 0.3ct", "earring", "18K", 2.2, "Princess Cut", "F", "VS1", 0.3, false, null, 13000, 18500, 3, 4],
      ["ANAKYN#0088", "กำไลเพชร Eternity 1ct", "bracelet", "18K", 8.0, "Round Brilliant", "H", "VS2", 1.0, true, "GIA-2141592655", 62000, 88000, 1, 4],
    ];

    for (const p of products) {
      await pool.query(
        `INSERT INTO products
          (sku, name, category, metal_type, weight_g, gem_shape, gem_color, gem_clarity, gem_carat,
           has_certificate, certificate_no, cost_price, sale_price, stock_qty, partner_commission_pct,
           gold_price_at_creation, silver_price_at_creation, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
        [...p, goldPrice, silverPrice, admin.rows[0].id]
      );
    }

    console.log("✅ เติมข้อมูลตัวอย่างสำเร็จ");
    console.log("\n── บัญชีทดสอบ ──");
    console.log("Admin   : admin@anakyngems.com   / admin1234");
    console.log("Staff   : staff@anakyngems.com   / staff1234");
    console.log("Partner : partner@example.com    / partner1234");
  } catch (err) {
    console.error("❌ Seed ล้มเหลว:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
