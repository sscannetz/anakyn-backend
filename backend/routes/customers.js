const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");
const { listCustomers, createCustomer } = require("../controllers/customerController");

router.get("/", requireAuth, listCustomers);
router.post("/", requireAuth, createCustomer);

module.exports = router;
