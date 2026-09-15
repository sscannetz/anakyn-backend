// ═══════════════════════════════════════════════════════════════
// docNumber.js — สร้างเลขเอกสาร
//
//  1) nextDocNumber()  แบบเก่า  INV-2026-00341   (เก็บไว้เผื่อของเดิม/ย้อนดู)
//  2) nextHashNumber() แบบใหม่  INV#00001        (ใช้กับเอกสารทุกใบแล้ว)
//
//     ใบแจ้งหนี้    INV#00001
//     ใบเสนอราคา   QT#00001
//     ใบสั่งซื้อ     PO#00001
//     บิลขาย       Sale#00001
//     ใบเสร็จ      Receipt#00001
//
// เลขเก่าที่ออกไปแล้วไม่ถูกแก้ และไม่ถูกนับตอนหาเลขถัดไป — ใบใหม่เท่านั้นที่ใช้รูปแบบใหม่
// ═══════════════════════════════════════════════════════════════
const pool = require("../config/db");

/**
 * สร้างเลขเอกสารถัดไปสำหรับตารางที่กำหนด
 * @param {string} table   ชื่อตาราง เช่น "invoices"
 * @param {string} column  ชื่อคอลัมน์เลขเอกสาร เช่น "invoice_no"
 * @param {string} prefix  คำนำหน้า เช่น "INV"
 */
async function nextDocNumber(table, column, prefix) {
  const ceYear = new Date().getFullYear(); // ใช้ปี ค.ศ. ให้ตรงกับตัวอย่างเดิม (เช่น 2026)

  const { rows } = await pool.query(
    `SELECT ${column} FROM ${table} WHERE ${column} LIKE $1 ORDER BY ${column} DESC LIMIT 1`,
    [`${prefix}-${ceYear}-%`]
  );

  let nextSeq = 1;
  if (rows.length > 0) {
    const lastNo = rows[0][column]; // เช่น INV-2026-00341
    const lastSeq = parseInt(lastNo.split("-")[2], 10);
    if (Number.isFinite(lastSeq)) nextSeq = lastSeq + 1;
  }

  return `${prefix}-${ceYear}-${String(nextSeq).padStart(5, "0")}`;
}

// ── ขยายความยาวคอลัมน์ให้พอสำหรับรูปแบบใหม่ ──────────────────
// Render free plan ไม่มี Shell → รันไมเกรชันตอนใช้งานจริงครั้งแรก
// จำไว้ใน Set ว่าตารางไหนทำไปแล้ว จะได้ไม่ยิงซ้ำทุกครั้งที่ออกเอกสาร
const widened = new Set();
async function ensureWidth(table, column) {
  const key = `${table}.${column}`;
  if (widened.has(key)) return;
  widened.add(key);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // ถ้ามีใครล็อกตารางค้างอยู่ ให้ยอมแพ้ใน 4 วิ ดีกว่าค้างรอจนคำขอ timeout
    await client.query("SET LOCAL lock_timeout = '4s'");
    await client.query(
      `DO $$
       BEGIN
         IF EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_name = '${table}' AND column_name = '${column}') THEN
           ALTER TABLE ${table} ALTER COLUMN ${column} TYPE VARCHAR(40);
         END IF;
       END $$;`
    );
    await client.query("COMMIT");
  } catch (err) {
    // ขยายไม่ได้ก็ยังออกเลขได้ (คอลัมน์อาจกว้างพออยู่แล้ว) — แค่บันทึกไว้ดู
    try { await client.query("ROLLBACK"); } catch (_) {}
    console.error(`ensureWidth ${key}:`, err.message);
  } finally {
    client.release();
  }
}

/**
 * เลขเอกสารแบบ Prefix#00001 — ไม่มีปี รันต่อเนื่องไปเรื่อย ๆ
 * @param {string} table   เช่น "receipts"
 * @param {string} column  เช่น "receipt_no"
 * @param {string} prefix  เช่น "Receipt"  → Receipt#00001
 */
async function nextHashNumber(table, column, prefix) {
  await ensureWidth(table, column);

  // เอาเฉพาะเลขที่เป็นรูปแบบใหม่ ตัดตัวอักษรออกแล้วหาค่าสูงสุด
  // (เลขเก่า RCP-2026-00007 ไม่เข้าเงื่อนไข LIKE จึงไม่ถูกนับ)
  const { rows } = await pool.query(
    `SELECT COALESCE(MAX(NULLIF(regexp_replace(${column}, '\\D', '', 'g'), '')::bigint), 0) AS mx
       FROM ${table} WHERE ${column} LIKE $1`,
    [`${prefix}#%`]
  );

  const next = Number(rows[0]?.mx || 0) + 1;
  return `${prefix}#${String(next).padStart(5, "0")}`;
}

module.exports = { nextDocNumber, nextHashNumber };
