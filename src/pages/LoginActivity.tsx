import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { listAuthEvents, listSessions, revokeSession } from "@/api/admins";
import { errorMessage } from "@/api/client";
import { useAuth } from "@/auth/store";
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, Pagination, Select, Spinner, statusTone } from "@/components/ui";
import { formatDateTime, formatRelative } from "@/lib/format";

const EVENT_TYPES = ["", "LOGIN_SUCCESS", "LOGIN_FAILED", "REFRESH", "LOGOUT", "SESSION_REVOKED"];

export const LoginActivity = () => {
  const user = useAuth((state) => state.user);
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [type, setType] = useState("");
  const [eventsPage, setEventsPage] = useState(1);
  const [sessionsPage, setSessionsPage] = useState(1);

  const events = useQuery({
    queryKey: ["auth-events", email, type, eventsPage],
    queryFn: () => listAuthEvents({ email: email.trim() || undefined, type: type || undefined, page: eventsPage, limit: 25 }),
  });
  const sessions = useQuery({
    queryKey: ["sessions", "all", sessionsPage],
    queryFn: () => listSessions([], [], "all", { page: sessionsPage, limit: 25 }),
  });

  const revoke = useMutation({
    mutationFn: revokeSession,
    onSuccess: () => {
      toast.success("Session signed out");
      void queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <div>
      <PageHeader title="Login activity" description="Every sign-in attempt and every active session, readable by platform admins." />

      <Card className="mb-4 p-4">
        <div className="flex flex-wrap gap-3">
          <input className="input max-w-xs" placeholder="Filter by account email" value={email} onChange={(event) => { setEmail(event.target.value); setEventsPage(1); }} />
          <Select className="w-48" value={type} onChange={(event) => { setType(event.target.value); setEventsPage(1); }}>
            {EVENT_TYPES.map((option) => <option key={option} value={option}>{option ? option.replaceAll("_", " ") : "Any event"}</option>)}
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-ink-100 px-5 py-3"><h2 className="text-sm font-semibold text-ink-900">Auth events</h2><p className="text-xs text-ink-400">Successful and failed logins, refreshes, sign-outs and admin revocations.</p></div>
        {events.isPending ? <Spinner /> : events.isError ? <ErrorState message={errorMessage(events.error)} onRetry={() => void events.refetch()} /> : (events.data?.events.length ?? 0) === 0 ? <EmptyState title="No auth events" description="Events appear as accounts sign in." /> : (
          <div className="overflow-x-auto"><table className="min-w-full"><thead className="bg-ink-50"><tr><th className="th">Type</th><th className="th">Account</th><th className="th">Role</th><th className="th">IP</th><th className="th">Reason</th><th className="th">When</th></tr></thead><tbody className="divide-y divide-ink-100">{events.data?.events.map((event) => (<tr key={event.id}><td className="td"><Badge tone={event.type === "LOGIN_SUCCESS" ? "success" : event.type === "LOGIN_FAILED" ? "danger" : "neutral"}>{event.type.replaceAll("_", " ")}</Badge></td><td className="td text-sm">{event.email ?? event.userId ?? "—"}</td><td className="td text-sm">{event.role ?? "—"}</td><td className="td font-mono text-xs">{event.ip ?? "—"}</td><td className="td text-sm">{event.reason ?? "—"}</td><td className="td" title={formatDateTime(event.createdAt)}>{formatRelative(event.createdAt)}</td></tr>))}</tbody></table></div>
        )}
        {events.data?.pagination ? <Pagination page={events.data.pagination.currentPage} totalPages={events.data.pagination.totalPages} total={events.data.pagination.total} onChange={setEventsPage} /> : null}
      </Card>

      <Card className="mt-4 overflow-hidden">
        <div className="border-b border-ink-100 px-5 py-3"><h2 className="text-sm font-semibold text-ink-900">Active sessions</h2><p className="text-xs text-ink-400">Revoke a session to invalidate its refresh token server-side.</p></div>
        {sessions.isPending ? <Spinner /> : sessions.isError ? <ErrorState message={errorMessage(sessions.error)} onRetry={() => void sessions.refetch()} /> : (sessions.data?.sessions.length ?? 0) === 0 ? <EmptyState title="No sessions recorded" /> : (
          <div className="overflow-x-auto"><table className="min-w-full"><thead className="bg-ink-50"><tr><th className="th">Account</th><th className="th">Device</th><th className="th">IP</th><th className="th">Last seen</th><th className="th">Status</th><th className="th text-right">Action</th></tr></thead><tbody className="divide-y divide-ink-100">{sessions.data?.sessions.map((session) => { const canRevoke = user?.role === "SUPERADMIN" || session.userId === user?.id; return (<tr key={session.id}><td className="td font-mono text-xs">{session.userId}</td><td className="td"><p className="text-sm">{session.device}</p><p className="max-w-xs truncate text-xs text-ink-400">{session.userAgent ?? "—"}</p></td><td className="td font-mono text-xs">{session.ip ?? "—"}</td><td className="td" title={formatDateTime(session.lastSeenAt)}>{session.lastSeenAt ? formatRelative(session.lastSeenAt) : "—"}</td><td className="td"><Badge tone={statusTone(session.status === "active" ? "ACTIVE" : session.status)}>{session.status}</Badge></td><td className="td text-right"><Button variant="danger" disabled={!canRevoke || session.status !== "active" || revoke.isPending} title={canRevoke ? undefined : "Only a SUPERADMIN can revoke another account's session"} onClick={() => revoke.mutate(session.id)}>Revoke</Button></td></tr>); })}</tbody></table></div>
        )}
        {sessions.data?.pagination ? <Pagination page={sessions.data.pagination.currentPage} totalPages={sessions.data.pagination.totalPages} total={sessions.data.pagination.total} onChange={setSessionsPage} /> : null}
      </Card>
    </div>
  );
};