// ═══════════════════════════════════════════════════════════════
// AnakynPurchaseOrder.jsx — เชื่อมกับ Backend จริง (เอกสารทางการตามต้นฉบับ AppPreview)
// from/to parties, ที่อยู่จัดส่ง, เงื่อนไขการสั่งซื้อ, หมายเหตุพิเศษ, สถานะ, ลายเซ็น
// ═══════════════════════════════════════════════════════════════
import { useState, useEffect } from "react";
import { api } from "./api"; // ★ เชื่อม API

const T_PO = {
  th: {
    langBtn: "EN", print: "ปริ้น",
    po_badge: "ใบสั่งซื้อ", po_ordered: "วันที่สั่ง", po_needed: "ต้องการภายใน",
    po_approver: "ผู้อนุมัติ", po_from: "ผู้สั่งซื้อ", po_to: "Supplier",
    po_deliver: "จัดส่งถึงที่",
    po_items: "รายการสั่งซื้อ", po_col_item: "รายการ", po_col_qty: "จำนวน",
    po_col_unit: "หน่วย", po_col_total: "รวม",
    po_before_vat: "รวมก่อน VAT", po_vat: "VAT 7%", po_grand: "ยอดสั่งซื้อรวม",
    po_conditions: "เงื่อนไขการสั่งซื้อ",
    po_note: "หมายเหตุพิเศษ",
    po_status: "สถานะ",
    po_sig_approver: "ผู้อนุมัติสั่งซื้อ", po_sig_supplier: "Supplier รับทราบ",
    po_sig_pending: "ยังไม่ได้ยืนยัน",
    po_footer: "Anakyn Gems Co., Ltd. · anakyngems.com · Tel. 02-XXX-XXXX",
    po_line: "ส่ง PO ให้ Supplier",
    po_buyer_sub: "123 ถ.สีลม บางรัก<br>กรุงเทพฯ 10500<br>TAX ID: 0-1055-65432-10-0",
    list_title: "ใบสั่งซื้อทั้งหมด", new_title: "สร้างใบสั่งซื้อใหม่",
    select_supplier: "เลือก Supplier", new_supplier: "+ เพิ่ม Supplier ใหม่",
    supplier_name_ph: "ชื่อ Supplier", supplier_phone_ph: "เบอร์โทร",
    item_name_ph: "ชื่อสินค้า", qty_ph: "จำนวน", unit_ph: "หน่วย", price_ph: "ราคา/หน่วย",
    add_row: "เพิ่มแถว", create_btn: "สร้างใบสั่งซื้อ", creating: "กำลังสร้าง...",
    no_pos: "ยังไม่มีใบสั่งซื้อ", loading: "กำลังโหลด...", back: "ย้อนกลับ",
    need_items: "กรุณากรอกรายการสินค้าอย่างน้อย 1 รายการ",
    status_pending: "รอส่ง", status_sent: "ส่งแล้ว", status_received: "รับแล้ว", status_cancelled: "ยกเลิก",
  },
  en: {
    langBtn: "ไทย", print: "Print",
    po_badge: "PURCHASE ORDER", po_ordered: "Order date", po_needed: "Required by",
    po_approver: "Approved by", po_from: "Buyer", po_to: "Supplier",
    po_deliver: "Ship to",
    po_items: "Order items", po_col_item: "Item", po_col_qty: "Qty",
    po_col_unit: "Unit", po_col_total: "Total",
    po_before_vat: "Subtotal (before VAT)", po_vat: "VAT 7%", po_grand: "Purchase total",
    po_conditions: "Terms & Conditions",
    po_note: "Special instructions",
    po_status: "Status",
    po_sig_approver: "Approved by", po_sig_supplier: "Supplier acknowledgement",
    po_sig_pending: "Not yet confirmed",
    po_footer: "Anakyn Gems Co., Ltd. · anakyngems.com · Tel. 02-XXX-XXXX",
    po_line: "Send PO to Supplier",
    po_buyer_sub: "123 Silom Rd, Bang Rak<br>Bangkok 10500<br>TAX ID: 0-1055-65432-10-0",
    list_title: "All Purchase Orders", new_title: "Create new PO",
    select_supplier: "Select supplier", new_supplier: "+ Add new supplier",
    supplier_name_ph: "Supplier name", supplier_phone_ph: "Phone",
    item_name_ph: "Item name", qty_ph: "Qty", unit_ph: "Unit", price_ph: "Unit price",
    add_row: "Add row", create_btn: "Create PO", creating: "Creating...",
    no_pos: "No purchase orders yet", loading: "Loading...", back: "Back",
    need_items: "Add at least one item",
    status_pending: "Pending", status_sent: "Sent", status_received: "Received", status_cancelled: "Cancelled",
  },
};

