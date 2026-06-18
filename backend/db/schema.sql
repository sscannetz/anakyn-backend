-- ═══════════════════════════════════════════════════════════════════════
-- Anakyn Gems — PostgreSQL Database Schema
-- เหมาะกับ Supabase, Railway, Render, หรือ Postgres ที่ host เอง
-- ═══════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────────────
-- 1. USERS — แอดมิน / พนักงาน
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(255) NOT NULL,
  nickname      VARCHAR(100),
  phone         VARCHAR(20),
  role          VARCHAR(20) NOT NULL CHECK (role IN ('admin','staff')),
  permissions   JSONB DEFAULT '[]',          -- ["sale","stock","doc","crm","report","finance","setting","user"]
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────
-- 2. CUSTOMERS — ลูกค้า / สมาชิก CRM
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE customers (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name    VARCHAR(255) NOT NULL,
  phone        VARCHAR(20),
  email        VARCHAR(255),
  is_vip       BOOLEAN DEFAULT false,
  vip_discount_pct DECIMAL(5,2) DEFAULT 0,
  loyalty_points   INT DEFAULT 0,
  referred_by_partner_id UUID,               -- FK ไป partners (เติมทีหลังกัน circular)
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────
-- 3. PRODUCTS — สินค้า/สต๊อก
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE products (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku           VARCHAR(50) UNIQUE NOT NULL,  -- ANAKYN#0143
  name          VARCHAR(255) NOT NULL,
  category      VARCHAR(50),                  -- แหวน, สร้อยคอ, ต่างหู, กำไล, จี้, อื่นๆ
  photo_url     TEXT,                          -- รูปสินค้า (อัพโหลดแยกทีหลัง)
  metal_type    VARCHAR(20),                   -- 9K, 14K, 18K, silver
  metal_weight_g     DECIMAL(8,2),             -- น้ำหนักจริงที่กรอก
  metal_weight_adj_g DECIMAL(8,2),             -- น้ำหนัก +10% ที่ใช้คำนวณจริง
  gold_price_at_creation   DECIMAL(12,2),      -- ราคาทองบาทละที่กรอกตอนเพิ่มสินค้า
  silver_price_at_creation DECIMAL(12,2),      -- ราคาเงิน/กรัมที่กรอกตอนเพิ่มสินค้า
  metal_cost    DECIMAL(12,2) DEFAULT 0,        -- ต้นทุนโลหะที่คำนวณได้ ณ ขณะนั้น
  labor_cost    DECIMAL(12,2) DEFAULT 0,        -- ค่าแรงช่าง
  diamonds      JSONB DEFAULT '[]',             -- [{weight,qty,shape,color,clarity,hasCert,certLab,certNo,certNote,certFile,cost}, ...]
  diamond_total_cost DECIMAL(12,2) DEFAULT 0,   -- รวมต้นทุนเพชรทุกเม็ด (คำนวณจาก diamonds)
  has_certificate BOOLEAN DEFAULT false,        -- มีเพชรอย่างน้อย 1 เม็ดที่มีใบเซอร์
  certificate_no  VARCHAR(100),                 -- เลขใบเซอร์เม็ดหลัก (เพื่อค้นหาง่าย)
  cost_price    DECIMAL(12,2) NOT NULL,         -- ราคาทุนรวม (metal + diamond + labor)
  sale_price    DECIMAL(12,2) NOT NULL,
  stock_qty     INT DEFAULT 1,
  is_available  BOOLEAN DEFAULT true,
  partner_commission_pct DECIMAL(5,2) DEFAULT 0,
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────
-- 4. PARTNERS — ตัวแทน/นายหน้า
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE partners (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ref_code      VARCHAR(20) UNIQUE NOT NULL,   -- PTN-2024-0042
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(255) NOT NULL,
  phone         VARCHAR(20),
  level         VARCHAR(20) DEFAULT 'silver' CHECK (level IN ('silver','gold','platinum')),
  comm_rate_pct DECIMAL(5,2) DEFAULT 3.00,
  is_active     BOOLEAN DEFAULT true,
  joined_at     TIMESTAMPTZ DEFAULT now(),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- เติม FK customers → partners ที่ข้ามไว้ก่อนหน้า
ALTER TABLE customers
  ADD CONSTRAINT fk_customers_partner
  FOREIGN KEY (referred_by_partner_id) REFERENCES partners(id);

-- ─────────────────────────────────────────────────────────────────────
-- 5. SALES — บันทึกการขาย
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE sales (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_no         VARCHAR(30) UNIQUE NOT NULL,   -- SALE-2026-00341
  customer_id     UUID REFERENCES customers(id),
  user_id         UUID REFERENCES users(id),      -- พนักงานที่ขาย
  partner_id      UUID REFERENCES partners(id),   -- ถ้ามาจากการแนะนำ
  subtotal        DECIMAL(12,2) NOT NULL,
  vip_discount    DECIMAL(12,2) DEFAULT 0,
  extra_discount  DECIMAL(12,2) DEFAULT 0,
  vat_enabled     BOOLEAN DEFAULT true,
  vat_amount      DECIMAL(12,2) DEFAULT 0,
  total           DECIMAL(12,2) NOT NULL,
  payment_methods JSONB DEFAULT '[]',             -- [{"method":"cash","amount":30000}]
  status          VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('completed','pending','cancelled')),
  sold_at         TIMESTAMPTZ DEFAULT now(),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────
-- 6. SALE_ITEMS — รายการสินค้าในแต่ละการขาย
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE sale_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id     UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id),
  qty         INT DEFAULT 1,
  unit_price  DECIMAL(12,2) NOT NULL,
  line_total  DECIMAL(12,2) NOT NULL
);

-- ─────────────────────────────────────────────────────────────────────
-- 7. INVOICES — ใบกำกับภาษี
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE invoices (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_no     VARCHAR(30) UNIQUE NOT NULL,   -- INV-2026-00341
  sale_id        UUID REFERENCES sales(id),
  tax_base       DECIMAL(12,2) NOT NULL,
  vat_amount     DECIMAL(12,2) NOT NULL,
  vat_applied    BOOLEAN DEFAULT true,           -- toggle มี/ไม่มี VAT (ตามต้นฉบับ)
  wht_amount     DECIMAL(12,2) DEFAULT 0,
  net_payable    DECIMAL(12,2) NOT NULL,
  due_date       DATE,
  payment_methods JSONB DEFAULT '[]',             -- ["transfer","cash"] เลือกได้หลายช่องทาง (ตามต้นฉบับ)
  issued_by      UUID REFERENCES users(id),
  issued_at      TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────
-- 8. QUOTATIONS — ใบเสนอราคา
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE quotations (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_no     VARCHAR(30) UNIQUE NOT NULL,    -- QT-2026-00089
  customer_id  UUID REFERENCES customers(id),
  items        JSONB NOT NULL DEFAULT '[]',     -- [{"product_id":"...","qty":1,"price":55000}]
  subtotal     DECIMAL(12,2) NOT NULL,
  vat_amount   DECIMAL(12,2) DEFAULT 0,
  vat_applied  BOOLEAN DEFAULT true,            -- toggle มี/ไม่มี VAT (แก้ไขได้ในตัวเอกสาร)
  total        DECIMAL(12,2) NOT NULL,
  valid_until  DATE NOT NULL,
  notes        TEXT,                            -- หมายเหตุ/เงื่อนไขพิเศษ
  status       VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','accepted','expired','rejected')),
  issued_by    UUID REFERENCES users(id),
  issued_at    TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────
-- 9. SUPPLIERS — ผู้จัดส่งวัตถุดิบ
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE suppliers (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       VARCHAR(255) NOT NULL,
  phone      VARCHAR(20),
  address    TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────
-- 10. PURCHASE_ORDERS — ใบสั่งซื้อ
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE purchase_orders (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_no         VARCHAR(30) UNIQUE NOT NULL,    -- PO-2026-00112
  supplier_id   UUID REFERENCES suppliers(id),
  subtotal      DECIMAL(12,2) NOT NULL,
  vat_amount    DECIMAL(12,2) DEFAULT 0,
  total         DECIMAL(12,2) NOT NULL,
  status        VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','sent','received','cancelled')),
  needed_by     DATE,
  approved_by   UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────
-- 11. PO_ITEMS — รายการในใบสั่งซื้อ
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE po_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_id       UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  item_name   VARCHAR(255) NOT NULL,
  unit        VARCHAR(20),                       -- เม็ด, บาท, กรัม
  qty         DECIMAL(10,2) NOT NULL,
  unit_price  DECIMAL(12,2) NOT NULL,
  line_total  DECIMAL(12,2) NOT NULL
);

-- ─────────────────────────────────────────────────────────────────────
-- 12. SERVICE_ORDERS — ใบสั่งซ่อม
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE service_orders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_no      VARCHAR(30) UNIQUE NOT NULL,   -- SRV-2026-00056
  customer_id     UUID REFERENCES customers(id),
  product_id      UUID REFERENCES products(id),
  condition_notes JSONB DEFAULT '{}',             -- {"โครงแหวน":"มีรอยขีดข่วน",...}
  services        JSONB DEFAULT '[]',             -- [{"name":"Prong repair","price":0,"is_warranty":true}]
  total_cost      DECIMAL(12,2) DEFAULT 0,
  status          VARCHAR(20) DEFAULT 'received' CHECK (status IN ('received','repairing','qc','notified','picked_up')),
  received_at     TIMESTAMPTZ DEFAULT now(),
  pickup_date     DATE,
  technician      VARCHAR(255),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────
-- 13. COMMISSIONS — ค่าคอมมิชชั่นของ Partner
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE commissions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id  UUID NOT NULL REFERENCES partners(id),
  sale_id     UUID NOT NULL REFERENCES sales(id),
  comm_pct    DECIMAL(5,2) NOT NULL,
  amount      DECIMAL(12,2) NOT NULL,
  status      VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','confirmed','paid')),
  paid_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════
-- INDEXES — เพิ่มความเร็วในการ query ที่ใช้บ่อย
-- ═══════════════════════════════════════════════════════════════════════
CREATE INDEX idx_products_sku        ON products(sku);
CREATE INDEX idx_products_category   ON products(category);
CREATE INDEX idx_products_available  ON products(is_available);
CREATE INDEX idx_sales_customer      ON sales(customer_id);
CREATE INDEX idx_sales_partner       ON sales(partner_id);
CREATE INDEX idx_sales_sold_at       ON sales(sold_at);
CREATE INDEX idx_sale_items_sale     ON sale_items(sale_id);
CREATE INDEX idx_commissions_partner ON commissions(partner_id);
CREATE INDEX idx_commissions_status  ON commissions(status);
CREATE INDEX idx_po_status           ON purchase_orders(status);
CREATE INDEX idx_service_status      ON service_orders(status);
CREATE INDEX idx_customers_phone     ON customers(phone);

-- ═══════════════════════════════════════════════════════════════════════
-- AUTO-UPDATE updated_at TRIGGER
-- ═══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at      BEFORE UPDATE ON users      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_customers_updated_at  BEFORE UPDATE ON customers  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_products_updated_at   BEFORE UPDATE ON products   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_partners_updated_at   BEFORE UPDATE ON partners   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
