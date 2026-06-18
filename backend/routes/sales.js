// ═══════════════════════════════════════════════════════════════
// sales.js routes — /api/sales/*
// ═══════════════════════════════════════════════════════════════
const express = require("express");
const router = express.Router();
const { requireAuth, requireRole } = require("../middleware/auth");
const { listSales, getSale, createSale } = require("../controllers/saleController");

router.get("/", requireAuth, listSales);
router.get("/:id", requireAuth, getSale);
router.post("/", requireAuth, requireRole("admin", "staff"), createSale);

module.exports = router;