const fmt_po = (n) => Math.round(Number(n)).toLocaleString("th-TH");

const Sec = ({ children }) => <div style={{ padding: "12px 14px", borderBottom: "0.5px solid #f0e4e8" }}>{children}</div>;
const SL = ({ children }) => <div style={{ fontSize: 9, color: "#a07080", letterSpacing: "1.5px", marginBottom: 8 }}>{children}</div>;
const TRow = ({ label, value, color = "#2c1015" }) => (
  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "3px 0" }}>
    <span style={{ color: "#806070" }}>{label}</span><span style={{ fontWeight: 500, color }}>{value}</span>
  </div>
);

// ── ฟอร์มสร้างใบสั่งซื้อใหม่ ★ เชื่อม API จริง ───────────────────────────
function POBuilder({ lang, setLang, onBack, onSaved, suppliers, setSuppliers }) {
  const t = T_PO[lang];
  const [supplierId, setSupplierId] = useState("");
  const [addingSupplier, setAddingSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierPhone, setNewSupplierPhone] = useState("");
  const [deliverVal, setDeliverVal] = useState("123 ถ.สีลม บางรัก กรุงเทพฯ 10500");
  const [conds, setConds] = useState([
    { key: "payment",  label: lang==="th"?"เงื่อนไขชำระ":"Payment",  val: lang==="th"?"30% มัดจำ · 70% รับของ":"30% deposit · 70% on delivery" },
    { key: "shipping", label: lang==="th"?"การจัดส่ง":"Shipping", val: lang==="th"?"จัดส่งถึงร้าน ฟรี":"Free delivery to store" },
    { key: "warranty", label: lang==="th"?"รับประกัน":"Warranty", val: lang==="th"?"คืนได้ภายใน 7 วัน":"7-day return policy" },
    { key: "currency", label: lang==="th"?"สกุลเงิน":"Currency", val: lang==="th"?"บาทไทย (THB)":"Thai Baht (THB)" },
  ]);
  const [noteVal, setNoteVal] = useState(lang==="th"
    ? "แนบใบรับรอง GIA / Hallmark ทุกชิ้น · ห่อบุ๊บเบิ้ลแรปแยกชิ้น · แจ้ง tracking ทาง LINE: @anakyngems"
    : "Attach GIA / Hallmark certificates · Bubble-wrap each piece · Send tracking via LINE: @anakyngems");
  const [items, setItems] = useState([{ item_name:"", unit:"บาท", qty:1, unit_price:0 }]);
  const [neededBy, setNeededBy] = useState("");
  const [vatOn, setVatOn] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const updateCond = (key, val) => setConds(cs => cs.map(c => c.key === key ? { ...c, val } : c));
  const updateItem = (idx, key, val) => setItems((prev) => prev.map((it,i)=> i===idx ? {...it,[key]:val} : it));
  const addRow = () => setItems((prev) => [...prev, { item_name:"", unit:"บาท", qty:1, unit_price:0 }]);
  const removeRow = (idx) => setItems((prev) => prev.filter((_,i)=>i!==idx));

  const subtotal = items.reduce((s, it) => s + (parseFloat(it.unit_price)||0) * (parseFloat(it.qty)||0), 0);
  const vatAmt = vatOn ? Math.round(subtotal*0.07) : 0;
  const grandPO = subtotal + vatAmt;

  const selectedSupplier = suppliers.find(s => s.id === supplierId);

  // ★ เชื่อม API — เพิ่ม supplier ใหม่จริง
  const handleAddSupplier = async () => {
    if (!newSupplierName.trim()) return;
    try {
      const newSup = await api.createSupplier({ name: newSupplierName, phone: newSupplierPhone });
      setSuppliers((prev) => [...prev, newSup]);
      setSupplierId(newSup.id);
      setAddingSupplier(false); setNewSupplierName(""); setNewSupplierPhone("");
    } catch (err) {
      setError(err.message);
    }
  };

  // ★ เชื่อม API — สร้างใบสั่งซื้อจริง
  const handleSave = async () => {
    const validItems = items.filter((it) => it.item_name.trim() !== "");
    if (validItems.length === 0) { setError(t.need_items); return; }
    setSaving(true); setError("");
    try {
      const newPO = await api.createPurchaseOrder({
        supplier_id: supplierId || null,
        items: validItems.map((it) => ({ ...it, qty: parseFloat(it.qty), unit_price: parseFloat(it.unit_price) })),
        needed_by: neededBy || null,
        vat_enabled: vatOn,
      });
      onSaved(newPO);
    } catch (err) {
      setError(err.message || "ไม่สามารถสร้างใบสั่งซื้อได้");
    } finally {
      setSaving(false);
    }
  };

  const inpStyle = { background: "transparent", border: "none", outline: "none", fontFamily: "inherit", color: "#2c1015", width: "100%", padding: 0, fontSize: 11 };

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
            <div style={{ textAlign: "right", paddingRight: 70 }}>
              <div style={{ display: "inline-block", background: "rgba(255,255,255,0.12)", border: "0.5px solid rgba(255,255,255,0.25)", borderRadius: 20, padding: "4px 12px", fontSize: 10, color: "#f0d0d8", letterSpacing: 2, marginBottom: 4 }}>{t.po_badge}</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#fff5f7" }}>{lang==="th"?"ฉบับร่าง":"Draft"}</div>
            </div>
          </div>
          <button onClick={() => setLang(l => l === "th" ? "en" : "th")}
            style={{ position: "absolute", top: 14, right: 16, background: "rgba(255,255,255,0.15)", border: "0.5px solid rgba(255,255,255,0.3)", borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 500, color: "#f5e0e5", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
            <i className="ti ti-language" style={{ fontSize: 13 }} aria-hidden="true" />{t.langBtn}
          </button>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, background: "rgba(255,255,255,0.08)", borderRadius: "8px 8px 0 0", padding: "10px 12px" }}>
            {[[t.po_ordered, new Date().toLocaleDateString("th-TH")], [t.po_needed, neededBy?new Date(neededBy).toLocaleDateString("th-TH"):"—"], [t.po_approver, "—"]].map(([l,v],i)=>(
              <div key={l} style={{ textAlign: i === 2 ? "right" : "left" }}>
                <div style={{ fontSize: 9, color: "#d4a0ac", letterSpacing: 1 }}>{l}</div>
                <div style={{ fontSize: 11, fontWeight: 500, color: "#f5e8eb", marginTop: 1 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "0.5px solid #f0e4e8" }}>
          <div style={{ padding: "11px 14px", borderRight: "0.5px solid #f0e4e8" }}>
            <div style={{ fontSize: 9, color: "#a07080", letterSpacing: "1.5px", marginBottom: 5 }}>{t.po_from}</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: "#2c1015" }}>Anakyn Gems Co., Ltd.</div>
            <div style={{ fontSize: 10, color: "#a07080", lineHeight: 1.5, marginTop: 2 }} dangerouslySetInnerHTML={{ __html: t.po_buyer_sub }} />
          </div>
          <div style={{ padding: "11px 14px" }}>
            <div style={{ fontSize: 9, color: "#a07080", letterSpacing: "1.5px", marginBottom: 5 }}>{t.po_to}</div>
            {!addingSupplier ? (
              <>
                <select value={supplierId} onChange={(e)=> e.target.value==="__new__" ? setAddingSupplier(true) : setSupplierId(e.target.value)}
                  style={{width:"100%",fontSize:12,fontWeight:500,color:"#2c1015",border:"0.5px solid #e8d5d9",borderRadius:6,padding:"4px 6px",fontFamily:"inherit",outline:"none",marginBottom:4}}>
                  <option value="">{t.select_supplier}</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  <option value="__new__">{t.new_supplier}</option>
                </select>
                <div style={{ fontSize: 10, color: "#a07080" }}>{selectedSupplier?.phone || "—"}</div>
              </>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:5}}>
                <input value={newSupplierName} onChange={(e)=>setNewSupplierName(e.target.value)} placeholder={t.supplier_name_ph}
                  style={{fontSize:11,border:"0.5px solid #e8d5d9",borderRadius:6,padding:"5px 7px",fontFamily:"inherit",outline:"none"}} />
                <input value={newSupplierPhone} onChange={(e)=>setNewSupplierPhone(e.target.value)} placeholder={t.supplier_phone_ph}
                  style={{fontSize:11,border:"0.5px solid #e8d5d9",borderRadius:6,padding:"5px 7px",fontFamily:"inherit",outline:"none"}} />
                <button onClick={handleAddSupplier} style={{fontSize:10,background:"#550a19",color:"#fff",border:"none",borderRadius:6,padding:"5px 0",cursor:"pointer"}}>OK</button>
              </div>
            )}
          </div>
        </div>

        <Sec>
          <div style={{ background: "#f0f4ff", borderLeft: "3px solid #3060a0", borderRadius: "0 6px 6px 0", padding: "9px 12px", display: "flex", gap: 10, alignItems: "flex-start" }}>
            <i className="ti ti-truck-delivery" style={{ fontSize: 18, color: "#3060a0", flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: "#3060a0", fontWeight: 500, marginBottom: 4 }}>{t.po_deliver}</div>
              <input value={deliverVal} onChange={e => setDeliverVal(e.target.value)} style={{ ...inpStyle, color: "#1a3a60" }} />
            </div>
          </div>
        </Sec>

        <Sec>
          <SL>{t.po_items}</SL>
          {items.map((it, idx) => (
            <div key={idx} style={{display:"flex",gap:6,marginBottom:6,alignItems:"center"}}>
              <input value={it.item_name} onChange={(e)=>updateItem(idx,"item_name",e.target.value)}
                placeholder={t.item_name_ph} style={{flex:2,fontSize:12,border:"0.5px solid #e8d5d9",borderRadius:6,padding:"6px 8px",fontFamily:"inherit",outline:"none"}} />
              <input type="number" value={it.qty} onChange={(e)=>updateItem(idx,"qty",e.target.value)}
                placeholder={t.qty_ph} style={{width:50,fontSize:12,border:"0.5px solid #e8d5d9",borderRadius:6,padding:"6px 6px",fontFamily:"inherit",outline:"none"}} />
              <input value={it.unit} onChange={(e)=>updateItem(idx,"unit",e.target.value)}
                placeholder={t.unit_ph} style={{width:50,fontSize:12,border:"0.5px solid #e8d5d9",borderRadius:6,padding:"6px 6px",fontFamily:"inherit",outline:"none"}} />
              <input type="number" value={it.unit_price} onChange={(e)=>updateItem(idx,"unit_price",e.target.value)}
                placeholder={t.price_ph} style={{width:65,fontSize:12,border:"0.5px solid #e8d5d9",borderRadius:6,padding:"6px 6px",fontFamily:"inherit",outline:"none"}} />
              <i className="ti ti-x" onClick={()=>removeRow(idx)} style={{fontSize:13,color:"#a32d2d",cursor:"pointer"}} aria-hidden="true" />
            </div>
          ))}
          <div onClick={addRow} style={{ fontSize: 11, color: "#550a19", cursor: "pointer", marginTop: 4, display:"flex",alignItems:"center",gap:4 }}>
            <i className="ti ti-plus" style={{fontSize:12}} aria-hidden="true"/>{t.add_row}
          </div>
          <input type="date" value={neededBy} onChange={(e)=>setNeededBy(e.target.value)}
            style={{width:"100%",fontSize:12,border:"0.5px solid #e8d5d9",borderRadius:6,padding:"6px 8px",fontFamily:"inherit",outline:"none",marginTop:8,boxSizing:"border-box"}} />
        </Sec>

        <Sec>
          <TRow label={t.po_before_vat} value={`฿${fmt_po(subtotal)}`} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0" }}>
            <span style={{ fontSize: 13, color: "#806070" }}>{t.po_vat}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: vatOn ? "#2c1015" : "#b08090" }}>{vatOn ? `฿${fmt_po(vatAmt)}` : "—"}</span>
              <div onClick={() => setVatOn(v => !v)} style={{ display: "flex", borderRadius: 20, overflow: "hidden", border: "0.5px solid #e8c0c8", cursor: "pointer" }}>
                {[["มี", true], ["ไม่มี", false]].map(([label, val]) => (
                  <span key={label} style={{ padding: "4px 11px", fontSize: 11, fontWeight: 500, background: vatOn === val ? "#550a19" : "#fff", color: vatOn === val ? "#f5e0e5" : "#a07080" }}>{label}</span>
                ))}
              </div>
            </div>
          </div>
        </Sec>
        <div style={{ background: "#550a19", padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "#f0d0d8" }}>{t.po_grand}</span>
          <span style={{ fontSize: 20, fontWeight: 500, color: "#fff5f7" }}>฿{fmt_po(grandPO)}</span>
        </div>

        <Sec>
          <SL>{t.po_conditions}</SL>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
            {conds.map((c) => (
              <div key={c.key} style={{ background: "#f9f4f5", borderRadius: 7, padding: "8px 9px", border: "0.5px solid #e8d5d9" }}>
                <div style={{ fontSize: 9, color: "#a07080", letterSpacing: 1, marginBottom: 3 }}>{c.label}</div>
                <input value={c.val} onChange={e => updateCond(c.key, e.target.value)} style={{ ...inpStyle, fontWeight: 500 }} />
              </div>
            ))}
          </div>
        </Sec>

        <Sec>
          <SL>{t.po_note}</SL>
          <textarea value={noteVal} onChange={e => setNoteVal(e.target.value)} rows={3}
            style={{ width: "100%", background: "#f9f4f5", border: "0.5px solid #e8d5d9", borderRadius: 7, padding: "8px 10px", fontSize: 11, color: "#806070", lineHeight: 1.6, fontFamily: "inherit", outline: "none", resize: "none", boxSizing: "border-box" }} />
        </Sec>

        {error && (
          <div style={{margin:"10px 14px",background:"#fdf0f2",border:"0.5px solid #e8c0c8",borderRadius:8,padding:"7px 10px",fontSize:11,color:"#a32d2d"}}>{error}</div>
        )}

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

