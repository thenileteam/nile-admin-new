import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { errorMessage } from "@/api/client";
import { fetchAdminOrders, orderRef } from "@/api/ops";
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  Pagination,
  Select,
  Spinner,
  statusTone,
} from "@/components/ui";
import { formatDateTime, formatMoney, formatNumber } from "@/lib/format";

const STATUSES = ["", "PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "COMPLETED", "CANCELLED", "REFUNDED"];

export const Orders = () => {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  const query = useQuery({
    queryKey: ["orders", page, status, search],
    queryFn: () =>
      fetchAdminOrders({
        page,
        limit: 25,
        status: status || undefined,
        search: search.trim() || undefined,
      }),
  });

  return (
    <div>
      <PageHeader title="Orders" description="Every order across the platform, newest first." />

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-ink-100 px-4 py-3">
          <input
            className="input max-w-xs"
            placeholder="Order number or customer"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          <Select
            className="w-44"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            {STATUSES.map((option) => (
              <option key={option} value={option}>
                {option ? option.replaceAll("_", " ") : "Any status"}
              </option>
            ))}
          </Select>
          <span className="ml-auto text-xs text-ink-400">
            {formatNumber(query.data?.pagination?.total)} orders
          </span>
        </div>

        {query.isPending ? (
          <Spinner />
        ) : query.isError ? (
          <ErrorState message={errorMessage(query.error)} onRetry={() => void query.refetch()} />
        ) : (query.data?.orders.length ?? 0) === 0 ? (
          <EmptyState title="No orders matched" />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-ink-50">
                <tr>
                  <th className="th">Order</th>
                  <th className="th">Store</th>
                  <th className="th">Customer</th>
                  <th className="th">Total</th>
                  <th className="th">Payment</th>
                  <th className="th">Status</th>
                  <th className="th">Placed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {query.data?.orders.map((order) => (
                  <tr key={order.uuid ?? String(order.id)}>
                    <td className="td font-medium text-ink-900">
                      #{orderRef(order, 6)}
                    </td>
                    <td className="td font-mono text-xs text-ink-600">{order.storeId.slice(0, 10)}</td>
                    <td className="td text-sm">
                      {[order.customer?.firstName, order.customer?.lastName].filter(Boolean).join(" ") ||
                        order.customer?.email ||
                        "Guest"}
                    </td>
                    <td className="td">{formatMoney(order.grandTotal, order.currency ?? "NGN")}</td>
                    <td className="td">
                      <Badge tone={statusTone(order.paymentStatus)}>
                        {(order.paymentStatus ?? "").replaceAll("_", " ")}
                      </Badge>
                    </td>
                    <td className="td">
                      <Badge tone={statusTone(order.status)}>{(order.status ?? "").replaceAll("_", " ")}</Badge>
                    </td>
                    <td className="td text-sm text-ink-600">{formatDateTime(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {query.data?.pagination ? (
          <Pagination
            page={query.data.pagination.currentPage}
            totalPages={query.data.pagination.totalPages}
            total={query.data.pagination.total}
            onChange={setPage}
          />
        ) : null}
      </Card>
    </div>
  );
};
