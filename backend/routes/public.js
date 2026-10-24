// ═══════════════════════════════════════════════════════════════
// public.js routes — /api/public/*  (เว็บร้าน otw2you ใช้ ไม่ต้องล็อกอิน)
// ═══════════════════════════════════════════════════════════════
const express = require("express");
const router = express.Router();
const { listPublicProducts, getPublicProduct } = require("../controllers/publicCatalogController");

router.get("/products", listPublicProducts);
router.get("/products/:id", getPublicProduct);

module.exports = router;
