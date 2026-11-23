import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { listSessions, revokeSession } from "@/api/admins";
import { errorMessage } from "@/api/client";
import { useAuth } from "@/auth/store";
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, Pagination, Spinner, statusTone } from "@/components/ui";
import { describeDevice } from "@/lib/device";
import { formatDateTime, formatRelative } from "@/lib/format";

export const MySessions = () => {
  const user = useAuth((state) => state.user);
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ["sessions", "me", user?.id, page],
    queryFn: () => listSessions([user?.id as string], [], undefined, { page, limit: 25 }),
    enabled: Boolean(user?.id),
  });

  const revokeMutation = useMutation({
    mutationFn: revokeSession,
    onSuccess: () => {
      toast.success("Session signed out");
      void queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  // Refresh the "last seen" column while the page is open.
  useEffect(() => {
    const timer = setInterval(() => void query.refetch(), 60_000);
    return () => clearInterval(timer);
  }, []);

  const thisBrowser = describeDevice(navigator.userAgent);
  const sessions = query.data?.sessions ?? [];

  return (
    <div>
      <PageHeader
        title="My sessions"
        description="Every device signed in to your admin account. Revoking one signs that device out immediately."
      />

      <Card className="overflow-hidden">
        {query.isPending ? (
          <Spinner />
        ) : query.isError ? (
          <ErrorState message={errorMessage(query.error)} onRetry={() => void query.refetch()} />
        ) : sessions.length === 0 ? (
          <EmptyState title="No sessions recorded" />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-ink-50">
                <tr>
                  <th className="th">Device</th>
                  <th className="th">IP</th>
                  <th className="th">Started</th>
                  <th className="th">Last seen</th>
                  <th className="th">Status</th>
                  <th className="th text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {sessions.map((session) => {
                  const isCurrent = session.device === thisBrowser && session.status === "active";
                  return (
                    <tr key={session.id}>
                      <td className="td">
                        <p className="font-medium text-ink-900">{session.device}</p>
                        <p className="text-xs text-ink-400">
                          {isCurrent ? "This browser · " : ""}
                          {session.userAgent?.slice(0, 70) ?? "No user agent"}
                        </p>
                      </td>
                      <td className="td font-mono text-xs">{session.ip ?? "—"}</td>
                      <td className="td" title={formatDateTime(session.createdAt)}>
                        {formatRelative(session.createdAt)}
                      </td>
                      <td className="td" title={formatDateTime(session.lastSeenAt)}>
                        {session.lastSeenAt ? formatRelative(session.lastSeenAt) : "—"}
                      </td>
                      <td className="td">
                        <Badge tone={statusTone(session.status === "active" ? "ACTIVE" : session.status)}>
                          {session.status}
                        </Badge>
                      </td>
                      <td className="td text-right">
                        <Button
                          variant="danger"
                          disabled={session.status !== "active" || revokeMutation.isPending}
                          onClick={() => {
                            if (isCurrent) {
                              toast.error("Sign out from the header to end this browser's session.");
                              return;
                            }
                            revokeMutation.mutate(session.id);
                          }}
                        >
                          Revoke
                        </Button>
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

      <p className="mt-3 text-xs text-ink-400">
        Expired sessions disappear when the server's TTL index clears them. Access tokens last 3 hours; the refresh
        token lasts 10 days.
      </p>
    </div>
  );
};
