// ═══════════════════════════════════════════════════════════════
// AnakynSummary.jsx — เชื่อมกับ Backend จริง (ตามต้นฉบับ AppPreview ทุกรายละเอียด)
// period tabs, KPI grid, bar chart รายวัน 7 วัน, สินค้าขายดี, ช่องทางชำระเงิน, รายการค้าง
// ═══════════════════════════════════════════════════════════════
import { useState, useEffect } from "react";
import { api } from "./api"; // ★ เชื่อม API

const T_SUM = {
  th: {
    langBtn: "EN", pageTitle: "สรุปรายงาน",
    periods: ["วันนี้","สัปดาห์นี้","เดือนนี้","ปีนี้"],
    periodKeys: ["today","week","month","year"],
    revenue: "รายได้รวม", orders: "จำนวนออเดอร์",
    profit: "กำไรสุทธิ", profitMargin: "อัตรากำไร",
    vatCollected: "VAT ที่เก็บได้", vatLabel: "VAT 7%",
    topSales: "สินค้าขายดี", rank: "อันดับ",
    item: "สินค้า", qty: "จำนวน", amount: "ยอด",
    paymentBreakdown: "ช่องทางชำระเงิน",
    cash: "เงินสด", qr: "โอน / QR", card: "บัตรเครดิต", mobile: "Mobile Pay",
    pendingSection: "รายการค้างอยู่",
    pendingPO: "ใบสั่งซื้อค้าง", pendingSRV: "งานซ่อมค้าง", pendingQT: "ใบเสนอราคา",
    exportPDF: "Export PDF", exportExcel: "Export Excel",
    chartTitle: "ยอดขายรายวัน (7 วันล่าสุด)",
    noData: "ไม่มีข้อมูล", loading: "กำลังโหลด...",
  },
  en: {
    langBtn: "ไทย", pageTitle: "Summary Report",
    periods: ["Today","This week","This month","This year"],
    periodKeys: ["today","week","month","year"],
    revenue: "Total revenue", orders: "Orders",
    profit: "Net profit", profitMargin: "Margin",
    vatCollected: "VAT collected", vatLabel: "VAT 7%",
    topSales: "Top selling items", rank: "Rank",
    item: "Item", qty: "Qty", amount: "Amount",
    paymentBreakdown: "Payment breakdown",
    cash: "Cash", qr: "Transfer / QR", card: "Credit card", mobile: "Mobile Pay",
    pendingSection: "Pending items",
    pendingPO: "Purchase orders", pendingSRV: "Service orders", pendingQT: "Quotations",
    exportPDF: "Export PDF", exportExcel: "Export Excel",
    chartTitle: "Daily sales (last 7 days)",
    noData: "No data", loading: "Loading...",
  },
};

const fmt_sum = (n) => n >= 1000000 ? (n/1000000).toFixed(1)+"M" : n >= 1000 ? (n/1000).toFixed(0)+"k" : String(Math.round(n));
const fmtFull = (n) => Math.round(Number(n)).toLocaleString("th-TH");

