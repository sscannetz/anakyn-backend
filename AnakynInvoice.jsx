// ═══════════════════════════════════════════════════════════════
// AnakynInvoice.jsx — เชื่อมกับ Backend จริง (เอกสารทางการตามต้นฉบับ AppPreview)
// รายการใบกำกับภาษีจริง + มุมมองเอกสารแบบทางการ
// VAT toggle / กำหนดชำระ / ช่องทางชำระเงิน แก้ไขได้ในตัวเอกสารเลย (ตามต้นฉบับ) แล้วบันทึกผ่าน API
// ═══════════════════════════════════════════════════════════════
import { useState, useEffect } from "react";
import { api } from "./api"; // ★ เชื่อม API

const T_INV = {
  th: {
    langBtn: "EN", print: "ปริ้น",
    inv_badge: "ใบกำกับภาษี", inv_date: "วันที่", inv_ref: "เลขที่ขาย",
    inv_staff: "พนักงาน", inv_seller: "ผู้ขาย", inv_buyer: "ผู้ซื้อ",
    inv_items: "รายการสินค้า", inv_col_item: "รายการ", inv_col_qty: "จำนวน", inv_col_price: "ราคา",
    inv_subtotal: "รวมก่อนส่วนลด", inv_before_vat: "มูลค่าก่อน VAT",
    inv_vat: "VAT 7%", inv_grand: "ยอดรวมทั้งสิ้น",
    inv_tax_info: "ข้อมูลภาษี", inv_tax_base: "ฐานภาษี", inv_tax_wht: "ภาษีหัก ณ ที่จ่าย",
    inv_net: "ยอดชำระสุทธิ", inv_due: "กำหนดชำระ", inv_due_by: "ชำระภายใน",
    inv_method: "ช่องทาง",
    inv_sig_issuer: "ผู้รับเงิน / ผู้ออกใบกำกับ", inv_sig_buyer: "ผู้ซื้อ / ผู้รับสินค้า",
    inv_footer: "เอกสารออกโดยระบบคอมพิวเตอร์ · Anakyn Gems Co., Ltd. · anakyngems.com",
    inv_line: "ส่งให้ลูกค้าทาง LINE",
    inv_seller_sub: "123 ถ.สีลม บางรัก<br>กรุงเทพฯ 10500<br>TAX ID: 0-1055-65432-10-0",
    list_title: "ใบกำกับภาษีทั้งหมด", new_title: "ออกใบกำกับภาษีใหม่",
    select_sale: "เลือกรายการขาย", wht_label: "หักภาษี ณ ที่จ่าย (ถ้ามี)",
    issue_btn: "ออกใบกำกับภาษี", issuing: "กำลังออก...",
    no_invoices: "ยังไม่มีใบกำกับภาษี", loading: "กำลังโหลด...", back: "ย้อนกลับ",
    vat_on: "มี", vat_off: "ไม่มี",
  },
  en: {
    langBtn: "ไทย", print: "Print",
    inv_badge: "TAX INVOICE", inv_date: "Date", inv_ref: "Sale No.",
    inv_staff: "Staff", inv_seller: "Seller", inv_buyer: "Buyer",
    inv_items: "Items", inv_col_item: "Item", inv_col_qty: "Qty", inv_col_price: "Price",
    inv_subtotal: "Subtotal", inv_before_vat: "Amount before VAT",
    inv_vat: "VAT 7%", inv_grand: "Grand Total",
    inv_tax_info: "Tax Details", inv_tax_base: "Tax base", inv_tax_wht: "Withholding tax",
    inv_net: "Net payable", inv_due: "Payment due", inv_due_by: "Due by",
    inv_method: "Method",
    inv_sig_issuer: "Issued by", inv_sig_buyer: "Buyer / Recipient",
    inv_footer: "Computer-generated document · Anakyn Gems Co., Ltd. · anakyngems.com",
    inv_line: "Send to customer via LINE",
    inv_seller_sub: "123 Silom Rd, Bang Rak<br>Bangkok 10500<br>TAX ID: 0-1055-65432-10-0",
    list_title: "All Invoices", new_title: "Issue new invoice",
    select_sale: "Select a sale", wht_label: "WHT amount (optional)",
    issue_btn: "Issue invoice", issuing: "Issuing...",
    no_invoices: "No invoices yet", loading: "Loading...", back: "Back",
    vat_on: "Incl.", vat_off: "Excl.",
  },
};

