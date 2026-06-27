// ═══════════════════════════════════════════════════════════════
// server.js — Entry point ของ Anakyn Gems Backend API
// ═══════════════════════════════════════════════════════════════
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const app = express();

// ── CORS: อนุญาตเว็บ live (Vercel) + dev (localhost) + ค่าใน env ──
// เดิมตั้ง origin = FRONTEND_URL เดี่ยวๆ (localhost) ทำให้เว็บ production โดน CORS บล็อก → โหลดข้อมูลไม่ได้
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:8081",
  "https://dist-tau-eight-30.vercel.app",
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // ไม่มี origin = แอป native / server-to-server / curl → อนุญาต
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    // เผื่อ deploy ใหม่บน Vercel ที่ลงท้าย .vercel.app
    try { if (/\.vercel\.app$/.test(new URL(origin).hostname)) return cb(null, true); } catch (_) {}
    return cb(null, false);
  },
}));
app.use(express.json());
app.use(morgan("dev"));

// ── Routes ──
app.use("/api/auth",            require("./routes/auth"));
app.use("/api/products",        require("./routes/products"));
app.use("/api/sales",           require("./routes/sales"));
app.use("/api/invoices",        require("./routes/invoices"));
app.use("/api/quotations",      require("./routes/quotations"));
app.use("/api/purchase-orders", require("./routes/purchaseOrders"));
app.use("/api/service-orders",  require("./routes/serviceOrders"));
app.use("/api/partners",        require("./routes/partners"));
app.use("/api/customers",       require("./routes/customers"));
app.use("/api/suppliers",       require("./routes/suppliers"));
app.use("/api/users",           require("./routes/users"));
app.use("/api/summary",         require("./routes/summary"));

app.get("/api/health", (req, res) => res.json({ status: "ok", time: new Date() }));

// Error handler กลาง
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "เกิดข้อผิดพลาดที่ไม่คาดคิดในระบบ" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Anakyn Gems API running on http://localhost:${PORT}`);
});
