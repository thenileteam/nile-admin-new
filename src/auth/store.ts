import { create } from "zustand";

export type AdminRole = "ADMIN" | "SUPERADMIN";

export interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: AdminRole;
  active?: boolean;
  lastLoginAt?: string | null;
  lastLoginIp?: string | null;
}

export interface AdminSessionPayload {
  accessToken: string;
  refreshToken: string;
  user: AdminUser;
}

const ACCESS_KEY = "nile_admin_access";
const REFRESH_KEY = "nile_admin_refresh";
const USER_KEY = "nile_admin_user";

// Access lives only for the tab (sessionStorage); the refresh token survives a
// browser restart in localStorage, scoped to the admin origin. No password is
// ever stored.
const accessStore = () => window.sessionStorage;
const durableStore = () => window.localStorage;

const readJson = <T,>(storage: Storage, key: string): T | null => {
  try {
    const raw = storage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

const writeJson = (storage: Storage, key: string, value: unknown) => {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage can be full or blocked; the in-memory session still works */
  }
};

export const isAdminRole = (role?: string | null): role is AdminRole =>
  role === "ADMIN" || role === "SUPERADMIN";

export const adminName = (user?: AdminUser | null): string => {
  if (!user) return "Admin";
  const full = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return full || user.email;
};

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AdminUser | null;
  status: "authenticated" | "anonymous";
  setSession: (payload: AdminSessionPayload) => void;
  setAccessToken: (token: string) => void;
  setUser: (user: AdminUser) => void;
  clearSession: () => void;
  hydrate: () => void;
}

const persistedAccess = (): string | null => {
  try {
    return window.sessionStorage.getItem(ACCESS_KEY);
  } catch {
    return null;
  }
};

export const useAuth = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  status: "anonymous",

  setSession: ({ accessToken, refreshToken, user }) => {
    try {
      accessStore().setItem(ACCESS_KEY, accessToken);
    } catch {
      /* ignore */
    }
    writeJson(durableStore(), REFRESH_KEY, refreshToken);
    writeJson(durableStore(), USER_KEY, user);
    set({ accessToken, refreshToken, user, status: "authenticated" });
  },

  setAccessToken: (token) => {
    try {
      accessStore().setItem(ACCESS_KEY, token);
    } catch {
      /* ignore */
    }
    set({ accessToken: token });
  },

  setUser: (user) => {
    writeJson(durableStore(), USER_KEY, user);
    set({ user });
  },

  clearSession: () => {
    try {
      accessStore().removeItem(ACCESS_KEY);
      durableStore().removeItem(REFRESH_KEY);
      durableStore().removeItem(USER_KEY);
    } catch {
      /* ignore */
    }
    set({ accessToken: null, refreshToken: null, user: null, status: "anonymous" });
  },

  hydrate: () => {
    const accessToken = persistedAccess();
    const refreshToken = readJson<string>(durableStore(), REFRESH_KEY);
    const user = readJson<AdminUser>(durableStore(), USER_KEY);

    if (accessToken && refreshToken && user && isAdminRole(user.role)) {
      set({ accessToken, refreshToken, user, status: "authenticated" });
      return;
    }

    set({ accessToken: null, refreshToken: null, user: null, status: "anonymous" });
  },
}));
