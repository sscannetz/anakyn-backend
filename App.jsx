// ═══════════════════════════════════════════════════════════════
// App.jsx — Router หลัก เชื่อมทุกหน้าที่ rebuild ตรงต้นฉบับ AnakynAppPreview แล้ว
// แทนที่ src/App.jsx เดิมด้วยไฟล์นี้
// (ลบฟีเจอร์ Partner ออกทั้งหมดแล้ว — ไม่มี role พาร์ตเนอร์อีกต่อไป)
// ═══════════════════════════════════════════════════════════════
import { useState } from "react";
import AnakynLogin from "./AnakynLogin";
import AnakynHome from "./AnakynHome";
import AnakynAddStock from "./AnakynAddStock";
import AnakynSalePage from "./AnakynSalePage";
import AnakynInvoice from "./AnakynInvoice";
import AnakynQuotation from "./AnakynQuotation";
import AnakynPurchaseOrder from "./AnakynPurchaseOrder";
import AnakynServiceOrder from "./AnakynServiceOrder";
import AnakynSummary from "./AnakynSummary";
import AnakynAddUser from "./AnakynAddUser";
import { clearSession } from "./api";

export default function App() {
  const [screen, setScreen] = useState("login");
  const [userRole, setUserRole] = useState(null);

  const navigate = (key) => setScreen(key);

  const handleLogin = ({ role }) => {
    setUserRole(role);
    setScreen("home");
  };

  const handleLogout = () => {
    setUserRole(null);
    clearSession();
    setScreen("login");
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "20px 0" }}>
      {screen === "login" && <AnakynLogin onLogin={handleLogin} />}

      {screen === "home" && (
        <AnakynHome navigate={navigate} userRole={userRole} onLogout={handleLogout} />
      )}

      {screen === "addStock" && <AnakynAddStock navigate={navigate} />}
      {screen === "sale" && <AnakynSalePage navigate={navigate} />}
      {screen === "invoice" && <AnakynInvoice navigate={navigate} />}
      {screen === "quotation" && <AnakynQuotation navigate={navigate} />}
      {screen === "purchaseOrder" && <AnakynPurchaseOrder navigate={navigate} />}
      {screen === "serviceOrder" && <AnakynServiceOrder navigate={navigate} />}
      {screen === "summary" && <AnakynSummary navigate={navigate} />}

      {/* เฉพาะ admin เท่านั้นที่เข้าหน้านี้ได้ — AnakynHome กรองเมนูไว้แล้ว แต่กันไว้อีกชั้น */}
      {screen === "addUser" && userRole === "admin" && <AnakynAddUser navigate={navigate} />}
    </div>
  );
}