const fmt_inv = (n) => Math.round(Number(n)).toLocaleString("th-TH");

// ── ช่องทางชำระเงิน (ตามต้นฉบับ) ──────────────────────────────────────────
const PAY_OPTIONS = (lang) => [
  { key: "transfer", icon: "ti-qrcode",     label: lang === "th" ? "โอนเงิน"     : "Transfer"     },
  { key: "cash",     icon: "ti-cash",        label: lang === "th" ? "เงินสด"      : "Cash"         },
  { key: "scan",     icon: "ti-scan",        label: lang === "th" ? "สแกน QR"     : "Scan QR"      },
  { key: "card",     icon: "ti-credit-card", label: lang === "th" ? "บัตรเครดิต" : "Credit card"  },
];

// ── shared document components (ตามต้นฉบับ) ──────────────────────────────
const DocWrapper = ({ children }) => (
  <div style={{ background: "#fff", border: "0.5px solid #c8a0b0", borderRadius: 12, overflow: "hidden" }}>{children}</div>
);
const LangBtn = ({ lang, setLang, t }) => (
  <button onClick={() => setLang(l => l === "th" ? "en" : "th")}
    style={{ position: "absolute", top: 14, right: 16, background: "rgba(255,255,255,0.15)", border: "0.5px solid rgba(255,255,255,0.3)", borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 500, color: "#f5e0e5", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
    <i className="ti ti-language" style={{ fontSize: 13 }} aria-hidden="true" />{t.langBtn}
  </button>
);
const DocHeader = ({ badge, docNo, meta = [], lang, setLang, t, onBack }) => (
  <div style={{ background: "#550a19", padding: "18px 18px 0", position: "relative" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
      <div>
        {onBack && (
          <div onClick={onBack} style={{cursor:"pointer",marginBottom:6,fontSize:11,color:"#f0d0d8",display:"flex",alignItems:"center",gap:4}}>
            <i className="ti ti-arrow-left" style={{fontSize:12}} aria-hidden="true"/>{t.back}
          </div>
        )}
        <div style={{ fontSize: 20, fontWeight: 500, color: "#fff5f7", letterSpacing: 4 }}>ANAKYN</div>
        <div style={{ fontSize: 9, color: "#d4a0ac", letterSpacing: 5, marginTop: 1 }}>GEMS</div>
      </div>
      <div style={{ textAlign: "right", paddingRight: 70 }}>
        <div style={{ display: "inline-block", background: "rgba(255,255,255,0.12)", border: "0.5px solid rgba(255,255,255,0.25)", borderRadius: 20, padding: "4px 12px", fontSize: 10, color: "#f0d0d8", letterSpacing: 2, marginBottom: 4 }}>{badge}</div>
        <div style={{ fontSize: 13, fontWeight: 500, color: "#fff5f7" }}>{docNo}</div>
      </div>
    </div>
    <LangBtn lang={lang} setLang={setLang} t={t} />
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, background: "rgba(255,255,255,0.08)", borderRadius: "8px 8px 0 0", padding: "10px 12px" }}>
      {meta.map(([l, v], i) => (
        <div key={l} style={{ textAlign: i === 2 ? "right" : "left" }}>
          <div style={{ fontSize: 9, color: "#d4a0ac", letterSpacing: 1 }}>{l}</div>
          <div style={{ fontSize: 11, fontWeight: 500, color: "#f5e8eb", marginTop: 1 }}>{v}</div>
        </div>
      ))}
    </div>
  </div>
);
const Parties = ({ seller, buyer }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "0.5px solid #f0e4e8" }}>
    {[seller, buyer].map((p, i) => (
      <div key={p.label} style={{ padding: "11px 14px", borderRight: i === 0 ? "0.5px solid #f0e4e8" : "none" }}>
        <div style={{ fontSize: 9, color: "#a07080", letterSpacing: "1.5px", marginBottom: 5 }}>{p.label}</div>
        <div style={{ fontSize: 12, fontWeight: 500, color: "#2c1015" }}>{p.name}</div>
        <div style={{ fontSize: 10, color: "#a07080", lineHeight: 1.5, marginTop: 2 }} dangerouslySetInnerHTML={{ __html: p.sub }} />
      </div>
    ))}
  </div>
);
const Sec = ({ children, style = {} }) => (
  <div style={{ padding: "12px 14px", borderBottom: "0.5px solid #f0e4e8", ...style }}>{children}</div>
);
const SL = ({ children }) => <div style={{ fontSize: 9, color: "#a07080", letterSpacing: "1.5px", marginBottom: 8 }}>{children}</div>;
const TRow = ({ label, value, color = "#2c1015", borderTop = false }) => (
  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "3px 0", borderTop: borderTop ? "0.5px solid #f0e4e8" : "none", marginTop: borderTop ? 5 : 0, paddingTop: borderTop ? 6 : 3 }}>
    <span style={{ color: "#806070" }}>{label}</span><span style={{ fontWeight: 500, color }}>{value}</span>
  </div>
);
const GrandTotal = ({ label, value }) => (
  <div style={{ background: "#550a19", padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
    <span style={{ fontSize: 13, fontWeight: 500, color: "#f0d0d8" }}>{label}</span>
    <span style={{ fontSize: 20, fontWeight: 500, color: "#fff5f7" }}>{value}</span>
  </div>
);
const SigRow = ({ left, right }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "12px 14px", borderBottom: "0.5px solid #f0e4e8" }}>
    {[left, right].map((s) => (
      <div key={s.label} style={{ borderTop: "0.5px solid #e8c0c8", paddingTop: 6 }}>
        <div style={{ fontSize: 10, color: "#a07080" }}>{s.label}</div>
        <div style={{ fontSize: 11, fontWeight: 500, color: s.pending ? "#c0a0a8" : "#2c1015", marginTop: 3 }}>{s.name}</div>
        <div style={{ fontSize: 10, color: "#a07080", marginTop: 1 }}>{s.date}</div>
      </div>
    ))}
  </div>
);
const DocFooter = ({ children }) => (
  <div style={{ padding: "10px 14px", textAlign: "center", borderBottom: "0.5px solid #f0e4e8", fontSize: 10, color: "#a07080", lineHeight: 1.6 }}>{children}</div>
);
const Spec = ({ children }) => (
  <span style={{ fontSize: 10, background: "#f9f4f5", color: "#806070", border: "0.5px solid #e8d5d9", borderRadius: 4, padding: "2px 5px" }}>{children}</span>
);
const ActionBar = ({ printLabel, lineLabel }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, padding: "10px 14px 14px" }}>
    <div onClick={() => window.print()} style={{ borderRadius: 8, padding: 9, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, cursor: "pointer", fontSize: 11, fontWeight: 500, border: "0.5px solid #e8c0c8", background: "#550a19", color: "#fff5f7" }}>
      <i className="ti ti-printer" style={{ fontSize: 14 }} aria-hidden="true" /> {printLabel}
    </div>
    <div style={{ borderRadius: 8, padding: 9, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, cursor: "pointer", fontSize: 11, fontWeight: 500, border: "0.5px solid #e8c0c8", background: "#fff", color: "#550a19" }}>
      <i className="ti ti-file-type-pdf" style={{ fontSize: 14 }} aria-hidden="true" /> PDF
    </div>
    <div style={{ gridColumn: "1/-1", borderRadius: 8, padding: 9, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, cursor: "pointer", fontSize: 11, fontWeight: 500, border: "0.5px solid #a0b8e0", background: "#fff", color: "#185FA5" }}>
      <i className="ti ti-message-circle" style={{ fontSize: 14 }} aria-hidden="true" /> {lineLabel}
    </div>
  </div>
);
const PAGE = { width: 360, margin: "0 auto", fontFamily: "'Anthropic Sans', sans-serif" };

