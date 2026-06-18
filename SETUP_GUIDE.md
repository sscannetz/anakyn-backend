# Anakyn Gems — คู่มือติดตั้งและใช้งานระบบ Full-Stack

เอกสารนี้แนะนำวิธีนำ Backend (Node.js + PostgreSQL) มาเชื่อมกับ Frontend (React) ที่ออกแบบไว้ก่อนหน้านี้ ให้ใช้งานได้จริงทั้งระบบ

## ภาพรวมโครงสร้าง

```
anakyn-fullstack/
├── backend/              ← Express API + PostgreSQL
│   ├── db/
│   │   ├── schema.sql    ← โครงสร้างตารางทั้งหมด 13 ตาราง
│   │   ├── migrate.js    ← รันสร้างตาราง
│   │   └── seed.js       ← เติมข้อมูลตัวอย่าง
│   ├── routes/           ← เส้นทาง API ทั้งหมด
│   ├── controllers/      ← ตรรกะการทำงานแต่ละ endpoint
│   ├── middleware/auth.js ← ตรวจสอบ JWT + สิทธิ์การเข้าถึง
│   ├── server.js         ← จุดเริ่มต้นรันเซิร์ฟเวอร์
│   └── package.json
├── api.js                ← ตัวกลางเรียก API จากฝั่ง React
├── AnakynLogin.jsx        ← ตัวอย่างหน้า Login เชื่อม API จริง
└── AnakynAddStock.jsx     ← ตัวอย่างหน้าสต๊อกเชื่อม API จริง
```

## ขั้นที่ 1 — ติดตั้งฐานข้อมูล (Supabase)

Supabase ใช้ง่ายและมี PostgreSQL ให้พร้อมใช้แบบไม่เสียค่าใช้จ่ายในระดับเริ่มต้น

1. ไปที่ supabase.com แล้วสร้างบัญชี/โปรเจกต์ใหม่
2. เมื่อสร้างโปรเจกต์เสร็จ ไปที่ Project Settings → Database → Connection string เลือกแบบ URI
3. คัดลอก connection string ที่ได้ (รูปแบบ `postgresql://postgres:[password]@db.xxxxx.supabase.co:5432/postgres`)

หากต้องการรันบนเครื่องตัวเองหรือ host อื่น (Railway, Render) ก็ใช้วิธีเดียวกัน เพียงแค่เปลี่ยน connection string

## ขั้นที่ 2 — ติดตั้ง Backend

```bash
cd backend
npm install
```

สร้างไฟล์ `.env` จาก `.env.example` แล้วกรอกค่าจริง

```bash
cp .env.example .env
```

แก้ไฟล์ `.env`:

```
DATABASE_URL=postgresql://postgres:รหัสผ่านจริง@db.xxxxx.supabase.co:5432/postgres
JWT_SECRET=สุ่มข้อความยาวๆไม่ซ้ำใคร
PORT=4000
FRONTEND_URL=http://localhost:5173
```

สร้างตารางในฐานข้อมูล:

```bash
npm run migrate
```

เติมข้อมูลตัวอย่าง (ผู้ใช้ทดสอบ + สินค้าตัวอย่าง):

```bash
npm run seed
```

เมื่อรันสำเร็จจะเห็นบัญชีทดสอบในเทอร์มินัล:

| บัญชี | อีเมล | รหัสผ่าน |
|---|---|---|
| Admin | admin@anakyngems.com | admin1234 |
| Staff | staff@anakyngems.com | staff1234 |
| Partner | partner@example.com | partner1234 |

เริ่มรันเซิร์ฟเวอร์:

```bash
npm run dev
```

ถ้าสำเร็จจะเห็นข้อความ `Anakyn Gems API running on http://localhost:4000` ทดสอบได้ที่ `http://localhost:4000/api/health`

## ขั้นที่ 3 — เชื่อม Frontend เข้ากับ Backend

นำไฟล์ `api.js` ไปวางในโฟลเดอร์ `src/` ของโปรเจกต์ React จากนั้นสร้างไฟล์ `.env` ที่ root ของ frontend (ถ้าใช้ Vite):

```
VITE_API_URL=http://localhost:4000/api
```

**ทุกหน้าเชื่อมกับ API จริงครบแล้ว** — คัดลอกไฟล์ JSX ทั้งหมดด้านล่างนี้ไปวางใน `src/` (ทับไฟล์เดิมถ้ามี) แล้วใช้ `App.jsx` ที่ให้ไปแทนที่ `src/App.jsx` เดิม

