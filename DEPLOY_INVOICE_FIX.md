# คู่มือ Deploy แก้บั๊ก Invoice แสดง ฿NaN — ฉบับละเอียด

เอกสารนี้อธิบายว่าบั๊กเกิดจากอะไร แก้อะไรไปบ้าง และวิธี deploy ขึ้นใช้งานจริงแบบทีละขั้น
(สำหรับคนที่ไม่ได้เขียนโค้ดทุกวัน ทำตามได้เลย)

---

## 1. บั๊กคืออะไร และเกิดจากอะไร

หน้า Invoice ทุกใบแสดงราคาเป็น **฿NaN** (NaN = "Not a Number" = ไม่ใช่ตัวเลข)

**ต้นเหตุที่แท้จริง:** ฐานข้อมูล PostgreSQL คอลัมน์ชนิดตัวเลข (NUMERIC) สามารถเก็บค่าพิเศษที่ชื่อ
`NaN` ได้จริง ตอนสร้างใบกำกับภาษีในอดีต บางใบถูกคำนวณยอดจากการขายที่ข้อมูลยอดรวม (subtotal)
เพี้ยน ทำให้ `Number(...)` ได้ผลเป็น `NaN` แล้วถูกบันทึกลงคอลัมน์ `net_payable` / `vat_amount`
เป็นค่า `NaN` ค้างไว้ในฐานข้อมูล

เมื่อ API ส่งค่านี้กลับมา มันกลายเป็นข้อความ `"NaN"` หน้าเว็บจึงแสดง `฿NaN`

มี **2 ชั้น** ที่ทำให้เห็น NaN:
1. **ฝั่ง Backend** — ส่งค่า `NaN` ที่ค้างในฐานข้อมูลกลับมาตรง ๆ
2. **ฝั่ง Frontend** — ฟังก์ชันจัดรูปแบบราคา (`fmt_inv`) ไม่ได้กันค่าที่ไม่ใช่ตัวเลข

---

## 2. แก้อะไรไปบ้าง (โค้ดแก้เสร็จแล้ว ทดสอบ compile ผ่านแล้ว)

| ไฟล์ | แก้อะไร |
|---|---|
| `backend/controllers/invoiceController.js` | เพิ่มฟังก์ชัน `sanitizeInvoice()` — เวลาอ่านข้อมูลออกมา ถ้าเจอค่า NaN จะคำนวณใหม่จาก `sales.subtotal` ที่เชื่อถือได้ + เพิ่ม guard เวลาบันทึก ไม่ให้เก็บ NaN ลงฐานข้อมูลได้อีก |
| `AnakynInvoice.jsx` (ไฟล์ที่ root) | `fmt_inv` กันค่า NaN (ถ้าไม่ใช่ตัวเลขให้แสดง 0) + หน้าลิสต์คำนวณ fallback เพื่อแสดงยอดจริง |
| `frontend/src/AnakynInvoice.jsx` | copy ไฟล์ที่แก้แล้วทับของเดิม (พร้อม build) |
| `frontend/.env.production` | **ไฟล์ใหม่** — บังคับให้ตอน build production ชี้ไป backend จริงบน Render ไม่ใช่ IP วง LAN |

> **จุดสำคัญ:** แค่ deploy backend (ขั้นตอนที่ 4) อย่างเดียว หน้า Invoice ก็หาย NaN แล้ว
> เพราะ `sanitizeInvoice` แก้ข้อมูลตอนส่งออกจาก API ส่วน frontend (ขั้นตอนที่ 5) เป็นการกันเหนียวเพิ่ม

---

## 3. เตรียมก่อนเริ่ม (ทำครั้งเดียว)

### 3.1 ลบไฟล์ lock ที่ค้างอยู่ (สำคัญ — ไม่ลบจะ commit ไม่ได้)

