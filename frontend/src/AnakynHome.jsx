// ═══════════════════════════════════════════════════════════════
// AnakynHome.jsx — เชื่อมกับ Backend จริง (ตามต้นฉบับ AnakynHomeV2 ใน AppPreview)
// KPI, ขายล่าสุด, PO/งานซ่อมค้าง ดึงจาก database จริงทั้งหมด
// ═══════════════════════════════════════════════════════════════
import { useState, useEffect } from "react";
import { api, clearSession } from "./api"; // ★ เชื่อม API

const T_HOMEv2 = {
  th: {
    langBtn:"EN",
    date:new Date().toLocaleDateString("th-TH",{day:"numeric",month:"short",year:"numeric"}), dateLabel:"วันนี้", openStatus:"เปิดร้านแล้ว",
    todayLabel:"ยอดขายวันนี้", stockLabel:"สินค้าในสต๊อก", stockSub:"ชิ้น",
    profitLabel:"กำไรเดือนนี้", profitSub:"ก่อน VAT",
    menuTitle:"เมนูทั้งหมด",
    menus:[
      { icon:"ti-shopping-cart",  emoji:"🛍️",  label:"บันทึกขาย",    sub:"New Sale",       screen:"sale",           col:"#550a19", bg:"#fdf0f2" },
      { icon:"ti-diamond",        emoji:"💎",  label:"สต๊อกสินค้า",  sub:"Stock",          screen:"addStock",        col:"#534AB7", bg:"#f0eeff" },
      { icon:"ti-receipt",        emoji:"🧾",  label:"Invoice",       sub:"ใบกำกับภาษี",   screen:"invoice",         col:"#1a5c28", bg:"#e8f5e9" },
      { icon:"ti-file-text",      emoji:"📋",  label:"ใบเสนอราคา",   sub:"Quotation",      screen:"quotation",       col:"#1a3a60", bg:"#e0f0ff" },
      { icon:"ti-truck-delivery", emoji:"🚚",  label:"ใบสั่งซื้อ",   sub:"Purchase Order", screen:"purchaseOrder",   col:"#854F0B", bg:"#fff8e1" },
      { icon:"ti-tool",           emoji:"🔧",  label:"ใบสั่งซ่อม",   sub:"Service Order",  screen:"serviceOrder",    col:"#7a1c2e", bg:"#fdf0f2" },
      { icon:"ti-chart-bar",      emoji:"📊",  label:"สรุปรายงาน",   sub:"Summary",        screen:"summary",         col:"#2e7d32", bg:"#e8f5e9" },
      { icon:"ti-user-plus",      emoji:"👤",  label:"จัดการผู้ใช้", sub:"Users",          screen:"addUser",         col:"#550a19", bg:"#fdf0f2" },
      { icon:"ti-award",          emoji:"🏅",  label:"Warranty",      sub:"ใบรับประกัน",   screen:null,              col:"#b87020", bg:"#fff8e8" },
    ],
    recentTitle:"ขายล่าสุด",
    poTitle:"PO ค้างอยู่", srvTitle:"งานซ่อมค้าง",
    pendingLabel:"รายการค้างอยู่",
    noSales:"ยังไม่มีการขายวันนี้", noPending:"ไม่มีรายการค้าง",
    due:"นัดรับ", logout:"ออกจากระบบ",
  },
  en: {
    langBtn:"ไทย",
    date:new Date().toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}), dateLabel:"Today", openStatus:"Store open",
    todayLabel:"Today's sales", stockLabel:"Items in stock", stockSub:"items",
    profitLabel:"Monthly profit", profitSub:"before VAT",
    menuTitle:"All modules",
    menus:[
      { icon:"ti-shopping-cart",  emoji:"🛍️",  label:"New Sale",       sub:"บันทึกขาย",     screen:"sale",           col:"#550a19", bg:"#fdf0f2" },
      { icon:"ti-diamond",        emoji:"💎",  label:"Stock",          sub:"สต๊อกสินค้า",   screen:"addStock",        col:"#534AB7", bg:"#f0eeff" },
      { icon:"ti-receipt",        emoji:"🧾",  label:"Invoice",        sub:"ใบกำกับภาษี",   screen:"invoice",         col:"#1a5c28", bg:"#e8f5e9" },
      { icon:"ti-file-text",      emoji:"📋",  label:"Quotation",      sub:"ใบเสนอราคา",    screen:"quotation",       col:"#1a3a60", bg:"#e0f0ff" },
      { icon:"ti-truck-delivery", emoji:"🚚",  label:"Purchase Order", sub:"ใบสั่งซื้อ",    screen:"purchaseOrder",   col:"#854F0B", bg:"#fff8e1" },
      { icon:"ti-tool",           emoji:"🔧",  label:"Service Order",  sub:"ใบสั่งซ่อม",    screen:"serviceOrder",    col:"#7a1c2e", bg:"#fdf0f2" },
      { icon:"ti-chart-bar",      emoji:"📊",  label:"Summary",        sub:"สรุปรายงาน",    screen:"summary",         col:"#2e7d32", bg:"#e8f5e9" },
      { icon:"ti-user-plus",      emoji:"👤",  label:"Add User",       sub:"จัดการผู้ใช้",  screen:"addUser",         col:"#550a19", bg:"#fdf0f2" },
      { icon:"ti-award",          emoji:"🏅",  label:"Warranty",       sub:"ใบรับประกัน",   screen:null,              col:"#b87020", bg:"#fff8e8" },
    ],
    recentTitle:"Recent sales",
    poTitle:"Pending PO", srvTitle:"Pending Service",
    pendingLabel:"Pending items",
    noSales:"No sales today yet", noPending:"No pending items",
    due:"Due", logout:"Log out",
  },
};

