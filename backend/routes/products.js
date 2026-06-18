// ═══════════════════════════════════════════════════════════════
// products.js routes — /api/products/*
// ═══════════════════════════════════════════════════════════════
const express = require("express");
const router = express.Router();
const { requireAuth, requireRole } = require("../middleware/auth");
const {
  listProducts, getProduct, createProduct, updateProduct, deleteProduct,
} = require("../controllers/productController");

// Partner ก็ดูสต๊อกได้ (แต่ระบบจะซ่อน cost_price ให้อัตโนมัติผ่าน query param)
router.get("/", requireAuth, listProducts);
router.get("/:id", requireAuth, getProduct);

// เพิ่ม/แก้ไข/ลบ — admin กับ staff เท่านั้น
router.post("/", requireAuth, requireRole("admin", "staff"), createProduct);
router.put("/:id", requireAuth, requireRole("admin", "staff"), updateProduct);
router.delete("/:id", requireAuth, requireRole("admin"), deleteProduct);

module.exports = router;