// ── มุมมองดู PO ที่บันทึกแล้ว ★ เชื่อม API จริง ───────────────────────────
function POView({ po, lang, setLang, onBack, onStatusChange }) {
  const t = T_PO[lang];
  const [detail, setDetail] = useState(null);
  useEffect(() => { api.getPurchaseOrder(po.id).then(setDetail); }, [po.id]);

  const items = detail?.items || [];
  const statuses = [
    ["ti-clock", t.status_pending, "#fff8e1","#854F0B","#e8c060","pending"],
    ["ti-send", t.status_sent, "#e0f0ff","#1a3a60","#90b8d8","sent"],
    ["ti-package", t.status_received, "#e8f5e9","#2e7d32","#a8d8b0","received"],
  ];

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
            <div style={{ textAlign: "right", paddingRight: 70 }}>
              <div style={{ display: "inline-block", background: "rgba(255,255,255,0.12)", border: "0.5px solid rgba(255,255,255,0.25)", borderRadius: 20, padding: "4px 12px", fontSize: 10, color: "#f0d0d8", letterSpacing: 2, marginBottom: 4 }}>{t.po_badge}</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#fff5f7" }}>{po.po_no}</div>
            </div>
          </div>
          <button onClick={() => setLang(l => l === "th" ? "en" : "th")}
            style={{ position: "absolute", top: 14, right: 16, background: "rgba(255,255,255,0.15)", border: "0.5px solid rgba(255,255,255,0.3)", borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 500, color: "#f5e0e5", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
            <i className="ti ti-language" style={{ fontSize: 13 }} aria-hidden="true" />{t.langBtn}
          </button>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, background: "rgba(255,255,255,0.08)", borderRadius: "8px 8px 0 0", padding: "10px 12px" }}>
            {[[t.po_ordered, new Date(po.created_at).toLocaleDateString("th-TH")], [t.po_needed, po.needed_by?new Date(po.needed_by).toLocaleDateString("th-TH"):"—"], [t.po_approver,"—"]].map(([l,v],i)=>(
              <div key={l} style={{ textAlign: i === 2 ? "right" : "left" }}>
                <div style={{ fontSize: 9, color: "#d4a0ac", letterSpacing: 1 }}>{l}</div>
                <div style={{ fontSize: 11, fontWeight: 500, color: "#f5e8eb", marginTop: 1 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "0.5px solid #f0e4e8" }}>
          <div style={{ padding: "11px 14px", borderRight: "0.5px solid #f0e4e8" }}>
            <div style={{ fontSize: 9, color: "#a07080", letterSpacing: "1.5px", marginBottom: 5 }}>{t.po_from}</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: "#2c1015" }}>Anakyn Gems Co., Ltd.</div>
          </div>
          <div style={{ padding: "11px 14px" }}>
            <div style={{ fontSize: 9, color: "#a07080", letterSpacing: "1.5px", marginBottom: 5 }}>{t.po_to}</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: "#2c1015" }}>{po.supplier_name || "—"}</div>
          </div>
        </div>

        <Sec>
          <SL>{t.po_items}</SL>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 40px 44px 64px", gap: 4, fontSize: 9, color: "#a07080", letterSpacing: 1, paddingBottom: 5, borderBottom: "0.5px dashed #e8d5d9", marginBottom: 8 }}>
            <span>{t.po_col_item}</span><span style={{textAlign:"center"}}>{t.po_col_qty}</span><span style={{textAlign:"center"}}>{t.po_col_unit}</span><span style={{textAlign:"right"}}>{t.po_col_total}</span>
          </div>
          {items.map((item) => (
            <div key={item.id} style={{ display: "grid", gridTemplateColumns: "1fr 40px 44px 64px", gap: 4, marginBottom: 8, paddingBottom: 8, borderBottom: "0.5px solid #f9f4f5" }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "#2c1015" }}>{item.item_name}</div>
              <div style={{ fontSize: 12, color: "#2c1015", textAlign: "center" }}>{item.qty}</div>
              <div style={{ fontSize: 10, color: "#a07080", textAlign: "center" }}>{item.unit}</div>
              <div style={{ fontSize: 12, fontWeight: 500, color: "#550a19", textAlign: "right" }}>฿{fmt_po(item.line_total)}</div>
            </div>
          ))}
        </Sec>

        <Sec>
          <TRow label={t.po_before_vat} value={`฿${fmt_po(po.subtotal)}`} />
          <TRow label={t.po_vat} value={`฿${fmt_po(po.vat_amount)}`} />
        </Sec>
        <div style={{ background: "#550a19", padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "#f0d0d8" }}>{t.po_grand}</span>
          <span style={{ fontSize: 20, fontWeight: 500, color: "#fff5f7" }}>฿{fmt_po(po.total)}</span>
        </div>

        <Sec>
          <SL>{t.po_status}</SL>
          <div style={{ display: "flex", gap: 7 }}>
            {statuses.map(([icon,label,bg,col,border,key]) => (
              <div key={key} onClick={()=>onStatusChange(po.id, key)}
                style={{ flex: 1, borderRadius: 7, padding: "8px 4px", fontSize: 11, fontWeight: 500, textAlign: "center", cursor: "pointer", border: po.status===key?`1.5px solid ${col}`:`0.5px solid ${border}`, background: bg, color: col, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                <i className={`ti ${icon}`} style={{ fontSize: 12 }} aria-hidden="true" />{label}
              </div>
            ))}
          </div>
        </Sec>

        <div style={{ padding: "10px 14px", textAlign: "center", fontSize: 10, color: "#a07080" }}>{t.po_footer}</div>
      </div>
    </div>
  );
}

