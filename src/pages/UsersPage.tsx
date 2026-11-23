import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { errorMessage } from "@/api/client";
import { fetchPlatformUsers } from "@/api/ops";
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  Pagination,
  Spinner,
  statusTone,
} from "@/components/ui";
import { formatDate } from "@/lib/format";

export const UsersPage = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const query = useQuery({
    queryKey: ["platform-users", page, search],
    queryFn: () => fetchPlatformUsers({ page, limit: 25, search: search.trim() || undefined }),
  });

  const users = query.data?.users ?? [];

  return (
    <div>
      <PageHeader title="Users" description="Every account on the platform, across roles." />

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-4 py-3">
          <input
            className="input max-w-xs"
            placeholder="Search email or name"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          <span className="text-xs text-ink-400">{query.data?.pagination?.total ?? users.length} accounts</span>
        </div>

        {query.isPending ? (
          <Spinner />
        ) : query.isError ? (
          <ErrorState message={errorMessage(query.error)} onRetry={() => void query.refetch()} />
        ) : users.length === 0 ? (
          <EmptyState title="No accounts found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-ink-50">
                <tr>
                  <th className="th">Account</th>
                  <th className="th">Role</th>
                  <th className="th">Status</th>
                  <th className="th">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {users.map((user) => (
                  <tr key={user.id ?? user._id ?? user.email}>
                    <td className="td">
                      <p className="font-medium text-ink-900">
                        {[user.firstName, user.lastName].filter(Boolean).join(" ") || "—"}
                      </p>
                      <p className="text-xs text-ink-400">{user.email}</p>
                    </td>
                    <td className="td">
                      <Badge tone={user.role?.includes("ADMIN") ? "brand" : "neutral"}>{user.role}</Badge>
                    </td>
                    <td className="td">
                      <Badge tone={statusTone(user.active === false ? "SUSPENDED" : "ACTIVE")}>
                        {user.active === false ? "Inactive" : "Active"}
                      </Badge>
                    </td>
                    <td className="td text-sm text-ink-600">{formatDate(user.createdAt)}</td>
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
