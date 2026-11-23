import { api, unwrap } from "./client";

export interface OrderAnalytics {
  totalOrders: number;
  paidOrders: number;
  absoluteValue: number;
  grossProcessedValue: number;
  netProcessedValue: number;
  refundedValue: number;
  averageOrderValue: number;
  paidOrderRate: number;
  byStatus: Record<string, number>;
  byPaymentStatus: Record<string, number>;
  trends: Array<{ date: string; orders: number; value: number }>;
}

export const fetchOrderAnalytics = async (params: { startDate?: string; endDate?: string } = {}) => {
  const { data } = await api.get("/orders/orders/admin/analytics", { params });
  return unwrap<OrderAnalytics>(data);
};

export interface SubscriptionPlanStat {
  name: string;
  type: string;
  price: number;
  count: number;
  isCustom: boolean;
  activeCount: number;
  activeValue: number;
}

export interface SubscriptionAnalytics {
  totalStores: number;
  subscriptionsByPlan: SubscriptionPlanStat[];
  totalCustomOrManual: number;
  statusCounts: Record<string, number>;
  activeSubscriptionValue: number;
  generatedAt?: string;
}

export const fetchSubscriptionAnalytics = async () => {
  const { data } = await api.get("/store/admin/analytics/subscriptions");
  return unwrap<SubscriptionAnalytics>(data);
};

export interface WalletAnalytics {
  totalWalletBalance: number;
  totalLifetimeFunded: number;
  topWallets: Array<{ id: string; balance: number; currency: string; storeId: string; storeName: string }>;
}

export const fetchWalletAnalytics = async () => {
  const { data } = await api.get("/store/admin/analytics/wallet");
  return unwrap<WalletAnalytics>(data);
};

/** Returns only the total, by asking for a single row. */
export const fetchSupportTicketCount = async (): Promise<number> => {
  const { data } = await api.get("/store/store/support/admin/tickets", { params: { page: 1, limit: 1 } });
  const payload = unwrap<{ pagination?: { total?: number }; tickets?: unknown[] }>(data);
  return Number(payload?.pagination?.total ?? payload?.tickets?.length ?? 0);
};

export const fetchUserCount = async (): Promise<number> => {
  const { data } = await api.get("/users/users/auth/all-users", { params: { page: 1, limit: 1 } });
  const payload = unwrap<{ pagination?: { total?: number }; users?: unknown[]; totalUsers?: number }>(data);
  return Number(payload?.pagination?.total ?? payload?.totalUsers ?? payload?.users?.length ?? 0);
};

export const HEALTH_ENDPOINTS: Array<{ name: string; path: string }> = [
  { name: "Auth service", path: "/users/health-check" },
  { name: "Store service", path: "/store/health-check" },
  { name: "Order service", path: "/orders/health-check" },
  { name: "Product service", path: "/products/health-check" },
  { name: "Marketing service", path: "/marketing/health-check" },
];

export const checkHealth = async (path: string) => {
  const started = performance.now();
  try {
    const { data } = await api.get(path, { timeout: 8_000 });
    return { ok: true, latencyMs: Math.round(performance.now() - started), payload: data };
  } catch {
    return { ok: false, latencyMs: Math.round(performance.now() - started), payload: null };
  }
};
