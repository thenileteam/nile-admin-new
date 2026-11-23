import { format, formatDistanceToNowStrict, isValid, parseISO } from "date-fns";

const toDate = (value?: string | Date | null): Date | null => {
  if (!value) return null;
  const date = typeof value === "string" ? parseISO(value) : value;
  return isValid(date) ? date : null;
};

export const formatDateTime = (value?: string | Date | null): string => {
  const date = toDate(value);
  return date ? format(date, "d MMM yyyy, HH:mm") : "—";
};

export const formatDate = (value?: string | Date | null): string => {
  const date = toDate(value);
  return date ? format(date, "d MMM yyyy") : "—";
};

export const formatTime = (value?: string | Date | null): string => {
  const date = toDate(value);
  return date ? format(date, "HH:mm") : "—";
};

export const formatRelative = (value?: string | Date | null): string => {
  const date = toDate(value);
  if (!date) return "—";
  return `${formatDistanceToNowStrict(date)} ago`;
};

export const formatMoney = (amount?: number | string | null, currency = "NGN"): string => {
  if (amount === null || amount === undefined || amount === "") return "—";
  const value = typeof amount === "string" ? Number(amount) : amount;
  if (Number.isNaN(value)) return String(amount);
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString()}`;
  }
};

export const formatNumber = (value?: number | null): string =>
  typeof value === "number" && Number.isFinite(value) ? value.toLocaleString() : "—";

export const initials = (name?: string | null): string => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

export const titleCase = (value?: string | null): string => {
  if (!value) return "—";
  return value
    .toLowerCase()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
};

export const truncate = (value: string, length = 80): string =>
  value.length > length ? `${value.slice(0, length - 1)}…` : value;
