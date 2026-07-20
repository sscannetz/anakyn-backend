const express = require("express");
const router = express.Router();
const { requireAuth, requireRole } = require("../middleware/auth");
const {
  listReceipts, getReceipt, createReceipt, deleteReceipt,
} = require("../controllers/receiptController");

router.get("/", requireAuth, listReceipts);
router.get("/:id", requireAuth, getReceipt);
router.post("/", requireAuth, requireRole("admin", "staff"), createReceipt);
router.delete("/:id", requireAuth, requireRole("admin", "staff"), deleteReceipt);

module.exports = router;
