-- ═══════════════════════════════════════════════════════════════
-- migration_005_receipts.sql — ตารางใบเสร็จรับเงิน (Receipt)
-- ออกจากรายการขาย (sale) มีเลขที่ RCP-YYYY-NNNNN ต่อเนื่อง
-- ปลอดภัยต่อการรันซ้ำ (IF NOT EXISTS ทั้งหมด)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS receipts (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receipt_no     TEXT UNIQUE NOT NULL,              -- เช่น RCP-2026-00001
  sale_id        UUID REFERENCES sales(id),         -- การขายที่ใบเสร็จนี้อ้างอิง (UUID ให้ตรงกับ sales.id)
  amount         NUMERIC(12,2) NOT NULL DEFAULT 0,  -- จำนวนเงินที่รับ
  payment_method TEXT DEFAULT 'cash',               -- cash | transfer | card | other
  note           TEXT DEFAULT '',
  issued_by      UUID REFERENCES users(id),         -- UUID ให้ตรงกับ users.id
  issued_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_receipts_sale_id   ON receipts(sale_id);
CREATE INDEX IF NOT EXISTS idx_receipts_issued_at ON receipts(issued_at DESC);
