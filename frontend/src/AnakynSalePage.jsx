// ═══════════════════════════════════════════════════════════════
// AnakynSalePage.jsx — เชื่อมกับ Backend จริง (ตามต้นฉบับ AppPreview ทุกรายละเอียด)
// status bar, การ์ดสินค้าแบบ gem tags, การ์ดลูกค้าแบบ avatar, scan/เลือกจากสต๊อก, split payment
// ═══════════════════════════════════════════════════════════════
import { useState, useEffect } from "react";
import { api } from "./api"; // ★ เชื่อม API

const T_SALE = {
  th:{
    pageTitle:"บันทึกการขาย",langBtn:"EN",addItem:"เพิ่มสินค้า",
    searchItem:"ค้นหาชื่อ / รหัส SKU...",scanQR:"สแกน QR",scanSub:"บาร์โค้ด / Tag",
    fromStock:"เลือกจากสต๊อก",addMore:"เพิ่มสินค้าชิ้นถัดไป",
    salePrice:"ราคาขาย",hasCert:"มีใบเซอร์",customer:"ลูกค้า",
    searchMember:"ค้นหาชื่อ / เบอร์โทร...",
    vipDisc:"ส่วนลด VIP",extraDisc:"ส่วนลดพิเศษ (กรอกเอง)",
    priceItem:"ราคาสินค้า",priceVip:"ส่วนลด VIP",priceExtra:"ส่วนลดพิเศษ",
    vatLabel:"VAT 7%",vatOn:"มี",vatOff:"ไม่มี",grandTotal:"ยอดสุทธิ",
    payment:"ช่องทางชำระเงิน",payHint:"เลือกได้หลายช่องทาง (แบ่งจ่าย)",
    splitTitle:"แบ่งยอดชำระ",remaining:"ยอดคงเหลือที่ต้องชำระ",paid:"ครบแล้ว",
    confirm:(v) => `ยืนยันการขาย ฿${v}`,
    saving:"กำลังบันทึก...",
    warranty:"ออก Warranty",warrantySub:"ใบรับประกัน",
    receipt:"ออกใบเสร็จ",receiptSub:"Receipt / Tax",
    lineNotify:"แจ้ง LINE",lineNotifySub:"ส่งสรุปลูกค้า",
    noItems:"ยังไม่ได้เลือกสินค้า", noStock:"ไม่มีสินค้าในสต๊อก", loading:"กำลังโหลด...",
    noCustomer:"ไม่ระบุลูกค้า", saveSuccess:"บันทึกการขายเรียบร้อย ✓ (สต๊อกถูกหักอัตโนมัติแล้ว)",
    payMethods:[
      {key:"cash",label:"เงินสด",sub:"Cash"},
      {key:"qr",label:"โอน / QR",sub:"PromptPay"},
      {key:"card",label:"บัตรเครดิต",sub:"Visa / MC"},
    ],
    splitRows:[
      {key:"cash",icon:"ti-cash",label:"เงินสด"},
      {key:"qr",icon:"ti-qrcode",label:"โอน / QR"},
    ],
  },
  en:{
    pageTitle:"New Sale",langBtn:"ไทย",addItem:"Add Item",
    searchItem:"Search name / SKU...",scanQR:"Scan QR",scanSub:"Barcode / Tag",
    fromStock:"From Stock",addMore:"Add another item",
    salePrice:"Sale price",hasCert:"Has Certificate",customer:"Customer",
    searchMember:"Search name / phone...",
    vipDisc:"VIP Discount",extraDisc:"Extra discount (manual)",
    priceItem:"Item price",priceVip:"VIP discount",priceExtra:"Extra discount",
    vatLabel:"VAT 7%",vatOn:"Incl.",vatOff:"Excl.",grandTotal:"Grand total",
    payment:"Payment method",payHint:"Select multiple (split payment)",
    splitTitle:"Split payment",remaining:"Remaining balance",paid:"Paid in full",
    confirm:(v) => `Confirm sale ฿${v}`,
    saving:"Saving...",
    warranty:"Warranty",warrantySub:"Certificate",
    receipt:"Receipt",receiptSub:"Receipt / Tax",
    lineNotify:"LINE notify",lineNotifySub:"Send summary",
    noItems:"No items selected", noStock:"No items in stock", loading:"Loading...",
    noCustomer:"No customer", saveSuccess:"Sale saved successfully ✓ (stock deducted automatically)",
    payMethods:[
      {key:"cash",label:"Cash",sub:"Physical"},
      {key:"qr",label:"Transfer / QR",sub:"PromptPay"},
      {key:"card",label:"Credit card",sub:"Visa / MC"},
    ],
    splitRows:[
      {key:"cash",icon:"ti-cash",label:"Cash"},
      {key:"qr",icon:"ti-qrcode",label:"Transfer"},
    ],
  },
};

