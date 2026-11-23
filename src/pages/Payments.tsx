import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useState } from "react";
import { errorMessage } from "@/api/client";
import { fetchAdminPayment, fetchAdminPayments } from "@/api/payments";
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, Pagination, Select, Spinner, statusTone } from "@/components/ui";
import { formatDateTime, formatMoney } from "@/lib/format";

const STATUSES = ["", "PAID", "PENDING_PAYMENT", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED", "AUTHORIZED", "VOIDED"];

export const Payments = () => {
  const [page, setPage] = useState(1);
  const [storeId, setStoreId] = useState("");
  const [status, setStatus] = useState("");
  const [provider, setProvider] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["payments", page, storeId, status, provider, search],
    queryFn: () =>
      fetchAdminPayments({
        page,
        limit: 25,
        storeId: storeId.trim() || undefined,
        status: status || undefined,
        provider: provider.trim() || undefined,
        search: search.trim() || undefined,
      }),
  });

  const detail = useQuery({
    queryKey: ["payment", selected],
    queryFn: () => fetchAdminPayment(selected as string),
    enabled: Boolean(selected),
  });

  const payments = query.data?.payments ?? [];
  return (
    <div>
      <PageHeader title="Payments" description="Search by gateway reference, order, customer or store, and trace the settlement." />
      <Card className="mb-4 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-64 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input className="input pl-9" placeholder="Reference, transaction, order id, customer" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
          </div>
          <input className="input w-56" placeholder="Store id" value={storeId} onChange={(event) => { setStoreId(event.target.value); setPage(1); }} />
          <input className="input w-40" placeholder="Provider" value={provider} onChange={(event) => { setProvider(event.target.value); setPage(1); }} />
          <Select className="w-44" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
            {STATUSES.map((option) => <option key={option} value={option}>{option ? option.replaceAll("_", " ") : "Any status"}</option>)}
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {query.isPending ? <Spinner /> : query.isError ? <ErrorState message={errorMessage(query.error)} onRetry={() => void query.refetch()} /> : payments.length === 0 ? <EmptyState title="No payments matched" description="Try a reference, order id or clear the filters." /> : (
          <div className="overflow-x-auto"><table className="min-w-full"><thead className="bg-ink-50"><tr><th className="th">Reference</th><th className="th">Order</th><th className="th">Store</th><th className="th">Provider</th><th className="th">Status</th><th className="th">Amount</th><th className="th">Created</th><th className="th" /></tr></thead><tbody className="divide-y divide-ink-100">{payments.map((payment) => (<tr key={payment.id} className="hover:bg-ink-50/60"><td className="td font-mono text-xs">{payment.reference ?? payment.transactionId ?? payment.externalTransactionReference ?? payment.id.slice(0, 10)}</td><td className="td">#{payment.orderId}</td><td className="td font-mono text-xs text-ink-600">{payment.order.storeId.slice(0, 12)}</td><td className="td text-sm">{payment.provider ?? payment.method}</td><td className="td"><Badge tone={statusTone(payment.status)}>{payment.status.replaceAll("_", " ")}</Badge></td><td className="td">{formatMoney(payment.order.grandTotal, payment.order.currency)}</td><td className="td text-sm">{formatDateTime(payment.order.createdAt)}</td><td className="td text-right"><Button variant="secondary" onClick={() => setSelected(payment.id)}>Inspect</Button></td></tr>))}</tbody></table></div>
        )}
        {query.data?.pagination ? <Pagination page={query.data.pagination.currentPage} totalPages={query.data.pagination.totalPages} total={query.data.pagination.total} onChange={setPage} /> : null}
      </Card>

      {selected ? (
        <Card className="mt-4 p-5">
          <div className="flex items-start justify-between gap-3"><h2 className="text-sm font-semibold text-ink-900">Payment detail</h2><Button variant="ghost" onClick={() => setSelected(null)}>Close</Button></div>
          {detail.isPending ? <Spinner /> : detail.isError ? <ErrorState message={errorMessage(detail.error)} onRetry={() => void detail.refetch()} /> : detail.data ? (
            <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <Detail label="Reference" value={detail.data.reference ?? "—"} mono />
              <Detail label="Provider" value={detail.data.provider ?? detail.data.method} />
              <Detail label="Status" value={detail.data.status} />
              <Detail label="Amount" value={formatMoney(detail.data.order.grandTotal, detail.data.order.currency)} />
              <Detail label="Order" value={`#${detail.data.orderId}`} />
              <Detail label="Customer" value={detail.data.order.customer?.email ?? "Guest"} />
              <Detail label="Paid at" value={detail.data.paidAt ? formatDateTime(detail.data.paidAt) : "—"} />
              <Detail label="Verified at" value={detail.data.verifiedAt ? formatDateTime(detail.data.verifiedAt) : "—"} />
              <Detail label="Verification attempts" value={String(detail.data.verificationAttemptCount ?? 0)} />
              <Detail label="Settlement" value={detail.data.order.settlementBatch ? `${detail.data.order.settlementBatch.status} · ${detail.data.order.settlementBatch.id.slice(0, 10)}` : detail.data.order.settlementStatus} />
              <Detail label="Failure" value={detail.data.failureReason ?? "—"} />
              <Detail label="Store" value={detail.data.order.storeId} mono />
            </div>
          ) : <EmptyState title="Payment not found" />}
        </Card>
      ) : null}
    </div>
  );
};

const Detail = ({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) => (
  <div><p className="text-xs uppercase tracking-wide text-ink-400">{label}</p><p className={mono ? "mt-1 break-all font-mono text-xs" : "mt-1 break-words"}>{value}</p></div>
);