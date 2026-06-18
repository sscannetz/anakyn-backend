// ═══════════════════════════════════════════════════════════════
// AnakynAddUser.jsx — เชื่อมกับ Backend จริง (ตามต้นฉบับ AppPreview ทุกรายละเอียด)
// role selector (admin/staff), ข้อมูลส่วนตัว, ข้อมูลบัญชี, สิทธิ์การใช้งาน 8 ประเภท
// ═══════════════════════════════════════════════════════════════
import { useState } from "react";
import { api } from "./api"; // ★ เชื่อม API

const T_USER = {
  th: {
    langBtn: "EN",
    pageTitle: "เพิ่มผู้ใช้งาน",
    roleSection: "ระดับการใช้งาน",
    adminLabel: "แอดมิน / Admin", adminDesc: "เข้าถึงทุกส่วน รายงาน การเงิน และตั้งค่า",
    staffLabel: "พนักงาน / Staff", staffDesc: "ขาย สต๊อก และเอกสารทั่วไป เท่านั้น",
    infoSection: "ข้อมูลส่วนตัว",
    firstName: "ชื่อ", firstNamePh: "ชื่อจริง",
    lastName: "นามสกุล", lastNamePh: "นามสกุล",
    nickname: "ชื่อเล่น", nicknamePh: "เช่น แนน",
    phone: "เบอร์โทรศัพท์", phonePh: "08X-XXX-XXXX",
    accountSection: "ข้อมูลบัญชี",
    email: "อีเมล", emailPh: "example@anakyngems.com",
    username: "ชื่อผู้ใช้", usernamePh: "เช่น staff_nan",
    password: "รหัสผ่าน", passwordPh: "อย่างน้อย 8 ตัวอักษร",
    confirmPass: "ยืนยันรหัสผ่าน", confirmPassPh: "พิมรหัสผ่านอีกครั้ง",
    permSection: "สิทธิ์การใช้งาน",
    permNote: "แอดมินสามารถปรับสิทธิ์ได้ภายหลัง",
    perms: {
      sale:    { label: "บันทึกการขาย",    icon: "ti-shopping-cart" },
      stock:   { label: "จัดการสต๊อก",     icon: "ti-diamond"        },
      doc:     { label: "ออกเอกสาร",       icon: "ti-receipt"        },
      crm:     { label: "จัดการสมาชิก",    icon: "ti-users"          },
      report:  { label: "ดูรายงาน",        icon: "ti-chart-bar"      },
      finance: { label: "ดูข้อมูลการเงิน", icon: "ti-currency-baht"  },
      setting: { label: "ตั้งค่าระบบ",     icon: "ti-settings"       },
      user:    { label: "จัดการผู้ใช้",     icon: "ti-user-plus"      },
    },
    noteSection: "หมายเหตุ",
    notePh: "เช่น วันเริ่มงาน สาขา หรือข้อมูลเพิ่มเติม",
    saveBtn: "เพิ่มผู้ใช้งาน", saving: "กำลังบันทึก...",
    cancelBtn: "ยกเลิก",
    adminPerms: "แอดมินได้รับสิทธิ์ทั้งหมดโดยอัตโนมัติ",
    passMismatch: "รหัสผ่านไม่ตรงกัน",
    saveSuccess: "เพิ่มผู้ใช้งานเรียบร้อย ✓",
    fillRequired: "กรุณากรอกชื่อ, อีเมล, และรหัสผ่านให้ครบ",
  },
  en: {
    langBtn: "ไทย",
    pageTitle: "Add User",
    roleSection: "Access level",
    adminLabel: "Admin / Owner", adminDesc: "Full access — reports, finance & settings",
    staffLabel: "Staff", staffDesc: "Sales, stock and general documents only",
    infoSection: "Personal info",
    firstName: "First name", firstNamePh: "First name",
    lastName: "Last name", lastNamePh: "Last name",
    nickname: "Nickname", nicknamePh: "e.g. Nan",
    phone: "Phone", phonePh: "08X-XXX-XXXX",
    accountSection: "Account",
    email: "Email", emailPh: "example@anakyngems.com",
    username: "Username", usernamePh: "e.g. staff_nan",
    password: "Password", passwordPh: "At least 8 characters",
    confirmPass: "Confirm password", confirmPassPh: "Re-enter password",
    permSection: "Permissions",
    permNote: "Admin can adjust permissions later",
    perms: {
      sale:    { label: "Record sales",    icon: "ti-shopping-cart" },
      stock:   { label: "Manage stock",    icon: "ti-diamond"        },
      doc:     { label: "Issue documents", icon: "ti-receipt"        },
      crm:     { label: "Manage members",  icon: "ti-users"          },
      report:  { label: "View reports",    icon: "ti-chart-bar"      },
      finance: { label: "View finance",    icon: "ti-currency-baht"  },
      setting: { label: "System settings", icon: "ti-settings"       },
      user:    { label: "Manage users",    icon: "ti-user-plus"      },
    },
    noteSection: "Notes",
    notePh: "e.g. Start date, branch, or additional info",
    saveBtn: "Add user", saving: "Saving...",
    cancelBtn: "Cancel",
    adminPerms: "Admin receives all permissions automatically",
    passMismatch: "Passwords do not match",
    saveSuccess: "User added successfully ✓",
    fillRequired: "Please fill in name, email, and password",
  },
};

