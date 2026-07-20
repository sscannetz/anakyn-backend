const express = require("express");
const router = express.Router();
const { requireAuth, requireRole } = require("../middleware/auth");
const {
  listServiceOrders, getServiceOrder, createServiceOrder, updateServiceStatus, deleteServiceOrder,
} = require("../controllers/serviceOrderController");

router.get("/", requireAuth, listServiceOrders);
router.get("/:id", requireAuth, getServiceOrder);
router.post("/", requireAuth, requireRole("admin", "staff"), createServiceOrder);
router.patch("/:id/status", requireAuth, requireRole("admin", "staff"), updateServiceStatus);
router.delete("/:id", requireAuth, requireRole("admin", "staff"), deleteServiceOrder);

module.exports = router;
