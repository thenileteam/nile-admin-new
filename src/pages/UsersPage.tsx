// Platform users page showing every account with search, pagination, and role upgrade actions
import { useQuery } from "@tanstack/react-query";
import { UserCheck } from "lucide-react";
import { useState } from "react";
import { errorMessage } from "@/api/client";
import { fetchPlatformUsers, type PlatformUser } from "@/api/ops";
import { useAuth } from "@/auth/store";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  Pagination,
  statusTone,
  TableSkeleton,
} from "@/components/ui";
import { formatDate } from "@/lib/format";
import { RoleModal } from "./users/RoleModal";

export const UsersPage = () => {
  const currentUser = useAuth((state) => state.user);
  const isSuperAdmin = currentUser?.role === "SUPERADMIN";

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleModalUser, setRoleModalUser] = useState<PlatformUser | null>(null);

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
          <TableSkeleton rows={8} cols={5} />
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
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {users.map((user) => {
                  const isAdmin = user.role?.includes("ADMIN");
                  return (
                    <tr key={user.id ?? user._id ?? user.email}>
                      <td className="td">
                        <p className="font-medium text-ink-900">
                          {[user.firstName, user.lastName].filter(Boolean).join(" ") || "—"}
                        </p>
                        <p className="text-xs text-ink-400">{user.email}</p>
                      </td>
                      <td className="td">
                        <Badge tone={isAdmin ? "brand" : "neutral"}>{user.role}</Badge>
                      </td>
                      <td className="td">
                        <Badge tone={statusTone(user.active === false ? "SUSPENDED" : "ACTIVE")}>
                          {user.active === false ? "Inactive" : "Active"}
                        </Badge>
                      </td>
                      <td className="td text-sm text-ink-600">{formatDate(user.createdAt)}</td>
                      <td className="td text-right">
                        {isSuperAdmin ? (
                          <Button
                            variant="secondary"
                            onClick={() => setRoleModalUser(user)}
                            className="text-xs"
                          >
                            <UserCheck className="mr-1 h-3.5 w-3.5" />
                            {isAdmin ? "Change role" : "Upgrade"}
                          </Button>
                        ) : (
                          <span className="text-xs text-ink-400">Read-only</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
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

      {/* Role update / upgrade modal */}
      {roleModalUser ? (
        <RoleModal user={roleModalUser} onClose={() => setRoleModalUser(null)} />
      ) : null}
    </div>
  );
};