const fmt = (n) => Math.round(Number(n)).toLocaleString("th-TH");
const fmtCompact = (n) => {
  n = Number(n);
  if (n >= 1000) return `฿${(n/1000).toFixed(0)}k`;
  return `฿${fmt(n)}`;
};
const POSTATUS_LABEL = { pending:"รอส่ง", sent:"ส่งแล้ว", received:"รับแล้ว", cancelled:"ยกเลิก" };
const POSTATUS_COLOR = { pending:["#fff8e1","#854F0B"], sent:["#e0f0ff","#1a3a60"], received:["#e8f5e9","#1a5c28"], cancelled:["#f5f5f5","#666"] };
const SRVSTATUS_LABEL = { received:"รับเรื่อง", repairing:"กำลังซ่อม", qc:"ตรวจสอบ", notified:"แจ้งลูกค้า", picked_up:"รับคืนแล้ว" };
const SRVSTATUS_COLOR = { received:["#fff8e1","#854F0B"], repairing:["#e0f0ff","#1a3a60"], qc:["#f0eeff","#3c3489"], notified:["#fdf0f2","#7a1c2e"], picked_up:["#e8f5e9","#1a5c28"] };

export default function AnakynHome({ navigate, userRole, onLogout }) {
  const nav = navigate || function(){};
  const doLogout = onLogout || function(){};
  const [lang, setLang] = useState("th");
  const t = T_HOMEv2[lang];
  const isAdmin = userRole === "admin";

  const visibleMenus = t.menus.filter(m => m.screen !== "addUser" || isAdmin);

  // ★ เชื่อม API — โหลดข้อมูลจริงทั้งหมดสำหรับหน้า Home
  const [summary, setSummary] = useState(null);
  const [recentSales, setRecentSales] = useState([]);
  const [pendingPOs, setPendingPOs] = useState([]);
  const [pendingServices, setPendingServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getSummary("today"),
      api.getSales(3),
      api.getPurchaseOrders(),
      api.getServiceOrders(),
    ]).then(([sum, sales, pos, services]) => {
      setSummary(sum);
      setRecentSales(sales);
      setPendingPOs(pos.filter((p) => p.status === "pending" || p.status === "sent").slice(0,2));
      setPendingServices(services.filter((s) => s.status !== "picked_up").slice(0,2));
    }).finally(() => setLoading(false));
  }, []);

  const handleLogout = () => { clearSession(); doLogout(); };

  return (
    <div style={{width:360,margin:"0 auto",background:"#f9f4f5",borderRadius:32,overflow:"hidden",border:"1.5px solid #c8a8b0",fontFamily:"'Anthropic Sans',sans-serif"}}>

      {/* HEADER */}
      <div style={{background:"#550a19",padding:"10px 20px 4px"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
          <span style={{color:"#f0d0d8",fontSize:11,fontWeight:500}}>9:41</span>
          <span style={{display:"flex",gap:6}}>
            <i className="ti ti-wifi" style={{fontSize:13,color:"#f0d0d8"}} aria-hidden="true"/>
            <i className="ti ti-battery-2" style={{fontSize:13,color:"#f0d0d8"}} aria-hidden="true"/>
          </span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10,paddingBottom:12}}>
          <div>
            <div style={{fontSize:18,fontWeight:500,color:"#f5e8eb",letterSpacing:2}}>ANAKYN</div>
            <div style={{fontSize:9,color:"#d4a0ac",letterSpacing:3}}>GEMS</div>
          </div>
          <div style={{marginLeft:"auto",display:"flex",gap:7}}>
            <button onClick={()=>setLang(l=>l==="th"?"en":"th")}
              style={{background:"rgba(255,255,255,0.15)",border:"0.5px solid rgba(255,255,255,0.3)",borderRadius:8,padding:"4px 10px",fontSize:12,fontWeight:500,color:"#f5e0e5",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5}}>
              <i className="ti ti-language" style={{fontSize:13}} aria-hidden="true"/>{t.langBtn}
            </button>
            <button onClick={handleLogout}
              style={{background:"rgba(255,255,255,0.1)",border:"0.5px solid rgba(255,255,255,0.2)",borderRadius:8,padding:"4px 9px",fontSize:11,color:"#f0d0d8",cursor:"pointer",fontFamily:"inherit"}}>
              {t.logout}
            </button>
          </div>
        </div>
      </div>

      {/* DATE STRIP */}
      <div style={{background:"#3d0712",padding:"7px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{color:"#d4a0ac",fontSize:12}}>{t.dateLabel} <strong style={{color:"#f0d0d8"}}>{t.date}</strong></span>
        <span style={{display:"flex",alignItems:"center",gap:4}}>
          <i className="ti ti-circle-filled" style={{fontSize:8,color:"#7ec878"}} aria-hidden="true"/>
          <strong style={{color:"#f0d0d8",fontSize:12}}>{t.openStatus}</strong>
        </span>
      </div>

      <div style={{padding:"14px 16px",overflowY:"auto",maxHeight:680}}>

        {/* KPI — ★ เชื่อม API จริงจาก /api/summary?period=today */}
        <div style={{marginBottom:10}}>
          <div style={{background:"#550a19",borderRadius:12,padding:"12px 16px",marginBottom:8}}>
            <div style={{fontSize:11,color:"#d4a0ac",marginBottom:3}}>{t.todayLabel}</div>
            <div style={{fontSize:24,fontWeight:500,color:"#fff5f7"}}>
              {loading ? "—" : `฿${fmt(summary?.total_sales || 0)}`}
            </div>
            <div style={{fontSize:11,color:"#c090a0",marginTop:3}}>
              {loading ? "" : `${summary?.order_count || 0} รายการ`}
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {[
              [t.stockLabel, loading?"—":summary?.stock_count, t.stockSub, "ti-diamond","#534AB7","#f0eeff"],
              [t.profitLabel, loading?"—":fmtCompact(summary?.estimated_profit||0), t.profitSub, "ti-trending-up","#1a5c28","#e8f5e9"],
            ].map(([label,val,sub,icon,col,bg])=>(
              <div key={label} style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8d5d9",padding:"10px 12px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                  <div style={{fontSize:10,color:"#a07080"}}>{label}</div>
                  <div style={{width:22,height:22,borderRadius:6,background:bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <i className={"ti "+icon} style={{fontSize:11,color:col}} aria-hidden="true"/>
                  </div>
                </div>
                <div style={{fontSize:17,fontWeight:500,color:"#2c1015"}}>{val}</div>
                <div style={{fontSize:10,color:"#b09090",marginTop:2}}>{sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* MENU GRID */}
        <div style={{background:"#fff",borderRadius:12,border:"0.5px solid #e8d5d9",padding:"12px 10px",marginBottom:10}}>
          <div style={{fontSize:11,fontWeight:500,color:"#a07080",letterSpacing:"1.5px",marginBottom:10,paddingLeft:2}}>{t.menuTitle}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6}}>
            {visibleMenus.map((m)=>(
              <div key={m.label} onClick={()=>m.screen && nav(m.screen)}
                style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5,padding:"8px 4px",borderRadius:10,cursor:m.screen?"pointer":"default",transition:"background .15s"}}
                onMouseEnter={e=>{if(m.screen) e.currentTarget.style.background="#f9f4f5"}}
                onMouseLeave={e=>{e.currentTarget.style.background="transparent"}}>
                <div style={{width:44,height:44,borderRadius:13,background:m.bg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,position:"relative",border:`1px solid ${m.col}18`}}>
                  <span style={{fontSize:22,lineHeight:1}}>{m.emoji}</span>
                </div>
                <div style={{fontSize:10,fontWeight:500,color:m.screen?"#2c1015":"#b09090",textAlign:"center",lineHeight:1.3}}>{m.label}</div>
                <div style={{fontSize:9,color:"#c0a8b0",textAlign:"center",lineHeight:1.2,marginTop:-2}}>{m.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* RECENT SALES — ★ เชื่อม API จริงจาก /api/sales */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <div style={{fontSize:12,fontWeight:500,color:"#550a19",display:"flex",alignItems:"center",gap:6}}>
            <i className="ti ti-shopping-cart" style={{fontSize:13}} aria-hidden="true"/>{t.recentTitle}
          </div>
        </div>
        {!loading && recentSales.length === 0 && (
          <div style={{fontSize:12,color:"#a07080",textAlign:"center",padding:"10px 0"}}>{t.noSales}</div>
        )}
        {recentSales.map(s=>(
          <div key={s.id} onClick={()=>nav("sale")}
            style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8d5d9",padding:"9px 12px",marginBottom:7,display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:12,fontWeight:500,color:"#2c1015",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.sale_no}</div>
              <div style={{fontSize:11,color:"#a07080",marginTop:2}}>
                {new Date(s.sold_at).toLocaleTimeString("th-TH",{hour:"2-digit",minute:"2-digit"})} · {s.customer_name || "ไม่ระบุ"}
              </div>
            </div>
            <div style={{fontSize:14,fontWeight:500,color:"#550a19",flexShrink:0,marginLeft:10}}>฿{fmt(s.total)}</div>
          </div>
        ))}

        {/* PENDING — ★ เชื่อม API จริงจาก /api/purchase-orders และ /api/service-orders */}
        <div style={{fontSize:12,fontWeight:500,color:"#550a19",marginBottom:8,marginTop:4,display:"flex",alignItems:"center",gap:6}}>
          <i className="ti ti-clock" style={{fontSize:13}} aria-hidden="true"/>{t.pendingLabel}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:6}}>
          {[
            {title:t.poTitle,count:pendingPOs.length,icon:"ti-truck-delivery",col:"#1a3a60",bg:"#e0f0ff",screen:"purchaseOrder"},
            {title:t.srvTitle,count:pendingServices.length,icon:"ti-tool",col:"#854F0B",bg:"#fff8e1",screen:"serviceOrder"},
          ].map(p=>(
            <div key={p.title} onClick={()=>nav(p.screen)}
              style={{background:p.bg,borderRadius:10,border:`0.5px solid ${p.col}20`,padding:"10px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:30,height:30,borderRadius:8,background:"rgba(255,255,255,0.6)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <i className={"ti "+p.icon} style={{fontSize:15,color:p.col}} aria-hidden="true"/>
              </div>
              <div>
                <div style={{fontSize:11,color:p.col,fontWeight:500}}>{p.title}</div>
                <div style={{fontSize:18,fontWeight:500,color:p.col}}>{loading?"—":p.count}</div>
              </div>
            </div>
          ))}
        </div>

        {!loading && pendingPOs.length === 0 && pendingServices.length === 0 && (
          <div style={{fontSize:12,color:"#a07080",textAlign:"center",padding:"10px 0"}}>{t.noPending}</div>
        )}

        {pendingPOs.map((po)=>{
          const [bg,col]=POSTATUS_COLOR[po.status]||["#f5f5f5","#666"];
          return (
            <div key={po.id} onClick={()=>nav("purchaseOrder")}
              style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8d5d9",padding:"9px 12px",marginBottom:6,display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:10,fontWeight:500,color:"#550a19"}}>{po.po_no}</div>
                <div style={{fontSize:12,color:"#2c1015",marginTop:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{po.supplier_name || "ไม่ระบุ"}</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3,marginLeft:8,flexShrink:0}}>
                <div style={{fontSize:12,fontWeight:500,color:"#2c1015"}}>฿{fmt(po.total)}</div>
                <span style={{fontSize:9,fontWeight:500,background:bg,color:col,borderRadius:20,padding:"2px 7px"}}>{POSTATUS_LABEL[po.status]}</span>
              </div>
            </div>
          );
        })}
        {pendingServices.map((s)=>{
          const [bg,col]=SRVSTATUS_COLOR[s.status]||["#f5f5f5","#666"];
          return (
            <div key={s.id} onClick={()=>nav("serviceOrder")}
              style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8d5d9",padding:"9px 12px",marginBottom:6,display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:10,fontWeight:500,color:"#550a19"}}>{s.service_no}</div>
                <div style={{fontSize:12,color:"#2c1015",marginTop:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.product_name || "—"}</div>
                <div style={{fontSize:9,color:"#a07080",marginTop:1}}>{s.customer_name || "ไม่ระบุ"}</div>
              </div>
              <span style={{fontSize:9,fontWeight:500,background:bg,color:col,borderRadius:20,padding:"2px 7px",flexShrink:0,marginLeft:8}}>{SRVSTATUS_LABEL[s.status]}</span>
            </div>
          );
        })}

      </div>
    </div>
  );
}