// ── มุมมองเอกสารแบบทางการ ★ เชื่อม API จริง — VAT/กำหนดชำระ/ช่องทาง แก้ไขได้เลยตามต้นฉบับ ──
function InvoiceDocument({ invoice, lang, setLang, onBack, onUpdated }) {
  const t = T_INV[lang];
  const [sale, setSale] = useState(null);
  const [loadingSale, setLoadingSale] = useState(true);

  // ── state แก้ไขได้ในตัวเอกสาร (sync จาก invoice prop เมื่อเปิดเอกสาร) ──
  const [vatOn, setVatOn] = useState(invoice.vat_applied !== false);
  const [dueDate, setDueDate] = useState(invoice.due_date ? invoice.due_date.slice(0, 10) : "");
  const [payMethods, setPayMethods] = useState(Array.isArray(invoice.payment_methods) ? invoice.payment_methods : []);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (invoice.sale_id) {
      api.getSale(invoice.sale_id).then(setSale).finally(() => setLoadingSale(false));
    } else {
      setLoadingSale(false);
    }
  }, [invoice.sale_id]);

  const taxBase = Number(invoice.tax_base || invoice.subtotal || 0);
  const vatAmt  = vatOn ? Math.round(taxBase * 0.07 * 100) / 100 : 0;
  const wht     = Number(invoice.wht_amount || 0);
  const grand   = taxBase + vatAmt;
  const netPay  = grand - wht;

  // ── บันทึกการแก้ไขกลับไปที่ backend จริง ──
  const persist = async (patch) => {
    setSaving(true);
    try {
      const updated = await api.updateInvoice(invoice.id, patch);
      if (onUpdated) onUpdated(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleVat = (val) => {
    setVatOn(val);
    persist({ vat_applied: val });
  };
  const handleDueDateChange = (val) => {
    setDueDate(val);
    persist({ due_date: val || null });
  };
  const togglePayInv = (key) => {
    const next = payMethods.includes(key) ? payMethods.filter(k => k !== key) : [...payMethods, key];
    setPayMethods(next);
    persist({ payment_methods: next });
  };

  return (
    <div style={PAGE}>
      <DocWrapper>
        <DocHeader badge={t.inv_badge} docNo={invoice.invoice_no} lang={lang} setLang={setLang} t={t} onBack={onBack}
          meta={[[t.inv_date, new Date(invoice.issued_at).toLocaleDateString("th-TH")], [t.inv_ref, invoice.sale_no || "—"], [t.inv_staff, "—"]]} />
        <Parties
          seller={{ label: t.inv_seller, name: "Anakyn Gems Co., Ltd.", sub: t.inv_seller_sub }}
          buyer={{  label: t.inv_buyer,  name: invoice.customer_name || (lang==="th"?"ไม่ระบุลูกค้า":"Walk-in customer"), sub: invoice.phone || "—" }}
        />
        <Sec>
          <SL>{t.inv_items}</SL>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 40px 70px", gap: 4, fontSize: 9, color: "#a07080", letterSpacing: 1, paddingBottom: 5, borderBottom: "0.5px dashed #e8d5d9", marginBottom: 8 }}>
            <span>{t.inv_col_item}</span><span style={{ textAlign: "center" }}>{t.inv_col_qty}</span><span style={{ textAlign: "right" }}>{t.inv_col_price}</span>
          </div>
          {loadingSale && <div style={{fontSize:11,color:"#a07080"}}>{t.loading}</div>}
          {!loadingSale && sale?.items?.map((item) => (
            <div key={item.id} style={{ display: "grid", gridTemplateColumns: "1fr 40px 70px", gap: 4, alignItems: "start", marginBottom: 8, paddingBottom: 8, borderBottom: "0.5px solid #f9f4f5" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: "#2c1015" }}>{item.name}</div>
                <div style={{ fontSize: 10, color: "#a07080", marginTop: 1 }}>{item.sku}</div>
                {Array.isArray(item.specs) && item.specs.length > 0 && (
                  <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginTop: 4 }}>{item.specs.map(s => <Spec key={s}>{s}</Spec>)}</div>
                )}
              </div>
              <div style={{ fontSize: 12, color: "#2c1015", textAlign: "center" }}>{item.qty}</div>
              <div style={{ fontSize: 12, fontWeight: 500, color: "#550a19", textAlign: "right" }}>฿{fmt_inv(item.line_total)}</div>
            </div>
          ))}
          {!loadingSale && (!sale?.items || sale.items.length===0) && (
            <div style={{fontSize:11,color:"#a07080"}}>—</div>
          )}
        </Sec>

        {/* ── ราคารวม + VAT toggle (แก้ไขได้ในตัวเอกสาร ตามต้นฉบับ) ── */}
        <Sec>
          <TRow label={t.inv_before_vat} value={`฿${fmt_inv(taxBase)}`} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0" }}>
            <span style={{ fontSize: 13, color: "#806070" }}>{t.inv_vat}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: vatOn ? "#2c1015" : "#b08090" }}>
                {vatOn ? `฿${fmt_inv(vatAmt)}` : "—"}
              </span>
              <div onClick={() => handleToggleVat(!vatOn)}
                style={{ display: "flex", borderRadius: 20, overflow: "hidden", border: "0.5px solid #e8c0c8", cursor: "pointer" }}>
                {[[t.vat_on, true], [t.vat_off, false]].map(([label, val]) => (
                  <span key={label} style={{ padding: "4px 11px", fontSize: 11, fontWeight: 500, background: vatOn === val ? "#550a19" : "#fff", color: vatOn === val ? "#f5e0e5" : "#a07080", transition: "background .15s" }}>{label}</span>
                ))}
              </div>
            </div>
          </div>
        </Sec>
        <GrandTotal label={t.inv_grand} value={`฿${fmt_inv(grand)}`} />

        <Sec style={{ background: "#fdf5f7" }}>
          <SL>{t.inv_tax_info}</SL>
          <TRow label={t.inv_tax_base} value={`฿${fmt_inv(taxBase)}`} />
          {vatOn && <TRow label={t.inv_vat} value={`฿${fmt_inv(vatAmt)}`} />}
          {wht>0 && <TRow label={t.inv_tax_wht} value={`− ฿${fmt_inv(wht)}`} color="#c62828" />}
          <TRow label={t.inv_net} value={`฿${fmt_inv(netPay)}`} color="#550a19" borderTop />
        </Sec>

        {/* ── กำหนดชำระ (เลือกวันที่ได้เอง) + ช่องทางชำระเงิน (เลือกได้หลายช่อง) ตามต้นฉบับ ── */}
        <Sec>
          <SL>{t.inv_due}</SL>
          <div style={{ background: "#fff8e1", border: "0.5px solid #f0d060", borderRadius: 8, padding: "9px 12px", marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: "#8b4f00", fontWeight: 500, marginBottom: 5 }}>{t.inv_due_by}</div>
            <input
              type="date"
              value={dueDate}
              onChange={e => handleDueDateChange(e.target.value)}
              style={{ background: "transparent", border: "none", outline: "none", fontFamily: "inherit", fontSize: 13, fontWeight: 500, color: "#5a3000", width: "100%", cursor: "pointer" }}
            />
          </div>

          <div style={{ fontSize: 10, color: "#8b4f00", fontWeight: 500, marginBottom: 7 }}>{t.inv_method}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {PAY_OPTIONS(lang).map(opt => {
              const on = payMethods.includes(opt.key);
              return (
                <div key={opt.key} onClick={() => togglePayInv(opt.key)}
                  style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 10px", borderRadius: 8, border: `0.5px solid ${on ? "#b87020" : "#e8d5d9"}`, background: on ? "#fff8e8" : "#fff", cursor: "pointer", transition: "all .15s" }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: on ? "#b87020" : "#f9f4f5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <i className={`ti ${opt.icon}`} style={{ fontSize: 13, color: on ? "#fff" : "#a07080" }} aria-hidden="true" />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: on ? 500 : 400, color: on ? "#7a4f00" : "#806070" }}>{opt.label}</span>
                  {on && <i className="ti ti-check" style={{ fontSize: 12, color: "#b87020", marginLeft: "auto" }} aria-hidden="true" />}
                </div>
              );
            })}
          </div>
        </Sec>

        <SigRow
          left={{ label: t.inv_sig_issuer, name: "Anakyn Gems Staff", date: new Date(invoice.issued_at).toLocaleDateString("th-TH") }}
          right={{ label: t.inv_sig_buyer, name: invoice.customer_name || "—", date: new Date(invoice.issued_at).toLocaleDateString("th-TH") }}
        />
        <DocFooter>{t.inv_footer}</DocFooter>
        <ActionBar printLabel={t.print} lineLabel={t.inv_line} />
      </DocWrapper>
    </div>
  );
}