const Sec = ({ children }) => (
  <div style={{ background:"#fff", borderRadius:12, border:"0.5px solid #e8d5d9", padding:"12px 14px", marginBottom:10 }}>{children}</div>
);
const SL = ({ icon, children }) => (
  <div style={{ fontSize:11, fontWeight:500, color:"#550a19", letterSpacing:"1.5px", marginBottom:10, display:"flex", alignItems:"center", gap:6 }}>
    <i className={"ti "+icon} style={{ fontSize:14 }} aria-hidden="true" />{children}
  </div>
);
const KPI = ({ label, value, sub, subUp, icon, col="#550a19", bg="#fdf0f2" }) => (
  <div style={{ background:"#fff", borderRadius:10, border:"0.5px solid #e8d5d9", padding:"10px 12px" }}>
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
      <div style={{ fontSize:10, color:"#a07080" }}>{label}</div>
      <div style={{ width:26, height:26, borderRadius:7, background:bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <i className={"ti "+icon} style={{ fontSize:13, color:col }} aria-hidden="true" />
      </div>
    </div>
    <div style={{ fontSize:18, fontWeight:500, color:"#2c1015" }}>{value}</div>
    {sub && (
      <div style={{ fontSize:10, marginTop:3, color: subUp ? "#2e7d32" : "#c62828", display:"flex", alignItems:"center", gap:3 }}>
        {subUp ? "▲" : "▼"} {sub}
      </div>
    )}
  </div>
);

const PAY_META = {
  cash: { col:"#2e7d32" }, qr: { col:"#1a3a60" }, card: { col:"#550a19" }, mobile: { col:"#854F0B" },
};

export default function AnakynSummary({ navigate }) {
  const nav = navigate || function(){};
  const [lang, setLang] = useState("th");
  const [period, setPeriod] = useState(2); // index, default "month"
  const t = T_SUM[lang];

  // ★ เชื่อม API — โหลดสรุปจริงตามช่วงเวลาที่เลือก
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getSummary(t.periodKeys[period]).then(setSummary).finally(() => setLoading(false));
  }, [period]);

  const d = summary || { total_sales:0, order_count:0, estimated_profit:0, vat_collected:0, top_items:[], payment_breakdown:{}, daily_chart:[], pending_po:0, pending_service:0, pending_quotation:0 };

  const margin = d.total_sales > 0 ? ((d.estimated_profit / d.total_sales) * 100).toFixed(1) : "0.0";

  // bar chart: ใช้ daily_chart จริงจาก backend (อาจมีน้อยกว่า 7 วันถ้ายังไม่มียอดขาย)
  const chartDays = d.daily_chart.length > 0 ? d.daily_chart : [];
  const chartMax = Math.max(1, ...chartDays.map(c => c.total));
  const todayStr = new Date().toISOString().slice(0,10);

  const paymentEntries = Object.entries(d.payment_breakdown || {});
  const paymentTotal = paymentEntries.reduce((s,[,v])=>s+v, 0) || 1;

  return (
    <div style={{ width:360, margin:"0 auto", background:"#f9f4f5", borderRadius:32, overflow:"hidden", border:"1.5px solid #c8a8b0", fontFamily:"'Anthropic Sans',sans-serif" }}>

      <div style={{ background:"#550a19", padding:"10px 20px 4px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
          <span style={{ color:"#f0d0d8", fontSize:11 }}>9:41</span>
          <span style={{ display:"flex", gap:6 }}>
            <i className="ti ti-wifi" style={{ fontSize:13, color:"#f0d0d8" }} aria-hidden="true" />
            <i className="ti ti-battery-2" style={{ fontSize:13, color:"#f0d0d8" }} aria-hidden="true" />
          </span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10, paddingBottom:12 }}>
          <div onClick={() => nav("home")} style={{ width:32, height:32, borderRadius:"50%", background:"rgba(255,255,255,0.12)", display:"flex", alignItems:"center", justifyContent:"center", color:"#f0d0d8", fontSize:15, cursor:"pointer" }}>
            <i className="ti ti-arrow-left" aria-hidden="true" />
          </div>
          <span style={{ fontSize:16, fontWeight:500, color:"#fff5f7", flex:1 }}>{t.pageTitle}</span>
          <button onClick={() => setLang(l => l==="th"?"en":"th")}
            style={{ background:"rgba(255,255,255,0.15)", border:"0.5px solid rgba(255,255,255,0.3)", borderRadius:8, padding:"4px 10px", fontSize:12, fontWeight:500, color:"#f5e0e5", cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:5 }}>
            <i className="ti ti-language" style={{ fontSize:13 }} aria-hidden="true" />{t.langBtn}
          </button>
        </div>
      </div>

      <div style={{ display:"flex", borderBottom:"0.5px solid #e8d5d9", background:"#fff" }}>
        {t.periods.map((p, i) => (
          <button key={p} onClick={() => setPeriod(i)}
            style={{ flex:1, padding:"10px 4px", border:"none", borderBottom: period===i ? "2px solid #550a19" : "2px solid transparent", background:"#fff", fontSize:11, fontWeight: period===i ? 500 : 400, color: period===i ? "#550a19" : "#a07080", cursor:"pointer", fontFamily:"inherit" }}>
            {p}
          </button>
        ))}
      </div>

      <div style={{ padding:"14px 16px", overflowY:"auto", maxHeight:650 }}>

        {loading && <div style={{fontSize:12,color:"#a07080",textAlign:"center",padding:"10px 0"}}>{t.loading}</div>}

        {/* KPI grid — ★ เชื่อม API จริงจาก /api/summary */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:10 }}>
          <KPI label={t.revenue} value={"฿"+fmt_sum(d.total_sales)} icon="ti-currency-baht" col="#550a19" bg="#fdf0f2" />
          <KPI label={t.orders} value={String(d.order_count)} icon="ti-shopping-cart" col="#2e7d32" bg="#e8f5e9" />
          <KPI label={t.profit} value={"฿"+fmt_sum(d.estimated_profit)} sub={`${margin}% ${t.profitMargin}`} subUp={d.estimated_profit>=0} icon="ti-trending-up" col="#1a3a60" bg="#e0f0ff" />
          <KPI label={t.vatCollected} value={"฿"+fmt_sum(d.vat_collected)} sub={t.vatLabel} icon="ti-receipt-tax" col="#854F0B" bg="#fff8e1" />
        </div>

        {/* Bar chart — ★ เชื่อม API จริง 7 วันล่าสุด */}
        <Sec>
          <SL icon="ti-chart-bar">{t.chartTitle}</SL>
          {chartDays.length === 0 ? (
            <div style={{fontSize:12,color:"#a07080",textAlign:"center",padding:"10px 0"}}>{t.noData}</div>
          ) : (
            <>
              <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:80, marginBottom:4 }}>
                {chartDays.map((c) => {
                  const isToday = c.day === todayStr;
                  const dayLabel = new Date(c.day).toLocaleDateString(lang==="th"?"th-TH":"en-US",{weekday:"short"});
                  return (
                    <div key={c.day} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                      <div style={{ width:"100%", borderRadius:"4px 4px 0 0", background: isToday ? "#550a19" : "#f0d5d8", height: Math.max(2,Math.round((c.total/chartMax)*72)) }} />
                      <div style={{ fontSize:9, color: isToday?"#550a19":"#a07080", fontWeight: isToday?500:400 }}>{dayLabel}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize:10, color:"#a07080", textAlign:"right" }}>฿{fmtFull(chartMax)}</div>
            </>
          )}
        </Sec>

        {/* Top sales — ★ เชื่อม API จริง */}
        <Sec>
          <SL icon="ti-diamond">{t.topSales}</SL>
          {d.top_items.length === 0 ? (
            <div style={{fontSize:12,color:"#a07080",textAlign:"center",padding:"6px 0"}}>{t.noData}</div>
          ) : (
            <>
              <div style={{ display:"grid", gridTemplateColumns:"24px 1fr 40px 70px", gap:4, fontSize:9, color:"#a07080", letterSpacing:1, paddingBottom:6, borderBottom:"0.5px dashed #e8d5d9", marginBottom:8 }}>
                <span>{t.rank}</span><span>{t.item}</span>
                <span style={{ textAlign:"center" }}>{t.qty}</span>
                <span style={{ textAlign:"right" }}>{t.amount}</span>
              </div>
              {d.top_items.map((item, i) => (
                <div key={item.sku} style={{ display:"grid", gridTemplateColumns:"24px 1fr 40px 70px", gap:4, alignItems:"center", marginBottom:8, paddingBottom:8, borderBottom:"0.5px solid #f9f4f5" }}>
                  <div style={{ width:20, height:20, borderRadius:"50%", background: i===0?"#550a19":i===1?"#b87020":"#f0e8f0", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:500, color: i<2?"#fff":"#a07080" }}>{i+1}</div>
                  <div>
                    <div style={{ fontSize:11, fontWeight:500, color:"#2c1015", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{item.name}</div>
                    <div style={{ fontSize:9, color:"#550a19", marginTop:1 }}>{item.sku}</div>
                  </div>
                  <div style={{ fontSize:12, color:"#2c1015", textAlign:"center" }}>{item.qty}</div>
                  <div style={{ fontSize:12, fontWeight:500, color:"#550a19", textAlign:"right" }}>฿{fmt_sum(item.amount)}</div>
                </div>
              ))}
            </>
          )}
        </Sec>

        {/* Payment breakdown — ★ เชื่อม API จริง */}
        <Sec>
          <SL icon="ti-credit-card">{t.paymentBreakdown}</SL>
          {paymentEntries.length === 0 ? (
            <div style={{fontSize:12,color:"#a07080",textAlign:"center",padding:"6px 0"}}>{t.noData}</div>
          ) : (
            <>
              <div style={{ display:"flex", borderRadius:6, overflow:"hidden", height:10, marginBottom:10 }}>
                {paymentEntries.map(([key,val]) => (
                  <div key={key} style={{ width:`${(val/paymentTotal)*100}%`, background:(PAY_META[key]||{col:"#999"}).col }} />
                ))}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7 }}>
                {paymentEntries.map(([key,val]) => (
                  <div key={key} style={{ display:"flex", alignItems:"center", gap:7 }}>
                    <div style={{ width:10, height:10, borderRadius:"50%", background:(PAY_META[key]||{col:"#999"}).col, flexShrink:0 }} />
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:11, color:"#2c1015" }}>{t[key] || key}</div>
                      <div style={{ fontSize:10, color:"#a07080" }}>{((val/paymentTotal)*100).toFixed(0)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Sec>

        {/* Pending — ★ เชื่อม API จริง */}
        <Sec>
          <SL icon="ti-clock">{t.pendingSection}</SL>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:7 }}>
            {[
              { label:t.pendingPO,  val:d.pending_po,  icon:"ti-truck-delivery", col:"#1a3a60", bg:"#e0f0ff", screen:"purchaseOrder" },
              { label:t.pendingSRV, val:d.pending_service, icon:"ti-tool",       col:"#854F0B", bg:"#fff8e1", screen:"serviceOrder"  },
              { label:t.pendingQT,  val:d.pending_quotation, icon:"ti-file-text", col:"#534AB7", bg:"#f0eeff", screen:"quotation"     },
            ].map(item => (
              <div key={item.label} onClick={() => nav(item.screen)}
                style={{ background:item.bg, borderRadius:10, padding:"10px 8px", display:"flex", flexDirection:"column", alignItems:"center", gap:5, cursor:"pointer", border:`0.5px solid ${item.col}20` }}>
                <i className={"ti "+item.icon} style={{ fontSize:18, color:item.col }} aria-hidden="true" />
                <div style={{ fontSize:20, fontWeight:500, color:item.col }}>{loading?"—":item.val}</div>
                <div style={{ fontSize:10, color:item.col, textAlign:"center", lineHeight:1.3 }}>{item.label}</div>
              </div>
            ))}
          </div>
        </Sec>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:4 }}>
          <button style={{ background:"#550a19", border:"none", borderRadius:12, padding:"11px 8px", fontSize:12, fontWeight:500, color:"#fff5f7", cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
            <i className="ti ti-file-type-pdf" style={{ fontSize:16 }} aria-hidden="true" />{t.exportPDF}
          </button>
          <button style={{ background:"#1a5c28", border:"none", borderRadius:12, padding:"11px 8px", fontSize:12, fontWeight:500, color:"#fff", cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
            <i className="ti ti-file-spreadsheet" style={{ fontSize:16 }} aria-hidden="true" />{t.exportExcel}
          </button>
        </div>

      </div>
    </div>
  );
}
