import type { ActivityItem } from "@/lib/activity";
import { api, unwrap } from "./client";
import type { Pagination } from "./types";

export interface AdminStore {
  id: string;
  name: string;
  email: string | null;
  storeUrl: string;
  status: string;
  storeApproval: string;
  createdAt: string;
  logo: string | null;
  category: string | null;
  country: string | null;
  subscriptions?: Array<{ status: string; plan?: { name?: string } | null }>;
}

export const searchStores = async (params: { page?: number; limit?: number; search?: string; status?: string }) => {
  const { data } = await api.get("/store/store/admin/stores", { params });
  return unwrap<{ stores: AdminStore[]; pagination: Pagination }>(data);
};

export interface FollowStaff {
  id: string;
  name: string;
  email: string;
  status: string;
  createdAt: string | null;
}

export interface FollowOverview {
  store: {
    id: string;
    name: string;
    email: string | null;
    storeUrl: string;
    status: string;
    approval: string;
    createdAt: string;
    logo: string | null;
    category: string | null;
    country: string | null;
    currency: string | null;
  };
  ownerId: string;
  staff: FollowStaff[];
  subscription: {
    planName: string;
    status: string;
    amount: number | null;
    startDate: string | null;
    endDate: string | null;
  } | null;
  counts: { products: number; orders: number; designs: number; tickets: number; staff: number };
}

export const fetchStoreFollow = async (storeId: string) => {
  const { data } = await api.get(`/store/admin/stores/${storeId}/follow`);
  return unwrap<FollowOverview>(data);
};

export const fetchStoreActivity = async (
  storeId: string,
  params: { type?: string; cursor?: string; limit?: number },
) => {
  const { data } = await api.get(`/store/admin/stores/${storeId}/activity`, { params });
  return unwrap<{ items: ActivityItem[]; nextCursor: string | null }>(data);
};
