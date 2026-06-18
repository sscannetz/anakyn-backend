// ═══════════════════════════════════════════════════════════════
// AnakynServiceOrder.jsx — เชื่อมกับ Backend จริง (เอกสารทางการตามต้นฉบับ AppPreview)
// item source (สต๊อก/ถ่ายรูป), ตารางสภาพสินค้า, รายการงานซ่อม checklist, progress steps 5 ขั้น
// ═══════════════════════════════════════════════════════════════
import { useState, useEffect } from "react";
import { api } from "./api"; // ★ เชื่อม API

const T_SRV = {
  th: {
    langBtn: "EN", print: "ปริ้น",
    srv_badge: "ใบสั่งซ่อม", srv_received: "วันรับงาน", srv_pickup: "นัดรับคืน",
    srv_technician: "ช่างผู้รับ",
    srv_item_label: "สินค้าที่รับซ่อม", srv_item_value_label: "มูลค่าสินค้า", srv_warranty: "ประกัน",
    srv_condition: "สภาพสินค้าเมื่อรับ",
    srv_services_label: "รายการงานซ่อม",
    srv_add_service: "เพิ่มรายการงาน",
    srv_grand: "ยอดค่าบริการรวม", srv_free: "ฟรี",
    srv_status_label: "สถานะงานซ่อม",
    srv_appt: "นัดรับสินค้าคืน", srv_time: "เวลา",
    srv_sig_tech: "ช่างผู้รับงาน", srv_sig_customer: "ลูกค้าส่งซ่อม",
    srv_footer: "Anakyn Gems · งานซ่อมทุกชิ้นผ่าน QC ก่อนส่งคืน · anakyngems.com",
    srv_line: "แจ้งลูกค้าทาง LINE",
    search_stock: "ค้นหาจากสต๊อก", search_stock_sub: "SKU / ชื่อสินค้า",
    upload_photo: "อัพโหลดรูป", upload_photo_sub: "ถ่ายรูป / เลือกไฟล์",
    cancel: "ยกเลิก", change_item: "เปลี่ยนสินค้า", no_items_found: "ไม่พบสินค้า",
    tap_photo: "แตะเพื่อถ่ายรูป / เลือกไฟล์",
    select_customer: "เลือกลูกค้า", no_customer: "ไม่ระบุลูกค้า",
    list_title: "ใบสั่งซ่อมทั้งหมด", new_title: "สร้างใบสั่งซ่อมใหม่",
    technician_ph: "ชื่อช่าง", pickup_date_label: "วันนัดรับคืน",
    cond_labels: ["โครงแหวน","ที่ยึดเพชร","เพชรหลัก","ขนาดวง"],
    create_btn: "สร้างใบสั่งซ่อม", creating: "กำลังสร้าง...",
    no_services: "ยังไม่มีใบสั่งซ่อม", loading: "กำลังโหลด...", back: "ย้อนกลับ",
    steps: [
      { key:"received", label:"รับงาน", icon:"ti-check" },
      { key:"repairing", label:"ซ่อม", icon:"ti-tool" },
      { key:"qc", label:"QC", icon:"ti-eye" },
      { key:"notified", label:"แจ้ง", icon:"ti-bell" },
      { key:"picked_up", label:"รับคืน", icon:"ti-home" },
    ],
  },
  en: {
    langBtn: "ไทย", print: "Print",
    srv_badge: "SERVICE ORDER", srv_received: "Date received", srv_pickup: "Pickup date",
    srv_technician: "Technician",
    srv_item_label: "Item received for repair", srv_item_value_label: "Item value", srv_warranty: "Warranty",
    srv_condition: "Condition on receipt",
    srv_services_label: "Services",
    srv_add_service: "Add service",
    srv_grand: "Total service fee", srv_free: "Free",
    srv_status_label: "Repair status",
    srv_appt: "Pickup appointment", srv_time: "Time",
    srv_sig_tech: "Technician", srv_sig_customer: "Customer",
    srv_footer: "Anakyn Gems · All repairs QC-checked before return · anakyngems.com",
    srv_line: "Notify customer via LINE",
    search_stock: "Search from Stock", search_stock_sub: "SKU / Item name",
    upload_photo: "Upload Photo", upload_photo_sub: "Camera / File",
    cancel: "Cancel", change_item: "Change item", no_items_found: "No items found",
    tap_photo: "Tap to take photo / select file",
    select_customer: "Select customer", no_customer: "No customer",
    list_title: "All Service Orders", new_title: "Create new service order",
    technician_ph: "Technician name", pickup_date_label: "Pickup date",
    cond_labels: ["Ring shank","Prong setting","Main diamond","Ring size"],
    create_btn: "Create service order", creating: "Creating...",
    no_services: "No service orders yet", loading: "Loading...", back: "Back",
    steps: [
      { key:"received", label:"Received", icon:"ti-check" },
      { key:"repairing", label:"Repair", icon:"ti-tool" },
      { key:"qc", label:"QC", icon:"ti-eye" },
      { key:"notified", label:"Notify", icon:"ti-bell" },
      { key:"picked_up", label:"Pickup", icon:"ti-home" },
    ],
  },
};

