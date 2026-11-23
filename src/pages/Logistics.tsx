import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { errorMessage } from "@/api/client";
import {
  fetchShipbubbleBalance,
  fetchShipbubbleWallets,
  fetchShipments,
  fetchWebhookLogs,
  syncCouriers,
} from "@/api/ops";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  Pagination,
  Select,
  Spinner,
  StatCard,
  statusTone,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatDateTime, formatMoney } from "@/lib/format";

const TABS = [
  { id: "shipments", label: "Shipments" },
  { id: "webhooks", label: "Webhook logs" },
  { id: "wallets", label: "Shipbubble wallets" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export const Logistics = () => {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabId>("shipments");
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");

  const shipments = useQuery({
    queryKey: ["logistics", "shipments", page, status],
    queryFn: () => fetchShipments({ page, limit: 25, status: status || undefined }),
    enabled: tab === "shipments",
  });
  const webhooks = useQuery({
    queryKey: ["logistics", "webhooks", page],
    queryFn: () => fetchWebhookLogs({ page, limit: 25 }),
    enabled: tab === "webhooks",
  });
  const wallets = useQuery({
    queryKey: ["logistics", "wallets"],
    queryFn: fetchShipbubbleWallets,
    enabled: tab === "wallets",
  });
  const balance = useQuery({ queryKey: ["logistics", "balance"], queryFn: fetchShipbubbleBalance });

  const sync = useMutation({
    mutationFn: syncCouriers,
    onSuccess: () => {
      toast.success("Courier sync triggered");
      void queryClient.invalidateQueries({ queryKey: ["logistics"] });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const balanceValue =
    (balance.data?.balance as number | undefined) ??
    (balance.data?.availableBalance as number | undefined) ??
    null;

  return (
    <div>
      <PageHeader
        title="Logistics"
        description="Shipments, carrier webhooks and the shipping wallet."
        actions={
          <Button variant="secondary" loading={sync.isPending} onClick={() => sync.mutate()}>
            <RefreshCw className="h-4 w-4" /> Sync couriers
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Shipbubble balance" value={balanceValue === null ? "—" : formatMoney(balanceValue)} />
        <StatCard label="Wallet accounts" value={wallets.data?.length ?? "—"} />
      </div>

      <div className="mt-4 flex gap-1.5">
        {TABS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => {
              setTab(option.id);
              setPage(1);
            }}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition",
              tab === option.id ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-600 hover:bg-brand-50 hover:text-brand-700",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <Card className="mt-3 overflow-hidden">
        {tab === "shipments" ? (
          <>
            <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-4 py-3">
              <Select
                className="w-44"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">Any status</option>
                <option value="PENDING">Pending</option>
                <option value="IN_TRANSIT">In transit</option>
                <option value="DELIVERED">Delivered</option>
                <option value="FAILED">Failed</option>
              </Select>
              <span className="text-xs text-ink-400">{shipments.data?.pagination?.total ?? 0} shipments</span>
            </div>
            {shipments.isPending ? (
              <Spinner />
            ) : shipments.isError ? (
              <ErrorState message={errorMessage(shipments.error)} onRetry={() => void shipments.refetch()} />
            ) : (shipments.data?.shipments.length ?? 0) === 0 ? (
              <EmptyState title="No shipments found" />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-ink-50">
                    <tr>
                      <th className="th">Reference</th>
                      <th className="th">Courier</th>
                      <th className="th">Store</th>
                      <th className="th">Status</th>
                      <th className="th">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {shipments.data?.shipments.map((shipment, index) => {
                      const row = shipment as Record<string, unknown>;
                      return (
                        <tr key={String(row.id ?? row.uuid ?? index)}>
                          <td className="td font-mono text-xs">
                            {String(row.trackingNumber ?? row.reference ?? row.id ?? "—")}
                          </td>
                          <td className="td text-sm">{String(row.courierName ?? row.courier ?? "—")}</td>
                          <td className="td font-mono text-xs">{String(row.storeId ?? "—").slice(0, 10)}</td>
                          <td className="td">
                            <Badge tone={statusTone(String(row.status ?? ""))}>
                              {String(row.status ?? "—").replaceAll("_", " ")}
                            </Badge>
                          </td>
                          <td className="td text-sm text-ink-600">
                            {formatDateTime(String(row.createdAt ?? ""))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {shipments.data?.pagination ? (
              <Pagination
                page={shipments.data.pagination.currentPage}
                totalPages={shipments.data.pagination.totalPages}
                total={shipments.data.pagination.total}
                onChange={setPage}
              />
            ) : null}
          </>
        ) : null}

        {tab === "webhooks" ? (
          <>
            {webhooks.isPending ? (
              <Spinner />
            ) : webhooks.isError ? (
              <ErrorState message={errorMessage(webhooks.error)} onRetry={() => void webhooks.refetch()} />
            ) : (webhooks.data?.logs.length ?? 0) === 0 ? (
              <EmptyState title="No webhook logs" />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-ink-50">
                    <tr>
                      <th className="th">Event</th>
                      <th className="th">Provider</th>
                      <th className="th">Received</th>
                      <th className="th">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {webhooks.data?.logs.map((log, index) => {
                      const row = log as Record<string, unknown>;
                      return (
                        <tr key={String(row.id ?? index)}>
                          <td className="td text-sm">{String(row.event ?? row.eventType ?? "—")}</td>
                          <td className="td text-sm">{String(row.provider ?? row.source ?? "shipbubble")}</td>
                          <td className="td text-sm text-ink-600">
                            {formatDateTime(String(row.createdAt ?? row.receivedAt ?? ""))}
                          </td>
                          <td className="td">
                            <Badge tone={row.error ? "danger" : "success"}>
                              {row.error ? "Failed" : "Processed"}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {webhooks.data?.pagination ? (
              <Pagination
                page={webhooks.data.pagination.currentPage}
                totalPages={webhooks.data.pagination.totalPages}
                total={webhooks.data.pagination.total}
                onChange={setPage}
              />
            ) : null}
          </>
        ) : null}

        {tab === "wallets" ? (
          wallets.isPending ? (
            <Spinner />
          ) : wallets.isError ? (
            <ErrorState message={errorMessage(wallets.error)} onRetry={() => void wallets.refetch()} />
          ) : (wallets.data?.length ?? 0) === 0 ? (
            <EmptyState title="No Shipbubble wallets" />
          ) : (
            <ul className="divide-y divide-ink-100">
              {wallets.data?.map((wallet, index) => {
                const row = wallet as Record<string, unknown>;
                const amount =
                  (row.balance as number | undefined) ?? (row.availableBalance as number | undefined) ?? null;
                return (
                  <li key={String(row.id ?? index)} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-ink-900">
                        {String(row.name ?? row.currency ?? "Wallet")}
                      </p>
                      <p className="font-mono text-xs text-ink-400">{String(row.id ?? "—")}</p>
                    </div>
                    <span className="text-sm text-ink-800">{amount === null ? "—" : formatMoney(amount)}</span>
                  </li>
                );
              })}
            </ul>
          )
        ) : null}
      </Card>
    </div>
  );
};
