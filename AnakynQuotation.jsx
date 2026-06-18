// ═══════════════════════════════════════════════════════════════
// AnakynQuotation.jsx — เชื่อมกับ Backend จริง (เอกสารทางการตามต้นฉบับ AppPreview)
// from/to parties, searchable item picker จากสต๊อกจริง, validity dropdown, status, signatures
// ═══════════════════════════════════════════════════════════════
import { useState, useEffect } from "react";
import { api } from "./api"; // ★ เชื่อม API

const T_QT = {
  th: {
    langBtn: "EN", print: "ปริ้น",
    badge: "ใบเสนอราคา",
    date: "วันที่ออก", valid_until: "ใช้ได้ถึง", staff: "พนักงาน",
    from: "จาก", to: "เสนอราคาให้",
    validity_label: "อายุใบเสนอราคา", validity_unit: "วัน",
    items_label: "รายการสินค้า",
    col_item: "รายการ", col_qty: "จำนวน", col_price: "ราคา",
    note_label: "หมายเหตุ / เงื่อนไขพิเศษ",
    note_val: "กรุณายืนยันภายในระยะเวลาที่กำหนด\nราคาอาจเปลี่ยนแปลงตามราคาทองและเพชรในตลาด",
    before_vat: "มูลค่าก่อน VAT", vat: "VAT 7%", grand: "ยอดรวมทั้งสิ้น",
    vat_on: "มี", vat_off: "ไม่มี",
    status_label: "สถานะ",
    status_pending: "รอการยืนยัน", status_accept: "อนุมัติ", status_reject: "ปฏิเสธ", status_expired: "หมดอายุ",
    sig_seller: "ผู้เสนอราคา", sig_buyer: "ผู้รับใบเสนอราคา",
    sig_pending: "ยังไม่ได้ลงนาม", sig_date_empty: "— / — / —",
    footer: "Anakyn Gems · เลขที่ผู้เสียภาษี 0-1055-65432-10-0\n123 ถนนสีลม แขวงสีลม เขตบางรัก กรุงเทพฯ 10500\nTel. 02-XXX-XXXX · anakyngems.com",
    line_btn: "ส่งให้ลูกค้าทาง LINE", copy_link: "คัดลอกลิงค์ใบเสนอราคา",
    add_item: "เพิ่มรายการสินค้า",
    search_ph: "ค้นหา SKU / ชื่อสินค้า...", search_cancel: "ยกเลิก", not_found: "ไม่พบสินค้า",
    remove: "ลบ", price_label: "ราคาเสนอ",
    from_sub: "123 ถ.สีลม บางรัก<br>กรุงเทพฯ 10500<br>TAX ID: 0-1055-65432-10-0",
    vip_label: "VIP Member", no_customer: "ไม่ระบุลูกค้า",
    list_title: "ใบเสนอราคาทั้งหมด", new_title: "สร้างใบเสนอราคาใหม่",
    select_customer: "เลือกลูกค้า", create_btn: "สร้างใบเสนอราคา", creating: "กำลังสร้าง...",
    no_quotations: "ยังไม่มีใบเสนอราคา", loading: "กำลังโหลด...", back: "ย้อนกลับ",
    need_items: "กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการ",
  },
  en: {
    langBtn: "ไทย", print: "Print",
    badge: "QUOTATION",
    date: "Issue date", valid_until: "Valid until", staff: "Staff",
    from: "From", to: "Quote to",
    validity_label: "Validity", validity_unit: "days",
    items_label: "Items",
    col_item: "Item", col_qty: "Qty", col_price: "Price",
    note_label: "Notes / Special conditions",
    note_val: "Please confirm within the specified period.\nPrices subject to change based on gold and diamond market rates.",
    before_vat: "Amount before VAT", vat: "VAT 7%", grand: "Grand Total",
    vat_on: "Incl.", vat_off: "Excl.",
    status_label: "Status",
    status_pending: "Pending", status_accept: "Approved", status_reject: "Rejected", status_expired: "Expired",
    sig_seller: "Issued by", sig_buyer: "Customer signature",
    sig_pending: "Not yet signed", sig_date_empty: "— / — / —",
    footer: "Anakyn Gems · TAX ID: 0-1055-65432-10-0\n123 Silom Rd, Silom, Bang Rak, Bangkok 10500\nTel. 02-XXX-XXXX · anakyngems.com",
    line_btn: "Send to customer via LINE", copy_link: "Copy quotation link",
    add_item: "Add item",
    search_ph: "Search SKU / item name...", search_cancel: "Cancel", not_found: "No items found",
    remove: "Remove", price_label: "Offer price",
    from_sub: "123 Silom Rd, Bang Rak<br>Bangkok 10500<br>TAX ID: 0-1055-65432-10-0",
    vip_label: "VIP Member", no_customer: "No customer",
    list_title: "All Quotations", new_title: "Create new quotation",
    select_customer: "Select customer", create_btn: "Create quotation", creating: "Creating...",
    no_quotations: "No quotations yet", loading: "Loading...", back: "Back",
    need_items: "Add at least one item",
  },
};

const fmt_qt = (n) => Math.round(Number(n)).toLocaleString("th-TH");
const VALIDITY_PRESETS = [7, 14, 30, 45, 60, 90];

