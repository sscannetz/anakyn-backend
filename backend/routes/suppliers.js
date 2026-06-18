const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");
const { listSuppliers, createSupplier } = require("../controllers/supplierController");

router.get("/", requireAuth, listSuppliers);
router.post("/", requireAuth, createSupplier);

module.exports = router;
