// ═══════════════════════════════════════════════════════════════
// AnakynAddStock.jsx — เชื่อมกับ Backend จริง (เวอร์ชันเต็มตามต้นฉบับ AppPreview)
// SKU stepper, คำนวณราคาทอง/เงินอัตโนมัติ, เพชรหลายเม็ด, ใบ certificate GIA/IGI
// ทุก field บันทึกลง database จริงผ่าน api.createProduct
// ═══════════════════════════════════════════════════════════════
import { useState, useEffect, useRef } from "react";
import { api } from "./api"; // ★ เชื่อม API

const T_STOCK = {
  th: {
    pageTitle: "เพิ่มสินค้าใหม่", langToggle: "EN",
    skuSection: "รหัสสินค้า (SKU)", skuHint: "แก้เลขท้ายได้",
    skuMinus: "−1", skuReset: "รีเซ็ต", skuPlus: "+1",
    photoSection: "รูปสินค้า", photoHint: "ถ่ายรูป / อัพโหลด",
    photoTakeNew: "ถ่ายรูปใหม่", photoFromGallery: "เลือกจากคลังรูป",
    infoSection: "ข้อมูลทั่วไป",
    itemName: "ชื่อสินค้า", itemNamePh: "เช่น แหวนเพชร Solitaire",
    category: "หมวดหมู่", stockQty: "จำนวนในสต๊อก",
    laborCost: "ค่าแรงช่าง (บาท)",
    metalSection: "วัสดุโลหะ",
    goldPriceLabel: "ราคาทองคำ (กรอกเอง)", goldPriceUnit: "บาทละ 96.5%",
    silverPriceLabel: "ราคาเงิน 925 (กรอกเอง)", silverPriceUnit: "฿ / กรัม",
    actualWeight: "น้ำหนักจริง (g)", adjWeight: "น้ำหนัก +10% (g)",
    pricePerBaht: "ราคาที่ใช้คำนวณ", goldPerBaht: "/ บาทละ",
    pricePerGram: "ราคาต่อกรัม (96.5)", gramUnit: "/ g",
    adjWeightRow: "น้ำหนัก +10%",
    goldFactor: (k, f) => `× ${k} factor (${f}%)`,
    goldCostLabel: (k) => `ต้นทุนทอง ${k}`,
    silverSpotLabel: "ราคาเงิน 925 / กรัม",
    silverCostLabel: "ต้นทุนเงิน 925",
    diamondSection: "ข้อมูลเพชร",
    diamondMain: "(หลัก)", diamondSide: "(ข้าง)",
    diamondLabel: (n) => `เพชรเม็ดที่ ${n}`,
    dWeight: "น้ำหนัก (ct)", dQty: "จำนวน (เม็ด)",
    dShape: "ทรงเพชร", dColor: "สีเพชร (Color)", dClarity: "ความสะอาด (Clarity)",
    selectPh: "เลือก...", searchPh: "พิมพ์เพื่อค้นหา...", notFound: "ไม่พบตัวเลือก",
    certField: "ใบเซอร์ติฟิเคต (Certificate)",
    hasCert: "มีใบเซอร์", noCert: "ไม่มีใบเซอร์",
    certLab: "ออกโดย (Certificate Lab)",
    reportNo: "Report No.", reportPh: "เช่น 2486901234",
    certNote: "หมายเหตุ / รายละเอียดเพิ่มเติม", certNotePh: "พิมพ์หมายเหตุหรือรายละเอียดที่ต้องการบันทึก...",
    certUpload: "อัพโหลดไฟล์ใบเซอร์เพชร", certFilePh: "เลือกไฟล์ PDF / รูปภาพ",
    dCost: "ราคาต้นทุนเพชร (บาท)",
    addDiamond: "เพิ่มเพชรเม็ดถัดไป",
    summarySection: "สรุปราคา",
    metalCostRow: (k) => `ต้นทุนโลหะ (${k})`,
    diamondCostRow: "ต้นทุนเพชรรวม",
    laborCostRow: "ค่าแรงช่าง",
    totalCost: "ราคาทุนรวม",
    sellingPrice: "ราคาขาย (กรอกเอง)",
    profit: "กำไร",
    saveBtn: (sku) => `บันทึก ${sku} ลงสต๊อก`,
    saving: "กำลังบันทึก...",
    categories: ["แหวน","สร้อยคอ","ต่างหู","กำไล","จี้","อื่นๆ"],
    silverActualWeight: "น้ำหนักเงินจริง (g)",
    currentStock: "สต๊อกปัจจุบัน", saveSuccess: "บันทึกสินค้าเรียบร้อย ✓",
  },
  en: {
    pageTitle: "Add New Item", langToggle: "ไทย",
    skuSection: "Product Code (SKU)", skuHint: "Edit number as needed",
    skuMinus: "−1", skuReset: "Reset", skuPlus: "+1",
    photoSection: "Product Photo", photoHint: "Take photo / Upload",
    photoTakeNew: "Take new photo", photoFromGallery: "Choose from gallery",
    infoSection: "General Info",
    itemName: "Product Name", itemNamePh: "e.g. Solitaire Diamond Ring",
    category: "Category", stockQty: "Stock Qty",
    laborCost: "Labor Cost (THB)",
    metalSection: "Metal",
    goldPriceLabel: "Gold Price (manual)", goldPriceUnit: "per baht 96.5%",
    silverPriceLabel: "Silver 925 Price (manual)", silverPriceUnit: "฿ / gram",
    actualWeight: "Actual Weight (g)", adjWeight: "Weight +10% (g)",
    pricePerBaht: "Price Used", goldPerBaht: "/ baht",
    pricePerGram: "Price per gram (96.5)", gramUnit: "/ g",
    adjWeightRow: "Weight +10%",
    goldFactor: (k, f) => `× ${k} factor (${f}%)`,
    goldCostLabel: (k) => `Gold Cost ${k}`,
    silverSpotLabel: "Silver 925 / gram",
    silverCostLabel: "Silver 925 Cost",
    diamondSection: "Diamond Info",
    diamondMain: "(Main)", diamondSide: "(Side)",
    diamondLabel: (n) => `Diamond #${n}`,
    dWeight: "Weight (ct)", dQty: "Qty (pcs)",
    dShape: "Shape", dColor: "Color", dClarity: "Clarity",
    selectPh: "Select...", searchPh: "Type to search...", notFound: "No options found",
    certField: "Certificate",
    hasCert: "Has Certificate", noCert: "No Certificate",
    certLab: "Issued by (Lab)",
    reportNo: "Report No.", reportPh: "e.g. 2486901234",
    certNote: "Notes / Additional Details", certNotePh: "Type notes or additional info...",
    certUpload: "Upload Certificate File", certFilePh: "Select PDF / Image",
    dCost: "Diamond Cost (THB)",
    addDiamond: "Add Next Diamond",
    summarySection: "Price Summary",
    metalCostRow: (k) => `Metal Cost (${k})`,
    diamondCostRow: "Total Diamond Cost",
    laborCostRow: "Labor Cost",
    totalCost: "Total Cost",
    sellingPrice: "Selling Price (manual)",
    profit: "Profit",
    saveBtn: (sku) => `Save ${sku} to Stock`,
    saving: "Saving...",
    categories: ["Ring","Necklace","Earring","Bracelet","Pendant","Other"],
    silverActualWeight: "Actual Silver Weight (g)",
    currentStock: "Current Stock", saveSuccess: "Saved successfully ✓",
  },
};

