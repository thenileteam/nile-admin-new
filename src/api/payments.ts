import { api, unwrap } from "./client";
import { readPagination } from "./types";

export interface AdminPayment {
  id: string;
  orderId: number;
  method: string;
  status: string;
  reference: string | null;
  transactionId: string | null;
  externalTransactionReference: string | null;
  provider: string | null;
  amountMinor: number | null;
  currency: string | null;
  paidAt: string | null;
  verifiedAt: string | null;
  failureReason: string | null;
  verificationAttemptCount?: number;
  document?: { id: string; url: string; type: string; verified: boolean } | null;
  order: {
    id: number;
    storeId: string;
    status: string;
    paymentStatus: string;
    grandTotal: number;
    currency: string;
    createdAt: string;
    settled: boolean;
    settlementStatus: string;
    customer: { name?: string | null; email?: string | null; phoneNumber?: string | null } | null;
    settlementBatch: { id: string; status: string; totalPaidOut: number; createdAt: string } | null;
  };
}

export const fetchAdminPayments = async (params: {
  page?: number;
  limit?: number;
  storeId?: string;
  status?: string;
  provider?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}) => {
  const { data } = await api.get("/orders/orders/admin/payments", { params });
  const payload = unwrap<Record<string, unknown>>(data);
  const payments = (payload.payments ?? []) as AdminPayment[];
  return { payments, pagination: readPagination(payload) ?? undefined };
};

export const fetchAdminPayment = async (id: string) => {
  const { data } = await api.get(`/orders/orders/admin/payments/${encodeURIComponent(id)}`);
  return unwrap<AdminPayment>(data);
};