const BOSS_PERMS  = ["sale","stock","doc","crm","report","finance","setting","user"];
const STAFF_PERMS = ["sale","stock","doc"];

const Sec = ({ children }) => (
  <div style={{ background: "#fff", borderRadius: 12, border: "0.5px solid #e8d5d9", padding: "12px 14px", marginBottom: 10 }}>{children}</div>
);
const SL = ({ children }) => (
  <div style={{ fontSize: 11, fontWeight: 500, color: "#550a19", letterSpacing: "1.5px", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>{children}</div>
);
const Field = ({ label, children }) => (
  <div style={{ marginBottom: 8 }}>
    <div style={{ fontSize: 11, color: "#a07080", marginBottom: 3 }}>{label}</div>
    {children}
  </div>
);
const Inp = ({ value, onChange, placeholder, type = "text", style = {} }) => (
  <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
    style={{ width: "100%", background: "#f9f4f5", border: "0.5px solid #e8d5d9", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#2c1015", fontFamily: "inherit", outline: "none", boxSizing:"border-box", ...style }} />
);

export default function AnakynAddUser({ navigate }) {
  const nav = navigate || function(){};
  const [lang, setLang] = useState("th");
  const [role, setRole] = useState("staff");
  const [perms, setPerms] = useState(new Set(STAFF_PERMS));
  const [showPw, setShowPw] = useState(false);
  const [showCpw, setShowCpw] = useState(false);
  const [form, setForm] = useState({ firstName:"", lastName:"", nickname:"", phone:"", email:"", username:"", password:"", confirmPass:"", note:"" });
  const t = T_USER[lang];
  const isAdminRole = role === "admin";

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const selectRole = (r) => {
    setRole(r);
    setPerms(new Set(r === "admin" ? BOSS_PERMS : STAFF_PERMS));
  };

  const togglePerm = (key) => {
    if (isAdminRole) return;
    setPerms(p => {
      const n = new Set(p);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  };

  const accentColUser = isAdminRole ? "#550a19" : "#3060a0";
  const passwordsMismatch = form.confirmPass && form.password !== form.confirmPass;

  // ★ เชื่อม API — สร้างผู้ใช้จริงใน database (ต้องเป็น admin เท่านั้น)
  const handleSave = async () => {
    const fullName = `${form.firstName} ${form.lastName}`.trim();
    if (!fullName || !form.email || !form.password) {
      setError(t.fillRequired);
      return;
    }
    if (passwordsMismatch) {
      setError(t.passMismatch);
      return;
    }
    setSaving(true); setError(""); setSuccess(false);
    try {
      await api.createUser({
        email: form.email,
        password: form.password,
        full_name: fullName,
        nickname: form.nickname || null,
        phone: form.phone || null,
        role,
        permissions: Array.from(perms),
      });
      setSuccess(true);
      setForm({ firstName:"", lastName:"", nickname:"", phone:"", email:"", username:"", password:"", confirmPass:"", note:"" });
    } catch (err) {
      setError(err.message || "ไม่สามารถเพิ่มผู้ใช้งานได้");
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
          <div onClick={() => nav("home")} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "#f0d0d8", fontSize: 15, cursor: "pointer" }}>
            <i className="ti ti-arrow-left" aria-hidden="true" />
          </div>
          <span style={{ fontSize: 16, fontWeight: 500, color: "#fff5f7", flex: 1 }}>{t.pageTitle}</span>
          <button onClick={() => setLang(l => l === "th" ? "en" : "th")}
            style={{ background: "rgba(255,255,255,0.15)", border: "0.5px solid rgba(255,255,255,0.3)", borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 500, color: "#f5e0e5", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
            <i className="ti ti-language" style={{ fontSize: 13 }} aria-hidden="true" />{t.langBtn}
          </button>
        </div>
      </div>

      <div style={{ padding: "14px 16px", overflowY: "auto", maxHeight: 700 }}>

        {error && (
          <div style={{background:"#fdf0f2",border:"0.5px solid #e8c0c8",borderRadius:8,padding:"8px 12px",marginBottom:10,fontSize:12,color:"#a32d2d"}}>{error}</div>
        )}
        {success && (
          <div style={{background:"#e8f5e9",border:"0.5px solid #a8d8b0",borderRadius:8,padding:"8px 12px",marginBottom:10,fontSize:12,color:"#1a5c28"}}>{t.saveSuccess}</div>
        )}

        <Sec>
          <SL><i className="ti ti-shield" style={{ fontSize: 14 }} aria-hidden="true" />{t.roleSection}</SL>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { key:"admin",  emoji:"👑", label:t.adminLabel,  desc:t.adminDesc,  col:"#550a19", bg:"#fdf0f2", border:"#550a19" },
              { key:"staff", emoji:"👤", label:t.staffLabel, desc:t.staffDesc, col:"#3060a0", bg:"#eef3ff", border:"#3060a0" },
            ].map(r => {
              const active = role === r.key;
              return (
                <div key={r.key} onClick={() => selectRole(r.key)}
                  style={{ borderRadius: 12, padding: "12px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer", border: `1.5px solid ${active ? r.border : "#e8c0c8"}`, background: active ? r.bg : "#fff", transition: "all .2s", textAlign: "center" }}>
                  <div style={{ width: 38, height: 38, borderRadius: "50%", background: active ? r.bg : "#f9f4f5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{r.emoji}</div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: active ? r.col : "#806070" }}>{r.label}</div>
                  <div style={{ fontSize: 10, color: "#a07080", lineHeight: 1.4 }}>{r.desc}</div>
                </div>
              );
            })}
          </div>
        </Sec>

        <Sec>
          <SL><i className="ti ti-user" style={{ fontSize: 14 }} aria-hidden="true" />{t.infoSection}</SL>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Field label={t.firstName}><Inp value={form.firstName} onChange={v=>setField("firstName",v)} placeholder={t.firstNamePh} /></Field>
            <Field label={t.lastName}><Inp value={form.lastName} onChange={v=>setField("lastName",v)} placeholder={t.lastNamePh} /></Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Field label={t.nickname}><Inp value={form.nickname} onChange={v=>setField("nickname",v)} placeholder={t.nicknamePh} /></Field>
            <Field label={t.phone}><Inp value={form.phone} onChange={v=>setField("phone",v)} placeholder={t.phonePh} type="tel" /></Field>
          </div>
        </Sec>

        <Sec>
          <SL><i className="ti ti-lock" style={{ fontSize: 14 }} aria-hidden="true" />{t.accountSection}</SL>
          <Field label={t.email}><Inp value={form.email} onChange={v=>setField("email",v)} placeholder={t.emailPh} type="email" /></Field>
          <Field label={t.username}><Inp value={form.username} onChange={v=>setField("username",v)} placeholder={t.usernamePh} /></Field>
          <Field label={t.password}>
            <div style={{ position: "relative" }}>
              <Inp value={form.password} onChange={v=>setField("password",v)} placeholder={t.passwordPh} type={showPw?"text":"password"} style={{ paddingRight: 40 }} />
              <div onClick={() => setShowPw(v=>!v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", cursor: "pointer" }}>
                <i className={`ti ${showPw?"ti-eye":"ti-eye-off"}`} style={{ fontSize: 16, color: "#c0a0a8" }} aria-hidden="true" />
              </div>
            </div>
          </Field>
          <Field label={t.confirmPass}>
            <div style={{ position: "relative" }}>
              <Inp value={form.confirmPass} onChange={v=>setField("confirmPass",v)} placeholder={t.confirmPassPh} type={showCpw?"text":"password"} style={{ paddingRight: 40, borderColor: passwordsMismatch ? "#c62828" : "#e8d5d9" }} />
              <div onClick={() => setShowCpw(v=>!v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", cursor: "pointer" }}>
                <i className={`ti ${showCpw?"ti-eye":"ti-eye-off"}`} style={{ fontSize: 16, color: "#c0a0a8" }} aria-hidden="true" />
              </div>
            </div>
            {passwordsMismatch && (
              <div style={{ fontSize: 11, color: "#c62828", marginTop: 4 }}>{t.passMismatch}</div>
            )}
          </Field>
        </Sec>

        <Sec>
          <SL><i className="ti ti-key" style={{ fontSize: 14 }} aria-hidden="true" />{t.permSection}</SL>
          {isAdminRole ? (
            <div style={{ background: "#fdf5f7", borderRadius: 8, border: "0.5px solid #e8c0c8", padding: "9px 12px", display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <i className="ti ti-shield-check" style={{ fontSize: 16, color: "#550a19" }} aria-hidden="true" />
              <span style={{ fontSize: 12, color: "#550a19", fontWeight: 500 }}>{t.adminPerms}</span>
            </div>
          ) : (
            <div style={{ fontSize: 11, color: "#a07080", marginBottom: 8 }}>{t.permNote}</div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
            {Object.entries(t.perms).map(([key, perm]) => {
              const active = perms.has(key);
              const locked = isAdminRole;
              return (
                <div key={key} onClick={() => togglePerm(key)}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, border: `0.5px solid ${active ? accentColUser+"40" : "#e8d5d9"}`, background: active ? (isAdminRole?"#fdf5f7":"#f0f4ff") : "#fff", cursor: locked ? "default" : "pointer", opacity: locked && !active ? 0.5 : 1 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: active ? accentColUser : "#f9f4f5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <i className={"ti "+perm.icon} style={{ fontSize: 14, color: active ? "#fff" : "#a07080" }} aria-hidden="true" />
                  </div>
                  <span style={{ fontSize: 12, color: active ? "#2c1015" : "#a07080", fontWeight: active ? 500 : 400, flex: 1 }}>{perm.label}</span>
                  {active && <i className="ti ti-check" style={{ fontSize: 12, color: accentColUser }} aria-hidden="true" />}
                </div>
              );
            })}
          </div>
        </Sec>

        <Sec>
          <SL><i className="ti ti-notes" style={{ fontSize: 14 }} aria-hidden="true" />{t.noteSection}</SL>
          <textarea value={form.note} onChange={e => setField("note", e.target.value)}
            placeholder={t.notePh} rows={3}
            style={{ width: "100%", background: "#f9f4f5", border: "0.5px solid #e8d5d9", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#2c1015", fontFamily: "inherit", outline: "none", resize: "none", lineHeight: 1.5, boxSizing: "border-box" }} />
        </Sec>

        {/* ★ เชื่อม API — บันทึกผู้ใช้จริงลง database */}
        <button onClick={handleSave} disabled={saving}
          style={{ width: "100%", background: accentColUser, border: "none", borderRadius: 14, padding: 14, fontSize: 15, fontWeight: 500, color: "#fff5f7", cursor: saving?"default":"pointer", opacity: saving?0.7:1, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
          <i className="ti ti-user-plus" style={{ fontSize: 16 }} aria-hidden="true" />{saving ? t.saving : t.saveBtn}
        </button>
        <button onClick={() => nav("home")}
          style={{ width: "100%", background: "#fff", border: "0.5px solid #e8c0c8", borderRadius: 14, padding: 12, fontSize: 13, color: "#a07080", cursor: "pointer", fontFamily: "inherit" }}>
          {t.cancelBtn}
        </button>
      </div>
    </div>
  );
}
