// ═══════════════════════════════════════════════════════════════
// AnakynPartnerStock.jsx — เชื่อมกับ Backend จริง (ตามต้นฉบับ AppPreview ทุกรายละเอียด)
// search + sort, category filter tabs, การ์ดขยายได้พร้อม commission highlight
// ═══════════════════════════════════════════════════════════════
import { useState, useEffect } from "react";
import { api } from "./api"; // ★ เชื่อม API

const T_PS = {
  th: {
    langBtn:"EN", pageTitle:"สต๊อกสินค้า",
    searchPh:"ค้นหาชื่อ / SKU...",
    filterAll:"ทั้งหมด", filterRing:"แหวน", filterNecklace:"สร้อยคอ",
    filterEarring:"ต่างหู", filterBracelet:"กำไล", filterPendant:"จี้", filterOther:"อื่นๆ",
    available:"มีสินค้า", soldOut:"หมด",
    metal:"วัสดุ", weight:"น้ำหนัก", cert:"ใบเซอร์",
    commLabel:"คอมของคุณ",
    shareItem:"แชร์สินค้า", copyLink:"คัดลอกลิงค์",
    noResult:"ไม่พบสินค้า", loading:"กำลังโหลด...",
    sorts:["ราคา ↑","ราคา ↓","ใหม่สุด","คอมสูงสุด"],
  },
  en: {
    langBtn:"ไทย", pageTitle:"Product Stock",
    searchPh:"Search name / SKU...",
    filterAll:"All", filterRing:"Rings", filterNecklace:"Necklaces",
    filterEarring:"Earrings", filterBracelet:"Bracelets", filterPendant:"Pendants", filterOther:"Other",
    available:"Available", soldOut:"Sold out",
    metal:"Metal", weight:"Weight", cert:"Certificate",
    commLabel:"Your commission",
    shareItem:"Share", copyLink:"Copy link",
    noResult:"No items found", loading:"Loading...",
    sorts:["Price ↑","Price ↓","Newest","Top commission"],
  },
};

const CATS_PS = [
  {key:"all",   icon:"ti-diamond"},
  {key:"ring",  icon:"ti-circle"},
  {key:"necklace",  icon:"ti-link"},
  {key:"earring",   icon:"ti-sparkles"},
  {key:"bracelet", icon:"ti-wave-sine"},
  {key:"pendant", icon:"ti-disc"},
];

const fmt_PS = (n) => Math.round(Number(n)).toLocaleString("th-TH");

