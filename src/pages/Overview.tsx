import { useQuery } from "@tanstack/react-query";
import { Banknote, LifeBuoy, ShoppingCart, Store, TrendingUp, Users, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import {
  fetchOrderAnalytics,
  fetchSubscriptionAnalytics,
  fetchSupportTicketCount,
  fetchUserCount,
  fetchWalletAnalytics,
} from "@/api/overview";
import { errorMessage } from "@/api/client";
import { Card, EmptyState, ErrorState, PageHeader, Spinner, StatCard, Badge, statusTone } from "@/components/ui";
import { formatMoney, formatNumber, formatRelative } from "@/lib/format";

const OverviewSkeleton = () => (
  <div className="animate-pulse" role="status" aria-label="Loading dashboard">
    <span className="sr-only">Loading dashboard…</span>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="card space-y-4 p-5">
          <div className="flex items-center justify-between">
            <div className="h-3 w-24 rounded bg-ink-100" />
            <div className="h-4 w-4 rounded bg-ink-100" />
          </div>
          <div className="h-7 w-32 rounded bg-ink-100" />
          <div className="h-3 w-40 max-w-full rounded bg-ink-100" />
        </div>
      ))}
    </div>

    <div className="mt-6 grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <div className="border-b border-ink-100 px-5 py-3">
          <div className="h-4 w-36 rounded bg-ink-100" />
        </div>
        <div className="flex h-44 items-end gap-2 px-5 py-4">
          {[36, 62, 45, 78, 55, 90, 48, 70, 42, 84, 58, 74, 50, 66].map((height, index) => (
            <div key={index} className="flex h-full flex-1 flex-col justify-end gap-2">
              <div className="rounded-t bg-brand-100" style={{ height: `${height}%` }} />
              <div className="mx-auto h-2 w-full max-w-6 rounded bg-ink-100" />
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <div className="border-b border-ink-100 px-5 py-3">
          <div className="h-4 w-40 rounded bg-ink-100" />
        </div>
        <div className="space-y-4 px-5 py-5">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="flex items-center justify-between">
              <div className="h-3 w-28 rounded bg-ink-100" />
              <div className="h-3 w-10 rounded bg-ink-100" />
            </div>
          ))}
        </div>
      </Card>
    </div>

    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      {[0, 1].map((panel) => (
        <Card key={panel}>
          <div className="border-b border-ink-100 px-5 py-3">
            <div className="h-4 w-28 rounded bg-ink-100" />
          </div>
          <div className="space-y-4 px-5 py-5">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="flex items-center justify-between">
                <div className="h-3 w-32 rounded bg-ink-100" />
                <div className="h-3 w-16 rounded bg-ink-100" />
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  </div>
);

export const Overview = () => {
  const orders = useQuery({ queryKey: ["overview", "orders"], queryFn: () => fetchOrderAnalytics() });
  const subscriptions = useQuery({ queryKey: ["overview", "subscriptions"], queryFn: fetchSubscriptionAnalytics });
  const wallet = useQuery({ queryKey: ["overview", "wallet"], queryFn: fetchWalletAnalytics });
  const tickets = useQuery({ queryKey: ["overview", "tickets"], queryFn: fetchSupportTicketCount });
  const users = useQuery({ queryKey: ["overview", "users"], queryFn: fetchUserCount });

  const analytics = orders.data;
  const trend = analytics?.trends?.slice(-14) ?? [];
  const peak = Math.max(1, ...trend.map((point) => point.orders));
  const isLoading = orders.isPending || subscriptions.isPending || wallet.isPending || tickets.isPending || users.isPending;

  return (
    <div>
      <PageHeader
        title="Overview"
        description="Live platform numbers, orders and subscription health."
        actions={
          <Link to="/merchants" className="btn-secondary">
            <Store className="h-4 w-4" /> Find a merchant
          </Link>
        }
      />

      {isLoading ? <OverviewSkeleton /> : (
      <>
      {orders.isError ? (
        <Card>
          <ErrorState message={errorMessage(orders.error)} onRetry={() => void orders.refetch()} />
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Orders"
          value={formatNumber(analytics?.totalOrders)}
          hint={`${formatNumber(analytics?.paidOrders)} paid · ${analytics ? analytics.paidOrderRate.toFixed(1) : "—"}% paid rate`}
          icon={ShoppingCart}
        />
        <StatCard
          label="Processed value"
          value={formatMoney(analytics?.grossProcessedValue)}
          hint={`Net ${formatMoney(analytics?.netProcessedValue)} · refunds ${formatMoney(analytics?.refundedValue)}`}
          icon={TrendingUp}
        />
        <StatCard
          label="Average order"
          value={formatMoney(analytics?.averageOrderValue)}
          hint="Paid orders only"
          icon={Banknote}
        />
        <StatCard
          label="Stores"
          value={formatNumber(subscriptions.data?.totalStores)}
          hint={`${formatNumber(subscriptions.data?.totalCustomOrManual)} custom or manual plans`}
          icon={Store}
        />
        <StatCard label="Platform users" value={formatNumber(users.data)} icon={Users} />
        <StatCard label="Open support load" value={formatNumber(tickets.data)} hint="All tickets recorded" icon={LifeBuoy} />
        <StatCard
          label="Shipping wallet float"
          value={formatMoney(wallet.data?.totalWalletBalance)}
          hint={`Lifetime funded ${formatMoney(wallet.data?.totalLifetimeFunded)}`}
          icon={Wallet}
        />
        <StatCard
          label="Active subscriptions"
          value={formatNumber(
            subscriptions.data?.statusCounts
              ? subscriptions.data.statusCounts.ACTIVE ?? subscriptions.data.statusCounts.active ?? 0
              : undefined,
          )}
          hint="Plan status ACTIVE"
          icon={Store}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-ink-900">Orders, last 14 days</h2>
            <span className="text-xs text-ink-400">
              {trend.length > 0 ? `through ${formatRelative(trend[trend.length - 1]?.date)}` : ""}
            </span>
          </div>
          {orders.isPending ? (
            <Spinner />
          ) : trend.length === 0 ? (
            <EmptyState title="No orders in this window" />
          ) : (
            <div className="flex h-44 items-end gap-2 px-5 py-4">
              {trend.map((point) => (
                <div key={point.date} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    title={`${point.orders} orders · ${formatMoney(point.value)}`}
                    className="w-full rounded-t bg-brand-500/80"
                    style={{ height: `${Math.max(4, (point.orders / peak) * 100)}%` }}
                  />
                  <span className="text-[10px] text-ink-400">{point.date.slice(5)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="border-b border-ink-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-ink-900">Subscriptions by plan</h2>
          </div>
          {subscriptions.isPending ? (
            <Spinner />
          ) : (subscriptions.data?.subscriptionsByPlan?.length ?? 0) === 0 ? (
            <EmptyState title="No subscriptions yet" />
          ) : (
            <ul className="divide-y divide-ink-100">
              {subscriptions.data?.subscriptionsByPlan.map((plan) => (
                <li key={plan.name} className="flex items-center justify-between px-5 py-2.5 text-sm">
                  <span className="text-ink-800">
                    {plan.name} {plan.isCustom ? <Badge tone="warning">custom</Badge> : null}
                  </span>
                  <span className="text-ink-600">{plan.count}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="border-b border-ink-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-ink-900">Order status</h2>
          </div>
          {analytics && Object.keys(analytics.byStatus ?? {}).length > 0 ? (
            <ul className="divide-y divide-ink-100">
              {Object.entries(analytics.byStatus).map(([status, count]) => (
                <li key={status} className="flex items-center justify-between px-5 py-2.5 text-sm">
                  <Badge tone={statusTone(status)}>{status.replaceAll("_", " ")}</Badge>
                  <span className="text-ink-600">{formatNumber(count)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No status data" />
          )}
        </Card>

        <Card>
          <div className="border-b border-ink-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-ink-900">Top shipping wallets</h2>
          </div>
          {wallet.data?.topWallets?.length ? (
            <ul className="divide-y divide-ink-100">
              {wallet.data.topWallets.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between px-5 py-2.5 text-sm">
                  <Link to={`/merchants/${entry.storeId}`} className="text-ink-800 hover:underline">
                    {entry.storeName}
                  </Link>
                  <span className="text-ink-600">{formatMoney(entry.balance, entry.currency)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No wallet balances" />
          )}
        </Card>
      </div>
      </>
      )}
    </div>
  );
};
