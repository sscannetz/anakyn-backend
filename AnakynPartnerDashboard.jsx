// ═══════════════════════════════════════════════════════════════
// AnakynPartnerDashboard.jsx — เชื่อมกับ Backend จริง (ตามต้นฉบับ AppPreview ทุกรายละเอียด)
// level badge, KPI 4 กล่อง, payout banner, ref code คัดลอกได้, how-to-refer, ออเดอร์ล่าสุด
// ═══════════════════════════════════════════════════════════════
import { useState, useEffect } from "react";
import { api, clearSession } from "./api"; // ★ เชื่อม API

const T_PD = {
  th: {
    langBtn:"EN",
    partnerCode:"รหัสตัวแทน",
    levels:{ silver:"Silver", gold:"Gold", platinum:"Platinum" },
    commRateVal:(r)=>`${r}% จากยอดขาย`,
    kpi_sales:"ยอดขายที่แนะนำ", kpi_comm:"ค่าคอมสะสม",
    kpi_pending:"รอจ่าย", kpi_paid:"จ่ายแล้ว",
    recentTitle:"ออเดอร์ล่าสุด",
    status:{ pending:"รอยืนยัน", confirmed:"ยืนยันแล้ว", paid:"จ่ายคอมแล้ว", cancelled:"ยกเลิก" },
    statusBg:{ pending:"#fff8e1", confirmed:"#e0f0ff", paid:"#e8f5e9", cancelled:"#fdf0f2" },
    statusCol:{ pending:"#854F0B", confirmed:"#1a3a60", paid:"#2e7d32", cancelled:"#c62828" },
    commLabel:"ค่าคอม",
    howTitle:"วิธีแนะนำลูกค้า",
    how1title:"ส่งลูกค้ามาที่ร้าน",
    how1desc:"แนะนำให้ลูกค้ามาดูสินค้าที่ร้านโดยตรง แจ้งชื่อหรือรหัสตัวแทนของคุณ",
    how2title:"แชร์ลิงค์ออนไลน์",
    how2desc:"แชร์ลิงค์สินค้าจากระบบ หรือโพสต์โซเชียลมีเดีย เมื่อลูกค้าสั่งซื้อจะนับยอดให้อัตโนมัติ",
    copyLink:"คัดลอก Ref. Link",
    shareLink:"แชร์ LINE",
    viewStock:"ดูสต๊อกสินค้า",
    commHistory:"ประวัติค่าคอม",
    withdraw:"แจ้งถอนเงิน",
    pendingComm:"ค่าคอมที่รอรับ",
    nextPayout:"จ่ายรอบถัดไป",
    payoutDate:"สิ้นเดือนนี้",
    logout:"ออกจากระบบ",
    refCode:"Ref. Code ของฉัน",
    copied:"คัดลอกแล้ว!",
    noOrders:"ยังไม่มีออเดอร์", loading:"กำลังโหลด...",
  },
  en: {
    langBtn:"ไทย",
    partnerCode:"Partner ID",
    levels:{ silver:"Silver", gold:"Gold", platinum:"Platinum" },
    commRateVal:(r)=>`${r}% of sale`,
    kpi_sales:"Referred sales", kpi_comm:"Total commission",
    kpi_pending:"Pending payout", kpi_paid:"Paid out",
    recentTitle:"Recent orders",
    status:{ pending:"Pending", confirmed:"Confirmed", paid:"Paid", cancelled:"Cancelled" },
    statusBg:{ pending:"#fff8e1", confirmed:"#e0f0ff", paid:"#e8f5e9", cancelled:"#fdf0f2" },
    statusCol:{ pending:"#854F0B", confirmed:"#1a3a60", paid:"#2e7d32", cancelled:"#c62828" },
    commLabel:"Commission",
    howTitle:"How to refer customers",
    how1title:"Send to store",
    how1desc:"Refer customers to visit the store directly. Ask them to mention your name or partner code.",
    how2title:"Share online link",
    how2desc:"Share product links or post on social media. Sales via your link are tracked automatically.",
    copyLink:"Copy Ref. Link",
    shareLink:"Share on LINE",
    viewStock:"View stock",
    commHistory:"Commission history",
    withdraw:"Request payout",
    pendingComm:"Pending commission",
    nextPayout:"Next payout",
    payoutDate:"End of month",
    logout:"Logout",
    refCode:"My Ref. Code",
    copied:"Copied!",
    noOrders:"No orders yet", loading:"Loading...",
  },
};

