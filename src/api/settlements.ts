import { api, unwrap } from "./client";
import { readPagination, type Pagination } from "./types";

export interface SettlementBatchOrder {
  id: number;
  grandTotal: number;
  platformFee: number | null;
  netAmount: number | null;
  settled: boolean;
  settlementStatus: string;
  createdAt: string;
  customer?: { name?: string | null; email?: string | null; phoneNumber?: string | null } | null;
}

export interface SettlementBatch {
  id: string;
  storeId: string;
  totalPaidOut: number;
  feeCollected: number;
  status: string;
  approvedAt: string | null;
  approvedBy: string | null;
  createdAt: string;
  orders?: SettlementBatchOrder[];
}

export interface SettlementStats {
  pendingCount: number;
  completedCount: number;
  totalPendingAmount: number;
  totalCompletedAmount: number;
}

export const fetchSettlementStats = async () => {
  const { data } = await api.get("/settlement/admin/stats");
  return unwrap<SettlementStats>(data);
};

export const fetchPendingSettlements = async () => {
  const { data } = await api.get("/settlement/admin/pending");
  return unwrap<SettlementBatch[]>(data);
};

export const fetchSettlementBatches = async (params: {
  storeId?: string;
  status?: string;
  page?: number;
  limit?: number;
}) => {
  const { data } = await api.get("/settlement", { params });
  const payload = unwrap<Record<string, unknown>>(data);
  const page = Number(payload.page ?? 0);
  const pageCount = Number(payload.pageCount ?? 0);
  return {
    batches: (payload.batches ?? payload.settlements ?? payload.items ?? []) as SettlementBatch[],
    pagination:
      readPagination(payload) ??
      (page > 0
        ? ({ currentPage: page, totalPages: Math.max(1, pageCount), total: Number(payload.total ?? 0), limit: params.limit ?? 20 } satisfies Pagination)
        : undefined),
  };
};

export const fetchSettlementBatch = async (batchId: string) => {
  const { data } = await api.get(`/settlement/admin/batch/${encodeURIComponent(batchId)}`);
  return unwrap<SettlementBatch>(data);
};

export const approveSettlementBatch = async (batchId: string, approvedBy: string) => {
  const { data } = await api.post(`/settlement/batches/${encodeURIComponent(batchId)}/approve`, {
    batchId,
    approvedBy,
  });
  return unwrap<SettlementBatch>(data);
};

export const bulkApproveSettlements = async (batchIds: string[], approvedBy: string) => {
  const { data } = await api.post("/settlement/batches/bulk-approve", { batchIds, approvedBy });
  return unwrap<SettlementBatch[]>(data);
};

export const downloadSettlementCsv = async (batchId: string) => {
  const response = await api.get(`/settlement/admin/batch/${encodeURIComponent(batchId)}/export-csv`, {
    responseType: "blob",
  });
  const url = URL.createObjectURL(new Blob([response.data], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `settlement-${batchId}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};