const GOLD_BAHT_GRAMS = 15.244;
const GOLD_OPTIONS = [
  { key: "9K",  label: "9K",  factor: 0.50 },
  { key: "14K", label: "14K", factor: 0.75 },
  { key: "18K", label: "18K", factor: 0.90 },
];
const METAL_TABS = [
  { key: "9K",     label: "9K",     color: "#b87020", bg: "#fff8e8", border: "#e0c070", light: "#fffbf0" },
  { key: "14K",    label: "14K",    color: "#b87020", bg: "#fff8e8", border: "#e0c070", light: "#fffbf0" },
  { key: "18K",    label: "18K",    color: "#b87020", bg: "#fff8e8", border: "#e0c070", light: "#fffbf0" },
  { key: "silver", label: "Silver", color: "#3060a0", bg: "#f0f4ff", border: "#90b8d8", light: "#eef3ff" },
];
const SHAPES = [
  "Round Brilliant","Princess Cut","Cushion Cut","Emerald Cut","Asscher Cut",
  "Radiant Cut","Oval Cut","Pear Cut","Marquise Cut","Heart Cut",
  "Elongated Cushion Cut","Square Cushion Cut","Elongated Radiant Cut","Square Radiant Cut",
  "Moval Cut","Old Mine Cut","Old European Cut","Rose Cut","Cabochon Cut",
  "Trillion Cut","Trilliant Cut","Kite Cut","Shield Cut","Hexagon Cut",
  "Octagon Cut","Pentagon Cut","Lozenge Cut","Bullet Cut","Half Moon Cut",
  "Crescent Cut","Baguette Cut","Tapered Baguette Cut","French Cut",
  "Epaulette Cut","Briolette Cut","Triangle Cut",
];
const COLORS = [
  "D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z",
  "Fancy Yellow","Fancy Pink","Fancy Blue","Fancy Green","Fancy Orange",
  "Fancy Purple","Fancy Red","Fancy Brown","Fancy Black","Fancy Gray",
];
const CLARITY = ["FL","IF","VVS1","VVS2","VS1","VS2","SI1","SI2","I1","I2","I3"];

const initialDiamond = () => ({
  id: Date.now() + Math.random(),
  weight: "", qty: "1", shape: "", color: "", clarity: "",
  hasCert: false, certLab: "GIA", certNo: "", certNote: "", certFile: null,
  cost: "",
});

const fmt_stk = (n) => Number(n).toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const Field = ({ label, children }) => (
  <div style={{ marginBottom: 8 }}>
    <div style={{ fontSize: 11, color: "#a07080", marginBottom: 3 }}>{label}</div>
    {children}
  </div>
);

const Input = ({ value, onChange, placeholder, type = "text", style = {} }) => (
  <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
    style={{ width: "100%", background: "#f9f4f5", border: "0.5px solid #e8d5d9", borderRadius: 8, padding: "8px 10px", fontSize: 13, fontWeight: 500, color: "#2c1015", fontFamily: "inherit", outline: "none", boxSizing:"border-box", ...style }} />
);

const SecST = ({ children }) => (
  <div style={{ background: "#fff", borderRadius: 12, border: "0.5px solid #e8d5d9", padding: "12px 14px", marginBottom: 10 }}>
    {children}
  </div>
);

const SecHeadST = ({ icon, children, color = "#550a19" }) => (
  <div style={{ fontSize: 11, fontWeight: 500, color, letterSpacing: "1.5px", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
    <i className={`ti ti-${icon}`} style={{ fontSize: 14 }} aria-hidden="true" />{children}
  </div>
);

const Toggle = ({ on, onChange }) => (
  <div onClick={() => onChange(!on)}
    style={{ width: 36, height: 20, borderRadius: 10, background: on ? "#550a19" : "#e0d8da", position: "relative", cursor: "pointer", flexShrink: 0, transition: "background 0.2s" }}>
    <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: on ? 18 : 2, transition: "left 0.15s" }} />
  </div>
);

const CostBox = ({ rows, totalLabel, totalValue, bg, border, textColor, totalColor }) => (
  <div style={{ background: bg, borderRadius: 10, border: `0.5px solid ${border}`, padding: "10px 12px" }}>
    {rows.map(([l, v]) => (
      <div key={l} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: textColor }}>{l}</span>
        <span style={{ fontWeight: 500, color: textColor }}>{v}</span>
      </div>
    ))}
    <div style={{ borderTop: `0.5px solid ${border}`, marginTop: 6, paddingTop: 6, display: "flex", justifyContent: "space-between" }}>
      <span style={{ fontSize: 11, color: textColor }}>{totalLabel}</span>
      <span style={{ fontSize: 15, fontWeight: 500, color: totalColor }}>{totalValue}</span>
    </div>
  </div>
);

