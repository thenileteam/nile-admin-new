import { api, unwrap } from "./client";
import { firstArray, readPagination, type Pagination } from "./types";

/* ── Orders ───────────────────────────────────────────────────────────── */

export interface AdminOrder {
  id?: number;
  uuid?: string;
  orderNumber?: string | number;
  storeId: string;
  status: string;
  paymentStatus: string;
  grandTotal: number;
  currency?: string;
  createdAt: string;
  customer?: { firstName?: string; lastName?: string; email?: string } | null;
  payment?: {
    reference?: string | null;
    provider?: string | null;
    transactionId?: string | null;
  } | null;
  items?: Array<{ id: string; quantity: number }>;
}

export const orderRef = (order: AdminOrder, length = 8) =>
  String(order.orderNumber ?? order.uuid ?? order.id ?? "—").slice(0, length);

export const fetchAdminOrders = async (params: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  storeId?: string;
  startDate?: string;
  endDate?: string;
}) => {
  const { data } = await api.get("/orders/orders/admin/all-orders", { params });
  const payload = unwrap<Record<string, unknown>>(data);
  return {
    orders: firstArray<AdminOrder>(payload, ["orders", "allOrders", "data"]),
    pagination: readPagination(payload),
  };
};

/* ── Tasks ────────────────────────────────────────────────────────────── */

export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "BLOCKED", "REVIEW", "DONE", "CANCELLED"] as const;
export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignee?: { id: string; firstName?: string; lastName?: string } | null;
  dueDate?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export const fetchTasks = async (params: { page?: number; limit?: number; status?: string; search?: string }) => {
  const { data } = await api.get("/orders/tasks", { params });
  const payload = unwrap<Record<string, unknown>>(data);
  return {
    tasks: firstArray<Task>(payload, ["tasks", "items", "data"]),
    pagination: readPagination(payload),
  };
};

export const createTask = async (body: {
  title: string;
  description: string;
  priority?: string;
  status?: string;
  dueDate?: string | null;
}) => {
  const { data } = await api.post("/orders/tasks", body);
  return unwrap<Task>(data);
};

export const updateTask = async (id: string, changes: { status?: string; priority?: string }) => {
  const { data } = await api.patch(`/orders/tasks/${id}`, changes);
  return unwrap<Task>(data);
};

/* ── Support ──────────────────────────────────────────────────────────── */

export const TICKET_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;
export const TICKET_PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  storeId: string;
  issueLabel: string;
  categoryLabel: string;
  status: string;
  priority: string;
  submittedEmail?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface SupportMessage {
  id: string;
  body: string;
  authorRole?: string;
  authorName?: string | null;
  createdAt: string;
}

export const fetchSupportTickets = async (params: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}) => {
  const { data } = await api.get("/store/store/support/admin/tickets", { params });
  const payload = unwrap<Record<string, unknown>>(data);
  return {
    tickets: firstArray<SupportTicket>(payload, ["tickets", "data"]),
    pagination: readPagination(payload),
  };
};

export const fetchSupportTicket = async (ticketId: string) => {
  const { data } = await api.get(`/store/store/support/admin/tickets/${ticketId}`);
  const payload = unwrap<Record<string, unknown>>(data);
  const ticket = (payload.ticket ?? payload) as SupportTicket;
  return {
    ticket,
    messages: firstArray<SupportMessage>(payload, ["messages"]) as SupportMessage[],
  };
};

export const replyToTicket = async (ticketId: string, body: string) => {
  const { data } = await api.post(`/store/store/support/admin/tickets/${ticketId}/messages`, { body });
  return unwrap<SupportMessage>(data);
};

export const updateTicketStatus = async (
  ticketId: string,
  changes: { status: string; priority?: string },
) => {
  const { data } = await api.patch(`/store/store/support/admin/tickets/${ticketId}/status`, changes);
  return unwrap<SupportTicket>(data);
};

/* ── Office hours ─────────────────────────────────────────────────────── */

export interface OfficeHoursConfig {
  id: string;
  enabled: boolean;
  meetingUrl: string | null;
  timezone: string;
  openingTime: string;
  closingTime: string;
  activeDays: string;
  notice: string | null;
  status?: string;
  displaySchedule?: string;
}

export const fetchOfficeHours = async () => {
  const { data } = await api.get("/office-hours");
  return unwrap<OfficeHoursConfig>(data);
};

export const fetchOfficeHoursAnalytics = async () => {
  const { data } = await api.get("/office-hours/admin/analytics");
  return unwrap<{ today: number; sevenDays: number; thirtyDays: number }>(data);
};

export const updateOfficeHours = async (changes: Partial<OfficeHoursConfig>) => {
  const { data } = await api.patch("/office-hours/admin", changes);
  return unwrap<OfficeHoursConfig>(data);
};

