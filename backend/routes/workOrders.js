const express = require("express");
const router = express.Router();
const { requireAuth, requireRole } = require("../middleware/auth");
const {
  listWorkOrders, getWorkOrder, createWorkOrder, updateWorkOrder,
  peekNextWorkNo, updateWorkOrderStatus, deleteWorkOrder, workItemToStock,
} = require("../controllers/workOrderController");

router.get("/", requireAuth, listWorkOrders);
// ต้องมาก่อน "/:id" ไม่งั้น next-no จะถูกจับเป็น id
router.get("/next-no", requireAuth, peekNextWorkNo);
router.get("/:id", requireAuth, getWorkOrder);
router.post("/", requireAuth, requireRole("admin", "staff"), createWorkOrder);
router.put("/:id", requireAuth, requireRole("admin", "staff"), updateWorkOrder);
router.patch("/:id/status", requireAuth, requireRole("admin", "staff"), updateWorkOrderStatus);
router.post("/:id/items/:itemId/to-stock", requireAuth, requireRole("admin", "staff"), workItemToStock);
router.delete("/:id", requireAuth, requireRole("admin"), deleteWorkOrder);

module.exports = router;
