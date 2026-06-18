const express = require("express");
const router = express.Router();
const { requireAuth, requireRole } = require("../middleware/auth");
const { listInvoices, getInvoice, createInvoice, updateInvoice } = require("../controllers/invoiceController");

router.get("/", requireAuth, listInvoices);
router.get("/:id", requireAuth, getInvoice);
router.post("/", requireAuth, requireRole("admin", "staff"), createInvoice);
router.patch("/:id", requireAuth, requireRole("admin", "staff"), updateInvoice);

module.exports = router;
