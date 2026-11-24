import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { ArrowUpRight, Check, ChevronRight, Copy, RefreshCw } from "lucide-react";
import { useEffect, useState, type KeyboardEvent, type ReactNode } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { listAuthEvents, listSessions, revokeSession } from "@/api/admins";
import { errorMessage } from "@/api/client";
import { fetchStoreActivity, fetchStoreFollow } from "@/api/merchants";
import { UpgradePlanModal } from "./merchants/UpgradePlanModal";
import { fetchAdminOrders, orderRef } from "@/api/ops";
import { fetchAdminPayments } from "@/api/payments";
import { approveSettlementBatch, fetchSettlementBatches } from "@/api/settlements";
import { useAuth } from "@/auth/store";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  TableSkeleton,
  statusTone,
  type Tone,
} from "@/components/ui";
import {
  ACTIVITY_FILTERS,
  ACTIVITY_META,
  groupActivityByDay,
  type ActivityItem,
  type ActivityType,
} from "@/lib/activity";
import { cn } from "@/lib/cn";
import {
  formatDate,
  formatDateTime,
  formatMoney,
  formatNumber,
  formatRelative,
  initials,
} from "@/lib/format";

/* -------------------------------------------------------------------------- */
/* Constants & helpers                                                        */
/* -------------------------------------------------------------------------- */

const PAGE_SIZE = 25;

const TABS = ["Overview", "Orders", "Payments", "Settlements", "Sessions", "Login events", "Activity", "Staff"] as const;
type Tab = (typeof TABS)[number];

const tabSlug = (tab: Tab) => tab.toLowerCase().replaceAll(" ", "-");
const tabFromSlug = (slug: string | null): Tab => TABS.find((tab) => tabSlug(tab) === slug) ?? "Overview";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2";

const SUPERADMIN_ONLY = "Only a SUPERADMIN can do this";

