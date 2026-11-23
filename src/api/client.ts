import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuth } from "@/auth/store";

const baseURL = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "");

export const API_BASE_URL =
  baseURL || (import.meta.env.PROD ? "https://api.nile.ng" : "http://localhost:8800");

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60_000,
});

api.interceptors.request.use((config) => {
  const token = useAuth.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

let refreshPromise: Promise<string | null> | null = null;

/** Refreshes once at a time; every queued 401 retries with the same new token. */
const refreshAccessToken = async (): Promise<string | null> => {
  const { refreshToken, user } = useAuth.getState();
  if (!refreshToken || !user) return null;

  try {
    const { data } = await axios.post(
      `${API_BASE_URL}/users/auth/refresh`,
      { refreshToken, userId: user.id },
      { timeout: 20_000 },
    );

    const accessToken = (data?.accessToken ?? data?.responseObject?.accessToken) as string | undefined;
    if (!accessToken) return null;

    useAuth.getState().setAccessToken(accessToken);
    return accessToken;
  } catch {
    useAuth.getState().clearSession();
    return null;
  }
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined;
    const status = error.response?.status;
    const url = config?.url ?? "";

    if (status === 401 && config && !config._retried && !url.includes("/auth/refresh")) {
      config._retried = true;
      refreshPromise = refreshPromise ?? refreshAccessToken();
      const token = await refreshPromise;
      refreshPromise = null;

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        return api.request(config);
      }
    }

    return Promise.reject(error);
  },
);

export interface Envelope<T> {
  status?: string;
  message?: string;
  responseObject: T;
}

/** Every service route answers `{ status, message, responseObject }`. */
export const unwrap = <T,>(data: Envelope<T> | T): T => {
  if (data && typeof data === "object" && "responseObject" in (data as Envelope<T>)) {
    return (data as Envelope<T>).responseObject;
  }
  return data as T;
};

export const errorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as { message?: string; error?: string } | undefined;
    if (payload?.message) return payload.message;
    if (typeof error.response?.data === "string" && error.response.data.length < 300) {
      return error.response.data;
    }
    if (error.code === "ECONNABORTED") return "The request timed out. Try again.";
    if (!error.response) return "Cannot reach the API. Check your connection.";
    return `Request failed (${error.response.status})`;
  }
  return error instanceof Error ? error.message : "Something went wrong";
};
