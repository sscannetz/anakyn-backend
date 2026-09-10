// ═══════════════════════════════════════════════════════════════
// payments.js routes — /api/payments/*
// ═══════════════════════════════════════════════════════════════
const express = require("express");
const router = express.Router();
const { requireAuth, requireRole } = require("../middleware/auth");
const { createPromptPay, getPayment } = require("../controllers/paymentController");

// สร้าง QR PromptPay ของบิลนั้น — admin กับ staff เท่านั้น
router.post("/promptpay", requireAuth, requireRole("admin", "staff"), createPromptPay);

// ถามสถานะ (แอปเรียกวนทุก 3 วิ ระหว่างรอลูกค้าจ่าย)
router.get("/:id", requireAuth, getPayment);

module.exports = router;
