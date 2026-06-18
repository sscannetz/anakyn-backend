// ═══════════════════════════════════════════════════════════════
// AnakynLogin.jsx — เชื่อมกับ Backend จริง (ตามต้นฉบับ AppPreview ทุกรายละเอียด)
// role badge, show/hide password, remember me, LINE button (UI เท่านั้น)
// ═══════════════════════════════════════════════════════════════
import { useState } from "react";
import { api, saveSession } from "./api"; // ★ เชื่อม API

const T_LOGIN2 = {
  th: {
    langBtn: "EN",
    tagline: "Jewelry Management System",
    selectRole: "เข้าสู่ระบบในฐานะ",
    adminLabel:   "แอดมิน / Admin",   adminDesc:   "เข้าถึงได้ทุกส่วน รายงาน และการตั้งค่า",
    staffLabel:   "พนักงาน / Staff",  staffDesc:   "ขายสินค้า สต๊อก และเอกสารทั่วไป",
    emailLabel: "อีเมล / ชื่อผู้ใช้", emailPh: "example@anakyngems.com",
    passLabel: "รหัสผ่าน", passPh: "••••••••",
    remember: "จดจำการเข้าสู่ระบบ",
    forgot: "ลืมรหัสผ่าน?",
    loginBtn: "เข้าสู่ระบบ",
    loggingIn: "กำลังเข้าสู่ระบบ...",
    orText: "หรือ",
    lineBtn: "เข้าสู่ระบบด้วย LINE",
    version: "Anakyn Gems v1.0.0 · © 2026",
    adminBadge:   "สิทธิ์เต็ม — เข้าถึงได้ทุกส่วน",
    staffBadge:   "สิทธิ์พนักงาน — ขาย สต๊อก เอกสาร",
    errorGeneric: "เข้าสู่ระบบไม่สำเร็จ",
  },
  en: {
    langBtn: "ไทย",
    tagline: "Jewelry Management System",
    selectRole: "Login as",
    adminLabel:   "Admin / Owner",    adminDesc:   "Full access — reports, settings & all modules",
    staffLabel:   "Staff",            staffDesc:   "Sales, stock, and general documents",
    emailLabel: "Email / Username", emailPh: "example@anakyngems.com",
    passLabel: "Password", passPh: "••••••••",
    remember: "Remember me",
    forgot: "Forgot password?",
    loginBtn: "Log in",
    loggingIn: "Logging in...",
    orText: "or",
    lineBtn: "Log in with LINE",
    version: "Anakyn Gems v1.0.0 · © 2026",
    adminBadge:   "Full access — all modules",
    staffBadge:   "Staff access — sales, stock, docs",
    errorGeneric: "Login failed",
  },
};

const ROLES_LOGIN2 = [
  { key:"admin",   emoji:"👑", col:"#550a19", border:"#550a19", bg:"#fdf0f2" },
  { key:"staff",   emoji:"👤", col:"#3060a0", border:"#3060a0", bg:"#eef3ff" },
];