const PAY_META={
  cash:{icon:"ti-cash",color:"#2e7d32",bg:"#e8f5e9"},
  qr:{icon:"ti-qrcode",color:"#2e7d32",bg:"#e8f5e9"},
  card:{icon:"ti-credit-card",color:"#185FA5",bg:"#e8f0ff"},
};
const fmt_sale = (n) => Math.round(Number(n)).toLocaleString("th-TH");

const Sec = ({children}) => (
  <div style={{background:"#fff",borderRadius:12,border:"0.5px solid #e8d5d9",padding:"12px 14px",marginBottom:10}}>
    {children}
  </div>
);
const SecHead = ({ icon, children }) => (
  <div style={{fontSize:11,fontWeight:500,color:"#550a19",letterSpacing:"1.5px",marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
    <i className={"ti "+icon} style={{fontSize:14}} aria-hidden="true" />{children}
  </div>
);
const SearchBar = ({ placeholder }) => (
  <div style={{background:"#f9f4f5",borderRadius:10,border:"0.5px solid #e8d5d9",padding:"9px 12px",display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
    <i className="ti ti-search" style={{fontSize:15,color:"#b08090"}} aria-hidden="true" />
    <span style={{fontSize:13,color:"#b08090"}}>{placeholder}</span>
  </div>
);

// สร้างคำย่อ 2 ตัวอักษรจากชื่อลูกค้าสำหรับ avatar circle
const initials = (name) => {
  if (!name) return "—";
  const parts = name.replace(/^(คุณ|นาย|นาง|นางสาว|Mr\.|Ms\.|Mrs\.)\s*/,"").trim().split(" ");
  return parts.length > 1 ? (parts[0][0]+parts[1][0]) : (parts[0]?.slice(0,2) || "—");
};

export default function AnakynSalePage({ navigate }) {
  const nav = navigate || function(){};
  const [lang,setLang]=useState("th");

  // ★ เชื่อม API — โหลดสต๊อกสินค้าจริงและลูกค้าจริง
  const [stockList, setStockList] = useState([]);
  const [loadingStock, setLoadingStock] = useState(true);
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    api.getProducts({ available: "true" }).then(setStockList).finally(() => setLoadingStock(false));
    api.getCustomers().then(setCustomers).catch(() => {});
  }, []);

  const [cartItems, setCartItems] = useState([]); // [{product_id, name, sku, metal_type, metal_weight_g, diamonds, has_certificate, certificate_no, price}]
  const [showPicker, setShowPicker] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [customerQuery, setCustomerQuery] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);

  const [vatOn,setVatOn]=useState(true);
  const [vipDiscountOn,setVipDiscountOn]=useState(true);
  const [extraDisc,setExtraDisc]=useState(0);
  const [selectedPay,setSelectedPay]=useState(["cash","qr"]);
  const [splitCash,setSplitCash]=useState(0);
  const [splitQr,setSplitQr]=useState(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  const t=T_SALE[lang];

  const addToCart = (product) => {
    setCartItems((prev) => [...prev, {
      product_id: product.id, name: product.name, sku: product.sku,
      metal_type: product.metal_type, metal_weight_g: product.metal_weight_g,
      diamonds: product.diamonds || [], has_certificate: product.has_certificate,
      certificate_no: product.certificate_no,
      price: Number(product.sale_price),
    }]);
    setShowPicker(false); setPickerQuery("");
  };
  const removeFromCart = (idx) => setCartItems((prev) => prev.filter((_, i) => i !== idx));

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const subtotal = cartItems.reduce((s, it) => s + it.price, 0);
  const vipAmt = vipDiscountOn && selectedCustomer?.is_vip ? Math.round(subtotal * (Number(selectedCustomer.vip_discount_pct) || 0) / 100) : 0;
  const afterDisc=subtotal-vipAmt-(parseFloat(extraDisc)||0);
  const vatAmt=vatOn?Math.round(afterDisc*0.07):0;
  const grandTotal=afterDisc+vatAmt;
  const cashVal=parseFloat(String(splitCash).replace(/,/g,""))||0;
  const qrVal=splitQr!==null?(parseFloat(String(splitQr).replace(/,/g,""))||0):Math.max(0,grandTotal-cashVal);
  const remaining=grandTotal-cashVal-qrVal;
  const togglePay=(key)=>setSelectedPay(p=>p.includes(key)?p.filter(k=>k!==key):[...p,key]);

  const filteredStock = stockList.filter((p) =>
    pickerQuery.trim()==="" || p.name.toLowerCase().includes(pickerQuery.toLowerCase()) || p.sku.toLowerCase().includes(pickerQuery.toLowerCase())
  );
  const filteredCustomers = customers.filter((c) =>
    customerQuery.trim()==="" || c.full_name.toLowerCase().includes(customerQuery.toLowerCase()) || (c.phone||"").includes(customerQuery)
  );

  // ★ เชื่อม API — กดยืนยันขาย → เรียก backend จริง (หักสต๊อก + สร้างค่าคอม Partner อัตโนมัติ)
  const handleConfirmSale = async () => {
    if (cartItems.length === 0) {
      setSaveError(lang==="th"?"กรุณาเพิ่มสินค้าก่อนยืนยันการขาย":"Please add items first");
      return;
    }
    setSaving(true); setSaveError(""); setSaveSuccess(false);
    try {
      const payload = {
        customer_id: selectedCustomerId,
        items: cartItems.map((it) => ({ product_id: it.product_id, qty: 1, unit_price: it.price })),
        vip_discount: vipAmt,
        extra_discount: parseFloat(extraDisc) || 0,
        vat_enabled: vatOn,
        payment_methods: selectedPay.map((key) => ({ method: key, amount: grandTotal })),
      };
      await api.createSale(payload);
      setSaveSuccess(true);
      setCartItems([]); setExtraDisc(0); setSplitCash(0); setSplitQr(null);
      api.getProducts({ available: "true" }).then(setStockList);
    } catch (err) {
      setSaveError(err.message || "ไม่สามารถบันทึกการขายได้");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{width:360,margin:"0 auto",background:"#f9f4f5",borderRadius:32,overflow:"hidden",border:"1.5px solid #c8a8b0",fontFamily:"'Anthropic Sans',sans-serif"}}>
      {/* HEADER + STATUS BAR */}
      <div style={{background:"#550a19",padding:"10px 20px 4px"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
          <span style={{color:"#f0d0d8",fontSize:11,fontWeight:500}}>9:41</span>
          <span style={{display:"flex",gap:6}}>
            <i className="ti ti-wifi" style={{fontSize:13,color:"#f0d0d8"}} aria-hidden="true" />
            <i className="ti ti-battery-2" style={{fontSize:13,color:"#f0d0d8"}} aria-hidden="true" />
          </span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10,paddingBottom:12}}>
          <div style={{width:32,height:32,borderRadius:"50%",background:"rgba(255,255,255,0.12)",display:"flex",alignItems:"center",justifyContent:"center",color:"#f0d0d8",fontSize:15,cursor:"pointer"}}
            onClick={() => nav("home")}>
            <i className="ti ti-arrow-left" aria-hidden="true" />
          </div>
          <span style={{fontSize:16,fontWeight:500,color:"#fff5f7",flex:1}}>{t.pageTitle}</span>
          <button onClick={()=>setLang(l=>l==="th"?"en":"th")}
            style={{background:"rgba(255,255,255,0.15)",border:"0.5px solid rgba(255,255,255,0.3)",borderRadius:8,padding:"4px 10px",fontSize:12,fontWeight:500,color:"#f5e0e5",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5}}>
            <i className="ti ti-language" style={{fontSize:13}} aria-hidden="true" />{t.langBtn}
          </button>
        </div>
      </div>

      <div style={{padding:"14px 16px",overflowY:"auto",maxHeight:700}}>

        {saveError && (
          <div style={{background:"#fdf0f2",border:"0.5px solid #e8c0c8",borderRadius:8,padding:"8px 12px",marginBottom:10,fontSize:12,color:"#a32d2d"}}>{saveError}</div>
        )}
        {saveSuccess && (
          <div style={{background:"#e8f5e9",border:"0.5px solid #a8d8b0",borderRadius:8,padding:"8px 12px",marginBottom:10,fontSize:12,color:"#1a5c28"}}>{t.saveSuccess}</div>
        )}

        {/* ADD ITEM */}
        <Sec>
          <SecHead icon="ti-search">{t.addItem}</SecHead>
          <div onClick={()=>setShowPicker(s=>!s)}>
            <SearchBar placeholder={t.searchItem} />
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
            <div style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8c0c8",padding:"10px 12px",display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
              <div style={{width:32,height:32,borderRadius:8,background:"#fdf0f2",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <i className="ti ti-scan" style={{fontSize:17,color:"#550a19"}} aria-hidden="true" />
              </div>
              <div>
                <div style={{fontSize:12,fontWeight:500,color:"#550a19"}}>{t.scanQR}</div>
                <div style={{fontSize:10,color:"#a07080",marginTop:1}}>{t.scanSub}</div>
              </div>
            </div>
            <div onClick={()=>setShowPicker(s=>!s)}
              style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8c0c8",padding:"10px 12px",display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
              <div style={{width:32,height:32,borderRadius:8,background:"#fdf0f2",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <i className="ti ti-layout-list" style={{fontSize:17,color:"#550a19"}} aria-hidden="true" />
              </div>
              <div>
                <div style={{fontSize:12,fontWeight:500,color:"#550a19"}}>{t.fromStock}</div>
                <div style={{fontSize:10,color:"#a07080",marginTop:1}}>{stockList.length} {lang==="th"?"รายการ":"items"}</div>
              </div>
            </div>
          </div>

          {/* ★ เชื่อม API — picker เลือกจากสต๊อกจริง */}
          {showPicker && (
            <div style={{marginBottom:10}}>
              <input autoFocus value={pickerQuery} onChange={(e)=>setPickerQuery(e.target.value)}
                placeholder={t.searchItem}
                style={{width:"100%",background:"#f9f4f5",border:"0.5px solid #e8d5d9",borderRadius:9,padding:"8px 12px",fontSize:13,color:"#2c1015",fontFamily:"inherit",outline:"none",boxSizing:"border-box",marginBottom:6}} />
              <div style={{maxHeight:220,overflowY:"auto",border:"0.5px solid #e8d5d9",borderRadius:10}}>
                {loadingStock && <div style={{padding:10,fontSize:12,color:"#a07080"}}>{t.loading}</div>}
                {!loadingStock && filteredStock.length===0 && (
                  <div style={{padding:10,fontSize:12,color:"#a07080"}}>{t.noStock}</div>
                )}
                {filteredStock.map((p) => (
                  <div key={p.id} onClick={()=>addToCart(p)}
                    style={{padding:"8px 12px",borderBottom:"0.5px solid #f0e4e8",cursor:"pointer",display:"flex",justifyContent:"space-between"}}>
                    <div>
                      <div style={{fontSize:12,fontWeight:500,color:"#2c1015"}}>{p.name}</div>
                      <div style={{fontSize:10,color:"#a07080"}}>{p.sku} · {p.metal_type || "—"} · คงเหลือ {p.stock_qty}</div>
                    </div>
                    <div style={{fontSize:13,fontWeight:500,color:"#550a19"}}>฿{fmt_sale(p.sale_price)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* การ์ดสินค้าที่เลือก — แบบ gem tags ตามต้นฉบับ */}
          {cartItems.map((it, idx) => {
            const mainDiamond = (it.diamonds && it.diamonds[0]) || null;
            const tags = [];
            if (mainDiamond?.shape) tags.push(mainDiamond.shape);
            if (mainDiamond?.color && mainDiamond?.clarity) tags.push(`${mainDiamond.color} / ${mainDiamond.clarity}`);
            if (it.certificate_no) tags.push(`${mainDiamond?.certLab || "GIA"} #${it.certificate_no}`);
            if (mainDiamond?.weight) tags.push(`${mainDiamond.weight}ct`);
            return (
              <div key={idx} style={{background:"#fff",borderRadius:12,border:"1.5px solid #550a19",padding:"12px 14px",marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:500,color:"#2c1015"}}>{it.name}</div>
                    <div style={{fontSize:10,color:"#a07080",marginTop:2}}>{it.sku} · {it.metal_type || "—"}{it.metal_weight_g ? ` · ${it.metal_weight_g}g` : ""}</div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
                    <div onClick={()=>removeFromCart(idx)} style={{width:24,height:24,borderRadius:"50%",background:"#fdf0f2",border:"0.5px solid #e8c0c8",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                      <i className="ti ti-x" style={{fontSize:11,color:"#550a19"}} aria-hidden="true" />
                    </div>
                    <div style={{fontSize:15,fontWeight:500,color:"#550a19"}}>฿{fmt_sale(it.price)}</div>
                  </div>
                </div>
                {tags.length > 0 && (
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
                    {tags.map(s=>(
                      <span key={s} style={{fontSize:11,background:"#f9f4f5",color:"#806070",border:"0.5px solid #e8d5d9",borderRadius:6,padding:"3px 8px"}}>{s}</span>
                    ))}
                  </div>
                )}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  {it.has_certificate
                    ? <span style={{fontSize:10,background:"#fdf0f2",color:"#550a19",border:"0.5px solid #e8c0c8",borderRadius:20,padding:"2px 8px"}}>{t.hasCert}</span>
                    : <span />
                  }
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:11,color:"#a07080"}}>{t.salePrice}</span>
                    <div style={{background:"#f9f4f5",border:"0.5px solid #e8d5d9",borderRadius:7,padding:"5px 8px",fontSize:13,fontWeight:500,color:"#550a19"}}>฿{fmt_sale(it.price)}</div>
                  </div>
                </div>
              </div>
            );
          })}

          {cartItems.length === 0 && (
            <div style={{fontSize:12,color:"#a07080",textAlign:"center",padding:"10px 0"}}>{t.noItems}</div>
          )}

          <div onClick={()=>setShowPicker(s=>!s)}
            style={{border:"0.5px dashed #e8c0c8",borderRadius:10,padding:10,textAlign:"center",fontSize:12,color:"#b08090",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
            <i className="ti ti-plus" style={{fontSize:14}} aria-hidden="true" /> {t.addMore}
          </div>
        </Sec>

        {/* CUSTOMER — การ์ดแบบ avatar circle */}
        <Sec>
          <SecHead icon="ti-user">{t.customer}</SecHead>
          <div onClick={()=>setShowCustomerPicker(s=>!s)}>
            <SearchBar placeholder={t.searchMember} />
          </div>

          {showCustomerPicker && (
            <div style={{marginBottom:10}}>
              <input autoFocus value={customerQuery} onChange={(e)=>setCustomerQuery(e.target.value)}
                placeholder={t.searchMember}
                style={{width:"100%",background:"#f9f4f5",border:"0.5px solid #e8d5d9",borderRadius:9,padding:"8px 12px",fontSize:13,color:"#2c1015",fontFamily:"inherit",outline:"none",boxSizing:"border-box",marginBottom:6}} />
              <div style={{maxHeight:180,overflowY:"auto",border:"0.5px solid #e8d5d9",borderRadius:10}}>
                {filteredCustomers.map((c) => (
                  <div key={c.id} onClick={()=>{setSelectedCustomerId(c.id); setShowCustomerPicker(false); setCustomerQuery("");}}
                    style={{padding:"8px 12px",borderBottom:"0.5px solid #f0e4e8",cursor:"pointer",display:"flex",justifyContent:"space-between"}}>
                    <span style={{fontSize:12,color:"#2c1015"}}>{c.full_name}</span>
                    {c.is_vip && <span style={{fontSize:9,background:"#550a19",color:"#f5e0e5",borderRadius:20,padding:"1px 7px"}}>VIP</span>}
                  </div>
                ))}
                {filteredCustomers.length===0 && <div style={{padding:10,fontSize:12,color:"#a07080"}}>{lang==="th"?"ไม่พบลูกค้า":"No customers found"}</div>}
              </div>
            </div>
          )}

          {selectedCustomer ? (
            <div style={{background:"#fdf0f2",borderRadius:10,padding:"10px 12px",display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <div style={{width:34,height:34,borderRadius:"50%",background:"#550a19",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:500,color:"#f5e0e5",flexShrink:0}}>
                {initials(selectedCustomer.full_name)}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:500,color:"#2c1015"}}>{selectedCustomer.full_name}</div>
                <div style={{fontSize:11,color:"#a07080",marginTop:1}}>
                  {selectedCustomer.phone || "—"}
                  {selectedCustomer.loyalty_points!=null && ` · แต้ม ${selectedCustomer.loyalty_points}`}
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
                {selectedCustomer.is_vip && <span style={{background:"#550a19",color:"#f5e0e5",fontSize:10,padding:"2px 8px",borderRadius:20}}>VIP</span>}
                <div onClick={()=>setSelectedCustomerId(null)} style={{width:22,height:22,borderRadius:"50%",background:"#fdf0f2",border:"0.5px solid #e8c0c8",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                  <i className="ti ti-x" style={{fontSize:10,color:"#550a19"}} aria-hidden="true" />
                </div>
              </div>
            </div>
          ) : (
            <div style={{fontSize:12,color:"#a07080",textAlign:"center",padding:"8px 0",marginBottom:10}}>{t.noCustomer}</div>
          )}

          {selectedCustomer?.is_vip && (
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              <div onClick={()=>setVipDiscountOn(v=>!v)}
                style={{width:36,height:20,borderRadius:10,background:vipDiscountOn?"#550a19":"#e0d8da",position:"relative",cursor:"pointer",flexShrink:0,transition:"background .2s"}}>
                <div style={{width:16,height:16,borderRadius:"50%",background:"#fff",position:"absolute",top:2,left:vipDiscountOn?18:2,transition:"left .15s"}} />
              </div>
              <span style={{fontSize:12,color:"#550a19",fontWeight:500,flex:1}}>{t.vipDisc} ({selectedCustomer.vip_discount_pct}%)</span>
              <span style={{fontSize:13,fontWeight:500,color:"#2e7d32"}}>{vipDiscountOn?`− ฿${fmt_sale(vipAmt)}`:"—"}</span>
            </div>
          )}
          <div style={{background:"#f9f4f5",borderRadius:8,padding:"8px 10px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontSize:11,color:"#a07080"}}>{t.extraDisc}</span>
            <input type="number" value={extraDisc} onChange={e=>setExtraDisc(e.target.value)}
              style={{background:"#fff",border:"0.5px solid #e8d5d9",borderRadius:7,padding:"5px 8px",fontSize:13,fontWeight:500,color:"#550a19",fontFamily:"inherit",outline:"none",width:80,textAlign:"right"}} />
          </div>
        </Sec>

        {/* PRICE */}
        <div style={{background:"#fdf5f7",borderRadius:10,border:"0.5px solid #e8c0c8",padding:"12px 14px",marginBottom:10}}>
          {[[t.priceItem,`฿${fmt_sale(subtotal)}`,"#2c1015"],[t.priceVip,vipAmt?`− ฿${fmt_sale(vipAmt)}`:"—","#2e7d32"],[t.priceExtra,`− ฿${fmt_sale(parseFloat(extraDisc)||0)}`,"#2c1015"]].map(([l,v,c])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"3px 0",fontSize:13}}>
              <span style={{color:"#806070"}}>{l}</span><span style={{fontWeight:500,color:c}}>{v}</span>
            </div>
          ))}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"3px 0"}}>
            <span style={{fontSize:13,color:"#806070"}}>{t.vatLabel}</span>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:13,fontWeight:500,color:vatOn?"#2c1015":"#b08090"}}>{vatOn?`฿${fmt_sale(vatAmt)}`:"—"}</span>
              <div style={{display:"flex",borderRadius:20,overflow:"hidden",border:"0.5px solid #e8c0c8",cursor:"pointer"}} onClick={()=>setVatOn(v=>!v)}>
                {[[t.vatOn,true],[t.vatOff,false]].map(([label,val])=>(
                  <span key={label} style={{padding:"4px 11px",fontSize:11,fontWeight:500,background:vatOn===val?"#550a19":"#fff",color:vatOn===val?"#f5e0e5":"#a07080",transition:"background .15s"}}>{label}</span>
                ))}
              </div>
            </div>
          </div>
          <div style={{borderTop:"0.5px solid #e8c0c8",margin:"7px 0"}} />
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
            <span style={{fontSize:14,fontWeight:500,color:"#550a19"}}>{t.grandTotal}</span>
            <span style={{fontSize:20,fontWeight:500,color:"#550a19"}}>฿{fmt_sale(grandTotal)}</span>
          </div>
        </div>

        {/* PAYMENT + SPLIT */}
        <Sec>
          <SecHead icon="ti-credit-card">{t.payment}</SecHead>
          <div style={{fontSize:11,color:"#a07080",marginBottom:8}}>{t.payHint}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
            {t.payMethods.map(m=>{
              const meta=PAY_META[m.key];
              const on=selectedPay.includes(m.key);
              return (
                <div key={m.key} onClick={()=>togglePay(m.key)}
                  style={{borderRadius:10,padding:"11px 10px",display:"flex",flexDirection:"column",alignItems:"center",gap:6,cursor:"pointer",border:on?"1.5px solid #550a19":"0.5px solid #e8d5d9",background:on?"#fdf0f2":"#fff",transition:"border .15s",textAlign:"center"}}>
                  <div style={{width:28,height:28,borderRadius:8,background:meta.bg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <i className={"ti "+meta.icon} style={{fontSize:15,color:meta.color}} aria-hidden="true" />
                  </div>
                  <div style={{fontSize:11,fontWeight:500,color:"#2c1015"}}>{m.label}</div>
                  {on && <i className="ti ti-check" style={{fontSize:13,color:"#550a19"}} aria-hidden="true" />}
                </div>
              );
            })}
          </div>
          {(selectedPay.includes("cash") || selectedPay.includes("qr")) && (
            <div style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8d5d9",padding:"10px 12px",marginBottom:10}}>
              <div style={{fontSize:11,color:"#a07080",marginBottom:8}}>{t.splitTitle}</div>
              {t.splitRows.filter(r=>selectedPay.includes(r.key)).map(r=>(
                <div key={r.key} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                  <div style={{width:28,height:28,borderRadius:8,background:"#e8f5e9",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <i className={"ti "+r.icon} style={{fontSize:14,color:"#2e7d32"}} aria-hidden="true" />
                  </div>
                  <span style={{fontSize:12,color:"#806070",flex:1}}>{r.label}</span>
                  <input type="number"
                    value={r.key==="cash"?splitCash:(splitQr!==null?splitQr:qrVal)}
                    onChange={e=>r.key==="cash"?setSplitCash(e.target.value):setSplitQr(e.target.value)}
                    style={{background:"#f9f4f5",border:"0.5px solid #e8d5d9",borderRadius:7,padding:"6px 8px",fontSize:13,fontWeight:500,color:"#550a19",fontFamily:"inherit",outline:"none",width:90,textAlign:"right"}} />
                </div>
              ))}
              <div style={{display:"flex",justifyContent:"space-between",paddingTop:7,borderTop:"0.5px solid #e8d5d9",fontSize:12}}>
                <span style={{color:"#806070"}}>{t.remaining}</span>
                <span style={{fontWeight:500,color:remaining<=0?"#2e7d32":"#c62828"}}>{remaining<=0?`฿0 ${t.paid}`:`฿${fmt_sale(remaining)}`}</span>
              </div>
            </div>
          )}
        </Sec>

        {/* ★ เชื่อม API — ปุ่มยืนยันขายเรียก backend จริง */}
        <button onClick={handleConfirmSale} disabled={saving || cartItems.length===0}
          style={{width:"100%",background:"#550a19",borderRadius:14,padding:14,color:"#fff5f7",fontSize:15,fontWeight:500,cursor:saving?"default":"pointer",opacity:(saving||cartItems.length===0)?0.6:1,display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:"inherit",border:"none",marginBottom:10}}>
          <i className="ti ti-check" style={{fontSize:16}} aria-hidden="true" />{saving ? t.saving : t.confirm(fmt_sale(grandTotal))}
        </button>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:4}}>
          {[
            {icon:"ti-award",label:t.warranty,sub:t.warrantySub,col:"#550a19",bg:"#fdf0f2",border:"#e8c0c8",screen:null},
            {icon:"ti-receipt",label:t.receipt,sub:t.receiptSub,col:"#550a19",bg:"#fdf0f2",border:"#e8c0c8",screen:"invoice"},
            {icon:"ti-message-circle",label:t.lineNotify,sub:t.lineNotifySub,col:"#185FA5",bg:"#e8f0ff",border:"#a0b8e0",screen:null},
          ].map(d=>(
            <div key={d.label} onClick={()=>d.screen&&nav(d.screen)}
              style={{background:"#fff",borderRadius:10,border:`0.5px solid ${d.border}`,padding:"12px 8px",display:"flex",flexDirection:"column",alignItems:"center",gap:6,cursor:"pointer",textAlign:"center"}}>
              <div style={{width:34,height:34,borderRadius:9,background:d.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <i className={"ti "+d.icon} style={{fontSize:18,color:d.col}} aria-hidden="true" />
              </div>
              <div style={{fontSize:12,fontWeight:500,color:d.col}}>{d.label}</div>
              <div style={{fontSize:10,color:"#a07080"}}>{d.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
