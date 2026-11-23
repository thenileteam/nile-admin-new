import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { errorMessage } from "@/api/client";
import { searchStores } from "@/api/merchants";
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
import { formatDate } from "@/lib/format";

export const Merchants = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const query = useQuery({
    queryKey: ["merchants", page, search, status],
    queryFn: () =>
      searchStores({
        page,
        limit: 20,
        search: search.trim() || undefined,
        status: status || undefined,
      }),
  });

  const stores = query.data?.stores ?? [];
  const pagination = query.data?.pagination;

  return (
    <div>
      <PageHeader
        title="Merchants"
        description="Search any store, then open it to follow its sessions and activity."
      />

      <Card className="mb-4 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-64 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              className="input pl-9"
              placeholder="Store name, email or URL"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <Select
            className="w-40"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Any status</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {query.isPending ? (
          <Spinner />
        ) : query.isError ? (
          <ErrorState message={errorMessage(query.error)} onRetry={() => void query.refetch()} />
        ) : stores.length === 0 ? (
          <EmptyState
            title="No stores matched"
            description="Try a shorter search term, or clear the status filter."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-ink-50">
                <tr>
                  <th className="th">Store</th>
                  <th className="th">Contact</th>
                  <th className="th">Status</th>
                  <th className="th">Plan</th>
                  <th className="th">Created</th>
                  <th className="th text-right">Follow</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {stores.map((store) => (
                  <tr key={store.id} className="hover:bg-ink-50/60">
                    <td className="td">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-ink-100 text-xs font-semibold text-ink-600">
                          {store.logo ? (
                            <img src={store.logo} alt="" className="h-full w-full object-cover" />
                          ) : (
                            store.name.slice(0, 2).toUpperCase()
                          )}
                        </span>
                        <div>
                          <p className="font-medium text-ink-900">{store.name}</p>
                          <p className="text-xs text-ink-400">{store.storeUrl}</p>
                        </div>
                      </div>
                    </td>
                    <td className="td text-sm">{store.email ?? "—"}</td>
                    <td className="td">
                      <div className="flex flex-wrap gap-1">
                        <Badge tone={statusTone(store.status)}>{store.status}</Badge>
                        <Badge tone={statusTone(store.storeApproval)}>{store.storeApproval}</Badge>
                      </div>
                    </td>
                    <td className="td text-sm">
                      {store.subscriptions?.[0]?.plan?.name ?? "—"}
                      {store.subscriptions?.[0]?.status ? (
                        <span className="ml-1 text-xs text-ink-400">({store.subscriptions[0].status})</span>
                      ) : null}
                    </td>
                    <td className="td text-sm text-ink-600">{formatDate(store.createdAt)}</td>
                    <td className="td text-right">
                      <Link to={`/merchants/${store.id}`} className="btn-secondary">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination ? (
          <Pagination
            page={pagination.currentPage}
            totalPages={pagination.totalPages}
            total={pagination.total ?? pagination.totalStores}
            onChange={setPage}
          />
        ) : null}
      </Card>
    </div>
  );
};
