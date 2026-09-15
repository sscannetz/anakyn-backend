const express = require("express");
const router = express.Router();
const { requireAuth, requireRole } = require("../middleware/auth");
const {
  listServiceOrders, getServiceOrder, createServiceOrder, updateServiceOrder,
  peekNextServiceNo, updateServiceStatus, deleteServiceOrder,
} = require("../controllers/serviceOrderController");

router.get("/", requireAuth, listServiceOrders);
// ต้องมาก่อน "/:id" ไม่งั้น next-no จะถูกจับเป็น id
router.get("/next-no", requireAuth, peekNextServiceNo);
router.get("/:id", requireAuth, getServiceOrder);
router.post("/", requireAuth, requireRole("admin", "staff"), createServiceOrder);
router.put("/:id", requireAuth, requireRole("admin", "staff"), updateServiceOrder);
router.patch("/:id/status", requireAuth, requireRole("admin", "staff"), updateServiceStatus);
router.delete("/:id", requireAuth, requireRole("admin", "staff"), deleteServiceOrder);

module.exports = router;