| ไฟล์ | หน้าที่ |
|---|---|
| `AnakynLogin.jsx` | ล็อกอิน (admin/staff/partner) |
| `AnakynAddStock.jsx` | จัดการสต๊อกสินค้า |
| `AnakynSalePage.jsx` | บันทึกการขาย เลือกสินค้า+ลูกค้าจริง |
| `AnakynInvoice.jsx` | ใบกำกับภาษี |
| `AnakynQuotation.jsx` | ใบเสนอราคา |
| `AnakynPurchaseOrder.jsx` | ใบสั่งซื้อ |
| `AnakynServiceOrder.jsx` | ใบสั่งซ่อม |
| `AnakynSummary.jsx` | สรุปยอดขาย/กำไร/สต๊อก |
| `AnakynPartnerDashboard.jsx` | Dashboard ของ Partner |
| `AnakynPartnerStock.jsx` | สต๊อกที่ Partner มองเห็น (ซ่อนต้นทุน) |
| `App.jsx` | Router หลักรวมทุกหน้าเข้าด้วยกัน |

คำสั่งคัดลอกแบบรวดเดียว (รันจาก root ของโฟลเดอร์ `anakyn-fullstack`):

```bash
copy AnakynLogin.jsx frontend\src\AnakynLogin.jsx
copy AnakynAddStock.jsx frontend\src\AnakynAddStock.jsx
copy AnakynSalePage.jsx frontend\src\AnakynSalePage.jsx
copy AnakynInvoice.jsx frontend\src\AnakynInvoice.jsx
copy AnakynQuotation.jsx frontend\src\AnakynQuotation.jsx
copy AnakynPurchaseOrder.jsx frontend\src\AnakynPurchaseOrder.jsx
copy AnakynServiceOrder.jsx frontend\src\AnakynServiceOrder.jsx
copy AnakynSummary.jsx frontend\src\AnakynSummary.jsx
copy AnakynPartnerDashboard.jsx frontend\src\AnakynPartnerDashboard.jsx
copy AnakynPartnerStock.jsx frontend\src\AnakynPartnerStock.jsx
copy App.jsx frontend\src\App.jsx
copy api.js frontend\src\api.js
```

(ถ้าใช้ Mac/Linux ใช้ `cp` แทน `copy`)

จากนั้นรัน `npm run dev` ในโฟลเดอร์ `frontend` แล้วทดสอบทุกเมนูจากหน้า Home ได้เลย

## รายการ API ทั้งหมด

| Method | Endpoint | คำอธิบาย | สิทธิ์ |
|---|---|---|---|
| POST | /api/auth/login | ล็อกอิน Admin/Staff | ทุกคน |
| POST | /api/auth/partner-login | ล็อกอิน Partner | ทุกคน |
| GET | /api/products | ดูรายการสินค้า (filter ได้) | ผู้ที่ล็อกอิน |
| POST | /api/products | เพิ่มสินค้าใหม่ | admin, staff |
| PUT | /api/products/:id | แก้ไขสินค้า | admin, staff |
| DELETE | /api/products/:id | ลบสินค้า | admin |
| GET | /api/sales | ดูรายการขาย | ผู้ที่ล็อกอิน |
| POST | /api/sales | บันทึกการขายใหม่ (ตัดสต๊อก+สร้างค่าคอมอัตโนมัติ) | admin, staff |
| GET / POST | /api/invoices | ใบกำกับภาษี | admin, staff |
| GET / POST | /api/quotations | ใบเสนอราคา | admin, staff |
| PATCH | /api/quotations/:id/status | เปลี่ยนสถานะใบเสนอราคา | admin, staff |
| GET / POST | /api/purchase-orders | ใบสั่งซื้อ | admin, staff |
| PATCH | /api/purchase-orders/:id/status | เปลี่ยนสถานะ PO | admin, staff |
| GET / POST | /api/service-orders | ใบสั่งซ่อม | admin, staff |
| PATCH | /api/service-orders/:id/status | เปลี่ยนสถานะงานซ่อม | admin, staff |
| GET | /api/partners/me/dashboard | ข้อมูล Dashboard ของ Partner ที่ล็อกอินอยู่ | partner |
| GET | /api/partners | รายชื่อ Partner ทั้งหมด | admin |
| PATCH | /api/partners/:id/commission-paid | ยืนยันจ่ายค่าคอม | admin |
| GET / POST | /api/customers | จัดการลูกค้า | ผู้ที่ล็อกอิน |
| GET | /api/summary?period=month | สรุปยอดขาย/กำไร/สต๊อกค้าง | ผู้ที่ล็อกอิน |

