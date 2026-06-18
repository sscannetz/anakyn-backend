// ═══════════════════════════════════════════════════════════════
// api.js — ตัวกลางเรียก Backend API ทั้งหมด
// ใช้: import { api } from "./api";  await api.login(email, password)
// ═══════════════════════════════════════════════════════════════

const BASE_URL = import.meta.env?.VITE_API_URL || "http://localhost:4000/api";

function getToken() {
  return sessionStorage.getItem("anakyn_token");
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `เกิดข้อผิดพลาด (${res.status})`);
  }
  return data;
}

export const api = {
  // ── Auth ──
  login: (email, password) =>
    request("/auth/login", { method: "POST", body: { email, password }, auth: false }),

  // ── Products / Stock ──
  getProducts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/products${qs ? `?${qs}` : ""}`);
  },
  getProduct: (id) => request(`/products/${id}`),
  createProduct: (data) => request("/products", { method: "POST", body: data }),
  updateProduct: (id, data) => request(`/products/${id}`, { method: "PUT", body: data }),
  deleteProduct: (id) => request(`/products/${id}`, { method: "DELETE" }),

  // ── Sales ──
  getSales: (limit) => request(`/sales${limit ? `?limit=${limit}` : ""}`),
  getSale: (id) => request(`/sales/${id}`),
  createSale: (data) => request("/sales", { method: "POST", body: data }),

  // ── Invoices ──
  getInvoices: () => request("/invoices"),
  getInvoice: (id) => request(`/invoices/${id}`),
  createInvoice: (data) => request("/invoices", { method: "POST", body: data }),
  updateInvoice: (id, data) => request(`/invoices/${id}`, { method: "PATCH", body: data }),

  // ── Quotations ──
  getQuotations: () => request("/quotations"),
  getQuotation: (id) => request(`/quotations/${id}`),
  createQuotation: (data) => request("/quotations", { method: "POST", body: data }),
  updateQuotationStatus: (id, status) =>
    request(`/quotations/${id}/status`, { method: "PATCH", body: { status } }),
  updateQuotation: (id, data) => request(`/quotations/${id}`, { method: "PATCH", body: data }),

  // ── Purchase Orders ──
  getPurchaseOrders: () => request("/purchase-orders"),
  getPurchaseOrder: (id) => request(`/purchase-orders/${id}`),
  createPurchaseOrder: (data) => request("/purchase-orders", { method: "POST", body: data }),
  updatePOStatus: (id, status) =>
    request(`/purchase-orders/${id}/status`, { method: "PATCH", body: { status } }),

  // ── Suppliers ──
  getSuppliers: () => request("/suppliers"),
  createSupplier: (data) => request("/suppliers", { method: "POST", body: data }),

  // ── Users (admin only) ──
  getUsers: () => request("/users"),
  createUser: (data) => request("/users", { method: "POST", body: data }),

  // ── Service Orders ──
  getServiceOrders: () => request("/service-orders"),
  getServiceOrder: (id) => request(`/service-orders/${id}`),
  createServiceOrder: (data) => request("/service-orders", { method: "POST", body: data }),
  updateServiceStatus: (id, status) =>
    request(`/service-orders/${id}/status`, { method: "PATCH", body: { status } }),

  // ── Partners ──
  getPartnerDashboard: () => request("/partners/me/dashboard"),
  getPartners: () => request("/partners"),
  markCommissionsPaid: (partnerId) =>
    request(`/partners/${partnerId}/commission-paid`, { method: "PATCH" }),

  // ── Customers ──
  getCustomers: (search) => request(`/customers${search ? `?search=${search}` : ""}`),
  createCustomer: (data) => request("/customers", { method: "POST", body: data }),

  // ── Summary ──
  getSummary: (period) => request(`/summary?period=${period || "month"}`),
};

// Helper สำหรับ Login component
export function saveSession(token, role) {
  sessionStorage.setItem("anakyn_token", token);
  sessionStorage.setItem("anakyn_role", role);
}
export function clearSession() {
  sessionStorage.removeItem("anakyn_token");
  sessionStorage.removeItem("anakyn_role");
}
