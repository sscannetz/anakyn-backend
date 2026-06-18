const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");
const { getSummary } = require("../controllers/summaryController");

router.get("/", requireAuth, getSummary);

module.exports = router;
