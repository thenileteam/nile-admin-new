import axios from "axios";
import type { AdminSessionPayload, AdminUser } from "@/auth/store";
import { API_BASE_URL, api, unwrap } from "./client";

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  data: { user: AdminUser };
}

const toPayload = (response: AuthResponse): AdminSessionPayload => {
  const user = response.data?.user;
  if (!user) throw new Error("The sign-in response did not include an account");
  return {
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    user: {
      id: String((user as unknown as { _id?: string })._id ?? user.id),
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      email: user.email,
      role: user.role,
      lastLoginAt: user.lastLoginAt ?? null,
    },
  };
};

export const signIn = async (email: string, password: string): Promise<AdminSessionPayload> => {
  const { data } = await axios.post<AuthResponse>(
    `${API_BASE_URL}/users/auth/super-admin/login`,
    { email: email.trim().toLowerCase(), password },
    { timeout: 30_000 },
  );
  return toPayload(data);
};

/** Signs the server session out; the local state is cleared either way. */
export const signOutEverywhere = async (refreshToken: string | null) => {
  if (!refreshToken) return;
  try {
    await axios.post(`${API_BASE_URL}/users/auth/logout`, { refreshToken }, { timeout: 15_000 });
  } catch {
    /* revocation is best-effort; signing out locally must still work */
  }
};

export const fetchMe = async () => {
  const { data } = await api.get("/users/admin/me");
  return unwrap<AdminUser & { lastLoginIp?: string | null; lastLoginAt?: string | null }>(data);
};
