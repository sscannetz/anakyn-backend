const express = require("express");
const router = express.Router();
const { requireAuth, requireRole } = require("../middleware/auth");
const { getDashboard, listPartners, markCommissionsPaid } = require("../controllers/partnerController");

router.get("/me/dashboard", requireAuth, requireRole("partner"), getDashboard);
router.get("/", requireAuth, requireRole("admin"), listPartners);
router.patch("/:id/commission-paid", requireAuth, requireRole("admin"), markCommissionsPaid);

module.exports = router;