ตอนตรวจสอบมีไฟล์ `.git/index.lock` ค้างอยู่ ถ้าไม่ลบ เวลา `git commit` จะขึ้น error
`fatal: Unable to create '.../.git/index.lock': File exists`

เปิด **PowerShell** หรือ **Command Prompt** แล้วพิมพ์:

```powershell
cd D:\anakyn-fullstack
del .git\index.lock
```

(ถ้าขึ้นว่าหาไฟล์ไม่เจอ แปลว่าไม่มี lock แล้ว ข้ามได้เลย)

### 3.2 เช็คว่าเครื่องมือพร้อม

```powershell
git --version      # ควรขึ้นเลขเวอร์ชัน
node --version     # ควรขึ้น v18 ขึ้นไป
npm --version
```

ถ้าคำสั่งไหนไม่รู้จัก ต้องติดตั้งก่อน (Git: https://git-scm.com , Node: https://nodejs.org)

---

## 4. Deploy Backend (แก้ NaN ที่เห็นอยู่ตอนนี้ได้ทันที)

Backend อยู่บน **Render** ซึ่ง auto-deploy ทุกครั้งที่ push ขึ้น GitHub
(`github.com/sscannetz/anakyn-backend` branch `main`)

### 4.1 เปิด PowerShell ที่โฟลเดอร์โปรเจกต์

```powershell
cd D:\anakyn-fullstack
```

### 4.2 ดูว่ามีไฟล์อะไรถูกแก้บ้าง (optional — ไว้ตรวจ)

```powershell
git status
```

ควรเห็น `backend/controllers/invoiceController.js`, `AnakynInvoice.jsx`,
`frontend/src/AnakynInvoice.jsx`, `frontend/.env.production` อยู่ในรายการ

### 4.3 เพิ่มไฟล์ที่แก้ทั้งหมดเข้า staging

```powershell
git add backend/controllers/invoiceController.js AnakynInvoice.jsx frontend/src/AnakynInvoice.jsx frontend/.env.production
```

(หรือจะเอาทั้งหมดเลยก็ `git add -A`)

### 4.4 commit พร้อมข้อความอธิบาย

```powershell
git commit -m "fix(invoice): แก้ราคาแสดง NaN — sanitize ค่า NaN ในฐานข้อมูล + กันค่าผิดฝั่ง frontend"
```

### 4.5 push ขึ้น GitHub → Render จะ deploy ให้เองอัตโนมัติ

```powershell
git push origin main
```

> ถ้า push แล้วถามรหัส GitHub: ใช้ **Personal Access Token** แทนรหัสผ่าน
> (GitHub.com → Settings → Developer settings → Personal access tokens)

### 4.6 รอ Render deploy เสร็จ (~1-3 นาที)

1. เข้า https://dashboard.render.com
2. เลือก service `anakyn-backend`
3. ดูแท็บ **Events** / **Logs** — รอจนขึ้นสถานะ **Live** (จุดเขียว)

### 4.7 ตรวจผล

เปิด https://dist-tau-eight-30.vercel.app/ → เข้าเมนู **Invoice**
ราคาควรเปลี่ยนจาก `฿NaN` เป็นตัวเลขจริงแล้ว ✅

---

## 5. Deploy Frontend (กันเหนียวเพิ่มอีกชั้น)

ทำเพื่อให้แม้ backend ส่งค่าแปลก ๆ มาในอนาคต หน้าเว็บก็ยังไม่แสดง NaN

> **ทำไมต้อง build บนเครื่องพี่เอง:** ตอนนี้ build บนเครื่อง Cloud ของผมไม่ได้ เพราะ Vite 8
> ใช้ไฟล์ native binary คนละระบบปฏิบัติการ (ของผมเป็น Linux เครื่องพี่เป็น Windows)

### 5.1 เข้าโฟลเดอร์ frontend

```powershell
cd D:\anakyn-fullstack\frontend
```

### 5.2 ติดตั้ง dependencies (ถ้ายังไม่เคยติดตั้ง / หรือ build แล้ว error)

```powershell
npm install
```

### 5.3 สั่ง build

```powershell
npm run build
```

- ระบบจะอ่านไฟล์ `.env.production` ที่ผมสร้างให้ → ฝัง URL `https://anakyn-backend.onrender.com/api` ลง build อัตโนมัติ
- เสร็จแล้วจะได้โฟลเดอร์ใหม่ชื่อ **`dist`** ที่ `D:\anakyn-fullstack\frontend\dist`

### 5.4 Deploy โฟลเดอร์ `dist` ขึ้น Vercel

**วิธี A — ใช้ Vercel CLI (เร็วสุดถ้าเคยตั้งไว้แล้ว)**

```powershell
npm install -g vercel    # ถ้ายังไม่มี
cd D:\anakyn-fullstack\frontend
vercel --prod
```
ตอบคำถามตามที่ขึ้น (เลือก project `dist-tau-eight-30` ตัวเดิม) แล้วชี้ output directory เป็น `dist`

**วิธี B — ลากวางบนเว็บ (ง่ายสุด ไม่ต้องใช้ command)**

1. เข้า https://vercel.com → login
2. เปิดโปรเจกต์ `dist-tau-eight-30`
3. ไปที่ Deployments → ปุ่มเมนู (...) → **"Upload"** / หรือสร้าง deployment ใหม่แบบ drag-drop
4. ลากโฟลเดอร์ `D:\anakyn-fullstack\frontend\dist` ทั้งโฟลเดอร์เข้าไปวาง
5. รอ build เสร็จ → กด Promote to Production

### 5.5 ตรวจผลสุดท้าย

เปิด https://dist-tau-eight-30.vercel.app/ → กด **Ctrl+Shift+R** (ล้าง cache โหลดใหม่)
→ เข้าเมนู Invoice → ราคาต้องเป็นตัวเลขจริงครบทุกใบ ✅

---

## 6. สรุปลำดับสั้น ๆ (เอาไว้ทำซ้ำเร็ว ๆ)

```powershell
# เตรียม
cd D:\anakyn-fullstack
del .git\index.lock

# ── Backend (สำคัญสุด แก้ NaN ทันที) ──
git add -A
git commit -m "fix(invoice): แก้ราคาแสดง NaN"
git push origin main
#   → รอ Render ขึ้น Live → เช็คหน้า Invoice

# ── Frontend (กันเหนียว) ──
cd frontend
npm install
npm run build
vercel --prod        # หรือ ลากโฟลเดอร์ dist ขึ้น vercel.com
```

---

## 7. ถ้าติดปัญหา

| อาการ | วิธีแก้ |
|---|---|
| `git commit` ขึ้น `index.lock: File exists` | `del .git\index.lock` แล้ว commit ใหม่ |
| `git push` ถามรหัสผ่านแล้วไม่ผ่าน | ใช้ Personal Access Token ของ GitHub แทนรหัส |
| `npm run build` error เรื่อง module/binary | ลบ `node_modules` กับ `package-lock.json` แล้ว `npm install` ใหม่ |
| หน้า Invoice ยังขึ้น NaN หลัง deploy | กด Ctrl+Shift+R ล้าง cache เบราว์เซอร์ / เช็คว่า Render ขึ้น Live แล้วจริง |
| build เสร็จแต่ login ไม่ได้/เรียก API ไม่ติด | เช็คว่า `frontend/.env.production` ชี้ URL Render ถูก แล้ว build ใหม่ |

---

*หมายเหตุ: ผมแก้โค้ดและสร้างไฟล์ให้เรียบร้อยแล้ว แต่ขั้นตอน `git push` และ deploy ขึ้น Vercel
ต้องให้พี่ทำเอง เพราะต้องใช้บัญชี GitHub / Render / Vercel ของพี่ ซึ่งผมไม่มีสิทธิ์เข้าถึง*