const fmt_PD = (n) => Math.round(Number(n)).toLocaleString("th-TH");
const LEVEL_COLOR_PD = { silver:"#808080", gold:"#b87020", platinum:"#534AB7" };
const LEVEL_BG_PD    = { silver:"#f5f5f5", gold:"#fff8e8", platinum:"#f0eeff" };

export default function AnakynPartnerDashboard({ navigate, onLogout }) {
  const nav = navigate || function(){};
  const doLogout = onLogout || function(){};
  const [lang, setLang] = useState("th");
  const [copied, setCopied] = useState(false);
  const t = T_PD[lang];

  // ★ เชื่อม API — โหลด dashboard จริงของ partner ที่ login อยู่
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getPartnerDashboard().then(setData).finally(() => setLoading(false));
  }, []);

  const partner = data?.partner || {};
  const stats = data?.stats || { total_sales:0, total_commission:0, pending_commission:0, paid_commission:0 };
  const orders = data?.recent_orders || [];

  const level = partner.level || "silver";
  const levelCol = LEVEL_COLOR_PD[level];
  const levelBg = LEVEL_BG_PD[level];

  const handleCopy = () => {
    if (navigator.clipboard && partner.ref_code) {
      navigator.clipboard.writeText(partner.ref_code).catch(()=>{});
    }
    setCopied(true);
    setTimeout(()=>setCopied(false), 2000);
  };

  const handleLogout = () => { clearSession(); doLogout(); };

  return (
    <div style={{width:360,margin:"0 auto",background:"#f9f4f5",borderRadius:32,overflow:"hidden",border:"1.5px solid #c8a8b0",fontFamily:"'Anthropic Sans',sans-serif"}}>

      <div style={{background:"#550a19",padding:"10px 20px 0"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
          <span style={{color:"#f0d0d8",fontSize:11}}>9:41</span>
          <span style={{display:"flex",gap:6}}>
            <i className="ti ti-wifi" style={{fontSize:13,color:"#f0d0d8"}} aria-hidden="true" />
            <i className="ti ti-battery-2" style={{fontSize:13,color:"#f0d0d8"}} aria-hidden="true" />
          </span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10,paddingBottom:12}}>
          <div>
            <div style={{fontSize:16,fontWeight:500,color:"#f5e8eb",letterSpacing:2}}>ANAKYN</div>
            <div style={{fontSize:8,color:"#d4a0ac",letterSpacing:3}}>GEMS · PARTNER</div>
          </div>
          <button onClick={()=>setLang(l=>l==="th"?"en":"th")}
            style={{marginLeft:"auto",background:"rgba(255,255,255,0.15)",border:"0.5px solid rgba(255,255,255,0.3)",borderRadius:8,padding:"4px 10px",fontSize:12,fontWeight:500,color:"#f5e0e5",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5}}>
            <i className="ti ti-language" style={{fontSize:13}} aria-hidden="true" />{t.langBtn}
          </button>
          <button onClick={handleLogout}
            style={{background:"rgba(255,255,255,0.12)",border:"0.5px solid rgba(255,255,255,0.2)",borderRadius:8,padding:"5px 8px",cursor:"pointer",color:"#f0d0d8",fontSize:11,fontFamily:"inherit"}}>
            {t.logout}
          </button>
        </div>
        <div style={{background:"rgba(255,255,255,0.1)",borderRadius:"12px 12px 0 0",padding:"12px 14px",display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:44,height:44,borderRadius:"50%",background:"rgba(255,255,255,0.15)",border:"2px solid rgba(255,255,255,0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>💎</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:500,color:"#fff5f7"}}>{partner.full_name || "—"}</div>
            <div style={{fontSize:10,color:"#d4a0ac",marginTop:2}}>{t.partnerCode}: {partner.ref_code || "—"}</div>
          </div>
          <div style={{textAlign:"right",flexShrink:0}}>
            <div style={{display:"inline-flex",alignItems:"center",gap:4,background:levelBg,borderRadius:20,padding:"3px 9px",marginBottom:4}}>
              <i className="ti ti-award" style={{fontSize:11,color:levelCol}} aria-hidden="true" />
              <span style={{fontSize:11,fontWeight:500,color:levelCol}}>{t.levels[level]}</span>
            </div>
            <div style={{fontSize:10,color:"#d4a0ac"}}>{t.commRateVal(partner.comm_rate_pct || 0)}</div>
          </div>
        </div>
      </div>

      <div style={{padding:"14px 16px",overflowY:"auto",maxHeight:680}}>

        {loading && <div style={{fontSize:12,color:"#a07080",textAlign:"center",padding:"10px 0"}}>{t.loading}</div>}

        {/* KPI — ★ เชื่อม API จริงจาก /api/partners/me/dashboard */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
          {[
            {label:t.kpi_sales,   val:"฿"+fmt_PD(stats.total_sales), icon:"ti-shopping-cart", col:"#550a19", bg:"#fdf0f2"},
            {label:t.kpi_comm,    val:"฿"+fmt_PD(stats.total_commission),  icon:"ti-coin",          col:"#b87020", bg:"#fff8e8"},
            {label:t.kpi_pending, val:"฿"+fmt_PD(stats.pending_commission),   icon:"ti-clock",         col:"#854F0B", bg:"#fff8e1"},
            {label:t.kpi_paid,    val:"฿"+fmt_PD(stats.paid_commission),   icon:"ti-check",         col:"#2e7d32", bg:"#e8f5e9"},
          ].map(k=>(
            <div key={k.label} style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8d5d9",padding:"10px 12px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <div style={{fontSize:10,color:"#a07080"}}>{k.label}</div>
                <div style={{width:24,height:24,borderRadius:7,background:k.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <i className={"ti "+k.icon} style={{fontSize:12,color:k.col}} aria-hidden="true" />
                </div>
              </div>
              <div style={{fontSize:16,fontWeight:500,color:"#2c1015"}}>{loading?"—":k.val}</div>
            </div>
          ))}
        </div>

        <div style={{background:"#fff8e8",borderRadius:10,border:"0.5px solid #e8c060",padding:"10px 14px",marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:11,color:"#854F0B",fontWeight:500}}>{t.pendingComm}</div>
            <div style={{fontSize:18,fontWeight:500,color:"#5a3000"}}>฿{fmt_PD(stats.pending_commission)}</div>
            <div style={{fontSize:10,color:"#a07080",marginTop:2}}>{t.nextPayout}: {t.payoutDate}</div>
          </div>
          <button style={{background:"#550a19",border:"none",borderRadius:10,padding:"9px 14px",fontSize:12,fontWeight:500,color:"#fff5f7",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6}}>
            <i className="ti ti-cash" style={{fontSize:14}} aria-hidden="true" />{t.withdraw}
          </button>
        </div>

        <div style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8d5d9",padding:"10px 14px",marginBottom:10}}>
          <div style={{fontSize:10,color:"#a07080",marginBottom:6}}>{t.refCode}</div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <div style={{flex:1,background:"#f9f4f5",borderRadius:8,padding:"8px 12px",fontFamily:"monospace",fontSize:14,fontWeight:500,color:"#550a19",letterSpacing:2}}>{partner.ref_code || "—"}</div>
            <button onClick={handleCopy}
              style={{background:copied?"#2e7d32":"#550a19",border:"none",borderRadius:8,padding:"8px 12px",fontSize:11,fontWeight:500,color:"#fff",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5,transition:"background .2s",flexShrink:0}}>
              <i className={"ti "+(copied?"ti-check":"ti-copy")} style={{fontSize:13}} aria-hidden="true" />
              {copied ? t.copied : t.copyLink.split(" ")[0]}
            </button>
          </div>
        </div>

        <div style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8d5d9",padding:"12px 14px",marginBottom:10}}>
          <div style={{fontSize:11,fontWeight:500,color:"#550a19",marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
            <i className="ti ti-users" style={{fontSize:14}} aria-hidden="true" />{t.howTitle}
          </div>
          {[
            {icon:"ti-building-store", title:t.how1title, desc:t.how1desc, col:"#854F0B", bg:"#fff8e1"},
            {icon:"ti-share",     title:t.how2title, desc:t.how2desc, col:"#1a3a60", bg:"#e0f0ff"},
          ].map(h=>(
            <div key={h.title} style={{display:"flex",gap:10,marginBottom:8,padding:"8px 10px",borderRadius:8,background:h.bg,border:`0.5px solid ${h.col}20`}}>
              <div style={{width:32,height:32,borderRadius:8,background:"rgba(255,255,255,0.6)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <i className={"ti "+h.icon} style={{fontSize:16,color:h.col}} aria-hidden="true" />
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:500,color:h.col}}>{h.title}</div>
                <div style={{fontSize:11,color:"#806070",marginTop:2,lineHeight:1.5}}>{h.desc}</div>
              </div>
            </div>
          ))}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginTop:4}}>
            <button onClick={handleCopy} style={{background:"#fff",border:"0.5px solid #e8c0c8",borderRadius:8,padding:"8px 6px",fontSize:11,fontWeight:500,color:"#550a19",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
              <i className="ti ti-link" style={{fontSize:13}} aria-hidden="true" />{t.copyLink}
            </button>
            <button style={{background:"#00b900",border:"none",borderRadius:8,padding:"8px 6px",fontSize:11,fontWeight:500,color:"#fff",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
              <i className="ti ti-message-circle" style={{fontSize:13}} aria-hidden="true" />{t.shareLink}
            </button>
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
          <button onClick={()=>nav("partnerStock")}
            style={{background:"#550a19",border:"none",borderRadius:12,padding:"12px 8px",display:"flex",flexDirection:"column",alignItems:"center",gap:6,cursor:"pointer",fontFamily:"inherit"}}>
            <i className="ti ti-diamond" style={{fontSize:22,color:"#f5e0e5"}} aria-hidden="true" />
            <span style={{fontSize:12,fontWeight:500,color:"#f5e0e5"}}>{t.viewStock}</span>
          </button>
          <button style={{background:"#fff",border:"0.5px solid #e8d5d9",borderRadius:12,padding:"12px 8px",display:"flex",flexDirection:"column",alignItems:"center",gap:6,cursor:"pointer",fontFamily:"inherit"}}>
            <i className="ti ti-history" style={{fontSize:22,color:"#550a19"}} aria-hidden="true" />
            <span style={{fontSize:12,fontWeight:500,color:"#550a19"}}>{t.commHistory}</span>
          </button>
        </div>

        {/* Recent orders — ★ เชื่อม API จริง */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <div style={{fontSize:12,fontWeight:500,color:"#550a19",display:"flex",alignItems:"center",gap:6}}>
            <i className="ti ti-receipt" style={{fontSize:14}} aria-hidden="true" />{t.recentTitle}
          </div>
        </div>
        {!loading && orders.length === 0 && (
          <div style={{fontSize:12,color:"#a07080",textAlign:"center",padding:"10px 0"}}>{t.noOrders}</div>
        )}
        {orders.map((o,idx)=>(
          <div key={idx} style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8d5d9",padding:"10px 12px",marginBottom:7}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:5}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:11,color:"#550a19",fontWeight:500}}>{o.sale_no} · {new Date(o.sold_at).toLocaleDateString("th-TH")}</div>
                <div style={{fontSize:10,color:"#a07080",marginTop:1}}>{o.customer_name || "ไม่ระบุ"}</div>
              </div>
              <div style={{textAlign:"right",flexShrink:0,marginLeft:8}}>
                <div style={{fontSize:13,fontWeight:500,color:"#2c1015"}}>฿{fmt_PD(o.total)}</div>
                <div style={{fontSize:11,fontWeight:500,color:"#b87020",marginTop:2}}>{t.commLabel} ฿{fmt_PD(o.commission)}</div>
              </div>
            </div>
            <span style={{fontSize:10,fontWeight:500,background:t.statusBg[o.status],color:t.statusCol[o.status],borderRadius:20,padding:"2px 9px"}}>
              {t.status[o.status]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
