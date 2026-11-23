import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { listAuthEvents, listSessions, revokeSession } from "@/api/admins";
import { errorMessage } from "@/api/client";
import { fetchStoreActivity, fetchStoreFollow } from "@/api/merchants";
import { fetchAdminOrders, orderRef } from "@/api/ops";
import { fetchAdminPayments } from "@/api/payments";
import { approveSettlementBatch, fetchSettlementBatches } from "@/api/settlements";
import { useAuth } from "@/auth/store";
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, Spinner, StatCard, statusTone } from "@/components/ui";
import { ACTIVITY_FILTERS, ACTIVITY_META, groupActivityByDay, type ActivityType } from "@/lib/activity";
import { cn } from "@/lib/cn";
import { formatDate, formatDateTime, formatMoney, formatRelative } from "@/lib/format";

const TABS = ["Overview", "Orders", "Payments", "Settlements", "Sessions", "Login events", "Activity", "Staff"] as const;
type Tab = (typeof TABS)[number];

export const StoreFollow = () => {
  const { storeId = "" } = useParams();
  const queryClient = useQueryClient();
  const user = useAuth((state) => state.user);
  const isSuperAdmin = user?.role === "SUPERADMIN";
  const [tab, setTab] = useState<Tab>("Overview");
  const [filter, setFilter] = useState<ActivityType | "all">("all");
  const [page, setPage] = useState(1);
  const [sessionsPage, setSessionsPage] = useState(1);
  const [eventsPage, setEventsPage] = useState(1);

  const follow = useQuery({
    queryKey: ["store-follow", storeId],
    queryFn: () => fetchStoreFollow(storeId),
    enabled: Boolean(storeId),
  });

  const staffEmails = (follow.data?.staff ?? []).map((member) => member.email).filter(Boolean);
  const sessions = useQuery({
    queryKey: ["sessions", "store", storeId, follow.data?.ownerId, staffEmails.join(","), sessionsPage],
    queryFn: () => listSessions([follow.data?.ownerId as string], staffEmails, undefined, { page: sessionsPage, limit: 25 }),
    enabled: Boolean(follow.data?.ownerId) && (tab === "Sessions" || tab === "Overview"),
  });

  const orders = useQuery({
    queryKey: ["merchant-orders", storeId, page],
    queryFn: () => fetchAdminOrders({ storeId, page, limit: 25 }),
    enabled: tab === "Orders",
  });

  const payments = useQuery({
    queryKey: ["merchant-payments", storeId, page],
    queryFn: () => fetchAdminPayments({ storeId, page, limit: 25 }),
    enabled: tab === "Payments",
  });

  const settlements = useQuery({
    queryKey: ["merchant-settlements", storeId, page],
    queryFn: () => fetchSettlementBatches({ storeId, page, limit: 25 }),
    enabled: tab === "Settlements",
  });

  const events = useQuery({
    queryKey: ["merchant-events", storeId, follow.data?.ownerId, eventsPage],
    queryFn: () => listAuthEvents({ userId: follow.data?.ownerId, page: eventsPage, limit: 25 }),
    enabled: tab === "Login events" && Boolean(follow.data?.ownerId),
  });

  const activity = useInfiniteQuery({
    queryKey: ["store-activity", storeId, filter],
    queryFn: ({ pageParam }) =>
      fetchStoreActivity(storeId, {
        type: filter === "all" ? undefined : filter,
        cursor: pageParam,
        limit: 25,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: Boolean(storeId) && tab === "Activity",
  });

  const revoke = useMutation({
    mutationFn: revokeSession,
    onSuccess: () => {
      toast.success("Session signed out");
      void queryClient.invalidateQueries({ queryKey: ["sessions", "store", storeId] });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const approve = useMutation({
    mutationFn: (batchId: string) => approveSettlementBatch(batchId, user?.email ?? user?.id ?? "admin"),
    onSuccess: () => {
      toast.success("Settlement batch approved");
      void queryClient.invalidateQueries({ queryKey: ["merchant-settlements", storeId] });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  if (follow.isPending) return <Spinner label="Loading store…" />;
  if (follow.isError) return <Card><ErrorState message={errorMessage(follow.error)} onRetry={() => void follow.refetch()} /></Card>;
  const data = follow.data;
  if (!data) return <Card><EmptyState title="Store not found" description="The store may have been deleted." /></Card>;

  const items = activity.data?.pages.flatMap((p) => p.items) ?? [];
  const groups = groupActivityByDay(items);
  const ownerSession = sessions.data?.sessions.find((session) => session.userId === data.ownerId);

  return (
    <div>
      <Link to="/merchants" className="mb-4 inline-flex items-center gap-1 text-sm text-ink-600 hover:text-ink-900">
        <ArrowLeft className="h-4 w-4" /> Back to merchants
      </Link>
      <PageHeader
        title={data.store.name}
        description={`${data.store.storeUrl} · ${data.store.category ?? "No category"} · ${data.store.country ?? "Unknown country"}`}
        actions={<><Badge tone={statusTone(data.store.status)}>{data.store.status}</Badge><Badge tone={statusTone(data.store.approval)}>{data.store.approval}</Badge><Button variant="secondary" onClick={() => void follow.refetch()}><RefreshCw className="h-4 w-4" /> Refresh</Button></>}
      />

      <div className="mb-4 flex flex-wrap gap-1 rounded-xl border border-ink-100 bg-white p-1">
        {TABS.map((name) => (
          <button key={name} type="button" onClick={() => { setTab(name); setPage(1); }} className={cn("rounded-lg px-3 py-1.5 text-xs font-medium", tab === name ? "bg-brand-600 text-white" : "text-ink-600 hover:bg-brand-50 hover:text-brand-700")}>{name}</button>
        ))}
      </div>

      {tab === "Overview" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard label="Orders" value={data.counts.orders} hint="Live count" />
            <StatCard label="Products" value={data.counts.products} hint="Catalogue" />
            <StatCard label="Design pages" value={data.counts.designs} />
            <StatCard label="Support tickets" value={data.counts.tickets} />
            <StatCard label="Staff" value={data.counts.staff} />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <Card className="p-5"><h2 className="text-sm font-semibold text-ink-900">Store</h2><dl className="mt-3 space-y-2 text-sm"><div className="flex justify-between gap-3"><dt className="text-ink-400">Email</dt><dd className="text-right text-ink-800">{data.store.email ?? "—"}</dd></div><div className="flex justify-between gap-3"><dt className="text-ink-400">Currency</dt><dd className="text-ink-800">{data.store.currency ?? "—"}</dd></div><div className="flex justify-between gap-3"><dt className="text-ink-400">Created</dt><dd className="text-ink-800">{formatDate(data.store.createdAt)}</dd></div><div className="flex justify-between gap-3"><dt className="text-ink-400">Owner id</dt><dd className="truncate font-mono text-xs text-ink-600">{data.ownerId}</dd></div></dl></Card>
            <Card className="p-5"><h2 className="text-sm font-semibold text-ink-900">Plan</h2>{data.subscription ? <dl className="mt-3 space-y-2 text-sm"><div className="flex justify-between gap-3"><dt className="text-ink-400">Plan</dt><dd>{data.subscription.planName}</dd></div><div className="flex justify-between gap-3"><dt className="text-ink-400">Status</dt><dd><Badge tone={statusTone(data.subscription.status)}>{data.subscription.status}</Badge></dd></div><div className="flex justify-between gap-3"><dt className="text-ink-400">Amount</dt><dd>{formatMoney(data.subscription.amount, data.store.currency ?? "NGN")}</dd></div><div className="flex justify-between gap-3"><dt className="text-ink-400">Renews</dt><dd>{formatDate(data.subscription.endDate)}</dd></div></dl> : <p className="mt-3 text-sm text-ink-600">No subscription on record.</p>}</Card>
            <Card className="p-5"><h2 className="text-sm font-semibold text-ink-900">Last login</h2><div className="mt-3 space-y-2 text-sm"><p>{ownerSession ? formatDateTime(ownerSession.createdAt) : "No session recorded"}</p><p className="text-xs text-ink-400">{ownerSession ? `${ownerSession.device} · ${ownerSession.ip ?? "unknown IP"}` : "Never signed in"}</p><p className="text-xs text-ink-400">{ownerSession ? `Last seen ${formatRelative(ownerSession.lastSeenAt ?? ownerSession.createdAt)}` : ""}</p></div></Card>
          </div>
        </>
      ) : null}

      {tab === "Orders" ? (
        <Card className="overflow-hidden">
          <TabHeading title="Orders" hint="Newest first" />
          {orders.isPending ? <Spinner /> : orders.isError ? <ErrorState message={errorMessage(orders.error)} onRetry={() => void orders.refetch()} /> : (orders.data?.orders.length ?? 0) === 0 ? <EmptyState title="No orders" description="This store has no orders yet." /> : (
            <div className="overflow-x-auto"><table className="min-w-full"><thead className="bg-ink-50"><tr><th className="th">Order</th><th className="th">Customer</th><th className="th">Total</th><th className="th">Payment</th><th className="th">Status</th><th className="th">Placed</th></tr></thead><tbody className="divide-y divide-ink-100">{orders.data?.orders.map((order) => (<tr key={order.uuid ?? String(order.id)}><td className="td font-medium">#{orderRef(order)}</td><td className="td text-sm">{order.customer?.email ?? "Guest"}</td><td className="td">{formatMoney(order.grandTotal, order.currency ?? "NGN")}</td><td className="td"><Badge tone={statusTone(order.paymentStatus)}>{order.paymentStatus.replaceAll("_", " ")}</Badge></td><td className="td"><Badge tone={statusTone(order.status)}>{order.status.replaceAll("_", " ")}</Badge></td><td className="td text-sm">{formatDateTime(order.createdAt)}</td></tr>))}</tbody></table></div>
          )}
          <Pager page={page} data={orders.data?.pagination} onChange={setPage} total={orders.data?.pagination?.total} />
        </Card>
      ) : null}

      {tab === "Payments" ? (
        <Card className="overflow-hidden">
          <TabHeading title="Payments" hint="Reference, provider and settlement context" />
          {payments.isPending ? <Spinner /> : payments.isError ? <ErrorState message={errorMessage(payments.error)} onRetry={() => void payments.refetch()} /> : (payments.data?.payments.length ?? 0) === 0 ? <EmptyState title="No payments" description="No payment has been recorded for this store." /> : (
            <div className="overflow-x-auto"><table className="min-w-full"><thead className="bg-ink-50"><tr><th className="th">Reference</th><th className="th">Order</th><th className="th">Provider</th><th className="th">Status</th><th className="th">Amount</th><th className="th">Created</th></tr></thead><tbody className="divide-y divide-ink-100">{payments.data?.payments.map((payment) => (<tr key={payment.id}><td className="td font-mono text-xs">{payment.reference ?? payment.transactionId ?? payment.id.slice(0, 8)}</td><td className="td">#{payment.orderId}</td><td className="td text-sm">{payment.provider ?? payment.method}</td><td className="td"><Badge tone={statusTone(payment.status)}>{payment.status}</Badge></td><td className="td">{formatMoney(payment.order.grandTotal, payment.order.currency)}</td><td className="td text-sm">{formatDateTime(payment.order.createdAt)}</td></tr>))}</tbody></table></div>
          )}
          <Pager page={page} data={payments.data?.pagination} onChange={setPage} total={payments.data?.pagination?.total} />
        </Card>
      ) : null}

      {tab === "Settlements" ? (
        <Card className="overflow-hidden">
          <TabHeading title="Settlements" hint="Approve a pending batch to complete it" />
          {settlements.isPending ? <Spinner /> : settlements.isError ? <ErrorState message={errorMessage(settlements.error)} onRetry={() => void settlements.refetch()} /> : (settlements.data?.batches.length ?? 0) === 0 ? <EmptyState title="No settlement batches" description="Batches appear after paid orders are grouped." /> : (
            <div className="overflow-x-auto"><table className="min-w-full"><thead className="bg-ink-50"><tr><th className="th">Batch</th><th className="th">Status</th><th className="th">Paid out</th><th className="th">Fee</th><th className="th">Created</th><th className="th text-right">Action</th></tr></thead><tbody className="divide-y divide-ink-100">{settlements.data?.batches.map((batch) => (<tr key={batch.id}><td className="td font-mono text-xs">{batch.id.slice(0, 10)}</td><td className="td"><Badge tone={statusTone(batch.status)}>{batch.status}</Badge></td><td className="td">{formatMoney(batch.totalPaidOut, "NGN")}</td><td className="td">{formatMoney(batch.feeCollected, "NGN")}</td><td className="td text-sm">{formatDateTime(batch.createdAt)}</td><td className="td text-right">{batch.status === "PENDING" ? <Button variant="secondary" loading={approve.isPending} onClick={() => { if (window.confirm(`Approve settlement ${batch.id.slice(0, 8)}? This marks the batch completed.`)) approve.mutate(batch.id); }}>Approve</Button> : <span className="text-xs text-ink-400">—</span>}</td></tr>))}</tbody></table></div>
          )}
          <Pager page={page} data={settlements.data?.pagination} onChange={setPage} total={settlements.data?.pagination?.total} />
        </Card>
      ) : null}

      {tab === "Sessions" ? (
        <Card className="overflow-hidden">
          <TabHeading title="Sessions" hint="Owner and staff accounts, matched by email" />
          {sessions.isPending ? <Spinner /> : sessions.isError ? <ErrorState message={errorMessage(sessions.error)} onRetry={() => void sessions.refetch()} /> : (sessions.data?.sessions.length ?? 0) === 0 ? <EmptyState title="No sessions recorded" description="This merchant has not signed in since sessions were tracked." /> : (
            <div className="overflow-x-auto"><table className="min-w-full"><thead className="bg-ink-50"><tr><th className="th">Device</th><th className="th">IP</th><th className="th">Started</th><th className="th">Last seen</th><th className="th">Status</th><th className="th text-right">Action</th></tr></thead><tbody className="divide-y divide-ink-100">{sessions.data?.sessions.map((session) => (<tr key={session.id}><td className="td"><p className="font-medium">{session.device}</p><p className="text-xs text-ink-400">{session.userId === data.ownerId ? "Owner" : "Staff"}</p></td><td className="td font-mono text-xs">{session.ip ?? "—"}</td><td className="td">{formatRelative(session.createdAt)}</td><td className="td">{session.lastSeenAt ? formatRelative(session.lastSeenAt) : "—"}</td><td className="td"><Badge tone={statusTone(session.status === "active" ? "ACTIVE" : session.status)}>{session.status}</Badge></td><td className="td text-right"><Button variant="danger" disabled={!isSuperAdmin || session.status !== "active" || revoke.isPending} title={isSuperAdmin ? undefined : "Only a SUPERADMIN can sign out a merchant session"} onClick={() => revoke.mutate(session.id)}>Revoke</Button></td></tr>))}</tbody></table></div>
          )}
          <Pager page={sessionsPage} data={sessions.data?.pagination} onChange={setSessionsPage} total={sessions.data?.pagination?.total} />
        </Card>
      ) : null}

      {tab === "Login events" ? (
        <Card className="overflow-hidden">
          <TabHeading title="Login events" hint="Durable auth audit for the owner account" />
          {events.isPending ? <Spinner /> : events.isError ? <ErrorState message={errorMessage(events.error)} onRetry={() => void events.refetch()} /> : (events.data?.events.length ?? 0) === 0 ? <EmptyState title="No login events" description="Successful and failed sign-ins will appear here." /> : (
            <div className="overflow-x-auto"><table className="min-w-full"><thead className="bg-ink-50"><tr><th className="th">Type</th><th className="th">Account</th><th className="th">IP</th><th className="th">Reason</th><th className="th">When</th></tr></thead><tbody className="divide-y divide-ink-100">{events.data?.events.map((event) => (<tr key={event.id}><td className="td"><Badge tone={event.type === "LOGIN_SUCCESS" ? "success" : event.type === "LOGIN_FAILED" ? "danger" : "neutral"}>{event.type.replaceAll("_", " ")}</Badge></td><td className="td text-sm">{event.email ?? event.userId ?? "—"}</td><td className="td font-mono text-xs">{event.ip ?? "—"}</td><td className="td text-sm">{event.reason ?? "—"}</td><td className="td">{formatDateTime(event.createdAt)}</td></tr>))}</tbody></table></div>
          )}
          <Pager page={eventsPage} data={events.data?.pagination} onChange={setEventsPage} total={events.data?.pagination?.total} />
        </Card>
      ) : null}

      {tab === "Activity" ? (
        <Card className="overflow-hidden">
          <div className="border-b border-ink-100 px-5 py-3"><h2 className="text-sm font-semibold text-ink-900">Activity</h2><div className="mt-3 flex flex-wrap gap-1.5">{ACTIVITY_FILTERS.map((option) => (<button key={option.value} type="button" onClick={() => setFilter(option.value)} className={cn("rounded-full px-2.5 py-1 text-xs font-medium", filter === option.value ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-600 hover:bg-brand-50 hover:text-brand-700")}>{option.label}</button>))}</div></div>
          {activity.isPending ? <Spinner /> : activity.isError ? <ErrorState message={errorMessage(activity.error)} onRetry={() => void activity.refetch()} /> : groups.length === 0 ? <EmptyState title="Nothing recorded yet" description="Activity appears as the merchant works." /> : (
            <div className="px-5 py-4">{groups.map((group) => (<div key={group.day} className="mb-5"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">{group.label}</p><ol className="space-y-3 border-l border-ink-200 pl-4">{group.items.map((item) => { const meta = ACTIVITY_META[item.type] ?? ACTIVITY_META.staff; return (<li key={item.id} className="relative"><span className={cn("absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-white", meta.dot)} /><div className="flex flex-wrap items-baseline justify-between gap-2"><p className="text-sm font-medium text-ink-900">{item.title}</p><span className="text-xs text-ink-400">{formatRelative(item.at)}</span></div><p className="text-xs text-ink-500"><span className={cn("chip mr-2", meta.className)}>{meta.label}</span>{item.detail}</p></li>); })}</ol></div>))}{activity.hasNextPage ? <Button variant="secondary" loading={activity.isFetchingNextPage} onClick={() => void activity.fetchNextPage()}>Load more</Button> : null}</div>
          )}
        </Card>
      ) : null}

      {tab === "Staff" ? (
        <Card className="overflow-hidden"><TabHeading title="Staff" />{data.staff.length === 0 ? <EmptyState title="No staff accounts" /> : <ul className="divide-y divide-ink-100">{data.staff.map((member) => (<li key={member.id} className="px-5 py-3"><div className="flex items-center justify-between gap-2"><p className="text-sm font-medium">{member.name}</p><Badge tone={statusTone(member.status)}>{member.status}</Badge></div><p className="text-xs text-ink-400">{member.email}</p><p className="text-xs text-ink-400">Added {formatDate(member.createdAt)}</p></li>))}</ul>}</Card>
      ) : null}
    </div>
  );
};

const TabHeading = ({ title, hint }: { title: string; hint?: string }) => (
  <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3"><h2 className="text-sm font-semibold text-ink-900">{title}</h2>{hint ? <span className="text-xs text-ink-400">{hint}</span> : null}</div>
);

const Pager = ({ page, data, onChange, total }: { page: number; data?: { currentPage?: number; totalPages?: number } | null; onChange: (page: number) => void; total?: number }) => {
  if (!data || (data.totalPages ?? 1) <= 1) return null;
  return <div className="flex items-center justify-end gap-2 border-t border-ink-100 px-5 py-3"><span className="mr-2 text-xs text-ink-500">Page {page} of {data.totalPages}{total === undefined ? "" : ` · ${total.toLocaleString()} total`}</span><Button variant="secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</Button><Button variant="secondary" disabled={page >= (data.totalPages ?? 1)} onClick={() => onChange(page + 1)}>Next</Button></div>;
};