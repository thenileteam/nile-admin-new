import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { errorMessage } from "@/api/client";
import {
  approveSettlementBatch,
  bulkApproveSettlements,
  downloadSettlementCsv,
  fetchPendingSettlements,
  fetchSettlementBatch,
  fetchSettlementBatches,
  fetchSettlementStats,
} from "@/api/settlements";
import { useAuth } from "@/auth/store";
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, Pagination, Select, Spinner, StatCard, statusTone } from "@/components/ui";
import { formatDateTime, formatMoney } from "@/lib/format";

export const Settlements = () => {
  const user = useAuth((state) => state.user);
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [storeId, setStoreId] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [checked, setChecked] = useState<string[]>([]);

  const stats = useQuery({ queryKey: ["settlements", "stats"], queryFn: fetchSettlementStats });
  const pending = useQuery({ queryKey: ["settlements", "pending"], queryFn: fetchPendingSettlements });
  const batches = useQuery({
    queryKey: ["settlements", "list", page, storeId, status],
    queryFn: () => fetchSettlementBatches({ page, limit: 20, storeId: storeId.trim() || undefined, status: status || undefined }),
  });
  const detail = useQuery({
    queryKey: ["settlement", selected],
    queryFn: () => fetchSettlementBatch(selected as string),
    enabled: Boolean(selected),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["settlements"] });
    setChecked([]);
  };
  const approve = useMutation({
    mutationFn: (batchId: string) => approveSettlementBatch(batchId, user?.email ?? user?.id ?? "admin"),
    onSuccess: () => { toast.success("Settlement approved"); refresh(); },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const bulk = useMutation({
    mutationFn: () => bulkApproveSettlements(checked, user?.email ?? user?.id ?? "admin"),
    onSuccess: (result) => { toast.success(`${result.length} batch${result.length === 1 ? "" : "es"} approved`); refresh(); },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <div>
      <PageHeader title="Settlements" description="Review paid-out batches, approve them, and export the order-level CSV." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pending batches" value={stats.data?.pendingCount ?? "—"} />
        <StatCard label="Pending amount" value={stats.data ? formatMoney(stats.data.totalPendingAmount, "NGN") : "—"} />
        <StatCard label="Completed batches" value={stats.data?.completedCount ?? "—"} />
        <StatCard label="Completed amount" value={stats.data ? formatMoney(stats.data.totalCompletedAmount, "NGN") : "—"} />
      </div>

      <Card className="mt-4 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-ink-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-ink-900">Pending</h2>
          <span className="text-xs text-ink-400">{pending.data?.length ?? 0} batches</span>
          <div className="ml-auto flex gap-2">
            <Button variant="secondary" disabled={checked.length === 0} loading={bulk.isPending} onClick={() => { if (window.confirm(`Approve ${checked.length} selected batches?`)) bulk.mutate(); }}>Bulk approve ({checked.length})</Button>
          </div>
        </div>
        {pending.isPending ? <Spinner /> : pending.isError ? <ErrorState message={errorMessage(pending.error)} onRetry={() => void pending.refetch()} /> : (pending.data?.length ?? 0) === 0 ? <EmptyState title="No pending settlements" description="Every batch has been approved." /> : (
          <div className="overflow-x-auto"><table className="min-w-full"><thead className="bg-ink-50"><tr><th className="th"><input type="checkbox" aria-label="Select all pending" checked={checked.length === (pending.data?.length ?? 0) && checked.length > 0} onChange={(event) => setChecked(event.target.checked ? (pending.data ?? []).map((batch) => batch.id) : [])} /></th><th className="th">Batch</th><th className="th">Store</th><th className="th">Paid out</th><th className="th">Fee</th><th className="th">Created</th><th className="th text-right">Actions</th></tr></thead><tbody className="divide-y divide-ink-100">{pending.data?.map((batch) => (<tr key={batch.id}><td className="td"><input type="checkbox" aria-label={`Select ${batch.id}`} checked={checked.includes(batch.id)} onChange={(event) => setChecked((current) => event.target.checked ? [...current, batch.id] : current.filter((id) => id !== batch.id))} /></td><td className="td font-mono text-xs">{batch.id.slice(0, 10)}</td><td className="td font-mono text-xs">{batch.storeId.slice(0, 12)}</td><td className="td">{formatMoney(batch.totalPaidOut, "NGN")}</td><td className="td">{formatMoney(batch.feeCollected, "NGN")}</td><td className="td text-sm">{formatDateTime(batch.createdAt)}</td><td className="td text-right"><Button variant="secondary" loading={approve.isPending} onClick={() => { if (window.confirm(`Approve ${batch.id.slice(0, 8)}?`)) approve.mutate(batch.id); }}>Approve</Button></td></tr>))}</tbody></table></div>
        )}
      </Card>

      <Card className="mt-4 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-ink-100 px-5 py-3"><h2 className="text-sm font-semibold text-ink-900">All batches</h2><input className="input ml-auto w-56" placeholder="Store id" value={storeId} onChange={(event) => { setStoreId(event.target.value); setPage(1); }} /><Select className="w-40" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">Any status</option><option value="PENDING">Pending</option><option value="COMPLETED">Completed</option><option value="FAILED">Failed</option></Select></div>
        {batches.isPending ? <Spinner /> : batches.isError ? <ErrorState message={errorMessage(batches.error)} onRetry={() => void batches.refetch()} /> : (batches.data?.batches.length ?? 0) === 0 ? <EmptyState title="No batches" description="No settlement batch matches these filters." /> : (
          <div className="overflow-x-auto"><table className="min-w-full"><thead className="bg-ink-50"><tr><th className="th">Batch</th><th className="th">Store</th><th className="th">Status</th><th className="th">Paid out</th><th className="th">Created</th><th className="th text-right">Actions</th></tr></thead><tbody className="divide-y divide-ink-100">{batches.data?.batches.map((batch) => (<tr key={batch.id}><td className="td font-mono text-xs">{batch.id.slice(0, 10)}</td><td className="td font-mono text-xs">{batch.storeId.slice(0, 12)}</td><td className="td"><Badge tone={statusTone(batch.status)}>{batch.status}</Badge></td><td className="td">{formatMoney(batch.totalPaidOut, "NGN")}</td><td className="td text-sm">{formatDateTime(batch.createdAt)}</td><td className="td text-right"><div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setSelected(batch.id)}>View</Button><Button variant="ghost" title="Download CSV" onClick={() => void downloadSettlementCsv(batch.id).catch((error) => toast.error(errorMessage(error)))}><Download className="h-4 w-4" /></Button></div></td></tr>))}</tbody></table></div>
        )}
        {batches.data?.pagination ? <Pagination page={batches.data.pagination.currentPage} totalPages={batches.data.pagination.totalPages} total={batches.data.pagination.total} onChange={setPage} /> : null}
      </Card>

      {selected ? (
        <Card className="mt-4 overflow-hidden"><div className="flex items-center justify-between border-b border-ink-100 px-5 py-3"><h2 className="text-sm font-semibold text-ink-900">Batch {selected.slice(0, 10)}</h2><Button variant="ghost" onClick={() => setSelected(null)}>Close</Button></div>{detail.isPending ? <Spinner /> : detail.isError ? <ErrorState message={errorMessage(detail.error)} onRetry={() => void detail.refetch()} /> : (detail.data?.orders?.length ?? 0) === 0 ? <EmptyState title="No orders in this batch" /> : <div className="overflow-x-auto"><table className="min-w-full"><thead className="bg-ink-50"><tr><th className="th">Order</th><th className="th">Customer</th><th className="th">Total</th><th className="th">Fee</th><th className="th">Net</th><th className="th">Settled</th></tr></thead><tbody className="divide-y divide-ink-100">{detail.data?.orders?.map((order) => (<tr key={order.id}><td className="td">#{order.id}</td><td className="td text-sm">{order.customer?.email ?? "—"}</td><td className="td">{formatMoney(order.grandTotal, "NGN")}</td><td className="td">{formatMoney(order.platformFee, "NGN")}</td><td className="td">{formatMoney(order.netAmount, "NGN")}</td><td className="td">{order.settled ? "Yes" : "No"}</td></tr>))}</tbody></table></div>}</Card>
      ) : null}
    </div>
  );
};