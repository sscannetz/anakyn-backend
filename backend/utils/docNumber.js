// ═══════════════════════════════════════════════════════════════
// docNumber.js — สร้างเลขเอกสารรันตามปี เช่น INV-2026-00341
// ═══════════════════════════════════════════════════════════════
const pool = require("../config/db");

/**
 * สร้างเลขเอกสารถัดไปสำหรับตารางที่กำหนด
 * @param {string} table   ชื่อตาราง เช่น "invoices"
 * @param {string} column  ชื่อคอลัมน์เลขเอกสาร เช่น "invoice_no"
 * @param {string} prefix  คำนำหน้า เช่น "INV"
 */
async function nextDocNumber(table, column, prefix) {
  const year = new Date().getFullYear() + 543 - 2000 + 2400; // ปี พ.ศ. 4 หลัก เช่น 2569 → ใช้ ค.ศ.+0 ก็พอ ปรับตามต้องการ
  const ceYear = new Date().getFullYear(); // ใช้ปี ค.ศ. ให้ตรงกับตัวอย่างเดิม (เช่น 2026)

  const { rows } = await pool.query(
    `SELECT ${column} FROM ${table} WHERE ${column} LIKE $1 ORDER BY ${column} DESC LIMIT 1`,
    [`${prefix}-${ceYear}-%`]
  );

  let nextSeq = 1;
  if (rows.length > 0) {
    const lastNo = rows[0][column]; // เช่น INV-2026-00341
    const lastSeq = parseInt(lastNo.split("-")[2], 10);
    nextSeq = lastSeq + 1;
  }

  return `${prefix}-${ceYear}-${String(nextSeq).padStart(5, "0")}`;
}

module.exports = { nextDocNumber };