export default function AnakynLogin({ onLogin }) {
  const [lang,     setLang]     = useState("th");
  const [role,     setRole]     = useState("admin");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [remember, setRemember] = useState(false);
  const t = T_LOGIN2[lang];

  // ★ เชื่อม API — สถานะระหว่างเรียก backend
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  // ★ เชื่อม API — เรียก backend จริงตาม role ที่เลือก แล้วเก็บ JWT token
  const handleLogin = async () => {
    if (!email || !password) {
      setError(lang === "th" ? "กรุณากรอกอีเมลและรหัสผ่าน" : "Please enter email and password");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { token, user } = await api.login(email, password);
      saveSession(token, user.role);
      if (onLogin) onLogin({ role: user.role, user });
    } catch (err) {
      setError(err.message || t.errorGeneric);
    } finally {
      setLoading(false);
    }
  };

  const activeRole = ROLES_LOGIN2.find(r => r.key === role);
  const accentColLogin  = activeRole?.col || "#550a19";

  const badgeText = role === "admin"   ? t.adminBadge : t.staffBadge;
  const badgeBg   = role === "admin"   ? "#fdf0f2" : "#eef3ff";
  const badgeBorder = role === "admin" ? "#e8c0c8" : "#90b8d8";
  const badgeIcon = role === "admin"   ? "ti-shield-check" : "ti-user-check";

  const inp = {
    width:"100%", background:"#fff", border:"0.5px solid #e8d5d9",
    borderRadius:10, padding:"11px 14px", fontSize:14, color:"#2c1015",
    fontFamily:"inherit", outline:"none", boxSizing:"border-box",
  };

  return (
    <div style={{width:360,margin:"0 auto",background:"#f9f4f5",borderRadius:32,overflow:"hidden",border:"1.5px solid #c8a8b0",fontFamily:"'Anthropic Sans',sans-serif"}}>

      <div style={{background:"#550a19",padding:"40px 24px 32px",textAlign:"center",position:"relative"}}>
        <button onClick={() => setLang(l => l==="th"?"en":"th")}
          style={{position:"absolute",top:14,right:16,background:"rgba(255,255,255,0.15)",border:"0.5px solid rgba(255,255,255,0.3)",borderRadius:8,padding:"4px 10px",fontSize:12,fontWeight:500,color:"#f5e0e5",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5}}>
          <i className="ti ti-language" style={{fontSize:13}} aria-hidden="true" />{t.langBtn}
        </button>
        <div style={{fontSize:28,fontWeight:500,color:"#fff5f7",letterSpacing:5}}>ANAKYN</div>
        <div style={{fontSize:10,color:"#d4a0ac",letterSpacing:6,marginTop:3}}>GEMS</div>
        <div style={{fontSize:12,color:"#c090a0",marginTop:8,fontStyle:"italic"}}>{t.tagline}</div>
      </div>

      <div style={{padding:"24px 20px 28px"}}>

        <div style={{fontSize:13,fontWeight:500,color:"#550a19",marginBottom:12,textAlign:"center"}}>{t.selectRole}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
          {ROLES_LOGIN2.map(r => {
            const active = role === r.key;
            const labelKey = r.key+"Label";
            const descKey  = r.key+"Desc";
            return (
              <div key={r.key} onClick={() => setRole(r.key)}
                style={{borderRadius:12,padding:"12px 6px",display:"flex",flexDirection:"column",alignItems:"center",gap:6,cursor:"pointer",border:`1.5px solid ${active?r.border:"#e8c0c8"}`,background:active?r.bg:"#fff",transition:"all .2s",textAlign:"center"}}>
                <div style={{width:36,height:36,borderRadius:"50%",background:active?r.bg:"#f9f4f5",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>
                  {r.emoji}
                </div>
                <div style={{fontSize:11,fontWeight:500,color:active?r.col:"#806070",lineHeight:1.3}}>{t[labelKey]}</div>
                <div style={{fontSize:9,color:"#a07080",lineHeight:1.4}}>{t[descKey]}</div>
              </div>
            );
          })}
        </div>

        <div style={{background:badgeBg,borderRadius:8,padding:"7px 12px",marginBottom:16,display:"flex",alignItems:"center",gap:7,border:`0.5px solid ${badgeBorder}`}}>
          <i className={"ti "+badgeIcon} style={{fontSize:15,color:accentColLogin}} aria-hidden="true" />
          <div style={{flex:1}}>
            <div style={{fontSize:11,fontWeight:500,color:accentColLogin}}>{badgeText}</div>
          </div>
        </div>

        {/* ★ เชื่อม API — แสดง error จาก backend */}
        {error && (
          <div style={{background:"#fdf0f2",border:"0.5px solid #e8c0c8",borderRadius:8,padding:"8px 12px",marginBottom:12,fontSize:12,color:"#a32d2d"}}>
            {error}
          </div>
        )}

        <div style={{marginBottom:12}}>
          <div style={{fontSize:11,color:"#a07080",marginBottom:4,letterSpacing:0.5}}>{t.emailLabel}</div>
          <input type="text" value={email} onChange={e=>setEmail(e.target.value)}
            placeholder={t.emailPh}
            style={inp} />
        </div>

        <div style={{marginBottom:12}}>
          <div style={{fontSize:11,color:"#a07080",marginBottom:4,letterSpacing:0.5}}>{t.passLabel}</div>
          <div style={{position:"relative"}}>
            <input type={showPw?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)}
              placeholder={t.passPh}
              style={{...inp,paddingRight:40}} />
            <div onClick={()=>setShowPw(v=>!v)}
              style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",cursor:"pointer"}}>
              <i className={"ti "+(showPw?"ti-eye":"ti-eye-off")} style={{fontSize:16,color:"#c0a0a8"}} aria-hidden="true" />
            </div>
          </div>
        </div>

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div onClick={()=>setRemember(v=>!v)}
            style={{display:"flex",alignItems:"center",gap:7,cursor:"pointer"}}>
            <div style={{width:18,height:18,borderRadius:5,border:`0.5px solid ${remember?accentColLogin:"#e8c0c8"}`,background:remember?badgeBg:"#fff",display:"flex",alignItems:"center",justifyContent:"center"}}>
              {remember && <i className="ti ti-check" style={{fontSize:11,color:accentColLogin}} aria-hidden="true" />}
            </div>
            <span style={{fontSize:12,color:"#806070"}}>{t.remember}</span>
          </div>
          <span style={{fontSize:12,color:"#a07080",cursor:"pointer"}}>{t.forgot}</span>
        </div>

        {/* ★ เชื่อม API — ปุ่มเรียก backend จริง แสดง loading ระหว่างรอ */}
        <button onClick={handleLogin} disabled={loading}
          style={{width:"100%",background:accentColLogin,border:"none",borderRadius:14,padding:14,fontSize:15,fontWeight:500,color:"#fff5f7",cursor:loading?"default":"pointer",opacity:loading?0.7:1,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:12,transition:"background .2s"}}>
          <i className="ti ti-login" style={{fontSize:16}} aria-hidden="true" />
          {loading ? t.loggingIn : t.loginBtn}
        </button>

        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
          <div style={{flex:1,height:0.5,background:"#e8c0c8"}} />
          <span style={{fontSize:11,color:"#c0a0a8"}}>{t.orText}</span>
          <div style={{flex:1,height:0.5,background:"#e8c0c8"}} />
        </div>

        <button style={{width:"100%",background:"#00b900",border:"none",borderRadius:14,padding:12,fontSize:14,fontWeight:500,color:"#fff",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          <i className="ti ti-message-circle" style={{fontSize:18}} aria-hidden="true" />{t.lineBtn}
        </button>

        <div style={{textAlign:"center",fontSize:10,color:"#c0a0a8",marginTop:16}}>{t.version}</div>
      </div>
    </div>
  );
}
