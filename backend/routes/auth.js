// ═══════════════════════════════════════════════════════════════
// auth.js routes — /api/auth/*
// ═══════════════════════════════════════════════════════════════
const express = require("express");
const router = express.Router();
const { loginStaff, loginPartner } = require("../controllers/authController");

router.post("/login", loginStaff);           // Admin / Staff
router.post("/partner-login", loginPartner);  // Partner

module.exports = router;