const SearchableDropdown = ({ value, onChange, options, placeholder, searchPh, notFound, accentColor = "#534AB7" }) => {
  const [query, setQuery] = useState("");
  const [open, setOpen]   = useState(false);
  const filtered = query.trim() === "" ? options : options.filter(o => o.toLowerCase().includes(query.toLowerCase()));
  return (
    <div style={{ position: "relative" }}>
      <div onClick={() => { setOpen(o => !o); setQuery(""); }}
        style={{ background: "#fdf0f2", border: `0.5px solid ${open ? accentColor : "#d4c8f0"}`,
          borderRadius: 8, padding: "8px 32px 8px 10px", fontSize: 13,
          color: value ? "#2c1015" : "#b09090", cursor: "pointer", position: "relative",
          userSelect: "none", fontWeight: value ? 500 : 400 }}>
        {value || placeholder}
        <i className={`ti ti-chevron-${open ? "up" : "down"}`}
          style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#a07080" }} aria-hidden="true" />
      </div>
      {open && (
        <div style={{ position: "absolute", zIndex: 999, top: "calc(100% + 4px)", left: 0, right: 0,
          background: "#fff", borderRadius: 10, border: `1px solid ${accentColor}`,
          boxShadow: "0 6px 20px rgba(0,0,0,0.12)", overflow: "hidden" }}>
          <div style={{ padding: "8px 10px", borderBottom: "0.5px solid #e8d5d9", display: "flex", alignItems: "center", gap: 6 }}>
            <i className="ti ti-search" style={{ fontSize: 13, color: "#a07080", flexShrink: 0 }} aria-hidden="true" />
            <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder={searchPh}
              style={{ border: "none", outline: "none", fontSize: 12, color: "#2c1015", background: "transparent", width: "100%", fontFamily: "inherit" }} />
          </div>
          <div style={{ maxHeight: 180, overflowY: "auto" }}>
            {filtered.length === 0
              ? <div style={{ padding: "10px 12px", fontSize: 12, color: "#a07080" }}>{notFound}</div>
              : filtered.map(o => (
                  <div key={o} onClick={() => { onChange(o); setOpen(false); setQuery(""); }}
                    style={{ padding: "9px 12px", fontSize: 13, cursor: "pointer",
                      background: value === o ? accentColor : "transparent",
                      color: value === o ? "#fff" : "#2c1015", fontWeight: value === o ? 500 : 400 }}
                    onMouseEnter={e => { if (value !== o) e.currentTarget.style.background = "#f4f0ff"; }}
                    onMouseLeave={e => { if (value !== o) e.currentTarget.style.background = "transparent"; }}>
                    {o}
                  </div>
                ))
            }
          </div>
        </div>
      )}
    </div>
  );
};

