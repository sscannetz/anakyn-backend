const express = require("express");
const router = express.Router();
const { requireAuth, requireRole } = require("../middleware/auth");
const { listPOs, getPO, createPO, updatePOStatus } = require("../controllers/purchaseOrderController");

router.get("/", requireAuth, listPOs);
router.get("/:id", requireAuth, getPO);
router.post("/", requireAuth, requireRole("admin", "staff"), createPO);
router.patch("/:id/status", requireAuth, requireRole("admin", "staff"), updatePOStatus);

module.exports = router;