const fmtSrv = (n) => Math.round(Number(n)).toLocaleString("th-TH");
const COND_STYLE = [
  { bg: "#fff8e1", border: "#e8c060", lc: "#8b4f00" },
  { bg: "#fff0f0", border: "#f0a0a0", lc: "#c62828" },
  { bg: "#e8f5e9", border: "#a8d8b0", lc: "#2e7d32" },
  { bg: "#f9f4f5", border: "#e8d5d9", lc: "#a07080" },
];

const Sec = ({ children, style = {} }) => <div style={{ padding: "12px 14px", borderBottom: "0.5px solid #f0e4e8", ...style }}>{children}</div>;
const SL = ({ children }) => <div style={{ fontSize: 9, color: "#a07080", letterSpacing: "1.5px", marginBottom: 8 }}>{children}</div>;

// ── ฟอร์มสร้างใบสั่งซ่อมใหม่ ★ เชื่อม API จริง ───────────────────────────
function ServiceOrderBuilder({ lang, setLang, onBack, onSaved, customers, stockList }) {
  const t = T_SRV[lang];
  const [customerId, setCustomerId] = useState("");
  const [itemMode, setItemMode] = useState("none"); // none | stock | photo
  const [stockQuery, setStockQuery] = useState("");
  const [stockPicked, setStockPicked] = useState(null);
  const [photoName, setPhotoName] = useState(null);
  const [technician, setTechnician] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("13:00 – 18:00");

  const [condVals, setCondVals] = useState(["", "", "", ""]);
  const updateCond = (i, val) => setCondVals(v => v.map((x, j) => j === i ? val : x));

  const [svcs, setSvcs] = useState([
    { id: 1, name: "", price: "", checked: true },
  ]);
  const [nextId, setNextId] = useState(2);
  const toggleSvc = (id) => setSvcs(s => s.map(x => x.id === id ? { ...x, checked: !x.checked } : x));
  const updateSvc = (id, k, v) => setSvcs(s => s.map(x => x.id === id ? { ...x, [k]: v } : x));
  const removeSvc = (id) => setSvcs(s => s.filter(x => x.id !== id));
  const addSvc = () => { setSvcs(s => [...s, { id: nextId, name: "", price: "", checked: true }]); setNextId(n => n + 1); };

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const filteredStock = stockQuery.trim() === "" ? stockList
    : stockList.filter(s => s.name.toLowerCase().includes(stockQuery.toLowerCase()) || s.sku.toLowerCase().includes(stockQuery.toLowerCase()));
  const resetItem = () => { setItemMode("none"); setStockQuery(""); setStockPicked(null); setPhotoName(null); };

  const isFree = (s) => !s.price || s.price.trim()==="" || /^ฟ|^free/i.test(s.price.trim());
  const checkedSvcs = svcs.filter(s => s.checked && s.name.trim()!=="");
  const warrantyItems = checkedSvcs.filter(isFree);
  const paidItems = checkedSvcs.filter(s => !isFree(s));
  const grandSrv = paidItems.reduce((acc,s)=>acc+(parseFloat(String(s.price).replace(/[^0-9.]/g,""))||0),0);

  const inpSrv = { background: "#f9f4f5", border: "0.5px solid #e8d5d9", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#2c1015", fontFamily: "inherit", outline: "none", width: "100%", boxSizing:"border-box" };

  // ★ เชื่อม API — สร้างใบสั่งซ่อมจริง
  const handleSave = async () => {
    setSaving(true); setError("");
    try {
      const newSO = await api.createServiceOrder({
        customer_id: customerId || null,
        product_id: stockPicked?.id || null,
        condition_notes: { labels: t.cond_labels, values: condVals },
        services: checkedSvcs.map(s => ({
          name: s.name, price: parseFloat(String(s.price).replace(/[^0-9.]/g,""))||0,
          is_warranty: isFree(s),
        })),
        pickup_date: pickupDate || null,
        technician: technician || null,
      });
      onSaved(newSO);
    } catch (err) {
      setError(err.message || "ไม่สามารถสร้างใบสั่งซ่อมได้");
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
            <div style={{ textAlign: "right", paddingRight: 70 }}>
              <div style={{ display: "inline-block", background: "rgba(255,255,255,0.12)", border: "0.5px solid rgba(255,255,255,0.25)", borderRadius: 20, padding: "4px 12px", fontSize: 10, color: "#f0d0d8", letterSpacing: 2, marginBottom: 4 }}>{t.srv_badge}</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#fff5f7" }}>{lang==="th"?"ฉบับร่าง":"Draft"}</div>
            </div>
          </div>
          <button onClick={() => setLang(l => l === "th" ? "en" : "th")}
            style={{ position: "absolute", top: 14, right: 16, background: "rgba(255,255,255,0.15)", border: "0.5px solid rgba(255,255,255,0.3)", borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 500, color: "#f5e0e5", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
            <i className="ti ti-language" style={{ fontSize: 13 }} aria-hidden="true" />{t.langBtn}
          </button>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, background: "rgba(255,255,255,0.08)", borderRadius: "8px 8px 0 0", padding: "10px 12px" }}>
            <div>
              <div style={{ fontSize: 9, color: "#d4a0ac", letterSpacing: 1 }}>{t.srv_received}</div>
              <div style={{ fontSize: 11, fontWeight: 500, color: "#f5e8eb", marginTop: 1 }}>{new Date().toLocaleDateString("th-TH")}</div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: "#d4a0ac", letterSpacing: 1 }}>{t.srv_pickup}</div>
              <input type="date" value={pickupDate} onChange={(e)=>setPickupDate(e.target.value)}
                style={{background:"transparent",border:"none",outline:"none",fontFamily:"inherit",fontSize:11,fontWeight:500,color:"#f5e8eb",marginTop:1,width:"100%"}} />
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{ fontSize: 9, color: "#d4a0ac", letterSpacing: 1 }}>{t.srv_technician}</div>
              <input value={technician} onChange={(e)=>setTechnician(e.target.value)} placeholder={t.technician_ph}
                style={{background:"transparent",border:"none",outline:"none",fontFamily:"inherit",fontSize:11,fontWeight:500,color:"#f5e8eb",marginTop:1,textAlign:"right",width:"100%"}} />
            </div>
          </div>
        </div>

        <Sec style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <select value={customerId} onChange={(e)=>setCustomerId(e.target.value)}
            style={{flex:1,fontSize:13,fontWeight:500,color:"#2c1015",border:"0.5px solid #e8d5d9",borderRadius:8,padding:"9px 10px",fontFamily:"inherit",outline:"none"}}>
            <option value="">{t.select_customer}</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
          </select>
        </Sec>

        <Sec>
          <SL>{t.srv_item_label}</SL>
          {itemMode === "none" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button onClick={() => setItemMode("stock")}
                style={{ background: "#fff", border: "0.5px solid #e8c0c8", borderRadius: 10, padding: "12px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer", fontFamily: "inherit" }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: "#fdf0f2", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className="ti ti-search" style={{ fontSize: 18, color: "#550a19" }} aria-hidden="true" />
                </div>
                <span style={{ fontSize: 12, fontWeight: 500, color: "#550a19" }}>{t.search_stock}</span>
                <span style={{ fontSize: 10, color: "#a07080" }}>{t.search_stock_sub}</span>
              </button>
              <button onClick={() => setItemMode("photo")}
                style={{ background: "#fff", border: "0.5px solid #e8c0c8", borderRadius: 10, padding: "12px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer", fontFamily: "inherit" }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: "#fdf0f2", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className="ti ti-camera" style={{ fontSize: 18, color: "#550a19" }} aria-hidden="true" />
                </div>
                <span style={{ fontSize: 12, fontWeight: 500, color: "#550a19" }}>{t.upload_photo}</span>
                <span style={{ fontSize: 10, color: "#a07080" }}>{t.upload_photo_sub}</span>
              </button>
            </div>
          )}

          {itemMode === "stock" && !stockPicked && (
            <div>
              <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                <div style={{ flex: 1, position: "relative" }}>
                  <i className="ti ti-search" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#b08090" }} aria-hidden="true" />
                  <input autoFocus value={stockQuery} onChange={e => setStockQuery(e.target.value)}
                    placeholder={lang === "th" ? "ค้นหา SKU / ชื่อสินค้า..." : "Search SKU / item name..."}
                    style={{ ...inpSrv, paddingLeft: 32 }} />
                </div>
                <button onClick={resetItem}
                  style={{ background: "#f9f4f5", border: "0.5px solid #e8d5d9", borderRadius: 8, padding: "0 10px", cursor: "pointer", fontSize: 12, color: "#a07080", fontFamily: "inherit" }}>{t.cancel}</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight:220, overflowY:"auto" }}>
                {filteredStock.length === 0 && <div style={{ fontSize: 12, color: "#b08090", padding: "8px 0" }}>{t.no_items_found}</div>}
                {filteredStock.map(item => (
                  <div key={item.id} onClick={() => setStockPicked(item)}
                    style={{ background: "#fff", border: "0.5px solid #e8d5d9", borderRadius: 10, padding: "10px 12px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: "#2c1015" }}>{item.name}</div>
                      <div style={{ fontSize: 10, color: "#a07080", marginTop: 2 }}>{item.sku} · {item.metal_type||"—"}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: "#550a19" }}>฿{fmtSrv(item.sale_price)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {itemMode === "stock" && stockPicked && (
            <div>
              <div style={{ border: "1.5px solid #550a19", borderRadius: 10, padding: "10px 12px", marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#2c1015" }}>{stockPicked.name}</div>
                    <div style={{ fontSize: 10, color: "#a07080", marginTop: 2 }}>{stockPicked.sku} · {stockPicked.metal_type||"—"}</div>
                  </div>
                  <button onClick={() => setStockPicked(null)}
                    style={{ width: 22, height: 22, borderRadius: "50%", background: "#fdf0f2", border: "0.5px solid #e8c0c8", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, marginLeft: 8 }}>
                    <i className="ti ti-x" style={{ fontSize: 10, color: "#550a19" }} aria-hidden="true" />
                  </button>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, paddingTop: 7, borderTop: "0.5px solid #f0e4e8" }}>
                  <div><div style={{ fontSize: 10, color: "#a07080" }}>{t.srv_item_value_label}</div><div style={{ fontSize: 12, fontWeight: 500, color: "#550a19" }}>฿{fmtSrv(stockPicked.sale_price)}</div></div>
                  <div style={{ textAlign: "right" }}><div style={{ fontSize: 10, color: "#a07080" }}>{t.srv_warranty}</div><div style={{ fontSize: 12, fontWeight: 500, color: "#2e7d32" }}>✓</div></div>
                </div>
              </div>
              <button onClick={resetItem}
                style={{ width: "100%", background: "#f9f4f5", border: "0.5px solid #e8d5d9", borderRadius: 8, padding: "7px", fontSize: 11, color: "#a07080", cursor: "pointer", fontFamily: "inherit" }}>{t.change_item}</button>
            </div>
          )}

          {itemMode === "photo" && (
            <div>
              <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, background: "#f9f4f5", border: "0.5px dashed #c8a0b0", borderRadius: 10, padding: "20px 12px", cursor: "pointer", marginBottom: 8 }}>
                <i className="ti ti-camera" style={{ fontSize: 28, color: photoName ? "#550a19" : "#c8a0b0" }} aria-hidden="true" />
                <span style={{ fontSize: 12, color: photoName ? "#550a19" : "#b08090", fontWeight: photoName ? 500 : 400, textAlign: "center" }}>{photoName || t.tap_photo}</span>
                <input type="file" accept="image/*" capture="environment" onChange={e => setPhotoName(e.target.files?.[0]?.name || null)} style={{ display: "none" }} />
              </label>
              <button onClick={resetItem}
                style={{ width: "100%", background: "#f9f4f5", border: "0.5px solid #e8d5d9", borderRadius: 8, padding: "7px", fontSize: 11, color: "#a07080", cursor: "pointer", fontFamily: "inherit" }}>{t.cancel}</button>
            </div>
          )}
        </Sec>

        <Sec>
          <SL>{t.srv_condition}</SL>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
            {t.cond_labels.map((label, i) => (
              <div key={label} style={{ borderRadius: 8, border: `0.5px solid ${COND_STYLE[i].border}`, background: COND_STYLE[i].bg }}>
                <div style={{ fontSize: 9, color: COND_STYLE[i].lc, letterSpacing: 0.5, padding: "7px 9px 2px" }}>{label}</div>
                <input value={condVals[i]} onChange={e => updateCond(i, e.target.value)} placeholder={lang==="th"?"พิมพ์สภาพ...":"Type condition..."}
                  style={{ background:"transparent",border:"none",outline:"none",fontFamily:"inherit",fontSize:11,color:"#2c1015",padding:"0 9px 7px",display:"block",width:"100%",boxSizing:"border-box" }} />
              </div>
            ))}
          </div>
        </Sec>

        <Sec>
          <SL>{t.srv_services_label}</SL>
          {svcs.map((s) => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 9px", borderRadius: 8, border: `0.5px solid ${s.checked ? "#550a19" : "#e8d5d9"}`, background: s.checked ? "#fdf5f7" : "#fff", marginBottom: 6 }}>
              <div onClick={() => toggleSvc(s.id)}
                style={{ width: 18, height: 18, borderRadius: 4, border: `0.5px solid ${s.checked ? "#550a19" : "#e8c0c8"}`, background: s.checked ? "#550a19" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer" }}>
                {s.checked && <i className="ti ti-check" style={{ fontSize: 11, color: "#fff" }} aria-hidden="true" />}
              </div>
              <input value={s.name} onChange={e => updateSvc(s.id, "name", e.target.value)} placeholder={lang === "th" ? "ชื่องานซ่อม..." : "Service name..."}
                style={{ background:"transparent",border:"none",outline:"none",fontFamily:"inherit",fontSize:12,fontWeight:500,color:"#2c1015",flex:1,padding:0 }} />
              <input value={s.price} onChange={e => updateSvc(s.id, "price", e.target.value)} placeholder="฿0"
                style={{ background:"transparent",border:"none",outline:"none",fontFamily:"inherit",fontSize:12,fontWeight:500,width:56,textAlign:"right",color: s.checked ? "#550a19" : "#a07080",padding:0 }} />
              <div onClick={() => removeSvc(s.id)}
                style={{ width: 18, height: 18, borderRadius: "50%", background: "#fdf0f2", border: "0.5px solid #e8c0c8", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                <i className="ti ti-x" style={{ fontSize: 10, color: "#550a19" }} aria-hidden="true" />
              </div>
            </div>
          ))}
          <div onClick={addSvc} style={{ border: "0.5px dashed #e8c0c8", borderRadius: 8, padding: 9, textAlign: "center", fontSize: 12, color: "#b08090", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
            <i className="ti ti-plus" style={{ fontSize: 13 }} aria-hidden="true" /> {t.srv_add_service}
          </div>
        </Sec>

        <Sec>
          {warrantyItems.length > 0 && (
            <div style={{ marginBottom: 6 }}>
              {warrantyItems.map(s => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#2e7d32", marginBottom: 2 }}>
                  <i className="ti ti-check" style={{ fontSize: 11, flexShrink: 0 }} aria-hidden="true" />{s.name} <span style={{marginLeft:"auto",fontWeight:500}}>{t.srv_free}</span>
                </div>
              ))}
              <div style={{ borderTop: "0.5px solid #f0e4e8", marginTop: 6 }} />
            </div>
          )}
          {paidItems.map(s => (
            <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, padding: "3px 0" }}>
              <span style={{ color: "#806070", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 8 }}>{s.name}</span>
              <span style={{ fontWeight: 500, color: "#2c1015", flexShrink: 0 }}>฿{fmtSrv(parseFloat(String(s.price).replace(/[^0-9.]/g,""))||0)}</span>
            </div>
          ))}
          {checkedSvcs.length === 0 && <div style={{ fontSize: 12, color: "#c0a0a8", padding: "4px 0" }}>—</div>}
        </Sec>
        <div style={{ background: "#550a19", padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "#f0d0d8" }}>{t.srv_grand}</span>
          <span style={{ fontSize: 20, fontWeight: 500, color: "#fff5f7" }}>฿{fmtSrv(grandSrv)}</span>
        </div>

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

// ── มุมมองดูใบสั่งซ่อมที่บันทึกแล้ว พร้อม progress steps ★ เชื่อม API จริง ─
function ServiceOrderView({ so, lang, setLang, onBack, onStatusChange }) {
  const t = T_SRV[lang];
  const services = Array.isArray(so.services) ? so.services : [];
  const condition = so.condition_notes && so.condition_notes.labels ? so.condition_notes : { labels: t.cond_labels, values: ["","","",""] };

  const stepOrder = ["received","repairing","qc","notified","picked_up"];
  const currentIdx = stepOrder.indexOf(so.status);

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
              <div style={{ display: "inline-block", background: "rgba(255,255,255,0.12)", border: "0.5px solid rgba(255,255,255,0.25)", borderRadius: 20, padding: "4px 12px", fontSize: 10, color: "#f0d0d8", letterSpacing: 2, marginBottom: 4 }}>{t.srv_badge}</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#fff5f7" }}>{so.service_no}</div>
            </div>
          </div>
          <button onClick={() => setLang(l => l === "th" ? "en" : "th")}
            style={{ position: "absolute", top: 14, right: 16, background: "rgba(255,255,255,0.15)", border: "0.5px solid rgba(255,255,255,0.3)", borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 500, color: "#f5e0e5", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
            <i className="ti ti-language" style={{ fontSize: 13 }} aria-hidden="true" />{t.langBtn}
          </button>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, background: "rgba(255,255,255,0.08)", borderRadius: "8px 8px 0 0", padding: "10px 12px" }}>
            {[[t.srv_received, new Date(so.received_at).toLocaleDateString("th-TH")], [t.srv_pickup, so.pickup_date?new Date(so.pickup_date).toLocaleDateString("th-TH"):"—"], [t.srv_technician, so.technician||"—"]].map(([l,v],i)=>(
              <div key={l} style={{ textAlign: i === 2 ? "right" : "left" }}>
                <div style={{ fontSize: 9, color: "#d4a0ac", letterSpacing: 1 }}>{l}</div>
                <div style={{ fontSize: 11, fontWeight: 500, color: "#f5e8eb", marginTop: 1 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        <Sec style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#550a19", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 500, color: "#f5e0e5", flexShrink: 0 }}>
            {(so.customer_name||"—").slice(0,2)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "#2c1015" }}>{so.customer_name || t.no_customer}</div>
            <div style={{ fontSize: 11, color: "#a07080", marginTop: 1 }}>{so.phone || "—"}</div>
          </div>
        </Sec>

        <Sec>
          <SL>{t.srv_item_label}</SL>
          <div style={{ fontSize: 13, fontWeight: 500, color: "#2c1015" }}>{so.product_name || "—"}</div>
          <div style={{ fontSize: 10, color: "#a07080", marginTop: 2 }}>{so.sku || "—"}</div>
        </Sec>

        <Sec>
          <SL>{t.srv_condition}</SL>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
            {condition.labels.map((label, i) => (
              <div key={label} style={{ borderRadius: 8, border: `0.5px solid ${COND_STYLE[i]?.border||"#e8d5d9"}`, background: COND_STYLE[i]?.bg||"#fff", padding:"7px 9px" }}>
                <div style={{ fontSize: 9, color: COND_STYLE[i]?.lc||"#a07080", letterSpacing: 0.5, marginBottom:2 }}>{label}</div>
                <div style={{ fontSize: 11, color: "#2c1015" }}>{condition.values[i] || "—"}</div>
              </div>
            ))}
          </div>
        </Sec>

        <Sec>
          <SL>{t.srv_services_label}</SL>
          {services.map((s,idx) => (
            <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "3px 0" }}>
              <span style={{ color: "#2c1015" }}>{s.name}</span>
              <span style={{ fontWeight: 500, color: s.is_warranty?"#2e7d32":"#550a19" }}>{s.is_warranty?t.srv_free:`฿${fmtSrv(s.price)}`}</span>
            </div>
          ))}
        </Sec>
        <div style={{ background: "#550a19", padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "#f0d0d8" }}>{t.srv_grand}</span>
          <span style={{ fontSize: 20, fontWeight: 500, color: "#fff5f7" }}>฿{fmtSrv(so.total_cost)}</span>
        </div>

        <Sec>
          <SL>{t.srv_status_label}</SL>
          <div style={{ display: "flex", alignItems: "center" }}>
            {t.steps.map((s, i) => {
              const state = i < currentIdx ? "done" : i === currentIdx ? "active" : "todo";
              return (
                <div key={s.key} style={{display:"flex",alignItems:"center",flex: i < t.steps.length-1 ? 1 : "none"}}>
                  <div onClick={()=>onStatusChange(so.id, s.key)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor:"pointer" }}>
                    <div style={{ width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, background: state === "done" ? "#550a19" : state === "active" ? "#fdf0f2" : "#f9f4f5", border: state === "active" ? "1.5px solid #550a19" : state === "todo" ? "0.5px solid #e8d5d9" : "none", color: state === "done" ? "#fff" : state === "active" ? "#550a19" : "#c0a0a8" }}>
                      <i className={`ti ${s.icon}`} style={{ fontSize: 12 }} aria-hidden="true" />
                    </div>
                    <div style={{ fontSize: 9, textAlign: "center", lineHeight: 1.3, color: state === "todo" ? "#c0a0a8" : "#550a19", fontWeight: state !== "todo" ? 500 : 400, whiteSpace:"nowrap" }}>{s.label}</div>
                  </div>
                  {i < t.steps.length - 1 && (
                    <div style={{ height: 1.5, flex: 1, background: i < currentIdx ? "#550a19" : "#e8d5d9", marginTop: -16 }} />
                  )}
                </div>
              );
            })}
          </div>
        </Sec>

        <Sec style={{ background: "#fff8e1", borderColor: "#f0d060" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div><div style={{ fontSize: 10, color: "#8b4f00", fontWeight: 500 }}>{t.srv_appt}</div><div style={{ fontSize: 13, fontWeight: 500, color: "#5a3000" }}>{so.pickup_date ? new Date(so.pickup_date).toLocaleDateString("th-TH") : "—"}</div></div>
          </div>
        </Sec>

        <div style={{ padding: "10px 14px", textAlign: "center", fontSize: 10, color: "#a07080" }}>{t.srv_footer}</div>
      </div>
    </div>
  );
}

// ── หน้าหลัก ★ เชื่อม API จริง ────────────────────────────────────────────
export default function AnakynServiceOrder({ navigate }) {
  const nav = navigate || function(){};
  const [lang, setLang] = useState("th");
  const t = T_SRV[lang];

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [stockList, setStockList] = useState([]);
  const [mode, setMode] = useState("list");
  const [viewing, setViewing] = useState(null);

  useEffect(() => {
    Promise.all([api.getServiceOrders(), api.getCustomers(), api.getProducts()])
      .then(([s, c, p]) => { setServices(s); setCustomers(c); setStockList(p); })
      .finally(() => setLoading(false));
  }, []);

  const handleStatusChange = async (id, status) => {
    try {
      const updated = await api.updateServiceStatus(id, status);
      setServices((prev) => prev.map((s) => s.id === id ? updated : s));
      setViewing(updated);
    } catch (err) { alert(err.message); }
  };

  if (mode === "new") {
    return <ServiceOrderBuilder lang={lang} setLang={setLang} customers={customers} stockList={stockList}
      onBack={()=>setMode("list")} onSaved={(newSO)=>{ setServices(prev=>[newSO,...prev]); setMode("list"); }} />;
  }
  if (mode === "view" && viewing) {
    return <ServiceOrderView so={viewing} lang={lang} setLang={setLang} onBack={()=>setMode("list")} onStatusChange={handleStatusChange} />;
  }

  const STATUS_LABEL = { received:"รับเรื่อง", repairing:"กำลังซ่อม", qc:"ตรวจสอบ", notified:"แจ้งลูกค้า", picked_up:"รับคืนแล้ว" };
  const STATUS_COLOR = { received:["#fff8e1","#854F0B"], repairing:["#e0f0ff","#1a3a60"], qc:["#f0eeff","#3c3489"], notified:["#fdf0f2","#7a1c2e"], picked_up:["#e8f5e9","#1a5c28"] };

  return (
    <div style={{width:360,margin:"0 auto",background:"#f9f4f5",borderRadius:32,overflow:"hidden",border:"1.5px solid #c8a8b0",fontFamily:"'Anthropic Sans',sans-serif"}}>
      <div style={{background:"#550a19",padding:"10px 20px 4px"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,paddingBottom:12,paddingTop:8}}>
          <div onClick={()=>nav("home")} style={{width:32,height:32,borderRadius:"50%",background:"rgba(255,255,255,0.12)",display:"flex",alignItems:"center",justifyContent:"center",color:"#f0d0d8",fontSize:15,cursor:"pointer"}}>
            <i className="ti ti-arrow-left" aria-hidden="true" />
          </div>
          <span style={{fontSize:16,fontWeight:500,color:"#fff5f7",flex:1}}>{t.srv_badge}</span>
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
          {t.list_title} {!loading && `(${services.length})`}
        </div>
        {loading && <div style={{fontSize:12,color:"#a07080"}}>{t.loading}</div>}

        {!loading && services.map((s) => {
          const [bg,col] = STATUS_COLOR[s.status]||["#f5f5f5","#666"];
          return (
            <div key={s.id} onClick={()=>{setViewing(s); setMode("view");}}
              style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8d5d9",padding:"10px 12px",marginBottom:7,cursor:"pointer"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:12,fontWeight:500,color:"#550a19"}}>{s.service_no}</span>
                <span style={{fontSize:13,fontWeight:500,color:"#2c1015"}}>฿{fmtSrv(s.total_cost)}</span>
              </div>
              <div style={{fontSize:11,color:"#a07080",marginBottom:6}}>{s.product_name||"—"} · {s.customer_name||t.no_customer}</div>
              <span style={{fontSize:10,fontWeight:500,background:bg,color:col,borderRadius:20,padding:"2px 9px"}}>{STATUS_LABEL[s.status]}</span>
            </div>
          );
        })}

        {!loading && services.length === 0 && (
          <div style={{fontSize:12,color:"#a07080",textAlign:"center",padding:"20px 0"}}>{t.no_services}</div>
        )}
      </div>
    </div>
  );
}
