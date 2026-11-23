import type { AdminRole } from "@/auth/store";
import { api, unwrap } from "./client";
import type { Pagination } from "./types";

export interface AdminSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: AdminRole;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string | null;
}

export const listAdmins = async (params: { page?: number; limit?: number; search?: string }) => {
  const { data } = await api.get("/users/admin/admins", { params });
  return unwrap<{ admins: AdminSummary[]; pagination: Pagination }>(data);
};

export const createAdmin = async (body: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: AdminRole;
}) => {
  const { data } = await api.post("/users/admin/admins", body);
  return unwrap<AdminSummary>(data);
};

export const updateAdmin = async (
  id: string,
  changes: { active?: boolean; role?: AdminRole; firstName?: string; lastName?: string },
) => {
  const { data } = await api.patch(`/users/admin/admins/${id}`, changes);
  return unwrap<AdminSummary>(data);
};

export const resetAdminPassword = async (id: string, password: string) => {
  const { data } = await api.post(`/users/admin/admins/${id}/reset-password`, { password });
  return unwrap<{ id: string }>(data);
};

export interface SessionSummary {
  id: string;
  userId: string;
  device: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  lastSeenAt: string | null;
  expiresAt: string;
  status: "active" | "expired" | "signed-out";
}

export const listSessions = async (
  userIds: string[],
  emails: string[] = [],
  scope?: "all",
  params: { page?: number; limit?: number } = {},
) => {
  const { data } = await api.get("/users/admin/sessions", {
    params: {
      userIds: userIds.filter(Boolean).join(","),
      emails: emails.filter(Boolean).join(","),
      scope,
      page: params.page ?? 1,
      limit: params.limit ?? 50,
    },
  });
  return unwrap<{ sessions: SessionSummary[]; pagination: Pagination }>(data);
};

export interface AuthEvent {
  id: string;
  userId: string | null;
  email: string | null;
  role: string | null;
  type: string;
  ip: string | null;
  userAgent: string | null;
  sessionId: string | null;
  reason: string | null;
  createdAt: string;
}

export const listAuthEvents = async (params: {
  userId?: string;
  email?: string;
  role?: string;
  type?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
} = {}) => {
  const { data } = await api.get("/users/admin/auth-events", { params });
  return unwrap<{ events: AuthEvent[]; pagination: Pagination }>(data);
};

export const revokeSession = async (sessionId: string) => {
  const { data } = await api.post(`/users/admin/sessions/${sessionId}/revoke`);
  return unwrap<{ id: string }>(data);
};