export default function AnakynPartnerStock({ navigate }) {
  const nav = navigate || function(){};
  const [lang, setLang] = useState("th");
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("all");
  const [sort, setSort] = useState(0);
  const [expanded, setExpanded] = useState(null);
  const t = T_PS[lang];

  // ★ เชื่อม API — โหลดสต๊อกสินค้าที่มีจริงทั้งหมด
  const [stockList, setStockList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getProducts().then(setStockList).finally(() => setLoading(false));
  }, []);

  const catLabel = (k) => ({
    all:t.filterAll, ring:t.filterRing, necklace:t.filterNecklace,
    earring:t.filterEarring, bracelet:t.filterBracelet, pendant:t.filterPendant, other:t.filterOther,
  }[k] || k);

  let items = stockList.filter(s => {
    const matchCat = cat === "all" || s.category === cat;
    const matchQ = query.trim() === "" ||
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.sku.toLowerCase().includes(query.toLowerCase());
    return matchCat && matchQ;
  });

  if (sort === 0) items = [...items].sort((a,b) => a.sale_price - b.sale_price);
  if (sort === 1) items = [...items].sort((a,b) => b.sale_price - a.sale_price);
  if (sort === 2) items = [...items].sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
  if (sort === 3) items = [...items].sort((a,b) => (b.partner_commission_pct||0) - (a.partner_commission_pct||0));

  return (
    <div style={{width:360,margin:"0 auto",background:"#f9f4f5",borderRadius:32,overflow:"hidden",border:"1.5px solid #c8a8b0",fontFamily:"'Anthropic Sans',sans-serif"}}>

      <div style={{background:"#550a19",padding:"10px 20px 4px"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
          <span style={{color:"#f0d0d8",fontSize:11}}>9:41</span>
          <span style={{display:"flex",gap:6}}>
            <i className="ti ti-wifi" style={{fontSize:13,color:"#f0d0d8"}} aria-hidden="true" />
            <i className="ti ti-battery-2" style={{fontSize:13,color:"#f0d0d8"}} aria-hidden="true" />
          </span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10,paddingBottom:12}}>
          <div onClick={()=>nav("partnerDashboard")} style={{width:32,height:32,borderRadius:"50%",background:"rgba(255,255,255,0.12)",display:"flex",alignItems:"center",justifyContent:"center",color:"#f0d0d8",fontSize:15,cursor:"pointer"}}>
            <i className="ti ti-arrow-left" aria-hidden="true" />
          </div>
          <span style={{fontSize:16,fontWeight:500,color:"#fff5f7",flex:1}}>{t.pageTitle}</span>
          <button onClick={()=>setLang(l=>l==="th"?"en":"th")}
            style={{background:"rgba(255,255,255,0.15)",border:"0.5px solid rgba(255,255,255,0.3)",borderRadius:8,padding:"4px 10px",fontSize:12,fontWeight:500,color:"#f5e0e5",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5}}>
            <i className="ti ti-language" style={{fontSize:13}} aria-hidden="true" />{t.langBtn}
          </button>
        </div>
      </div>

      <div style={{padding:"10px 16px",background:"#fff",borderBottom:"0.5px solid #e8d5d9"}}>
        <div style={{display:"flex",gap:8,marginBottom:10}}>
          <div style={{flex:1,position:"relative"}}>
            <i className="ti ti-search" style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:14,color:"#b08090"}} aria-hidden="true" />
            <input value={query} onChange={e=>setQuery(e.target.value)} placeholder={t.searchPh}
              style={{width:"100%",background:"#f9f4f5",border:"0.5px solid #e8d5d9",borderRadius:9,padding:"8px 10px 8px 32px",fontSize:13,color:"#2c1015",fontFamily:"inherit",outline:"none",boxSizing:"border-box"}} />
          </div>
          <select value={sort} onChange={e=>setSort(Number(e.target.value))}
            style={{background:"#f9f4f5",border:"0.5px solid #e8d5d9",borderRadius:9,padding:"0 10px",fontSize:11,color:"#806070",fontFamily:"inherit",outline:"none",cursor:"pointer"}}>
            {t.sorts.map((s,i)=><option key={i} value={i}>{s}</option>)}
          </select>
        </div>
        <div style={{display:"flex",gap:7,overflowX:"auto",paddingBottom:2}}>
          {CATS_PS.map(c=>(
            <button key={c.key} onClick={()=>setCat(c.key)}
              style={{display:"flex",alignItems:"center",gap:4,padding:"5px 10px",borderRadius:20,border:`0.5px solid ${cat===c.key?"#550a19":"#e8d5d9"}`,background:cat===c.key?"#550a19":"#fff",color:cat===c.key?"#f5e0e5":"#806070",fontSize:11,fontWeight:cat===c.key?500:400,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",flexShrink:0}}>
              <i className={"ti "+c.icon} style={{fontSize:12}} aria-hidden="true" />{catLabel(c.key)}
            </button>
          ))}
        </div>
      </div>

      <div style={{padding:"12px 16px",overflowY:"auto",maxHeight:560}}>
        {loading && <div style={{textAlign:"center",padding:"20px 0",color:"#a07080",fontSize:13}}>{t.loading}</div>}
        {!loading && items.length === 0 && (
          <div style={{textAlign:"center",padding:"40px 0",color:"#b08090",fontSize:13}}>{t.noResult}</div>
        )}
        {items.map(item => {
          const commPct = Number(item.partner_commission_pct) || 0;
          const commS = Math.round(Number(item.sale_price) * commPct / 100);
          const isOpen = expanded === item.id;
          const catIcon = CATS_PS.find(c=>c.key===item.category)?.icon || "ti-diamond";
          const mainDiamond = (item.diamonds && item.diamonds[0]) || null;
          const specs = [];
          if (mainDiamond?.shape) specs.push(mainDiamond.shape);
          if (mainDiamond?.color && mainDiamond?.clarity) specs.push(`${mainDiamond.color}/${mainDiamond.clarity}`);
          if (mainDiamond?.weight) specs.push(`${mainDiamond.weight}ct`);

          return (
            <div key={item.id} style={{background:"#fff",borderRadius:12,border:`0.5px solid ${isOpen?"#550a19":"#e8d5d9"}`,marginBottom:8,overflow:"hidden",transition:"border .15s"}}>
              <div onClick={()=>setExpanded(isOpen?null:item.id)}
                style={{padding:"11px 13px",cursor:"pointer",display:"flex",gap:10,alignItems:"flex-start"}}>
                <div style={{width:40,height:40,borderRadius:10,background:"#fdf0f2",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <i className={"ti "+catIcon} style={{fontSize:18,color:"#550a19"}} aria-hidden="true" />
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:500,color:"#2c1015",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.name}</div>
                      <div style={{fontSize:10,color:"#550a19",fontWeight:500,marginTop:1}}>{item.sku}</div>
                    </div>
                    <i className={"ti "+(isOpen?"ti-chevron-up":"ti-chevron-down")} style={{fontSize:13,color:"#a07080",flexShrink:0,marginLeft:6,marginTop:2}} aria-hidden="true" />
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:6}}>
                    <div>
                      <div style={{fontSize:14,fontWeight:500,color:"#2c1015"}}>฿{fmt_PS(item.sale_price)}</div>
                      <div style={{fontSize:11,color:"#b87020",marginTop:1}}>{t.commLabel} ฿{fmt_PS(commS)}</div>
                    </div>
                    <span style={{fontSize:10,fontWeight:500,background:item.is_available?"#e8f5e9":"#fdf0f2",color:item.is_available?"#2e7d32":"#c62828",borderRadius:20,padding:"2px 8px"}}>
                      {item.is_available ? t.available : t.soldOut}
                    </span>
                  </div>
                </div>
              </div>
              {isOpen && (
                <div style={{borderTop:"0.5px solid #f0e4e8",padding:"10px 13px",background:"#fdf9fa"}}>
                  {specs.length > 0 && (
                    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
                      {specs.map(s=>(
                        <span key={s} style={{fontSize:10,background:"#fff",color:"#806070",border:"0.5px solid #e8d5d9",borderRadius:4,padding:"2px 6px"}}>{s}</span>
                      ))}
                    </div>
                  )}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
                    {[[t.metal,item.metal_type||"—"],[t.weight,item.metal_weight_g?`${item.metal_weight_g}g`:"—"],[t.cert,item.has_certificate?(mainDiamond?.certLab||"✓"):"—"]].map(([l,v])=>(
                      <div key={l} style={{background:"#fff",borderRadius:7,padding:"6px 8px",border:"0.5px solid #e8d5d9"}}>
                        <div style={{fontSize:9,color:"#a07080"}}>{l}</div>
                        <div style={{fontSize:11,fontWeight:500,color:"#2c1015",marginTop:2}}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{background:"#fff8e8",borderRadius:8,border:"0.5px solid #e8c060",padding:"8px 10px",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <div style={{fontSize:10,color:"#854F0B"}}>{t.commLabel} ({commPct}%)</div>
                      <div style={{fontSize:16,fontWeight:500,color:"#5a3000"}}>฿{fmt_PS(commS)}</div>
                    </div>
                    <i className="ti ti-coin" style={{fontSize:24,color:"#b87020"}} aria-hidden="true" />
                  </div>
                  {item.is_available && (
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
                      <button style={{background:"#550a19",border:"none",borderRadius:9,padding:"9px 8px",fontSize:11,fontWeight:500,color:"#fff5f7",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                        <i className="ti ti-share" style={{fontSize:13}} aria-hidden="true" />{t.shareItem}
                      </button>
                      <button style={{background:"#fff",border:"0.5px solid #e8c0c8",borderRadius:9,padding:"9px 8px",fontSize:11,fontWeight:500,color:"#550a19",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                        <i className="ti ti-link" style={{fontSize:13}} aria-hidden="true" />{t.copyLink}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