const Sec = ({ children }) => <div style={{ padding: "12px 14px", borderBottom: "0.5px solid #f0e4e8" }}>{children}</div>;
const SL = ({ children }) => <div style={{ fontSize: 9, color: "#a07080", letterSpacing: "1.5px", marginBottom: 8 }}>{children}</div>;
const Spec = ({ children }) => (
  <span style={{ fontSize: 10, background: "#f9f4f5", color: "#806070", border: "0.5px solid #e8d5d9", borderRadius: 4, padding: "2px 5px" }}>{children}</span>
);

function ValidityDropdown({ validDays, setValidDays, unit, lang }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = query.trim() === "" ? VALIDITY_PRESETS : VALIDITY_PRESETS.filter(d => String(d).startsWith(query.trim()));
  const select = (d) => { setValidDays(d); setOpen(false); setQuery(""); };
  const handleInput = (e) => {
    const v = e.target.value.replace(/\D/g, "");
    setQuery(v);
    if (v !== "") setValidDays(Math.max(1, parseInt(v)));
  };
  return (
    <div style={{ position: "relative" }}>
      <div onClick={() => { setOpen(o => !o); setQuery(""); }}
        style={{ display: "flex", alignItems: "center", background: "#fff", border: `0.5px solid ${open ? "#550a19" : "#e8c0c8"}`, borderRadius: 7, padding: "6px 10px", cursor: "pointer", gap: 6 }}>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "#550a19" }}>{validDays} {unit}</span>
        <i className={`ti ti-chevron-${open ? "up" : "down"}`} style={{ fontSize: 12, color: "#a07080", flexShrink: 0 }} aria-hidden="true" />
      </div>
      {open && (
        <div style={{ position: "absolute", zIndex: 999, top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", borderRadius: 10, border: "1px solid #550a19", boxShadow: "0 6px 20px rgba(0,0,0,0.12)", overflow: "hidden" }}>
          <div style={{ padding: "8px 10px", borderBottom: "0.5px solid #f0e4e8", display: "flex", alignItems: "center", gap: 6 }}>
            <i className="ti ti-search" style={{ fontSize: 13, color: "#a07080", flexShrink: 0 }} aria-hidden="true" />
            <input autoFocus value={query} onChange={handleInput}
              placeholder={lang === "th" ? "พิมจำนวนวัน..." : "Type days..."}
              style={{ border: "none", outline: "none", fontSize: 12, color: "#2c1015", background: "transparent", width: "100%", fontFamily: "inherit" }} />
          </div>
          <div>
            {filtered.length === 0 && query !== "" && (
              <div onClick={() => select(parseInt(query))} style={{ padding: "9px 12px", fontSize: 13, cursor: "pointer", color: "#550a19", fontWeight: 500 }}>{query} {unit}</div>
            )}
            {filtered.map(d => (
              <div key={d} onClick={() => select(d)}
                style={{ padding: "9px 12px", fontSize: 13, cursor: "pointer", background: validDays === d ? "#550a19" : "transparent", color: validDays === d ? "#fff" : "#2c1015", fontWeight: validDays === d ? 500 : 400 }}>
                {d} {unit}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── เอกสารใบเสนอราคาแบบสร้าง/แก้ไขได้ ★ เชื่อม API จริง ──────────────────
function QuotationBuilder({ lang, setLang, onBack, onSaved, customers, stockList }) {
  const t = T_QT[lang];
  const [customerId, setCustomerId] = useState("");
  const [vatOn, setVatOn] = useState(true);
  const [validDays, setValidDays] = useState(30);
  const [noteVal, setNoteVal] = useState(t.note_val);
  const [items, setItems] = useState([]);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedCustomer = customers.find(c => c.id === customerId);

  const filteredStock = query.trim() === "" ? stockList
    : stockList.filter(s => s.name.toLowerCase().includes(query.toLowerCase()) || s.sku.toLowerCase().includes(query.toLowerCase()));

  const addItem = (product) => {
    setItems(its => [...its, { id: product.id, name: product.name, sku: product.sku,
      detail: `${product.metal_type||""}${product.metal_weight_g?` · ${product.metal_weight_g}g`:""}`,
      specs: (product.diamonds||[]).slice(0,1).flatMap(d=>[d.shape,d.color&&d.clarity?`${d.color}/${d.clarity}`:null].filter(Boolean)),
      offerPrice: Number(product.sale_price) }]);
    setSearching(false); setQuery("");
  };
  const removeItem = (id) => setItems(its => its.filter(x => x.id !== id));
  const updatePrice = (id, val) => setItems(its => its.map(x => x.id === id ? { ...x, offerPrice: parseFloat(val) || 0 } : x));

  const subtotal = items.reduce((s, x) => s + x.offerPrice, 0);
  const vatAmtQt = Math.round(subtotal * 0.07);
  const grandQt = vatOn ? subtotal + vatAmtQt : subtotal;

  const expiry = new Date();
  expiry.setDate(expiry.getDate() + validDays);
  const expiryStr = expiry.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });

  // ★ เชื่อม API — บันทึกใบเสนอราคาจริง
  const handleSave = async () => {
    if (items.length === 0) { setError(t.need_items); return; }
    setSaving(true); setError("");
    try {
      const newQt = await api.createQuotation({
        customer_id: customerId || null,
        items: items.map(it => ({ name: it.name, sku: it.sku, detail: it.detail, specs: it.specs, qty: 1, price: it.offerPrice })),
        valid_days: validDays,
        notes: noteVal,
        vat_enabled: vatOn,
      });
      onSaved(newQt);
    } catch (err) {
      setError(err.message || "ไม่สามารถสร้างใบเสนอราคาได้");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ width: 360, margin: "0 auto", fontFamily: "'Anthropic Sans', sans-serif" }}>
      <div style={{ background: "#fff", border: "0.5px solid #c8a0b0", borderRadius: 12, overflow: "hidden" }}>

        <div style={{ background: "#550a19", padding: "18px 18px 0", position: "relative" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
            <div>
              <div onClick={onBack} style={{cursor:"pointer",marginBottom:6,fontSize:11,color:"#f0d0d8",display:"flex",alignItems:"center",gap:4}}>
                <i className="ti ti-arrow-left" style={{fontSize:12}} aria-hidden="true"/>{t.back}
              </div>
              <div style={{ fontSize: 20, fontWeight: 500, color: "#fff5f7", letterSpacing: 4 }}>ANAKYN</div>
              <div style={{ fontSize: 9, color: "#d4a0ac", letterSpacing: 5, marginTop: 1 }}>GEMS</div>
            </div>
            <div style={{ textAlign: "right", paddingRight: 72 }}>
              <div style={{ display: "inline-block", background: "rgba(255,255,255,0.12)", border: "0.5px solid rgba(255,255,255,0.25)", borderRadius: 20, padding: "4px 12px", fontSize: 10, color: "#f0d0d8", letterSpacing: 2, marginBottom: 4 }}>{t.badge}</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#fff5f7" }}>{lang==="th"?"ฉบับร่าง":"Draft"}</div>
            </div>
          </div>
          <button onClick={() => setLang(l => l === "th" ? "en" : "th")}
            style={{ position: "absolute", top: 14, right: 16, background: "rgba(255,255,255,0.15)", border: "0.5px solid rgba(255,255,255,0.3)", borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 500, color: "#f5e0e5", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
            <i className="ti ti-language" style={{ fontSize: 13 }} aria-hidden="true" />{t.langBtn}
          </button>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, background: "rgba(255,255,255,0.08)", borderRadius: "8px 8px 0 0", padding: "10px 12px" }}>
            {[[t.date, new Date().toLocaleDateString("th-TH")], [t.valid_until, expiryStr], [t.staff, "—"]].map(([l, v], i) => (
              <div key={l} style={{ textAlign: i === 2 ? "right" : "left" }}>
                <div style={{ fontSize: 9, color: "#d4a0ac", letterSpacing: 1 }}>{l}</div>
                <div style={{ fontSize: 11, fontWeight: 500, color: "#f5e8eb", marginTop: 1 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "0.5px solid #f0e4e8" }}>
          <div style={{ padding: "11px 14px", borderRight: "0.5px solid #f0e4e8" }}>
            <div style={{ fontSize: 9, color: "#a07080", letterSpacing: "1.5px", marginBottom: 5 }}>{t.from}</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: "#2c1015" }}>Anakyn Gems Co., Ltd.</div>
            <div style={{ fontSize: 10, color: "#a07080", lineHeight: 1.5, marginTop: 2 }} dangerouslySetInnerHTML={{ __html: t.from_sub }} />
          </div>
          <div style={{ padding: "11px 14px" }}>
            <div style={{ fontSize: 9, color: "#a07080", letterSpacing: "1.5px", marginBottom: 5 }}>{t.to}</div>
            <select value={customerId} onChange={(e)=>setCustomerId(e.target.value)}
              style={{width:"100%",fontSize:12,fontWeight:500,color:"#2c1015",border:"0.5px solid #e8d5d9",borderRadius:6,padding:"4px 6px",fontFamily:"inherit",outline:"none",marginBottom:4}}>
              <option value="">{t.no_customer}</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
            <div style={{ fontSize: 10, color: "#a07080", lineHeight: 1.5 }}>{selectedCustomer?.phone || "—"}</div>
            {selectedCustomer?.is_vip && <span style={{ display: "inline-flex", marginTop: 4, background: "#550a19", color: "#f5e0e5", fontSize: 10, padding: "2px 7px", borderRadius: 20 }}>{t.vip_label}</span>}
          </div>
        </div>

        <div style={{ padding: "10px 14px", borderBottom: "0.5px solid #f0e4e8", display: "flex", justifyContent: "flex-end" }}>
          <div style={{ background: "#fdf5f7", borderRadius: 8, padding: "8px 12px", border: "0.5px solid #e8c0c8", minWidth: 160 }}>
            <div style={{ fontSize: 9, color: "#a07080", letterSpacing: 1, marginBottom: 5 }}>{t.validity_label}</div>
            <ValidityDropdown validDays={validDays} setValidDays={setValidDays} unit={t.validity_unit} lang={lang} />
            <div style={{ fontSize: 10, color: "#c09090", marginTop: 4 }}>{lang === "th" ? `หมดอายุ ${expiryStr}` : `Expires ${expiryStr}`}</div>
          </div>
        </div>

        <Sec>
          <SL>{t.items_label}</SL>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 36px 72px", gap: 4, fontSize: 9, color: "#a07080", letterSpacing: 1, paddingBottom: 5, borderBottom: "0.5px dashed #e8d5d9", marginBottom: 10 }}>
            <span>{t.col_item}</span><span style={{ textAlign: "center" }}>{t.col_qty}</span><span style={{ textAlign: "right" }}>{t.col_price}</span>
          </div>

          {items.map(item => (
            <div key={item.id} style={{ border: "0.5px solid #f0e4e8", borderRadius: 10, padding: "10px 12px", marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "#2c1015" }}>{item.name}</div>
                  <div style={{ fontSize: 10, color: "#a07080", marginTop: 1 }}>{item.sku} · {item.detail}</div>
                  {item.specs.length > 0 && (
                    <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginTop: 4 }}>{item.specs.map(s => <Spec key={s}>{s}</Spec>)}</div>
                  )}
                </div>
                <button onClick={() => removeItem(item.id)}
                  style={{ width: 22, height: 22, borderRadius: "50%", background: "#fdf0f2", border: "0.5px solid #e8c0c8", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, marginLeft: 8 }}>
                  <i className="ti ti-x" style={{ fontSize: 10, color: "#550a19" }} aria-hidden="true" />
                </button>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                <span style={{ fontSize: 11, color: "#a07080" }}>{t.price_label}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 12, color: "#a07080" }}>฿</span>
                  <input type="number" value={item.offerPrice} onChange={e => updatePrice(item.id, e.target.value)}
                    style={{ width: 72, textAlign: "right", background: "#fdf5f7", border: "0.5px solid #e8c0c8", borderRadius: 6, padding: "4px 7px", fontSize: 13, fontWeight: 500, color: "#550a19", fontFamily: "inherit", outline: "none" }} />
                </div>
              </div>
            </div>
          ))}

          {searching ? (
            <div style={{ border: "1.5px solid #550a19", borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                <div style={{ flex: 1, position: "relative" }}>
                  <i className="ti ti-search" style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#b08090" }} aria-hidden="true" />
                  <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder={t.search_ph}
                    style={{ width: "100%", background: "#f9f4f5", border: "0.5px solid #e8d5d9", borderRadius: 8, padding: "8px 10px 8px 30px", fontSize: 12, color: "#2c1015", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
                </div>
                <button onClick={() => { setSearching(false); setQuery(""); }}
                  style={{ background: "#f9f4f5", border: "0.5px solid #e8d5d9", borderRadius: 8, padding: "0 10px", cursor: "pointer", fontSize: 11, color: "#a07080", fontFamily: "inherit" }}>{t.search_cancel}</button>
              </div>
              <div style={{ maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 5 }}>
                {filteredStock.length === 0 && <div style={{ fontSize: 12, color: "#b08090", padding: "6px 0" }}>{t.not_found}</div>}
                {filteredStock.map(s => (
                  <div key={s.id} onClick={() => addItem(s)}
                    style={{ background: "#fff", border: "0.5px solid #e8d5d9", borderRadius: 8, padding: "9px 11px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: "#2c1015" }}>{s.name}</div>
                      <div style={{ fontSize: 10, color: "#a07080", marginTop: 1 }}>{s.sku} · {s.metal_type||"—"}</div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "#550a19", flexShrink: 0 }}>฿{fmt_qt(s.sale_price)}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div onClick={() => setSearching(true)}
              style={{ border: "0.5px dashed #e8c0c8", borderRadius: 8, padding: 9, textAlign: "center", fontSize: 12, color: "#b08090", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
              <i className="ti ti-plus" style={{ fontSize: 14 }} aria-hidden="true" /> {t.add_item}
            </div>
          )}
        </Sec>

        <Sec>
          <SL>{t.note_label}</SL>
          <textarea value={noteVal} onChange={e => setNoteVal(e.target.value)} rows={3}
            style={{ width: "100%", background: "#f9f4f5", border: "0.5px solid #e8d5d9", borderRadius: 7, padding: "8px 10px", fontSize: 11, color: "#806070", lineHeight: 1.7, fontFamily: "inherit", outline: "none", resize: "none", boxSizing: "border-box" }} />
        </Sec>

        <Sec>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "3px 0" }}>
            <span style={{ color: "#806070" }}>{t.before_vat}</span><span style={{ fontWeight: 500, color: "#2c1015" }}>฿{fmt_qt(subtotal)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0" }}>
            <span style={{ fontSize: 12, color: "#806070" }}>{t.vat}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: vatOn ? "#2c1015" : "#b08090" }}>{vatOn ? `฿${fmt_qt(vatAmtQt)}` : "—"}</span>
              <div onClick={() => setVatOn(v => !v)} style={{ display: "flex", borderRadius: 20, overflow: "hidden", border: "0.5px solid #e8c0c8", cursor: "pointer" }}>
                {[[t.vat_on, true],[t.vat_off, false]].map(([label, val]) => (
                  <span key={label} style={{ padding: "4px 11px", fontSize: 11, fontWeight: 500, background: vatOn === val ? "#550a19" : "#fff", color: vatOn === val ? "#f5e0e5" : "#a07080" }}>{label}</span>
                ))}
              </div>
            </div>
          </div>
        </Sec>
        <div style={{ background: "#550a19", padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "#f0d0d8" }}>{t.grand}</span>
          <span style={{ fontSize: 20, fontWeight: 500, color: "#fff5f7" }}>฿{fmt_qt(grandQt)}</span>
        </div>

        {error && (
          <div style={{margin:"10px 14px",background:"#fdf0f2",border:"0.5px solid #e8c0c8",borderRadius:8,padding:"7px 10px",fontSize:11,color:"#a32d2d"}}>{error}</div>
        )}

        {/* ★ เชื่อม API — บันทึกจริง */}
        <div style={{ padding: "10px 14px 14px" }}>
          <button onClick={handleSave} disabled={saving}
            style={{ width: "100%", borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 500, color: "#fff", background: "#550a19", border: "none", cursor: saving?"default":"pointer", opacity: saving?0.6:1, fontFamily: "inherit" }}>
            {saving ? t.creating : t.create_btn}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── มุมมองดูใบเสนอราคาที่บันทึกแล้ว ★ เชื่อม API จริง ────────────────────
function QuotationView({ quotation, lang, setLang, onBack, onStatusChange, onUpdated }) {
  const t = T_QT[lang];
  const items = Array.isArray(quotation.items) ? quotation.items : [];
  const subtotal = Number(quotation.subtotal) || items.reduce((s,it)=>s+(Number(it.price)||0)*(Number(it.qty)||1),0);

  // ── state แก้ไขได้ในตัวเอกสาร (sync จาก quotation prop) ──
  const [vatOn, setVatOn] = useState(quotation.vat_applied !== false);
  const [noteVal, setNoteVal] = useState(quotation.notes || "");
  const [validDays, setValidDays] = useState(30);

  const vatAmt = vatOn ? Math.round(subtotal * 0.07) : 0;
  const grand = subtotal + vatAmt;

  const validUntilDate = new Date(quotation.valid_until);
  const expiryStr = validUntilDate.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });

  const persist = (patch) => {
    api.updateQuotation(quotation.id, patch).then((updated) => { if (onUpdated) onUpdated(updated); }).catch(console.error);
  };
  const handleToggleVat = (val) => { setVatOn(val); persist({ vat_applied: val }); };
  const handleNoteBlur = () => { persist({ notes: noteVal }); };
  const handleValidDaysChange = (days) => {
    setValidDays(days);
    const issued = quotation.issued_at ? new Date(quotation.issued_at) : new Date();
    const newValidUntil = new Date(issued);
    newValidUntil.setDate(newValidUntil.getDate() + days);
    persist({ valid_until: newValidUntil.toISOString().slice(0,10) });
  };

  return (
    <div style={{ width: 360, margin: "0 auto", fontFamily: "'Anthropic Sans', sans-serif" }}>
      <div style={{ background: "#fff", border: "0.5px solid #c8a0b0", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ background: "#550a19", padding: "18px 18px 0", position: "relative" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
            <div>
              <div onClick={onBack} style={{cursor:"pointer",marginBottom:6,fontSize:11,color:"#f0d0d8",display:"flex",alignItems:"center",gap:4}}>
                <i className="ti ti-arrow-left" style={{fontSize:12}} aria-hidden="true"/>{t.back}
              </div>
              <div style={{ fontSize: 20, fontWeight: 500, color: "#fff5f7", letterSpacing: 4 }}>ANAKYN</div>
              <div style={{ fontSize: 9, color: "#d4a0ac", letterSpacing: 5, marginTop: 1 }}>GEMS</div>
            </div>
            <div style={{ textAlign: "right", paddingRight: 72 }}>
              <div style={{ display: "inline-block", background: "rgba(255,255,255,0.12)", border: "0.5px solid rgba(255,255,255,0.25)", borderRadius: 20, padding: "4px 12px", fontSize: 10, color: "#f0d0d8", letterSpacing: 2, marginBottom: 4 }}>{t.badge}</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#fff5f7" }}>{quotation.quote_no}</div>
            </div>
          </div>
          <button onClick={() => setLang(l => l === "th" ? "en" : "th")}
            style={{ position: "absolute", top: 14, right: 16, background: "rgba(255,255,255,0.15)", border: "0.5px solid rgba(255,255,255,0.3)", borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 500, color: "#f5e0e5", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
            <i className="ti ti-language" style={{ fontSize: 13 }} aria-hidden="true" />{t.langBtn}
          </button>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, background: "rgba(255,255,255,0.08)", borderRadius: "8px 8px 0 0", padding: "10px 12px" }}>
            {[[t.date, new Date(quotation.issued_at).toLocaleDateString("th-TH")], [t.valid_until, new Date(quotation.valid_until).toLocaleDateString("th-TH")], [t.staff,"—"]].map(([l,v],i)=>(
              <div key={l} style={{ textAlign: i === 2 ? "right" : "left" }}>
                <div style={{ fontSize: 9, color: "#d4a0ac", letterSpacing: 1 }}>{l}</div>
                <div style={{ fontSize: 11, fontWeight: 500, color: "#f5e8eb", marginTop: 1 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── FROM / TO (ข้อมูลครบตามต้นฉบับ) ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "0.5px solid #f0e4e8" }}>
          <div style={{ padding: "11px 14px", borderRight: "0.5px solid #f0e4e8" }}>
            <div style={{ fontSize: 9, color: "#a07080", letterSpacing: "1.5px", marginBottom: 5 }}>{t.from}</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: "#2c1015" }}>Anakyn Gems Co., Ltd.</div>
            <div style={{ fontSize: 10, color: "#a07080", lineHeight: 1.5, marginTop: 2 }} dangerouslySetInnerHTML={{ __html: t.from_sub }} />
          </div>
          <div style={{ padding: "11px 14px" }}>
            <div style={{ fontSize: 9, color: "#a07080", letterSpacing: "1.5px", marginBottom: 5 }}>{t.to}</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: "#2c1015" }}>{quotation.customer_name || t.no_customer}</div>
            <div style={{ fontSize: 10, color: "#a07080", lineHeight: 1.5, marginTop: 2 }}>
              {quotation.phone || "—"}{quotation.email ? <><br/>{quotation.email}</> : null}
            </div>
            {quotation.is_vip && <span style={{ display: "inline-flex", marginTop: 4, background: "#550a19", color: "#f5e0e5", fontSize: 10, padding: "2px 7px", borderRadius: 20 }}>{t.vip_label}</span>}
          </div>
        </div>

        {/* ── VALIDITY (แก้ไขได้) ── */}
        <div style={{ padding: "10px 14px", borderBottom: "0.5px solid #f0e4e8", display: "flex", justifyContent: "flex-end" }}>
          <div style={{ background: "#fdf5f7", borderRadius: 8, padding: "8px 12px", border: "0.5px solid #e8c0c8", minWidth: 160 }}>
            <div style={{ fontSize: 9, color: "#a07080", letterSpacing: 1, marginBottom: 5 }}>{t.validity_label}</div>
            <ValidityDropdown validDays={validDays} setValidDays={handleValidDaysChange} unit={t.validity_unit} lang={lang} />
            <div style={{ fontSize: 10, color: "#c09090", marginTop: 4 }}>
              {lang === "th" ? `หมดอายุ ${expiryStr}` : `Expires ${expiryStr}`}
            </div>
          </div>
        </div>

        {/* ── ITEMS (การ์ดพร้อม spec tags ตามต้นฉบับ) ── */}
        <Sec>
          <SL>{t.items_label}</SL>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 36px 72px", gap: 4, fontSize: 9, color: "#a07080", letterSpacing: 1, paddingBottom: 5, borderBottom: "0.5px dashed #e8d5d9", marginBottom: 10 }}>
            <span>{t.col_item}</span><span style={{ textAlign: "center" }}>{t.col_qty}</span><span style={{ textAlign: "right" }}>{t.col_price}</span>
          </div>
          {items.map((it,idx)=>(
            <div key={idx} style={{ border: "0.5px solid #f0e4e8", borderRadius: 10, padding: "10px 12px", marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "#2c1015" }}>{it.name}{it.qty>1?` × ${it.qty}`:""}</div>
              {(it.sku || it.detail) && <div style={{ fontSize: 10, color: "#a07080", marginTop: 1 }}>{[it.sku, it.detail].filter(Boolean).join(" · ")}</div>}
              {Array.isArray(it.specs) && it.specs.length > 0 && (
                <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginTop: 4 }}>{it.specs.map(s => <Spec key={s}>{s}</Spec>)}</div>
              )}
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: "#550a19" }}>฿{fmt_qt((it.price||0)*(it.qty||1))}</span>
              </div>
            </div>
          ))}
        </Sec>

        {/* ── NOTES (แก้ไขได้) ── */}
        <Sec>
          <SL>{t.note_label}</SL>
          <textarea value={noteVal} onChange={e => setNoteVal(e.target.value)} onBlur={handleNoteBlur} rows={3}
            style={{ width: "100%", background: "#f9f4f5", border: "0.5px solid #e8d5d9", borderRadius: 7, padding: "8px 10px", fontSize: 11, color: "#806070", lineHeight: 1.7, fontFamily: "inherit", outline: "none", resize: "none", boxSizing: "border-box" }} />
        </Sec>

        {/* ── TOTALS + VAT TOGGLE (แก้ไขได้) ── */}
        <Sec>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "3px 0" }}>
            <span style={{ color: "#806070" }}>{t.before_vat}</span><span style={{ fontWeight: 500, color: "#2c1015" }}>฿{fmt_qt(subtotal)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0" }}>
            <span style={{ fontSize: 12, color: "#806070" }}>{t.vat}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: vatOn ? "#2c1015" : "#b08090" }}>{vatOn ? `฿${fmt_qt(vatAmt)}` : "—"}</span>
              <div onClick={() => handleToggleVat(!vatOn)} style={{ display: "flex", borderRadius: 20, overflow: "hidden", border: "0.5px solid #e8c0c8", cursor: "pointer" }}>
                {[[t.vat_on, true],[t.vat_off, false]].map(([label, val]) => (
                  <span key={label} style={{ padding: "4px 11px", fontSize: 11, fontWeight: 500, background: vatOn === val ? "#550a19" : "#fff", color: vatOn === val ? "#f5e0e5" : "#a07080" }}>{label}</span>
                ))}
              </div>
            </div>
          </div>
        </Sec>
        <div style={{ background: "#550a19", padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "#f0d0d8" }}>{t.grand}</span>
          <span style={{ fontSize: 20, fontWeight: 500, color: "#fff5f7" }}>฿{fmt_qt(grand)}</span>
        </div>

        {/* ── STATUS ── */}
        <Sec>
          <SL>{t.status_label}</SL>
          <div style={{ display: "flex", gap: 7 }}>
            {[
              { key: "pending", label: t.status_pending, icon: "ti-clock", bg: "#fff8e1", col: "#854F0B", border: "#e8c060" },
              { key: "accepted",  label: t.status_accept,  icon: "ti-check", bg: "#e8f5e9", col: "#2e7d32", border: "#a8d8b0" },
              { key: "rejected",  label: t.status_reject,  icon: "ti-x",     bg: "#fff",    col: "#a07080", border: "#e8d5d9" },
            ].map(s => {
              const active = quotation.status === s.key;
              return (
                <div key={s.key} onClick={() => onStatusChange(quotation.id, s.key)}
                  style={{ flex: 1, borderRadius: 8, padding: "9px 4px", fontSize: 11, fontWeight: 500, textAlign: "center", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, border: active ? `1.5px solid ${s.col}` : `0.5px solid ${s.border}`, background: active ? s.bg : "#fff", color: active ? s.col : "#a07080" }}>
                  <i className={`ti ${s.icon}`} style={{ fontSize: 13 }} aria-hidden="true" />{s.label}
                </div>
              );
            })}
          </div>
        </Sec>

        {/* ── SIGNATURES ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "12px 14px", borderBottom: "0.5px solid #f0e4e8" }}>
          <div style={{ borderTop: "0.5px solid #e8c0c8", paddingTop: 6 }}>
            <div style={{ fontSize: 10, color: "#a07080" }}>{t.sig_seller}</div>
            <div style={{ fontSize: 11, fontWeight: 500, color: "#2c1015", marginTop: 3 }}>Anakyn Gems Staff</div>
            <div style={{ fontSize: 10, color: "#a07080", marginTop: 1 }}>{new Date(quotation.issued_at).toLocaleDateString("th-TH")}</div>
          </div>
          <div style={{ borderTop: "0.5px solid #e8c0c8", paddingTop: 6 }}>
            <div style={{ fontSize: 10, color: "#a07080" }}>{t.sig_buyer}</div>
            <div style={{ fontSize: 11, fontWeight: 500, color: quotation.status==="accepted" ? "#2c1015" : "#c0a0a8", marginTop: 3 }}>
              {quotation.status==="accepted" ? (quotation.customer_name || "—") : t.sig_pending}
            </div>
            <div style={{ fontSize: 10, color: "#a07080", marginTop: 1 }}>{t.sig_date_empty}</div>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div style={{ padding: "10px 14px", textAlign: "center", borderBottom: "0.5px solid #f0e4e8", fontSize: 10, color: "#a07080", lineHeight: 1.7, whiteSpace: "pre-line" }}>{t.footer}</div>

        {/* ── ACTIONS ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, padding: "10px 14px 14px" }}>
          <div onClick={() => window.print()} style={{ borderRadius: 8, padding: 9, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, cursor: "pointer", fontSize: 11, fontWeight: 500, border: "0.5px solid #e8c0c8", background: "#550a19", color: "#fff5f7" }}>
            <i className="ti ti-printer" style={{ fontSize: 14 }} aria-hidden="true" /> {t.print}
          </div>
          <div style={{ borderRadius: 8, padding: 9, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, cursor: "pointer", fontSize: 11, fontWeight: 500, border: "0.5px solid #e8c0c8", background: "#fff", color: "#550a19" }}>
            <i className="ti ti-file-type-pdf" style={{ fontSize: 14 }} aria-hidden="true" /> PDF
          </div>
          <div style={{ gridColumn: "1/-1", borderRadius: 8, padding: 9, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, cursor: "pointer", fontSize: 11, fontWeight: 500, border: "0.5px solid #a0b8e0", background: "#fff", color: "#185FA5" }}>
            <i className="ti ti-message-circle" style={{ fontSize: 14 }} aria-hidden="true" /> {t.line_btn}
          </div>
          <div style={{ gridColumn: "1/-1", borderRadius: 8, padding: 9, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, cursor: "pointer", fontSize: 11, fontWeight: 500, border: "0.5px solid #e8c0c8", background: "#fff", color: "#550a19" }}>
            <i className="ti ti-link" style={{ fontSize: 14 }} aria-hidden="true" /> {t.copy_link}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── หน้าหลัก: รายการ + ปุ่มสร้างใหม่ ★ เชื่อม API จริง ───────────────────
export default function AnakynQuotation({ navigate }) {
  const nav = navigate || function(){};
  const [lang, setLang] = useState("th");
  const t = T_QT[lang];

  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stockList, setStockList] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [mode, setMode] = useState("list"); // list | new | view
  const [viewing, setViewing] = useState(null);

  useEffect(() => {
    Promise.all([api.getQuotations(), api.getProducts(), api.getCustomers()])
      .then(([q, p, c]) => { setQuotations(q); setStockList(p); setCustomers(c); })
      .finally(() => setLoading(false));
  }, []);

  const handleStatusChange = async (id, status) => {
    try {
      const updated = await api.updateQuotationStatus(id, status);
      setQuotations((prev) => prev.map((q) => q.id === id ? { ...q, ...updated } : q));
      setViewing((prev) => ({ ...prev, ...updated }));
    } catch (err) { alert(err.message); }
  };

  const handleQuotationUpdated = (updated) => {
    setQuotations((prev) => prev.map((q) => q.id === updated.id ? { ...q, ...updated } : q));
    setViewing((prev) => ({ ...prev, ...updated }));
  };

  const openQuotation = async (q) => {
    setViewing(q); setMode("view");
    try {
      const full = await api.getQuotation(q.id);
      setViewing(full);
    } catch (err) { /* เก็บข้อมูลจาก list ไว้ก็พอถ้าโหลดละเอียดไม่สำเร็จ */ }
  };

  if (mode === "new") {
    return <QuotationBuilder lang={lang} setLang={setLang} customers={customers} stockList={stockList}
      onBack={()=>setMode("list")}
      onSaved={(newQt)=>{ setQuotations(prev=>[newQt,...prev]); setMode("list"); }} />;
  }
  if (mode === "view" && viewing) {
    return <QuotationView quotation={viewing} lang={lang} setLang={setLang} onBack={()=>setMode("list")} onStatusChange={handleStatusChange} onUpdated={handleQuotationUpdated} />;
  }

  return (
    <div style={{width:360,margin:"0 auto",background:"#f9f4f5",borderRadius:32,overflow:"hidden",border:"1.5px solid #c8a8b0",fontFamily:"'Anthropic Sans',sans-serif"}}>
      <div style={{background:"#550a19",padding:"10px 20px 4px"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,paddingBottom:12,paddingTop:8}}>
          <div onClick={()=>nav("home")} style={{width:32,height:32,borderRadius:"50%",background:"rgba(255,255,255,0.12)",display:"flex",alignItems:"center",justifyContent:"center",color:"#f0d0d8",fontSize:15,cursor:"pointer"}}>
            <i className="ti ti-arrow-left" aria-hidden="true" />
          </div>
          <span style={{fontSize:16,fontWeight:500,color:"#fff5f7",flex:1}}>{t.badge}</span>
          <button onClick={()=>setLang(l=>l==="th"?"en":"th")}
            style={{background:"rgba(255,255,255,0.15)",border:"0.5px solid rgba(255,255,255,0.3)",borderRadius:8,padding:"4px 10px",fontSize:12,color:"#f5e0e5",cursor:"pointer",fontFamily:"inherit"}}>
            {t.langBtn}
          </button>
        </div>
      </div>

      <div style={{padding:"14px 16px",overflowY:"auto",maxHeight:700}}>
        <button onClick={()=>setMode("new")}
          style={{width:"100%",background:"#550a19",border:"none",borderRadius:10,padding:12,fontSize:13,fontWeight:500,color:"#fff",cursor:"pointer",fontFamily:"inherit",marginBottom:14,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
          <i className="ti ti-plus" style={{fontSize:14}} aria-hidden="true"/>{t.new_title}
        </button>

        <div style={{fontSize:12,fontWeight:500,color:"#550a19",marginBottom:8}}>
          {t.list_title} {!loading && `(${quotations.length})`}
        </div>
        {loading && <div style={{fontSize:12,color:"#a07080"}}>{t.loading}</div>}

        {!loading && quotations.map((q) => {
          const STATUS_LABEL = { pending:t.status_pending, accepted:t.status_accept, rejected:t.status_reject, expired:t.status_expired };
          const STATUS_COLOR = { pending:["#fff8e1","#854F0B"], accepted:["#e8f5e9","#1a5c28"], rejected:["#fdf0f2","#a32d2d"], expired:["#f5f5f5","#666"] };
          const [bg, col] = STATUS_COLOR[q.status] || ["#f5f5f5","#666"];
          return (
            <div key={q.id} onClick={()=>openQuotation(q)}
              style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8d5d9",padding:"10px 12px",marginBottom:7,cursor:"pointer"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:12,fontWeight:500,color:"#550a19"}}>{q.quote_no}</span>
                <span style={{fontSize:13,fontWeight:500,color:"#2c1015"}}>฿{fmt_qt(q.total)}</span>
              </div>
              <div style={{fontSize:11,color:"#a07080",marginBottom:6}}>
                {q.customer_name || t.no_customer} · {lang==="th"?"ถึง":"until"} {new Date(q.valid_until).toLocaleDateString("th-TH")}
              </div>
              <span style={{fontSize:10,fontWeight:500,background:bg,color:col,borderRadius:20,padding:"2px 9px"}}>{STATUS_LABEL[q.status]}</span>
            </div>
          );
        })}

        {!loading && quotations.length === 0 && (
          <div style={{fontSize:12,color:"#a07080",textAlign:"center",padding:"20px 0"}}>{t.no_quotations}</div>
        )}
      </div>
    </div>
  );
}
