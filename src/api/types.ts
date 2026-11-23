export interface Pagination {
  currentPage: number;
  totalPages: number;
  total?: number;
  totalStores?: number;
  limit: number;
}

export interface Paged<T> {
  data: T[];
  pagination: Pagination;
}

/** Reads the first array-valued key, so a slightly different envelope still renders. */
export const firstArray = <T,>(value: unknown, keys: string[]): T[] => {
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const candidate = record[key];
    if (Array.isArray(candidate)) return candidate as T[];
  }
  return [];
};

export const readPagination = (value: unknown): Pagination | null => {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const pagination = record.pagination ?? record.meta;
  if (!pagination || typeof pagination !== "object") return null;
  const p = pagination as Record<string, unknown>;
  return {
    currentPage: Number(p.currentPage ?? 1),
    totalPages: Number(p.totalPages ?? 1),
    total: Number(p.total ?? p.totalStores ?? p.totalOrders ?? p.totalPayments ?? 0),
    limit: Number(p.limit ?? 20),
  };
};

export const readNumber = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : fallback;
};
