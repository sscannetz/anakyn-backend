const express = require("express");
const router = express.Router();
const { requireAuth, requireRole } = require("../middleware/auth");
const {
  listWorkOrders, getWorkOrder, createWorkOrder,
  updateWorkOrderStatus, deleteWorkOrder, workItemToStock,
} = require("../controllers/workOrderController");

router.get("/", requireAuth, listWorkOrders);
router.get("/:id", requireAuth, getWorkOrder);
router.post("/", requireAuth, requireRole("admin", "staff"), createWorkOrder);
router.patch("/:id/status", requireAuth, requireRole("admin", "staff"), updateWorkOrderStatus);
router.post("/:id/items/:itemId/to-stock", requireAuth, requireRole("admin", "staff"), workItemToStock);
router.delete("/:id", requireAuth, requireRole("admin"), deleteWorkOrder);

module.exports = router;