## ตรรกะสำคัญที่ Backend จัดการให้อัตโนมัติ

เมื่อบันทึกการขาย (`POST /api/sales`) ระบบจะทำสิ่งเหล่านี้ในขั้นตอนเดียว (database transaction) เพื่อไม่ให้ข้อมูลขาดตอนหากเกิดข้อผิดพลาดกลางทาง

- หักจำนวนสินค้าออกจากสต๊อกตามที่ขาย
- ถ้าสต๊อกสินค้าชิ้นนั้นเหลือ 0 จะตั้งสถานะ "หมด" ให้อัตโนมัติ
- ถ้าการขายนั้นมี partner แนะนำมา จะคำนวณค่าคอมตามเปอร์เซ็นต์ของ partner คนนั้นและสร้างรายการในตาราง commissions ให้ทันที
- ออกเลขที่เอกสารรันต่อปีอัตโนมัติ (เช่น SALE-2026-00342)

เมื่อ Partner ล็อกอินดูสต๊อก ระบบจะซ่อนคอลัมน์ cost_price (ราคาทุน) ออกจากผลลัพธ์ ไม่ให้ Partner เห็นต้นทุนของร้าน

## Deploy ขึ้นใช้งานจริง

แนะนำการจับคู่ที่ตั้งค่าง่ายและมีระดับฟรีให้ทดลอง

| ส่วน | บริการที่แนะนำ |
|---|---|
| Database | Supabase |
| Backend API | Railway หรือ Render |
| Frontend | Vercel หรือ Netlify |

ขั้นตอนคร่าวๆสำหรับ Backend บน Railway: สร้างโปรเจกต์ใหม่ → เชื่อม GitHub repo ของโฟลเดอร์ backend → ตั้งค่า Environment Variables ตามไฟล์ `.env` → Railway จะ build และรันให้อัตโนมัติทุกครั้งที่ push code

สำหรับ Frontend บน Vercel: เชื่อม repo → ตั้งค่า `VITE_API_URL` ให้ชี้ไปที่ URL ของ backend ที่ deploy แล้ว → Vercel จะ build และแจก URL ให้ใช้งานทันที

## สิ่งที่ยังต้องทำต่อ (ยังไม่รวมในชุดนี้)

ทุกหน้าหลักเชื่อมกับ API จริงครบแล้ว ส่วนต่อไปนี้ยังไม่รวมอยู่ในชุดไฟล์นี้ และต้องเขียนเพิ่มตามความต้องการเฉพาะของร้าน

- ระบบอัปโหลดรูปภาพสินค้า (ต้องใช้ Supabase Storage หรือ S3 เพิ่ม)
- การแจ้งเตือนแบบ real-time เมื่อมีออเดอร์ใหม่ (ต้องใช้ WebSocket หรือ Supabase Realtime)
- กราฟแสดงผลในหน้า Summary (ตอนนี้เป็นตัวเลข KPI เท่านั้น แนะนำเพิ่ม Chart.js หรือ Recharts)
- หน้า AnakynAddUser ยังไม่เชื่อม API (จัดการบัญชีพนักงาน)
- หน้า Warranty/Members/Settings ยังไม่มีหน้าจริง
- LINE LIFF integration สำหรับ Partner
- ปุ่ม "จ่ายค่าคอมแล้ว" สำหรับแอดมิน (API `markCommissionsPaid` มีพร้อมใช้ใน `api.js` แล้ว แต่ยังไม่มีหน้า UI เรียกใช้)

## การแก้ปัญหาเบื้องต้น

หากรัน `npm run migrate` แล้วเกิด error เกี่ยวกับ extension `uuid-ossp` ให้ตรวจสอบว่า Supabase project เปิดใช้ extension นี้ไว้แล้ว (ปกติเปิดให้ตั้งแต่สร้างโปรเจกต์)

หากเรียก API จาก frontend แล้วได้ error CORS ให้ตรวจสอบว่าค่า `FRONTEND_URL` ใน backend `.env` ตรงกับ URL จริงที่ frontend รันอยู่

หากล็อกอินแล้ว token หมดอายุเร็วเกินไป ปรับค่า `JWT_EXPIRES_IN` ใน `.env` ของ backend (ค่าเริ่มต้นคือ 7 วัน)