/* ── Transfers ────────────────────────────────────────────────────────── */

export interface BankTransfer {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
  bankAccountId?: string;
  reference?: string | null;
}

export const fetchStoreTransfers = async (storeId: string) => {
  const { data } = await api.get(`/store/admin/transfers/store/${storeId}`);
  const payload = unwrap<Record<string, unknown>>(data);
  return firstArray<BankTransfer>(payload, ["transfers", "bankTransfers", "data"]);
};

export const initiateTransfer = async (body: {
  storeId: string;
  bankAccountId: string;
  amount: number;
  narration?: string;
}) => {
  const { data } = await api.post("/store/admin/transfers/initiate", body);
  return unwrap<BankTransfer>(data);
};

/* ── Logistics ────────────────────────────────────────────────────────── */

export const fetchShipments = async (params: { page?: number; limit?: number; status?: string } = {}) => {
  const { data } = await api.get("/orders/admin/shipments", { params });
  const payload = unwrap<Record<string, unknown>>(data);
  return {
    shipments: firstArray<Record<string, unknown>>(payload, ["shipments", "data"]),
    pagination: readPagination(payload),
  };
};

export const fetchWebhookLogs = async (params: { page?: number; limit?: number } = {}) => {
  const { data } = await api.get("/orders/admin/webhook-logs", { params });
  const payload = unwrap<Record<string, unknown>>(data);
  return {
    logs: firstArray<Record<string, unknown>>(payload, ["logs", "webhookLogs", "data"]),
    pagination: readPagination(payload),
  };
};

export const fetchShipbubbleWallets = async () => {
  const { data } = await api.get("/admin/shipbubble/wallets");
  const payload = unwrap<Record<string, unknown>>(data);
  return firstArray<Record<string, unknown>>(payload, ["wallets", "data"]);
};

export const fetchShipbubbleBalance = async () => {
  const { data } = await api.get("/admin/shipbubble/wallet/balance");
  return unwrap<Record<string, unknown>>(data);
};

export const syncCouriers = async () => {
  const { data } = await api.post("/admin/shipbubble/couriers/sync");
  return unwrap<Record<string, unknown>>(data);
};

/* ── CAC ──────────────────────────────────────────────────────────────── */

export const CAC_DECISIONS = ["UNDER_REVIEW", "PROCESSING", "APPROVED", "REJECTED", "INFO_REQUIRED"] as const;

export interface CacApplication {
  id: string;
  status: string;
  packageKey?: string;
  paymentStatus?: string;
  storeId?: string;
  businessName?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export const fetchCacApplications = async (params: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
} = {}) => {
  const { data } = await api.get("/store/add-ons/cac/admin/applications", { params });
  const payload = (data ?? {}) as Record<string, unknown>;
  return {
    applications: firstArray<CacApplication>(payload, ["applications", "items", "data"]),
    pagination: readPagination(payload),
  };
};

export const reviewCacApplication = async (
  id: string,
  body: { decision: (typeof CAC_DECISIONS)[number]; note?: string },
) => {
  const { data } = await api.post(`/store/add-ons/cac/admin/applications/${id}/review`, body);
  return data;
};

/* ── Marketing ────────────────────────────────────────────────────────── */

export const sendMarketingBlast = async (body: {
  storeId: string;
  campaignName: string;
  subject: string;
  html: string;
  audience: string;
}) => {
  const { data } = await api.post("/store/admin/marketing/blast", body);
  return unwrap<Record<string, unknown>>(data);
};

export const fetchEmailOverview = async () => {
  const { data } = await api.get("/marketing/email/admin/overview");
  return (data ?? {}) as Record<string, unknown>;
};

export const fetchFailedEmailCampaigns = async () => {
  const { data } = await api.get("/marketing/email/admin/failed-campaigns");
  const payload = (data ?? {}) as Record<string, unknown>;
  return firstArray<Record<string, unknown>>(payload, ["campaigns", "items", "data"]);
};

export const retryEmailCampaign = async (id: string) => {
  const { data } = await api.post(`/marketing/email/admin/failed-campaigns/${id}/retry`);
  return data;
};

/* ── Users ────────────────────────────────────────────────────────────── */

export interface PlatformUser {
  id?: string;
  _id?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: string;
  active?: boolean;
  createdAt?: string;
}

export const fetchPlatformUsers = async (params: { page?: number; limit?: number; search?: string } = {}) => {
  const { data } = await api.get("/users/users/auth/all-users", { params });
  const payload = unwrap<Record<string, unknown>>(data);
  return {
    users: firstArray<PlatformUser>(payload, ["users", "data"]),
    pagination: readPagination(payload),
  };
};

export type { Pagination };