// ── หน้าหลัก ★ เชื่อม API จริง ────────────────────────────────────────────
export default function AnakynPurchaseOrder({ navigate }) {
  const nav = navigate || function(){};
  const [lang, setLang] = useState("th");
  const t = T_PO[lang];

  const [pos, setPos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState([]);
  const [mode, setMode] = useState("list");
  const [viewing, setViewing] = useState(null);

  useEffect(() => {
    Promise.all([api.getPurchaseOrders(), api.getSuppliers()])
      .then(([poList, sup]) => { setPos(poList); setSuppliers(sup); })
      .finally(() => setLoading(false));
  }, []);

  const handleStatusChange = async (id, status) => {
    try {
      const updated = await api.updatePOStatus(id, status);
      setPos((prev) => prev.map((p) => p.id === id ? updated : p));
      setViewing((prev) => prev && prev.id === id ? { ...prev, status } : prev);
    } catch (err) { alert(err.message); }
  };

  if (mode === "new") {
    return <POBuilder lang={lang} setLang={setLang} suppliers={suppliers} setSuppliers={setSuppliers}
      onBack={()=>setMode("list")} onSaved={(newPO)=>{ setPos(prev=>[newPO,...prev]); setMode("list"); }} />;
  }
  if (mode === "view" && viewing) {
    return <POView po={viewing} lang={lang} setLang={setLang} onBack={()=>setMode("list")} onStatusChange={handleStatusChange} />;
  }

  const STATUS_LABEL = { pending:t.status_pending, sent:t.status_sent, received:t.status_received, cancelled:t.status_cancelled };
  const STATUS_COLOR = { pending:["#fff8e1","#854F0B"], sent:["#e0f0ff","#1a3a60"], received:["#e8f5e9","#1a5c28"], cancelled:["#f5f5f5","#666"] };

  return (
    <div style={{width:360,margin:"0 auto",background:"#f9f4f5",borderRadius:32,overflow:"hidden",border:"1.5px solid #c8a8b0",fontFamily:"'Anthropic Sans',sans-serif"}}>
      <div style={{background:"#550a19",padding:"10px 20px 4px"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,paddingBottom:12,paddingTop:8}}>
          <div onClick={()=>nav("home")} style={{width:32,height:32,borderRadius:"50%",background:"rgba(255,255,255,0.12)",display:"flex",alignItems:"center",justifyContent:"center",color:"#f0d0d8",fontSize:15,cursor:"pointer"}}>
            <i className="ti ti-arrow-left" aria-hidden="true" />
          </div>
          <span style={{fontSize:16,fontWeight:500,color:"#fff5f7",flex:1}}>{t.po_badge}</span>
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
          {t.list_title} {!loading && `(${pos.length})`}
        </div>
        {loading && <div style={{fontSize:12,color:"#a07080"}}>{t.loading}</div>}

        {!loading && pos.map((po) => {
          const [bg, col] = STATUS_COLOR[po.status] || ["#f5f5f5","#666"];
          return (
            <div key={po.id} onClick={()=>{setViewing(po); setMode("view");}}
              style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8d5d9",padding:"10px 12px",marginBottom:7,cursor:"pointer"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:12,fontWeight:500,color:"#550a19"}}>{po.po_no}</span>
                <span style={{fontSize:13,fontWeight:500,color:"#2c1015"}}>฿{fmt_po(po.total)}</span>
              </div>
              <div style={{fontSize:11,color:"#a07080",marginBottom:6}}>{po.supplier_name || "ไม่ระบุผู้จัดส่ง"}</div>
              <span style={{fontSize:10,fontWeight:500,background:bg,color:col,borderRadius:20,padding:"2px 9px"}}>{STATUS_LABEL[po.status]}</span>
            </div>
          );
        })}

        {!loading && pos.length === 0 && (
          <div style={{fontSize:12,color:"#a07080",textAlign:"center",padding:"20px 0"}}>{t.no_pos}</div>
        )}
      </div>
    </div>
  );
}