// ── หน้าหลัก: รายการ + ฟอร์มออกใบใหม่ ★ เชื่อม API จริง ──────────────────
export default function AnakynInvoice({ navigate }) {
  const nav = navigate || function(){};
  const [lang, setLang] = useState("th");
  const t = T_INV[lang];

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState([]);
  const [selectedSaleId, setSelectedSaleId] = useState("");
  const [whtAmount, setWhtAmount] = useState(0);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [viewingInvoice, setViewingInvoice] = useState(null);

  useEffect(() => {
    Promise.all([api.getInvoices(), api.getSales(20)])
      .then(([inv, sl]) => { setInvoices(inv); setSales(sl); })
      .finally(() => setLoading(false));
  }, []);

  const handleCreateInvoice = async () => {
    if (!selectedSaleId) {
      setCreateError(lang==="th"?"กรุณาเลือกรายการขาย":"Please select a sale");
      return;
    }
    setCreating(true); setCreateError("");
    try {
      const newInvoice = await api.createInvoice({ sale_id: selectedSaleId, wht_amount: parseFloat(whtAmount)||0, vat_applied: true });
      setInvoices((prev) => [newInvoice, ...prev]);
      setSelectedSaleId(""); setWhtAmount(0);
    } catch (err) {
      setCreateError(err.message || "ไม่สามารถออกใบกำกับภาษีได้");
    } finally {
      setCreating(false);
    }
  };

  const handleInvoiceUpdated = (updated) => {
    setViewingInvoice(updated);
    setInvoices((prev) => prev.map((i) => (i.id === updated.id ? { ...i, ...updated } : i)));
  };

  if (viewingInvoice) {
    return <InvoiceDocument invoice={viewingInvoice} lang={lang} setLang={setLang} onBack={()=>setViewingInvoice(null)} onUpdated={handleInvoiceUpdated} />;
  }

  const inputStyle = { width:"100%", background:"#fff", border:"0.5px solid #e8d5d9", borderRadius:8, padding:"8px 10px", fontSize:13, color:"#2c1015", fontFamily:"inherit", outline:"none", boxSizing:"border-box" };

  return (
    <div style={{width:360,margin:"0 auto",background:"#f9f4f5",borderRadius:32,overflow:"hidden",border:"1.5px solid #c8a8b0",fontFamily:"'Anthropic Sans',sans-serif"}}>
      <div style={{background:"#550a19",padding:"10px 20px 4px"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,paddingBottom:12,paddingTop:8}}>
          <div onClick={()=>nav("home")} style={{width:32,height:32,borderRadius:"50%",background:"rgba(255,255,255,0.12)",display:"flex",alignItems:"center",justifyContent:"center",color:"#f0d0d8",fontSize:15,cursor:"pointer"}}>
            <i className="ti ti-arrow-left" aria-hidden="true" />
          </div>
          <span style={{fontSize:16,fontWeight:500,color:"#fff5f7",flex:1}}>{t.inv_badge}</span>
          <button onClick={()=>setLang(l=>l==="th"?"en":"th")}
            style={{background:"rgba(255,255,255,0.15)",border:"0.5px solid rgba(255,255,255,0.3)",borderRadius:8,padding:"4px 10px",fontSize:12,color:"#f5e0e5",cursor:"pointer",fontFamily:"inherit"}}>
            {t.langBtn}
          </button>
        </div>
      </div>

      <div style={{padding:"14px 16px",overflowY:"auto",maxHeight:700}}>
        <div style={{background:"#fff",borderRadius:12,border:"0.5px solid #e8d5d9",padding:"12px 14px",marginBottom:12}}>
          <div style={{fontSize:12,fontWeight:500,color:"#550a19",marginBottom:8}}>{t.new_title}</div>

          {createError && (
            <div style={{background:"#fdf0f2",border:"0.5px solid #e8c0c8",borderRadius:8,padding:"7px 10px",marginBottom:8,fontSize:11,color:"#a32d2d"}}>{createError}</div>
          )}

          <select value={selectedSaleId} onChange={(e)=>setSelectedSaleId(e.target.value)} style={{...inputStyle,marginBottom:8}}>
            <option value="">-- {t.select_sale} --</option>
            {sales.map((s) => (
              <option key={s.id} value={s.id}>{s.sale_no} · {s.customer_name || "ไม่ระบุ"} · ฿{fmt_inv(s.total)}</option>
            ))}
          </select>

          <input type="number" value={whtAmount} onChange={(e)=>setWhtAmount(e.target.value)}
            placeholder={t.wht_label} style={{...inputStyle,marginBottom:8}} />

          <button onClick={handleCreateInvoice} disabled={creating}
            style={{width:"100%",background:"#550a19",border:"none",borderRadius:10,padding:10,fontSize:13,fontWeight:500,color:"#fff",cursor:creating?"default":"pointer",opacity:creating?0.6:1,fontFamily:"inherit"}}>
            {creating ? t.issuing : t.issue_btn}
          </button>
        </div>

        <div style={{fontSize:12,fontWeight:500,color:"#550a19",marginBottom:8}}>
          {t.list_title} {!loading && `(${invoices.length})`}
        </div>

        {loading && <div style={{fontSize:12,color:"#a07080"}}>{t.loading}</div>}

        {!loading && invoices.map((inv) => (
          <div key={inv.id} onClick={()=>setViewingInvoice(inv)}
            style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8d5d9",padding:"10px 12px",marginBottom:7,cursor:"pointer"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
              <span style={{fontSize:12,fontWeight:500,color:"#550a19"}}>{inv.invoice_no}</span>
              <span style={{fontSize:13,fontWeight:500,color:"#2c1015"}}>฿{fmt_inv(inv.net_payable)}</span>
            </div>
            <div style={{fontSize:11,color:"#a07080"}}>
              {inv.customer_name || "ไม่ระบุลูกค้า"} · VAT ฿{fmt_inv(inv.vat_amount)}
              {Number(inv.wht_amount) > 0 && ` · WHT ฿${fmt_inv(inv.wht_amount)}`}
            </div>
          </div>
        ))}

        {!loading && invoices.length === 0 && (
          <div style={{fontSize:12,color:"#a07080",textAlign:"center",padding:"20px 0"}}>{t.no_invoices}</div>
        )}
      </div>
    </div>
  );
}
