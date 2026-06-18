const express = require("express");
const router = express.Router();
const { requireAuth, requireRole } = require("../middleware/auth");
const {
  listQuotations, getQuotation, createQuotation, updateQuotationStatus, updateQuotation,
} = require("../controllers/quotationController");

router.get("/", requireAuth, listQuotations);
router.get("/:id", requireAuth, getQuotation);
router.post("/", requireAuth, requireRole("admin", "staff"), createQuotation);
router.patch("/:id/status", requireAuth, requireRole("admin", "staff"), updateQuotationStatus);
router.patch("/:id", requireAuth, requireRole("admin", "staff"), updateQuotation);

module.exports = router;