/** PARTIALLY_PAID -> "Partially paid". Raw values still drive tone lookups. */
const humanize = (value: string) => {
  const text = value.replaceAll("_", " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/** storeUrl is stored without a protocol on some stores. */
const storeHref = (storeUrl: string) => (/^https?:\/\//i.test(storeUrl) ? storeUrl : `https://${storeUrl}`);

/** How far through its paid period a subscription is. */
const planProgress = (start?: string | null, end?: string | null) => {
  if (!end) return null;
  const endDate = new Date(end);
  if (Number.isNaN(endDate.getTime())) return null;

  const now = Date.now();
  const daysLeft = Math.ceil((endDate.getTime() - now) / 86_400_000);
  const startDate = start ? new Date(start) : null;
  const span = startDate && !Number.isNaN(startDate.getTime()) ? endDate.getTime() - startDate.getTime() : 0;
  const pct =
    startDate && span > 0 ? Math.min(100, Math.max(0, ((now - startDate.getTime()) / span) * 100)) : null;

  return { daysLeft, pct };
};

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export const StoreFollow = () => {
  const { storeId = "" } = useParams();
  const queryClient = useQueryClient();
  const user = useAuth((state) => state.user);
  const isSuperAdmin = user?.role === "SUPERADMIN";

  // The active tab lives in the URL so it survives refresh, back/forward and sharing.
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = tabFromSlug(searchParams.get("tab"));
  const go = (next: Tab) =>
    setSearchParams((previous) => {
      const params = new URLSearchParams(previous);
      if (next === "Overview") params.delete("tab");
      else params.set("tab", tabSlug(next));
      return params;
    });

  const [filter, setFilter] = useState<ActivityType | "all">("all");
  const [pages, setPages] = useState<Record<string, number>>({});
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  // One page cursor per store+tab, so returning to a tab keeps your place.
  const pageFor = (name: Tab) => pages[`${storeId}:${name}`] ?? 1;
  const setPageFor = (name: Tab) => (next: number) =>
    setPages((current) => ({ ...current, [`${storeId}:${name}`]: next }));

  const follow = useQuery({
    queryKey: ["store-follow", storeId],
    queryFn: () => fetchStoreFollow(storeId),
    enabled: Boolean(storeId),
  });

  const ownerId = follow.data?.ownerId;
  const staffEmails = (follow.data?.staff ?? []).map((member) => member.email).filter(Boolean);

  const sessions = useQuery({
    queryKey: ["sessions", "store", storeId, ownerId, staffEmails.join(","), pageFor("Sessions")],
    queryFn: () =>
      listSessions([ownerId as string], staffEmails, undefined, { page: pageFor("Sessions"), limit: PAGE_SIZE }),
    enabled: Boolean(ownerId) && (tab === "Sessions" || tab === "Overview"),
    placeholderData: keepPreviousData,
  });

  const orders = useQuery({
    queryKey: ["merchant-orders", storeId, pageFor("Orders")],
    queryFn: () => fetchAdminOrders({ storeId, page: pageFor("Orders"), limit: PAGE_SIZE }),
    enabled: tab === "Orders",
    placeholderData: keepPreviousData,
  });

  const payments = useQuery({
    queryKey: ["merchant-payments", storeId, pageFor("Payments")],
    queryFn: () => fetchAdminPayments({ storeId, page: pageFor("Payments"), limit: PAGE_SIZE }),
    enabled: tab === "Payments",
    placeholderData: keepPreviousData,
  });

  const settlements = useQuery({
    queryKey: ["merchant-settlements", storeId, pageFor("Settlements")],
    queryFn: () => fetchSettlementBatches({ storeId, page: pageFor("Settlements"), limit: PAGE_SIZE }),
    enabled: tab === "Settlements",
    placeholderData: keepPreviousData,
  });

  const events = useQuery({
    queryKey: ["merchant-events", storeId, ownerId, pageFor("Login events")],
    queryFn: () => listAuthEvents({ userId: ownerId, page: pageFor("Login events"), limit: PAGE_SIZE }),
    enabled: tab === "Login events" && Boolean(ownerId),
    placeholderData: keepPreviousData,
  });

  const activity = useInfiniteQuery({
    queryKey: ["store-activity", storeId, filter],
    queryFn: ({ pageParam }) =>
      fetchStoreActivity(storeId, {
        type: filter === "all" ? undefined : filter,
        cursor: pageParam,
        limit: PAGE_SIZE,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: Boolean(storeId) && (tab === "Activity" || tab === "Overview"),
    placeholderData: keepPreviousData,
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

  const storeName = follow.data?.store.name;
  useEffect(() => {
    if (!storeName) return;
    const previous = document.title;
    document.title = `${storeName} · Nile Admin`;
    return () => {
      document.title = previous;
    };
  }, [storeName]);

  if (follow.isPending) return <PageSkeleton />;
  if (follow.isError) {
    return (
      <Card>
        <ErrorState message={errorMessage(follow.error)} onRetry={() => void follow.refetch()} />
      </Card>
    );
  }
  const data = follow.data;
  if (!data) {
    return (
      <Card>
        <EmptyState title="Store not found" description="The store may have been deleted." />
      </Card>
    );
  }

  const currency = data.store.currency ?? "NGN";
  const items = activity.data?.pages.flatMap((p) => p.items) ?? [];
  const groups = groupActivityByDay(items);
  const recent = items.slice(0, 5);
  const ownerSession = sessions.data?.sessions.find((session) => session.userId === data.ownerId);
  const subscription = data.subscription;
  const planWindow = planProgress(subscription?.startDate, subscription?.endDate);
  const planTone: Tone = !planWindow
    ? "neutral"
    : planWindow.daysLeft <= 0
      ? "danger"
      : planWindow.daysLeft <= 7
        ? "warning"
        : "success";
  const planActionLabel = subscription ? "Change plan" : "Upgrade plan";
  const tabCounts: Partial<Record<Tab, number>> = {
    Orders: data.counts.orders,
    Staff: data.counts.staff,
  };

  const openSupport = () => {
    setFilter("support");
    go("Activity");
  };

  const onTabKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = TABS.indexOf(tab);
    let next: number;
    if (event.key === "ArrowRight") next = (index + 1) % TABS.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + TABS.length) % TABS.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = TABS.length - 1;
    else return;
    event.preventDefault();
    go(TABS[next]);
    document.getElementById(`tab-${tabSlug(TABS[next])}`)?.focus();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ------------------------------ Header ------------------------------ */}
      <header className="space-y-4">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-[13px] text-ink-500">
          <Link
            to="/merchants"
            className={cn("rounded font-medium text-ink-600 transition-colors hover:text-brand-700", focusRing)}
          >
            Merchants
          </Link>
          <ChevronRight className="h-3 w-3 text-ink-300" aria-hidden />
          <span className="truncate text-ink-500">{data.store.name}</span>
        </nav>

        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div className="flex min-w-0 items-center gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-ink-200 bg-white text-sm font-semibold text-ink-600">
              {data.store.logo ? (
                <img src={data.store.logo} alt="" className="h-full w-full object-cover" />
              ) : (
                initials(data.store.name)
              )}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <h1 className="truncate text-xl font-semibold tracking-tight text-ink-900">{data.store.name}</h1>
                <Badge tone={statusTone(data.store.status)}>{humanize(data.store.status)}</Badge>
                <Badge tone={statusTone(data.store.approval)}>{humanize(data.store.approval)}</Badge>
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[13px] text-ink-500">
                <a
                  href={storeHref(data.store.storeUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className={cn("rounded text-ink-700 hover:text-brand-700 hover:underline", focusRing)}
                >
                  {data.store.storeUrl}
                </a>
                <Dot />
                <span>{data.store.category ?? "No category"}</span>
                <Dot />
                <span>{data.store.country ?? "Unknown country"}</span>
                <Dot />
                <span>Merchant since {formatDate(data.store.createdAt)}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void follow.refetch()}
              disabled={follow.isFetching}
              aria-label="Refresh"
              title="Refresh"
              className={cn("btn-secondary px-2.5", focusRing)}
            >
              <RefreshCw className={cn("h-4 w-4", follow.isFetching && "animate-spin")} aria-hidden />
            </button>
            <a href={storeHref(data.store.storeUrl)} target="_blank" rel="noreferrer" className={cn("btn-secondary", focusRing)}>
              View storefront
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </a>
            <Button
              onClick={() => setUpgradeOpen(true)}
              disabled={!isSuperAdmin}
              title={isSuperAdmin ? undefined : SUPERADMIN_ONLY}
            >
              {planActionLabel}
            </Button>
          </div>
        </div>

        <Card className="overflow-hidden">
          <div className="grid grid-cols-2 gap-px bg-ink-100 sm:grid-cols-4">
            <Metric label="Orders" value={data.counts.orders} onClick={() => go("Orders")} />
            <Metric label="Products" value={data.counts.products} />
            <Metric label="Staff" value={data.counts.staff} onClick={() => go("Staff")} />
            <Metric label="Support tickets" value={data.counts.tickets} onClick={openSupport} />
          </div>
        </Card>
      </header>

      {/* ------------------------------- Tabs ------------------------------- */}
      <div className="sticky top-0 z-20 -mx-1 bg-ink-50 px-1 pt-1">
        <div
          role="tablist"
          aria-label="Merchant sections"
          onKeyDown={onTabKeyDown}
          className="flex gap-6 overflow-x-auto border-b border-ink-200"
        >
          {TABS.map((name) => {
            const active = tab === name;
            const count = tabCounts[name];
            return (
              <button
                key={name}
                id={`tab-${tabSlug(name)}`}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls="merchant-panel"
                tabIndex={active ? 0 : -1}
                onClick={() => go(name)}
                className={cn(
                  "relative shrink-0 whitespace-nowrap pb-2.5 pt-1.5 text-sm font-medium transition-colors",
                  focusRing,
                  active ? "text-ink-900" : "text-ink-500 hover:text-ink-800",
                )}
              >
                {name}
                {count !== undefined ? (
                  <span className="ml-1.5 text-xs font-normal tabular-nums text-ink-400">{formatNumber(count)}</span>
                ) : null}
                {active ? (
                  <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-t bg-brand-600" aria-hidden />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* ------------------------------ Panels ------------------------------ */}
      <div id="merchant-panel" role="tabpanel" aria-labelledby={`tab-${tabSlug(tab)}`}>
        {tab === "Overview" ? (
          <div className="grid gap-6 xl:grid-cols-3">
            <div className="space-y-6 xl:col-span-2">
              <Panel
                title="Subscription"
                action={
                  planWindow ? (
                    <Badge tone={planTone}>
                      {planWindow.daysLeft > 0 ? `${plural(planWindow.daysLeft, "day")} left` : "Expired"}
                    </Badge>
                  ) : null
                }
              >
                {subscription ? (
                  <div className="px-5 py-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-semibold text-ink-900">
                          {subscription.planName ?? "Unnamed plan"}
                        </span>
                        <Badge tone={statusTone(subscription.status)}>{humanize(subscription.status)}</Badge>
                      </div>
                      <p className="text-sm tabular-nums text-ink-900">
                        {formatMoney(subscription.amount, currency)}
                        <span className="text-ink-500"> / period</span>
                      </p>
                    </div>

                    {planWindow?.pct != null ? (
                      <div
                        className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-ink-100"
                        role="progressbar"
                        aria-label="Plan period elapsed"
                        aria-valuenow={Math.round(planWindow.pct)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <div
                          className={cn(
                            "h-full rounded-full transition-[width] duration-500",
                            planTone === "danger" ? "bg-red-500" : planTone === "warning" ? "bg-amber-500" : "bg-brand-500",
                          )}
                          style={{ width: `${planWindow.pct}%` }}
                        />
                      </div>
                    ) : null}

                    <div className="mt-2 flex justify-between text-xs text-ink-500">
                      <span>Started {formatDate(subscription.startDate)}</span>
                      <span>Ends {formatDate(subscription.endDate)}</span>
                    </div>

                    {planWindow && planWindow.daysLeft <= 7 ? (
                      <p
                        className={cn(
                          "mt-4 rounded-md border px-3 py-2 text-xs",
                          planWindow.daysLeft <= 0
                            ? "border-red-200 bg-red-50 text-red-800"
                            : "border-amber-200 bg-amber-50 text-amber-900",
                        )}
                      >
                        {planWindow.daysLeft <= 0
                          ? "This plan period has ended. Issue a new period to bring the plan current."
                          : `Expires in ${plural(planWindow.daysLeft, "day")}. Renew or change the plan before it lapses.`}
                      </p>
                    ) : null}

                    <p className="mt-4 border-t border-ink-100 pt-3 text-xs text-ink-500">
                      {isSuperAdmin
                        ? "Plan changes apply immediately and notify the merchant by email."
                        : "Only a SUPERADMIN can change a merchant's plan."}
                    </p>
                  </div>
                ) : (
                  <div className="px-5 py-5">
                    <p className="text-sm font-medium text-ink-900">No plan on record</p>
                    <p className="mt-1 text-sm text-ink-500">
                      Move this merchant onto Starter, Growth or Pro to apply that plan's catalogue and staff limits.
                    </p>
                    <Button
                      className="mt-4"
                      onClick={() => setUpgradeOpen(true)}
                      disabled={!isSuperAdmin}
                      title={isSuperAdmin ? undefined : SUPERADMIN_ONLY}
                    >
                      Upgrade plan
                    </Button>
                  </div>
                )}
              </Panel>

              <Panel
                title="Details"
                action={<Badge tone="neutral">{currency}</Badge>}
              >
                <dl className="divide-y divide-ink-100">
                  <Detail label="Contact email" value={data.store.email ?? "—"} />
                  <Detail label="Category" value={data.store.category ?? "—"} />
                  <Detail label="Country" value={data.store.country ?? "—"} />
                  <Detail label="Design pages" value={formatNumber(data.counts.designs)} />
                  <Detail
                    label="Storefront"
                    value={
                      <span className="flex items-center gap-1.5">
                        <a
                          href={storeHref(data.store.storeUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className={cn("truncate rounded text-brand-700 hover:underline", focusRing)}
                        >
                          {data.store.storeUrl}
                        </a>
                        <CopyButton value={storeHref(data.store.storeUrl)} label="Copy storefront URL" />
                      </span>
                    }
                  />
                  <Detail label="Store ID" value={<CopyableId value={data.store.id} label="Copy store ID" />} />
                  <Detail label="Owner ID" value={<CopyableId value={data.ownerId} label="Copy owner ID" />} />
                </dl>
              </Panel>

              <Panel
                title="Recent activity"
                action={<LinkButton onClick={() => go("Activity")}>View all</LinkButton>}
              >
                {activity.isPending ? (
                  <TableSkeleton rows={4} cols={2} />
                ) : activity.isError ? (
                  <ErrorState message={errorMessage(activity.error)} onRetry={() => void activity.refetch()} />
                ) : recent.length === 0 ? (
                  <EmptyState title="Nothing recorded yet" description="Activity appears as the merchant works." />
                ) : (
                  <ul className="divide-y divide-ink-100">
                    {recent.map((item) => (
                      <ActivityRow key={item.id} item={item} />
                    ))}
                  </ul>
                )}
              </Panel>
            </div>

            <div className="space-y-6">
              <Panel title="Owner access" action={<LinkButton onClick={() => go("Sessions")}>All sessions</LinkButton>}>
                {sessions.isPending ? (
                  <TableSkeleton rows={2} cols={2} />
                ) : ownerSession ? (
                  <dl className="divide-y divide-ink-100">
                    <Detail label="Device" value={ownerSession.device} />
                    <Detail
                      label="Status"
                      value={
                        <Badge tone={statusTone(ownerSession.status === "active" ? "ACTIVE" : ownerSession.status)}>
                          {humanize(ownerSession.status)}
                        </Badge>
                      }
                    />
                    <Detail
                      label="Last seen"
                      value={
                        <span title={formatDateTime(ownerSession.lastSeenAt ?? ownerSession.createdAt)}>
                          {formatRelative(ownerSession.lastSeenAt ?? ownerSession.createdAt)}
                        </span>
                      }
                    />
                    <Detail label="Signed in" value={formatDateTime(ownerSession.createdAt)} />
                    <Detail
                      label="IP address"
                      value={<span className="font-mono text-xs">{ownerSession.ip ?? "—"}</span>}
                    />
                  </dl>
                ) : (
                  <div className="px-5 py-5">
                    <p className="text-sm font-medium text-ink-900">No session recorded</p>
                    <p className="mt-1 text-xs text-ink-500">The owner hasn't signed in since sessions were tracked.</p>
                  </div>
                )}
              </Panel>

              <Panel
                title="Staff"
                action={data.staff.length > 0 ? <LinkButton onClick={() => go("Staff")}>View all</LinkButton> : null}
              >
                {data.staff.length === 0 ? (
                  <p className="px-5 py-5 text-sm text-ink-500">Only the owner works on this store.</p>
                ) : (
                  <ul className="divide-y divide-ink-100">
                    {data.staff.slice(0, 3).map((member) => (
                      <StaffRow key={member.id} member={member} compact />
                    ))}
                  </ul>
                )}
              </Panel>
            </div>
          </div>
        ) : null}

        {tab === "Orders" ? (
          <Panel
            title="Orders"
            action={
              orders.data?.pagination?.total !== undefined ? (
                <span className="text-xs tabular-nums text-ink-500">
                  {formatNumber(orders.data.pagination.total)} total
                </span>
              ) : null
            }
          >
            <QueryBody
              query={orders}
              isEmpty={(d) => d.orders.length === 0}
              empty={{ title: "No orders", description: "This store has no orders yet." }}
              skeleton={<TableSkeleton rows={6} cols={6} />}
            >
              {(d) => (
                <DataTable
                  columns={[
                    { label: "Order" },
                    { label: "Customer" },
                    { label: "Amount", align: "right" },
                    { label: "Payment" },
                    { label: "Status" },
                    { label: "Placed" },
                  ]}
                >
                  {d.orders.map((order) => (
                    <tr key={order.uuid ?? String(order.id)} className="transition-colors hover:bg-ink-50/60">
                      <td className="td font-medium tabular-nums">#{orderRef(order)}</td>
                      <td className={cn("td text-sm", !order.customer?.email && "text-ink-400")}>
                        {order.customer?.email ?? "Guest"}
                      </td>
                      <td className="td text-right tabular-nums">
                        {formatMoney(order.grandTotal, order.currency ?? currency)}
                      </td>
                      <td className="td">
                        <Badge tone={statusTone(order.paymentStatus)}>{humanize(order.paymentStatus)}</Badge>
                      </td>
                      <td className="td">
                        <Badge tone={statusTone(order.status)}>{humanize(order.status)}</Badge>
                      </td>
                      <td className="td text-sm text-ink-600">{formatDateTime(order.createdAt)}</td>
                    </tr>
                  ))}
                </DataTable>
              )}
            </QueryBody>
            <Pager
              page={pageFor("Orders")}
              data={orders.data?.pagination}
              total={orders.data?.pagination?.total}
              onChange={setPageFor("Orders")}
            />
          </Panel>
        ) : null}

        {tab === "Payments" ? (
          <Panel title="Payments">
            <QueryBody
              query={payments}
              isEmpty={(d) => d.payments.length === 0}
              empty={{ title: "No payments", description: "No payment has been recorded for this store." }}
              skeleton={<TableSkeleton rows={6} cols={6} />}
            >
              {(d) => (
                <DataTable
                  columns={[
                    { label: "Reference" },
                    { label: "Order" },
                    { label: "Provider" },
                    { label: "Status" },
                    { label: "Amount", align: "right" },
                    { label: "Created" },
                  ]}
                >
                  {d.payments.map((payment) => (
                    <tr key={payment.id} className="transition-colors hover:bg-ink-50/60">
                      <td className="td font-mono text-xs">
                        {payment.reference ?? payment.transactionId ?? payment.id.slice(0, 8)}
                      </td>
                      <td className="td tabular-nums">#{payment.orderId}</td>
                      <td className="td text-sm">{payment.provider ?? payment.method}</td>
                      <td className="td">
                        <Badge tone={statusTone(payment.status)}>{humanize(payment.status)}</Badge>
                      </td>
                      <td className="td text-right tabular-nums">
                        {formatMoney(payment.order.grandTotal, payment.order.currency)}
                      </td>
                      <td className="td text-sm text-ink-600">{formatDateTime(payment.order.createdAt)}</td>
                    </tr>
                  ))}
                </DataTable>
              )}
            </QueryBody>
            <Pager
              page={pageFor("Payments")}
              data={payments.data?.pagination}
              total={payments.data?.pagination?.total}
              onChange={setPageFor("Payments")}
            />
          </Panel>
        ) : null}

        {tab === "Settlements" ? (
          <Panel title="Settlements" description="Approving a pending batch marks it completed.">
            <QueryBody
              query={settlements}
              isEmpty={(d) => d.batches.length === 0}
              empty={{ title: "No settlement batches", description: "Batches appear after paid orders are grouped." }}
              skeleton={<TableSkeleton rows={5} cols={6} />}
            >
              {(d) => (
                <DataTable
                  columns={[
                    { label: "Batch" },
                    { label: "Status" },
                    { label: "Paid out", align: "right" },
                    { label: "Fee", align: "right" },
                    { label: "Created" },
                    { label: "", align: "right", srLabel: "Actions" },
                  ]}
                >
                  {d.batches.map((batch) => (
                    <tr key={batch.id} className="transition-colors hover:bg-ink-50/60">
                      <td className="td font-mono text-xs">{batch.id.slice(0, 10)}</td>
                      <td className="td">
                        <Badge tone={statusTone(batch.status)}>{humanize(batch.status)}</Badge>
                      </td>
                      <td className="td text-right tabular-nums">{formatMoney(batch.totalPaidOut, currency)}</td>
                      <td className="td text-right tabular-nums">{formatMoney(batch.feeCollected, currency)}</td>
                      <td className="td text-sm text-ink-600">{formatDateTime(batch.createdAt)}</td>
                      <td className="td text-right">
                        {batch.status === "PENDING" ? (
                          <ConfirmButton
                            label="Approve"
                            confirmLabel="Confirm approval"
                            variant="secondary"
                            loading={approve.isPending && approve.variables === batch.id}
                            disabled={approve.isPending}
                            onConfirm={() => approve.mutate(batch.id)}
                          />
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </DataTable>
              )}
            </QueryBody>
            <Pager
              page={pageFor("Settlements")}
              data={settlements.data?.pagination}
              total={settlements.data?.pagination?.total}
              onChange={setPageFor("Settlements")}
            />
          </Panel>
        ) : null}

        {tab === "Sessions" ? (
          <Panel title="Sessions" description="Owner and staff accounts, matched by email.">
            <QueryBody
              query={sessions}
              isEmpty={(d) => d.sessions.length === 0}
              empty={{
                title: "No sessions recorded",
                description: "This merchant hasn't signed in since sessions were tracked.",
              }}
              skeleton={<TableSkeleton rows={5} cols={6} />}
            >
              {(d) => (
                <DataTable
                  columns={[
                    { label: "Device" },
                    { label: "IP address" },
                    { label: "Started" },
                    { label: "Last seen" },
                    { label: "Status" },
                    { label: "", align: "right", srLabel: "Actions" },
                  ]}
                >
                  {d.sessions.map((session) => (
                    <tr key={session.id} className="transition-colors hover:bg-ink-50/60">
                      <td className="td">
                        <p className="font-medium">{session.device}</p>
                        <p className="text-xs text-ink-500">{session.userId === data.ownerId ? "Owner" : "Staff"}</p>
                      </td>
                      <td className="td font-mono text-xs">{session.ip ?? "—"}</td>
                      <td className="td text-sm text-ink-600" title={formatDateTime(session.createdAt)}>
                        {formatRelative(session.createdAt)}
                      </td>
                      <td
                        className="td text-sm text-ink-600"
                        title={session.lastSeenAt ? formatDateTime(session.lastSeenAt) : undefined}
                      >
                        {session.lastSeenAt ? formatRelative(session.lastSeenAt) : "—"}
                      </td>
                      <td className="td">
                        <Badge tone={statusTone(session.status === "active" ? "ACTIVE" : session.status)}>
                          {humanize(session.status)}
                        </Badge>
                      </td>
                      <td className="td text-right">
                        {session.status === "active" ? (
                          <ConfirmButton
                            label="Sign out"
                            confirmLabel="Confirm sign out"
                            variant="danger"
                            destructive
                            disabled={!isSuperAdmin || revoke.isPending}
                            disabledReason={isSuperAdmin ? undefined : SUPERADMIN_ONLY}
                            loading={revoke.isPending && revoke.variables === session.id}
                            onConfirm={() => revoke.mutate(session.id)}
                          />
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </DataTable>
              )}
            </QueryBody>
            <Pager
              page={pageFor("Sessions")}
              data={sessions.data?.pagination}
              total={sessions.data?.pagination?.total}
              onChange={setPageFor("Sessions")}
            />
          </Panel>
        ) : null}

        {tab === "Login events" ? (
          <Panel title="Login events" description="Durable auth audit for the owner account.">
            <QueryBody
              query={events}
              isEmpty={(d) => d.events.length === 0}
              empty={{ title: "No login events", description: "Successful and failed sign-ins will appear here." }}
              skeleton={<TableSkeleton rows={5} cols={5} />}
            >
              {(d) => (
                <DataTable
                  columns={[
                    { label: "Event" },
                    { label: "Account" },
                    { label: "IP address" },
                    { label: "Reason" },
                    { label: "When" },
                  ]}
                >
                  {d.events.map((event) => (
                    <tr key={event.id} className="transition-colors hover:bg-ink-50/60">
                      <td className="td">
                        <Badge
                          tone={
                            event.type === "LOGIN_SUCCESS" ? "success" : event.type === "LOGIN_FAILED" ? "danger" : "neutral"
                          }
                        >
                          {humanize(event.type)}
                        </Badge>
                      </td>
                      <td className="td text-sm">{event.email ?? event.userId ?? "—"}</td>
                      <td className="td font-mono text-xs">{event.ip ?? "—"}</td>
                      <td className="td text-sm text-ink-600">{event.reason ?? "—"}</td>
                      <td className="td text-sm text-ink-600">{formatDateTime(event.createdAt)}</td>
                    </tr>
                  ))}
                </DataTable>
              )}
            </QueryBody>
            <Pager
              page={pageFor("Login events")}
              data={events.data?.pagination}
              total={events.data?.pagination?.total}
              onChange={setPageFor("Login events")}
            />
          </Panel>
        ) : null}

        {tab === "Activity" ? (
          <Panel
            title="Activity"
            action={
              <div className="flex flex-wrap gap-1" role="group" aria-label="Filter activity">
                {ACTIVITY_FILTERS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={filter === option.value}
                    onClick={() => setFilter(option.value)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                      focusRing,
                      filter === option.value
                        ? "bg-ink-900 text-white"
                        : "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            }
          >
            {activity.isPending ? (
              <TableSkeleton rows={6} cols={2} />
            ) : activity.isError ? (
              <ErrorState message={errorMessage(activity.error)} onRetry={() => void activity.refetch()} />
            ) : groups.length === 0 ? (
              <EmptyState title="Nothing recorded yet" description="Activity appears as the merchant works." />
            ) : (
              <div className={cn("transition-opacity", activity.isPlaceholderData && "opacity-60")}>
                {groups.map((group) => (
                  <section key={group.day} aria-label={group.label}>
                    <h3 className="border-b border-ink-100 bg-ink-50/60 px-5 py-2 text-xs font-medium text-ink-500">
                      {group.label}
                    </h3>
                    <ul className="divide-y divide-ink-100 border-b border-ink-100 last:border-b-0">
                      {group.items.map((item) => (
                        <ActivityRow key={item.id} item={item} />
                      ))}
                    </ul>
                  </section>
                ))}
                {activity.hasNextPage ? (
                  <div className="border-t border-ink-100 px-5 py-3">
                    <Button
                      variant="secondary"
                      loading={activity.isFetchingNextPage}
                      onClick={() => void activity.fetchNextPage()}
                    >
                      Load more
                    </Button>
                  </div>
                ) : null}
              </div>
            )}
          </Panel>
        ) : null}

        {tab === "Staff" ? (
          <Panel
            title="Staff"
            description="Accounts that can sign in to this store."
            action={
              data.staff.length > 0 ? (
                <span className="text-xs tabular-nums text-ink-500">{formatNumber(data.staff.length)} total</span>
              ) : null
            }
          >
            {data.staff.length === 0 ? (
              <EmptyState title="No staff accounts" description="Only the owner has access to this store." />
            ) : (
              <ul className="divide-y divide-ink-100">
                {data.staff.map((member) => (
                  <StaffRow key={member.id} member={member} />
                ))}
              </ul>
            )}
          </Panel>
        ) : null}
      </div>

      {upgradeOpen ? (
        <UpgradePlanModal
          open={upgradeOpen}
          store={{ id: data.store.id, name: data.store.name }}
          currentPlanName={subscription?.planName ?? null}
          onClose={() => setUpgradeOpen(false)}
        />
      ) : null}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Building blocks                                                            */
/* -------------------------------------------------------------------------- */

const Dot = () => (
  <span aria-hidden className="text-ink-300">
    ·
  </span>
);

const Metric = ({ label, value, onClick }: { label: string; value: number; onClick?: () => void }) => {
  const content = (
    <>
      <p className="text-xs text-ink-500">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-ink-900">{formatNumber(value)}</p>
    </>
  );

  if (!onClick) return <div className="bg-white px-5 py-3.5">{content}</div>;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("bg-white px-5 py-3.5 text-left transition-colors hover:bg-ink-50", focusRing)}
    >
      {content}
    </button>
  );
};

const Panel = ({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) => (
  <Card className="overflow-hidden">
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-ink-100 px-5 py-3">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
        {description ? <p className="mt-0.5 text-xs text-ink-500">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
    {children}
  </Card>
);

/** Label/value row. Labels sit in a fixed column so values align down the card. */
const Detail = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-3 px-5 py-2.5">
    <dt className="text-[13px] text-ink-500">{label}</dt>
    <dd className="min-w-0 truncate text-[13px] text-ink-900">{value}</dd>
  </div>
);

const CopyableId = ({ value, label }: { value: string; label: string }) => (
  <span className="flex items-center gap-1.5">
    <span className="truncate font-mono text-xs text-ink-700">{value}</span>
    <CopyButton value={value} label={label} />
  </span>
);

const LinkButton = ({ onClick, children }: { onClick: () => void; children: ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn("rounded text-xs font-medium text-brand-700 hover:underline", focusRing)}
  >
    {children}
  </button>
);

/**
 * Owns the loading / error / empty states for a query so every table behaves the same.
 * With keepPreviousData, paging dims the current rows instead of flashing a skeleton.
 */
const QueryBody = <T,>({
  query,
  isEmpty,
  empty,
  skeleton,
  children,
}: {
  query: UseQueryResult<T>;
  isEmpty: (data: T) => boolean;
  empty: { title: string; description: string };
  skeleton: ReactNode;
  children: (data: T) => ReactNode;
}) => {
  if (query.isPending) return <>{skeleton}</>;
  if (query.isError) {
    return <ErrorState message={errorMessage(query.error)} onRetry={() => void query.refetch()} />;
  }
  if (isEmpty(query.data)) return <EmptyState title={empty.title} description={empty.description} />;
  return (
    <div className={cn("transition-opacity", query.isPlaceholderData && "opacity-60")}>{children(query.data)}</div>
  );
};

type Column = { label: string; align?: "right"; srLabel?: string };

const DataTable = ({ columns, children }: { columns: Column[]; children: ReactNode }) => (
  <div className="overflow-x-auto">
    <table className="min-w-full">
      <thead className="border-b border-ink-100 bg-ink-50/60">
        <tr>
          {columns.map((column, index) => (
            <th key={index} scope="col" className={cn("th", column.align === "right" && "text-right")}>
              {column.label || <span className="sr-only">{column.srLabel}</span>}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-ink-100">{children}</tbody>
    </table>
  </div>
);

/** Two-step inline confirmation: no modal, no window.confirm, auto-disarms after a few seconds. */
const ConfirmButton = ({
  label,
  confirmLabel,
  variant,
  destructive,
  loading,
  disabled,
  disabledReason,
  onConfirm,
}: {
  label: string;
  confirmLabel: string;
  variant: "secondary" | "danger";
  destructive?: boolean;
  loading?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  onConfirm: () => void;
}) => {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timer = window.setTimeout(() => setArmed(false), 5000);
    return () => window.clearTimeout(timer);
  }, [armed]);

  if (!armed) {
    return (
      <Button
        variant={variant}
        loading={loading}
        disabled={disabled}
        title={disabled ? disabledReason : undefined}
        onClick={() => setArmed(true)}
      >
        {label}
      </Button>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={() => setArmed(false)}
        className={cn("rounded text-xs font-medium text-ink-600 hover:text-ink-900", focusRing)}
      >
        Cancel
      </button>
      <Button
        variant={destructive ? "danger" : undefined}
        onClick={() => {
          setArmed(false);
          onConfirm();
        }}
      >
        {confirmLabel}
      </Button>
    </span>
  );
};

const StaffRow = ({
  member,
  compact,
}: {
  member: { id: string; name: string; email: string; status: string; createdAt: string | null };
  compact?: boolean;
}) => (
  <li className={cn("flex items-center gap-3 px-5 transition-colors hover:bg-ink-50/60", compact ? "py-2.5" : "py-3")}>
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-100 text-[11px] font-semibold text-ink-600">
      {initials(member.name)}
    </span>
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-medium text-ink-900">{member.name}</p>
      <p className="truncate text-xs text-ink-500">{member.email}</p>
    </div>
    {compact ? null : <p className="hidden text-xs text-ink-500 sm:block">Added {formatDate(member.createdAt)}</p>}
    <Badge tone={statusTone(member.status)}>{humanize(member.status)}</Badge>
  </li>
);

const ActivityRow = ({ item }: { item: ActivityItem }) => {
  const meta = ACTIVITY_META[item.type] ?? ACTIVITY_META.staff;
  return (
    <li className="flex items-start justify-between gap-4 px-5 py-3 transition-colors hover:bg-ink-50/60">
      <div className="min-w-0">
        <p className="text-sm text-ink-900">{item.title}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-500">
          <span className={cn("chip", meta.className)}>{meta.label}</span>
          {item.detail ? <span className="min-w-0">{item.detail}</span> : null}
        </p>
      </div>
      <time
        dateTime={item.at}
        title={formatDateTime(item.at)}
        className="shrink-0 pt-0.5 text-xs tabular-nums text-ink-500"
      >
        {formatRelative(item.at)}
      </time>
    </li>
  );
};

const CopyButton = ({ value, label }: { value: string; label: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => {
        navigator.clipboard
          ?.writeText(value)
          .then(() => {
            setCopied(true);
            toast.success("Copied to clipboard");
            window.setTimeout(() => setCopied(false), 1500);
          })
          .catch(() => toast.error("Couldn't copy to clipboard"));
      }}
      className={cn("shrink-0 rounded p-1 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700", focusRing)}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
    </button>
  );
};

const PageSkeleton = () => (
  <div className="space-y-6" role="status" aria-label="Loading merchant">
    <span className="sr-only">Loading merchant…</span>
    <div className="h-3 w-28 animate-pulse rounded bg-ink-100" />
    <div className="flex items-center gap-3.5">
      <div className="h-11 w-11 shrink-0 animate-pulse rounded-lg bg-ink-100" />
      <div className="space-y-2">
        <div className="h-5 w-56 animate-pulse rounded bg-ink-100" />
        <div className="h-3 w-72 max-w-full animate-pulse rounded bg-ink-100" />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-ink-200 bg-ink-100 sm:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="space-y-2 bg-white px-5 py-3.5">
          <div className="h-3 w-16 animate-pulse rounded bg-ink-100" />
          <div className="h-6 w-12 animate-pulse rounded bg-ink-100" />
        </div>
      ))}
    </div>
    <div className="flex gap-6 border-b border-ink-200 pb-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="h-3.5 w-16 animate-pulse rounded bg-ink-100" />
      ))}
    </div>
    <div className="grid gap-6 xl:grid-cols-3">
      <div className="space-y-6 xl:col-span-2">
        <div className="h-48 animate-pulse rounded-xl border border-ink-200 bg-white" />
        <div className="h-64 animate-pulse rounded-xl border border-ink-200 bg-white" />
      </div>
      <div className="space-y-6">
        <div className="h-56 animate-pulse rounded-xl border border-ink-200 bg-white" />
        <div className="h-40 animate-pulse rounded-xl border border-ink-200 bg-white" />
      </div>
    </div>
  </div>
);

const Pager = ({
  page,
  data,
  onChange,
  total,
}: {
  page: number;
  data?: { currentPage?: number; totalPages?: number } | null;
  onChange: (page: number) => void;
  total?: number;
}) => {
  const totalPages = data?.totalPages ?? 1;
  if (!data || totalPages <= 1) return null;

  const start = (page - 1) * PAGE_SIZE + 1;
  const end = total === undefined ? page * PAGE_SIZE : Math.min(page * PAGE_SIZE, total);

  return (
    <div className="flex items-center justify-between gap-3 border-t border-ink-100 px-5 py-2.5">
      <span className="text-xs tabular-nums text-ink-500">
        {total === undefined
          ? `Page ${page} of ${totalPages}`
          : `${formatNumber(start)}–${formatNumber(end)} of ${formatNumber(total)}`}
      </span>
      <div className="flex items-center gap-2">
        <Button variant="secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Previous
        </Button>
        <Button variant="secondary" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
};