export default function AnakynAddStock({ navigate }) {
  const nav = navigate || function(){};
  const [lang, setLang] = useState("th");
  const t = T_STOCK[lang];

  // ★ เชื่อม API — โหลดสต๊อกจริงเพื่อรู้จำนวนรายการล่าสุด (ใช้ตั้ง SKU ถัดไป) และแสดงรายการท้ายหน้า
  const [stockList, setStockList] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState("");

  useEffect(() => {
    let mounted = true;
    api.getProducts()
      .then((data) => {
        if (!mounted) return;
        setStockList(data);
        setSkuNum(data.length + 1);
      })
      .catch((err) => { if (mounted) setListError(err.message); })
      .finally(() => { if (mounted) setLoadingList(false); });
    return () => { mounted = false; };
  }, []);

  const [skuNum, setSkuNum]           = useState(1);
  const [editingSku, setEditingSku]   = useState(false);
  const [skuInput, setSkuInput]       = useState("0001");

  const [goldPriceInput,   setGoldPriceInput]   = useState("67300");
  const [silverPriceInput, setSilverPriceInput] = useState("33.50");

  const [metalKey, setMetalKey]   = useState("18K");
  const [metalWeight, setMetalWeight] = useState("");
  const [laborCost, setLaborCost] = useState("");
  const [itemName, setItemName]   = useState("");
  const [category, setCategory]   = useState(t.categories[0]);
  const [qty, setQty]             = useState("1");
  const [diamonds, setDiamonds]   = useState([initialDiamond()]);
  const [sellingPrice, setSellingPrice] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ── รูปสินค้า: เก็บเป็น base64 ใน database (resize/compress ก่อนเพื่อไม่ให้ขนาดใหญ่เกินไป) ──
  const [photoDataUrl, setPhotoDataUrl] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPhotoError(lang === "th" ? "กรุณาเลือกไฟล์รูปภาพ" : "Please select an image file");
      return;
    }
    setPhotoError("");
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        // ย่อรูปให้ไม่เกิน 600px (ด้านที่ยาวที่สุด) แล้วบีบอัดเป็น JPEG คุณภาพ 0.75 ก่อนแปลงเป็น base64
        const maxSide = 600;
        let { width, height } = img;
        if (width > maxSide || height > maxSide) {
          if (width > height) { height = Math.round(height * (maxSide / width)); width = maxSide; }
          else { width = Math.round(width * (maxSide / height)); height = maxSide; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL("image/jpeg", 0.75);
        setPhotoDataUrl(compressed);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoDataUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  useEffect(() => { setCategory(T_STOCK[lang].categories[0]); }, [lang]);

  const isGold   = metalKey !== "silver";
  const isSilver = metalKey === "silver";
  const tab      = METAL_TABS.find(m => m.key === metalKey) || METAL_TABS[2];

  const activeGoldPrice   = parseFloat(goldPriceInput)   || 0;
  const activeSilverPrice = parseFloat(silverPriceInput) || 0;
  const metalWeightNum    = parseFloat(metalWeight)||0;
  const metalWeightAdj    = metalWeightNum * 1.1;
  const goldOpt           = GOLD_OPTIONS.find(o => o.key === metalKey) || GOLD_OPTIONS[2];
  const goldPricePerGram  = activeGoldPrice / GOLD_BAHT_GRAMS;
  const goldCost          = isGold   ? Math.round(metalWeightAdj * goldPricePerGram * goldOpt.factor) : 0;
  const silverCost        = isSilver ? Math.round(metalWeightAdj * activeSilverPrice) : 0;
  const metalCost         = isGold ? goldCost : silverCost;

  const diamondTotalCost = diamonds.reduce((s, d) => s + (parseFloat(d.cost)||0), 0);
  const totalCost        = metalCost + diamondTotalCost + (parseFloat(laborCost)||0);
  const skuLabel         = `ANAKYN#${String(skuNum).padStart(4,"0")}`;

  const addDiamond    = () => setDiamonds(ds => [...ds, initialDiamond()]);
  const removeDiamond = (id) => setDiamonds(ds => ds.filter(d => d.id !== id));
  const updD          = (id, k, v) => setDiamonds(ds => ds.map(d => d.id===id ? {...d,[k]:v} : d));

  const categoryMap = { "แหวน":"ring","สร้อยคอ":"necklace","ต่างหู":"earring","กำไล":"bracelet","จี้":"pendant","อื่นๆ":"other",
    "Ring":"ring","Necklace":"necklace","Earring":"earring","Bracelet":"bracelet","Pendant":"pendant","Other":"other" };

  // ★ เชื่อม API — กดบันทึก → ส่งทุก field ไป backend จริง รวมเพชรทุกเม็ด
  const handleSave = async () => {
    if (!itemName.trim() || totalCost <= 0 || !sellingPrice) {
      setSaveError(lang === "th" ? "กรุณากรอกชื่อสินค้าและราคาขายให้ครบ" : "Please fill in item name and selling price");
      return;
    }
    setSaving(true);
    setSaveError("");
    setSaveSuccess(false);
    try {
      const mainDiamond = diamonds[0] || {};
      const hasCertAny = diamonds.some((d) => d.hasCert);
      const payload = {
        sku: skuLabel,
        name: itemName,
        category: categoryMap[category] || "other",
        photo_url: photoDataUrl || null,
        metal_type: metalKey,
        metal_weight_g: metalWeightNum || null,
        metal_weight_adj_g: metalWeightNum > 0 ? metalWeightAdj : null,
        gold_price_at_creation: isGold ? activeGoldPrice : null,
        silver_price_at_creation: isSilver ? activeSilverPrice : null,
        metal_cost: metalCost,
        labor_cost: parseFloat(laborCost) || 0,
        diamonds: diamonds.filter((d) => d.weight || d.cost).map((d) => ({
          weight: parseFloat(d.weight) || 0, qty: parseInt(d.qty) || 1,
          shape: d.shape, color: d.color, clarity: d.clarity,
          hasCert: d.hasCert, certLab: d.certLab, certNo: d.certNo,
          certNote: d.certNote, cost: parseFloat(d.cost) || 0,
        })),
        diamond_total_cost: diamondTotalCost,
        has_certificate: hasCertAny,
        certificate_no: mainDiamond.certNo || null,
        cost_price: totalCost,
        sale_price: parseFloat(sellingPrice),
        stock_qty: parseInt(qty) || 1,
      };
      const newProduct = await api.createProduct(payload);
      setStockList((prev) => [newProduct, ...prev]);
      setSaveSuccess(true);
      setSkuNum((n) => n + 1);
      setItemName(""); setMetalWeight(""); setLaborCost(""); setSellingPrice("");
      setDiamonds([initialDiamond()]); setQty("1");
      handleRemovePhoto();
    } catch (err) {
      setSaveError(err.message || "ไม่สามารถบันทึกสินค้าได้");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ width: 360, margin: "0 auto", background: "#f9f4f5", borderRadius: 32, overflow: "hidden", border: "1.5px solid #c8a8b0", fontFamily: "'Anthropic Sans', sans-serif" }}>

      <div style={{ background: "#550a19", padding: "10px 20px 4px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ color: "#f0d0d8", fontSize: 11, fontWeight: 500 }}>9:41</span>
          <span style={{ display: "flex", gap: 6 }}>
            <i className="ti ti-wifi"      style={{ fontSize: 13, color: "#f0d0d8" }} aria-hidden="true" />
            <i className="ti ti-battery-2" style={{ fontSize: 13, color: "#f0d0d8" }} aria-hidden="true" />
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 12 }}>
          <div onClick={() => nav("home")} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "#f0d0d8", fontSize: 15, cursor:"pointer" }}>
            <i className="ti ti-arrow-left" aria-hidden="true" />
          </div>
          <span style={{ fontSize: 16, fontWeight: 500, color: "#fff5f7", flex: 1, letterSpacing: 0.5 }}>{t.pageTitle}</span>
          <button onClick={() => setLang(l => l === "th" ? "en" : "th")}
            style={{ background: "rgba(255,255,255,0.15)", border: "0.5px solid rgba(255,255,255,0.3)", borderRadius: 8,
              padding: "4px 10px", fontSize: 12, fontWeight: 500, color: "#f5e0e5", cursor: "pointer",
              fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
            <i className="ti ti-language" style={{ fontSize: 13 }} aria-hidden="true" />
            {t.langToggle}
          </button>
        </div>
      </div>

      <div style={{ padding: "14px 16px", overflowY: "auto", maxHeight: 700 }}>

        {saveError && (
          <div style={{background:"#fdf0f2",border:"0.5px solid #e8c0c8",borderRadius:8,padding:"8px 12px",marginBottom:10,fontSize:12,color:"#a32d2d"}}>
            {saveError}
          </div>
        )}
        {saveSuccess && (
          <div style={{background:"#e8f5e9",border:"0.5px solid #a8d8b0",borderRadius:8,padding:"8px 12px",marginBottom:10,fontSize:12,color:"#1a5c28"}}>
            {t.saveSuccess}
          </div>
        )}

        <SecST>
          <SecHeadST icon="barcode">{t.skuSection}</SecHeadST>
          <div style={{ fontSize: 10, color: "#a07080", marginBottom: 6 }}>{t.skuHint}</div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
            <div style={{ background: "#550a19", color: "#f5e0e5", borderRadius: 8, padding: "8px 10px", fontSize: 12, fontWeight: 500, whiteSpace: "nowrap" }}>ANAKYN</div>
            {editingSku
              ? <input autoFocus value={skuInput}
                  onChange={e => setSkuInput(e.target.value.replace(/\D/g,"").slice(0,4))}
                  onBlur={() => { setSkuNum(parseInt(skuInput)||skuNum); setEditingSku(false); }}
                  style={{ flex:1, background:"#fdf0f2", border:"1.5px solid #c8a0b0", borderRadius:8, padding:"8px 10px", fontSize:16, fontWeight:500, color:"#550a19", textAlign:"center", fontFamily:"inherit", outline:"none" }} />
              : <div onClick={() => { setSkuInput(String(skuNum).padStart(4,"0")); setEditingSku(true); }}
                  style={{ flex:1, background:"#fdf0f2", border:"0.5px solid #c8a0b0", borderRadius:8, padding:"8px 10px", fontSize:16, fontWeight:500, color:"#550a19", textAlign:"center", cursor:"text", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span>#{String(skuNum).padStart(4,"0")}</span>
                  <i className="ti ti-pencil" style={{ fontSize:13, color:"#c8a0b0" }} aria-hidden="true" />
                </div>
            }
          </div>
          <div style={{ display:"flex", gap:6 }}>
            {[[t.skuMinus, ()=>setSkuNum(n=>Math.max(1,n-1))],[t.skuReset,()=>setSkuNum(stockList.length+1)],[t.skuPlus,()=>setSkuNum(n=>n+1)]].map(([l,fn],i)=>(
              <button key={l} onClick={fn} style={{ flex:1, background: i===2?"#fdf0f2":"#f9f4f5", border:"0.5px solid #e8d5d9", borderRadius:8, padding:"7px 4px", fontSize:12, color: i===2?"#550a19":"#a07080", cursor:"pointer", fontFamily:"inherit" }}>{l}</button>
            ))}
          </div>
        </SecST>

        <SecST>
          <SecHeadST icon="camera">{t.photoSection}</SecHeadST>
          {/* input ปกติ — เลือกไฟล์จากคลังรูปในเครื่อง */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoSelect}
            style={{ display: "none" }}
          />
          {/* input ถ่ายรูป — capture="environment" บังคับเปิดกล้องสดบนมือถือ (เบราว์เซอร์คอมพิวเตอร์จะข้ามแอตทริบิวต์นี้ไปและเปิด file picker ปกติแทน) */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoSelect}
            style={{ display: "none" }}
          />

          {photoDataUrl ? (
            <div style={{ position: "relative" }}>
              <img src={photoDataUrl} alt="" style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: 10, border: "0.5px solid #e8d5d9" }} />
              <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 6 }}>
                <button onClick={() => setPhotoMenuOpen(true)}
                  style={{ background: "rgba(0,0,0,0.55)", border: "none", borderRadius: 7, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <i className="ti ti-camera" style={{ fontSize: 14, color: "#fff" }} aria-hidden="true" />
                </button>
                <button onClick={handleRemovePhoto}
                  style={{ background: "rgba(0,0,0,0.55)", border: "none", borderRadius: 7, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <i className="ti ti-trash" style={{ fontSize: 14, color: "#fff" }} aria-hidden="true" />
                </button>
              </div>
            </div>
          ) : (
            <div onClick={() => setPhotoMenuOpen(true)}
              style={{ background: "#f9f4f5", borderRadius: 10, border: "0.5px dashed #c8a0ac", height: 72, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer" }}>
              <i className="ti ti-camera" style={{ fontSize: 20, color: "#c8a0b0" }} aria-hidden="true" />
              <span style={{ fontSize: 12, color: "#b08090" }}>{t.photoHint}</span>
            </div>
          )}
          {photoError && (
            <div style={{ fontSize: 11, color: "#c62828", marginTop: 6 }}>{photoError}</div>
          )}

          {/* เมนูเลือก: ถ่ายรูปใหม่ / เลือกจากคลังรูป */}
          {photoMenuOpen && (
            <div onClick={() => setPhotoMenuOpen(false)}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 }}>
              <div onClick={(e) => e.stopPropagation()}
                style={{ width: 360, maxWidth: "100%", background: "#fff", borderRadius: "16px 16px 0 0", padding: "10px 14px 18px" }}>
                <div style={{ width: 36, height: 4, background: "#e8d5d9", borderRadius: 2, margin: "0 auto 14px" }} />
                <button onClick={() => { setPhotoMenuOpen(false); cameraInputRef.current?.click(); }}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 8px", background: "none", border: "none", borderBottom: "0.5px solid #f0e4e8", fontFamily: "inherit", cursor: "pointer" }}>
                  <i className="ti ti-camera" style={{ fontSize: 18, color: "#550a19" }} aria-hidden="true" />
                  <span style={{ fontSize: 13, color: "#2c1015" }}>{t.photoTakeNew}</span>
                </button>
                <button onClick={() => { setPhotoMenuOpen(false); fileInputRef.current?.click(); }}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 8px", background: "none", border: "none", fontFamily: "inherit", cursor: "pointer" }}>
                  <i className="ti ti-photo" style={{ fontSize: 18, color: "#550a19" }} aria-hidden="true" />
                  <span style={{ fontSize: 13, color: "#2c1015" }}>{t.photoFromGallery}</span>
                </button>
              </div>
            </div>
          )}
        </SecST>

        <SecST>
          <SecHeadST icon="info-circle">{t.infoSection}</SecHeadST>
          <Field label={t.itemName}>
            <Input value={itemName} onChange={setItemName} placeholder={t.itemNamePh} />
          </Field>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            <Field label={t.category}>
              <div style={{ position:"relative" }}>
                <select value={category} onChange={e=>setCategory(e.target.value)}
                  style={{ width:"100%", background:"#f9f4f5", border:"0.5px solid #e8d5d9", borderRadius:8, padding:"8px 10px", fontSize:13, color:"#2c1015", fontFamily:"inherit", appearance:"none" }}>
                  {t.categories.map(c=><option key={c}>{c}</option>)}
                </select>
                <i className="ti ti-chevron-down" style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", fontSize:12, color:"#a07080", pointerEvents:"none" }} aria-hidden="true" />
              </div>
            </Field>
            <Field label={t.stockQty}>
              <Input value={qty} onChange={setQty} type="number" placeholder="1" />
            </Field>
          </div>
          <Field label={t.laborCost}>
            <Input value={laborCost} onChange={setLaborCost} type="number" placeholder="0" />
          </Field>
        </SecST>

        <SecST>
          <SecHeadST icon="layers">{t.metalSection}</SecHeadST>

          <div style={{ display:"flex", borderRadius:10, overflow:"hidden", border:"0.5px solid #e8d5d9", marginBottom:14 }}>
            {METAL_TABS.map((tb,i)=>{
              const active = metalKey === tb.key;
              const isLast = i === METAL_TABS.length-1;
              const isSilverTab = tb.key === "silver";
              const isBeforeSilver = i === METAL_TABS.length-2;
              return (
                <button key={tb.key} onClick={()=>{ setMetalKey(tb.key); setMetalWeight(""); }}
                  style={{ flex:1, padding:"11px 4px", border:"none",
                    borderRight: isLast ? "none" : isBeforeSilver ? "1.5px solid #d0c8c0" : `0.5px solid ${active?"transparent":"#e8d5d9"}`,
                    background: active ? (isSilverTab?"#3060a0":"#b87020") : "#fff",
                    cursor:"pointer", fontFamily:"inherit", transition:"background 0.15s",
                    display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                  <span style={{ fontSize:13, fontWeight:500, color: active?"#fff":(isSilverTab?"#3060a0":"#a06020"), letterSpacing:0.3 }}>
                    {tb.label}
                  </span>
                </button>
              );
            })}
          </div>

          {isGold && (
            <div style={{ background:tab.light, borderRadius:10, border:`0.5px solid ${tab.border}`, padding:"12px 12px 8px" }}>
              <div style={{ background:"#fff", borderRadius:8, border:`0.5px solid ${tab.border}`, padding:"10px 12px", marginBottom:10 }}>
                <div style={{ fontSize:11, color:tab.color, fontWeight:500, marginBottom:6, display:"flex", alignItems:"center", gap:4 }}>
                  <i className="ti ti-currency-baht" style={{fontSize:13}} aria-hidden="true"/>
                  {t.goldPriceLabel}
                  <span style={{fontWeight:400,opacity:0.7,fontSize:10}}>({t.goldPriceUnit})</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:14,color:tab.color,fontWeight:500}}>฿</span>
                  <input
                    type="number"
                    value={goldPriceInput}
                    onChange={e => setGoldPriceInput(e.target.value)}
                    placeholder="67300"
                    style={{flex:1,background:tab.light,border:`1.5px solid ${tab.border}`,borderRadius:8,padding:"8px 12px",fontSize:16,fontWeight:500,color:tab.color,fontFamily:"inherit",outline:"none"}}
                  />
                  <span style={{fontSize:11,color:"#a07080",whiteSpace:"nowrap"}}>{t.goldPriceUnit}</span>
                </div>
                <div style={{fontSize:10,color:"#a07080",marginTop:5,display:"flex",alignItems:"center",gap:4}}>
                  <i className="ti ti-info-circle" style={{fontSize:11}} aria-hidden="true"/>
                  {lang==="th"?"กรอกราคาทองบาทละ (96.5%) จากกองทุนทองคำหรือ YLG":"Enter gold bar price per baht (96.5%) from your trusted source"}
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                <Field label={t.actualWeight}>
                  <Input value={metalWeight} onChange={setMetalWeight} type="number" placeholder="0.00"/>
                </Field>
                <Field label={t.adjWeight}>
                  <div style={{background:"#f0fdf4",border:"0.5px solid #a8d8b0",borderRadius:8,padding:"8px 10px",fontSize:13,fontWeight:500,color:"#1a5c28"}}>
                    {metalWeightNum>0?metalWeightAdj.toFixed(2):"—"} g
                  </div>
                </Field>
              </div>
              <CostBox
                rows={[
                  [t.pricePerBaht, `฿${fmt_stk(activeGoldPrice)} ${t.goldPerBaht}`],
                  [t.pricePerGram, metalWeightNum>0?`฿${fmt_stk(Math.round(goldPricePerGram))} ${t.gramUnit}`:"—"],
                  [t.adjWeightRow, metalWeightNum>0?`${metalWeightAdj.toFixed(2)} g`:"—"],
                  [t.goldFactor(metalKey, goldOpt.factor*100), metalWeightNum>0?`× ${goldOpt.factor}`:"—"],
                ]}
                totalLabel={t.goldCostLabel(metalKey)} totalValue={`฿${fmt_stk(goldCost)}`}
                bg={tab.bg} border={tab.border} textColor="#806030" totalColor={tab.color}
              />
            </div>
          )}

          {isSilver && (
            <div style={{background:tab.light,borderRadius:10,border:`0.5px solid ${tab.border}`,padding:"12px 12px 8px"}}>
              <div style={{background:"#fff",borderRadius:8,border:`0.5px solid ${tab.border}`,padding:"10px 12px",marginBottom:10}}>
                <div style={{fontSize:11,color:tab.color,fontWeight:500,marginBottom:6,display:"flex",alignItems:"center",gap:4}}>
                  <i className="ti ti-currency-baht" style={{fontSize:13}} aria-hidden="true"/>
                  {t.silverPriceLabel}
                  <span style={{fontWeight:400,opacity:0.7,fontSize:10}}>({t.silverPriceUnit})</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:14,color:tab.color,fontWeight:500}}>฿</span>
                  <input
                    type="number"
                    value={silverPriceInput}
                    onChange={e => setSilverPriceInput(e.target.value)}
                    placeholder="33.50"
                    step="0.50"
                    style={{flex:1,background:tab.light,border:`1.5px solid ${tab.border}`,borderRadius:8,padding:"8px 12px",fontSize:16,fontWeight:500,color:tab.color,fontFamily:"inherit",outline:"none"}}
                  />
                  <span style={{fontSize:11,color:"#a07080",whiteSpace:"nowrap"}}>{t.silverPriceUnit}</span>
                </div>
                <div style={{fontSize:10,color:"#a07080",marginTop:5,display:"flex",alignItems:"center",gap:4}}>
                  <i className="ti ti-info-circle" style={{fontSize:11}} aria-hidden="true"/>
                  {lang==="th"?"กรอกราคาเงิน 925 ต่อกรัม (อ้างอิง YLG หรือ Hua Seng Heng)":"Enter silver 925 price per gram (reference YLG or Hua Seng Heng)"}
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                <Field label={t.silverActualWeight}>
                  <Input value={metalWeight} onChange={setMetalWeight} type="number" placeholder="0.00"/>
                </Field>
                <Field label={t.adjWeight}>
                  <div style={{background:"#f0fdf4",border:"0.5px solid #a8d8b0",borderRadius:8,padding:"8px 10px",fontSize:13,fontWeight:500,color:"#1a5c28"}}>
                    {metalWeightNum>0?metalWeightAdj.toFixed(2):"—"} g
                  </div>
                </Field>
              </div>
              <CostBox
                rows={[
                  [t.silverSpotLabel, `฿${activeSilverPrice.toFixed(2)}`],
                  [t.adjWeightRow, metalWeightNum>0?`${metalWeightAdj.toFixed(2)} g`:"—"],
                ]}
                totalLabel={t.silverCostLabel} totalValue={`฿${fmt_stk(silverCost)}`}
                bg={tab.bg} border={tab.border} textColor="#304060" totalColor={tab.color}
              />
            </div>
          )}
        </SecST>

        <SecST>
          <SecHeadST icon="diamond" color="#534AB7">{t.diamondSection}</SecHeadST>
          {diamonds.map((d,idx)=>(
            <div key={d.id} style={{background:"#f8f4ff",borderRadius:10,border:"0.5px solid #d4c8f0",padding:"10px 12px",marginBottom:8,position:"relative"}}>
              <div style={{fontSize:10,fontWeight:500,color:"#534AB7",letterSpacing:1,marginBottom:8}}>
                {t.diamondLabel(idx+1)} {idx===0?t.diamondMain:t.diamondSide}
              </div>
              {idx>0&&(
                <button onClick={()=>removeDiamond(d.id)}
                  style={{position:"absolute",top:8,right:8,width:20,height:20,borderRadius:"50%",background:"#fdf0f2",border:"0.5px solid #e8c0c8",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#550a19"}}>
                  <i className="ti ti-x" style={{fontSize:10}} aria-hidden="true"/>
                </button>
              )}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                <Field label={t.dWeight}>
                  <Input value={d.weight} onChange={v=>updD(d.id,"weight",v)} type="number" placeholder="0.00" style={{background:"#fdf0f2",borderColor:"#d4c8f0"}}/>
                </Field>
                <Field label={t.dQty}>
                  <Input value={d.qty} onChange={v=>updD(d.id,"qty",v)} type="number" placeholder="1" style={{background:"#fdf0f2",borderColor:"#d4c8f0"}}/>
                </Field>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:8}}>
                <Field label={t.dShape}>
                  <SearchableDropdown value={d.shape} onChange={v=>updD(d.id,"shape",v)}
                    options={SHAPES} placeholder={t.selectPh} searchPh={t.searchPh} notFound={t.notFound}/>
                </Field>
                <Field label={t.dColor}>
                  <SearchableDropdown value={d.color} onChange={v=>updD(d.id,"color",v)}
                    options={COLORS} placeholder={t.selectPh} searchPh={t.searchPh} notFound={t.notFound}/>
                </Field>
                <Field label={t.dClarity}>
                  <SearchableDropdown value={d.clarity} onChange={v=>updD(d.id,"clarity",v)}
                    options={CLARITY} placeholder={t.selectPh} searchPh={t.searchPh} notFound={t.notFound}/>
                </Field>
              </div>
              <Field label={t.certField}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:d.hasCert?10:0}}>
                  <Toggle on={d.hasCert} onChange={v=>updD(d.id,"hasCert",v)}/>
                  <span style={{fontSize:12,color:d.hasCert?"#550a19":"#a07080",fontWeight:500}}>
                    {d.hasCert?t.hasCert:t.noCert}
                  </span>
                </div>
                {d.hasCert&&(
                  <div style={{background:"#fdf8ff",borderRadius:10,border:"0.5px solid #d4c8f0",padding:"10px 12px",display:"flex",flexDirection:"column",gap:8}}>
                    <div>
                      <div style={{fontSize:11,color:"#a07080",marginBottom:5}}>{t.certLab}</div>
                      <div style={{display:"flex",gap:0,borderRadius:8,overflow:"hidden",border:"0.5px solid #d4c8f0"}}>
                        {["IGI","GIA"].map((lab,i)=>{
                          const on=d.certLab===lab;
                          return(
                            <button key={lab} onClick={()=>updD(d.id,"certLab",lab)}
                              style={{flex:1,padding:"9px 0",border:"none",borderRight:i===0?"0.5px solid #d4c8f0":"none",
                                background:on?"#534AB7":"#fff",color:on?"#fff":"#534AB7",
                                fontFamily:"inherit",fontSize:13,fontWeight:500,cursor:"pointer",transition:"background 0.15s"}}>
                              {lab}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <div style={{fontSize:11,color:"#a07080",marginBottom:4}}>{t.reportNo}</div>
                      <Input value={d.certNo} onChange={v=>updD(d.id,"certNo",v)} placeholder={t.reportPh}
                        style={{background:"#fff",borderColor:"#d4c8f0",letterSpacing:1}}/>
                    </div>
                    <div>
                      <div style={{fontSize:11,color:"#a07080",marginBottom:4}}>{t.certNote}</div>
                      <textarea value={d.certNote} onChange={e=>updD(d.id,"certNote",e.target.value)}
                        placeholder={t.certNotePh} rows={3}
                        style={{width:"100%",background:"#fff",border:"0.5px solid #d4c8f0",borderRadius:8,
                          padding:"8px 10px",fontSize:12,color:"#2c1015",fontFamily:"inherit",
                          outline:"none",resize:"none",lineHeight:1.5,boxSizing:"border-box"}}/>
                    </div>
                    <div>
                      <div style={{fontSize:11,color:"#a07080",marginBottom:4}}>{t.certUpload}</div>
                      <label style={{display:"flex",alignItems:"center",gap:8,background:"#fff",
                        border:"0.5px dashed #d4c8f0",borderRadius:8,padding:"9px 12px",cursor:"pointer"}}>
                        <i className="ti ti-file-certificate" style={{fontSize:18,color:"#534AB7"}} aria-hidden="true"/>
                        <span style={{fontSize:12,color:d.certFile?"#534AB7":"#a07080",fontWeight:d.certFile?500:400}}>
                          {d.certFile?d.certFile:t.certFilePh}
                        </span>
                        <input type="file" accept=".pdf,image/*"
                          onChange={e=>updD(d.id,"certFile",e.target.files?.[0]?.name||null)}
                          style={{display:"none"}}/>
                      </label>
                    </div>
                  </div>
                )}
              </Field>
              <Field label={t.dCost}>
                <Input value={d.cost} onChange={v=>updD(d.id,"cost",v)} type="number" placeholder="0" style={{background:"#fdf0f2",borderColor:"#d4c8f0"}}/>
              </Field>
            </div>
          ))}
          <button onClick={addDiamond}
            style={{width:"100%",border:"0.5px dashed #d4c8f0",borderRadius:10,padding:10,fontSize:12,color:"#534AB7",cursor:"pointer",background:"#f8f4ff",display:"flex",alignItems:"center",justifyContent:"center",gap:6,fontFamily:"inherit"}}>
            <i className="ti ti-plus" style={{fontSize:14}} aria-hidden="true"/> {t.addDiamond}
          </button>
        </SecST>

        <SecST>
          <SecHeadST icon="currency-baht">{t.summarySection}</SecHeadST>
          {[
            [t.metalCostRow(metalKey), metalCost],
            [t.diamondCostRow,         diamondTotalCost],
            [t.laborCostRow,           parseFloat(laborCost)||0],
          ].map(([l,v])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:13}}>
              <span style={{color:"#806070"}}>{l}</span>
              <span style={{fontWeight:500,color:"#2c1015"}}>฿{fmt_stk(v)}</span>
            </div>
          ))}
          <div style={{borderTop:"0.5px solid #e8d5d9",margin:"8px 0"}}/>
          <div style={{display:"flex",justifyContent:"space-between"}}>
            <span style={{fontSize:13,fontWeight:500,color:"#550a19"}}>{t.totalCost}</span>
            <span style={{fontSize:16,fontWeight:500,color:"#550a19"}}>฿{fmt_stk(totalCost)}</span>
          </div>
          <div style={{background:"#f9f4f5",borderRadius:8,padding:"10px 12px",marginTop:8}}>
            <div style={{fontSize:11,color:"#a07080",marginBottom:4}}>{t.sellingPrice}</div>
            <Input value={sellingPrice} onChange={setSellingPrice} type="number" placeholder="0"/>
            {sellingPrice&&totalCost>0&&(
              <div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontSize:12}}>
                <span style={{color:"#608050"}}>{t.profit}</span>
                <span style={{fontWeight:500,color:parseFloat(sellingPrice)>=totalCost?"#2e7d32":"#c62828"}}>
                  ฿{fmt_stk(parseFloat(sellingPrice)-totalCost)}
                  {" "}({((parseFloat(sellingPrice)-totalCost)/totalCost*100).toFixed(1)}%)
                </span>
              </div>
            )}
          </div>
        </SecST>

        <button onClick={handleSave} disabled={saving}
          style={{width:"100%",background:"#550a19",borderRadius:14,padding:14,color:"#fff5f7",fontSize:15,fontWeight:500,cursor:saving?"default":"pointer",opacity:saving?0.7:1,display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:"inherit",border:"none",marginBottom:10}}>
          <i className="ti ti-check" style={{fontSize:16}} aria-hidden="true"/>
          {saving ? t.saving : t.saveBtn(skuLabel)}
        </button>

        <SecST>
          <SecHeadST icon="list">{t.currentStock} {!loadingList && `(${stockList.length})`}</SecHeadST>
          {loadingList && <div style={{fontSize:12,color:"#a07080"}}>กำลังโหลด...</div>}
          {listError && <div style={{fontSize:12,color:"#a32d2d"}}>{listError}</div>}
          {!loadingList && stockList.slice(0,8).map((p) => (
            <div key={p.id} style={{padding:"8px 0",borderBottom:"0.5px solid #f0e4e8",display:"flex",justifyContent:"space-between"}}>
              <div>
                <div style={{fontSize:12,fontWeight:500,color:"#2c1015"}}>{p.name}</div>
                <div style={{fontSize:10,color:"#a07080"}}>{p.sku} · คงเหลือ {p.stock_qty}</div>
              </div>
              <div style={{fontSize:13,fontWeight:500,color:"#550a19"}}>฿{fmt_stk(p.sale_price)}</div>
            </div>
          ))}
        </SecST>

      </div>
    </div>
  );
}
