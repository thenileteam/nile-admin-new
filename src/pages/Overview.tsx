import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowUpRight,
  Banknote,
  CircleDollarSign,
  CreditCard,
  LifeBuoy,
  Percent,
  RefreshCw,
  ShoppingCart,
  Store,
  TrendingUp,
  Undo2,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import {
  fetchOrderAnalytics,
  fetchSubscriptionAnalytics,
  fetchSupportTicketCount,
  fetchUserCount,
  fetchWalletAnalytics,
} from "@/api/overview";
import { errorMessage } from "@/api/client";
import { Badge, Card, EmptyState, ErrorState, PageHeader, statusTone } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatMoney, formatNumber, formatRelative } from "@/lib/format";

type Tone = "success" | "warning" | "danger" | "neutral";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const getActiveSubscriptions = (subscriptions: any) =>
  subscriptions?.statusCounts?.ACTIVE ?? subscriptions?.statusCounts?.active ?? 0;

const pct = (count: number, total: number) => (total ? Math.round((count / total) * 100) : 0);

const label = (status: string) => status.replaceAll("_", " ");

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1";

/* -------------------------------------------------------------------------- */
/* Building blocks                                                            */
/* -------------------------------------------------------------------------- */

const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn("animate-pulse rounded bg-ink-100", className)} aria-hidden />
);

const MetricCard = ({
  label: title,
  value,
  description,
  icon: Icon,
  badge,
  badgeTone = "neutral",
  featured = false,
  loading = false,
}: {
  label: string;
  value?: string;
  description?: string;
  icon: LucideIcon;
  badge?: string;
  badgeTone?: Tone;
  featured?: boolean;
  loading?: boolean;
}) => (
  <Card
    className={cn(
      "relative overflow-hidden p-5 transition-shadow hover:shadow-md",
      featured && "border-brand-200 bg-gradient-to-br from-brand-50 to-white",
    )}
  >
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink-500">{title}</p>
        {loading ? (
          <Skeleton className="mt-3 h-8 w-32" />
        ) : (
          <p className="mt-2 break-words text-2xl font-bold tabular-nums tracking-tight text-ink-950 sm:text-[28px]">
            {value}
          </p>
        )}
      </div>
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          featured ? "bg-brand-600 text-white" : "bg-ink-50 text-ink-600",
        )}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </div>
    </div>

    {(badge || description) && (
      <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1">
        {loading ? (
          <Skeleton className="h-3 w-28" />
        ) : (
          <>
            {badge && <Badge tone={badgeTone}>{badge}</Badge>}
            {description && <span className="text-xs text-ink-400">{description}</span>}
          </>
        )}
      </div>
    )}
  </Card>
);

const SectionHeading = ({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) => (
  <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
    <div>
      <h2 className="text-lg font-semibold tracking-tight text-ink-950">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-ink-500">{description}</p>}
    </div>
    {action}
  </div>
);

/** Card with a consistent title block. */
const Panel = ({
  title,
  description,
  right,
  children,
  className,
}: {
  title: string;
  description?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) => (
  <Card className={cn("overflow-hidden", className)}>
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-5 py-4">
      <div>
        <h3 className="font-semibold text-ink-900">{title}</h3>
        {description && <p className="mt-0.5 text-xs text-ink-500">{description}</p>}
      </div>
      {right}
    </div>
    {children}
  </Card>
);

const PanelSkeleton = ({ rows = 4 }: { rows?: number }) => (
  <div className="space-y-4 p-5" role="status">
    <span className="sr-only">Loading…</span>
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} className="space-y-2">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-1.5 w-full" />
      </div>
    ))}
  </div>
);

const ProgressBar = ({ value, className }: { value: number; className?: string }) => (
  <div
    className="h-1.5 overflow-hidden rounded-full bg-ink-100"
    role="progressbar"
    aria-valuenow={value}
    aria-valuemin={0}
    aria-valuemax={100}
  >
    <div
      className={cn("h-full rounded-full bg-brand-500 transition-[width] duration-500", className)}
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
);

/** One row of a status distribution list: badge, count, percentage, bar. */
const StatusRow = ({ status, count, total }: { status: string; count: number; total: number }) => {
  const percentage = pct(count, total);
  return (
    <div className="px-5 py-3.5">
      <div className="flex items-center justify-between gap-3">
        <Badge tone={statusTone(status)}>{label(status)}</Badge>
        <div className="flex items-baseline gap-2 tabular-nums">
          <span className="text-sm font-semibold text-ink-900">{formatNumber(count)}</span>
          <span className="w-9 text-right text-xs text-ink-400">{percentage}%</span>
        </div>
      </div>
      <div className="mt-2.5">
        <ProgressBar value={percentage} />
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Overview                                                                   */
/* -------------------------------------------------------------------------- */

export const Overview = () => {
  const orders = useQuery({ queryKey: ["overview", "orders"], queryFn: () => fetchOrderAnalytics() });
  const subscriptions = useQuery({ queryKey: ["overview", "subscriptions"], queryFn: fetchSubscriptionAnalytics });
  const wallet = useQuery({ queryKey: ["overview", "wallet"], queryFn: fetchWalletAnalytics });
  const tickets = useQuery({ queryKey: ["overview", "tickets"], queryFn: fetchSupportTicketCount });
  const users = useQuery({ queryKey: ["overview", "users"], queryFn: fetchUserCount });

  const analytics = orders.data;
  const subscriptionData = subscriptions.data;

  const activeSubscriptions = getActiveSubscriptions(subscriptionData);
  const plans = subscriptionData?.subscriptionsByPlan ?? [];
  const totalPlanCount = plans.reduce((total, plan) => total + Number(plan.count ?? 0), 0);

  const trend: any[] = analytics?.trends?.slice(-14) ?? [];
  const peakOrders = Math.max(1, ...trend.map((point) => Number(point.orders ?? 0)));
  const trendTotal = trend.reduce((sum, point) => sum + Number(point.orders ?? 0), 0);
  const trendAverage = trend.length ? trendTotal / trend.length : 0;

  const orderStatuses = Object.entries(analytics?.byStatus ?? {}).sort((a, b) => Number(b[1]) - Number(a[1]));
  const paymentStatuses = Object.entries(analytics?.byPaymentStatus ?? {}).sort((a, b) => Number(b[1]) - Number(a[1]));
  const totalPaymentOrders = paymentStatuses.reduce((sum, [, count]) => sum + Number(count), 0);
  const subscriptionStatuses = Object.entries(subscriptionData?.statusCounts ?? {}).sort(
    (a, b) => Number(b[1]) - Number(a[1]),
  );
  const totalSubscriptions = subscriptionStatuses.reduce((sum, [, count]) => sum + Number(count), 0);

  const paidShare =
    analytics && Number(analytics.absoluteValue) > 0
      ? pct(Number(analytics.grossProcessedValue ?? 0), Number(analytics.absoluteValue))
      : 0;

  const queries = [orders, subscriptions, wallet, tickets, users];
  const isRefreshing = queries.some((query) => query.isFetching);
  const lastUpdated = Math.max(0, ...queries.map((query) => query.dataUpdatedAt ?? 0));

  const refreshAll = () => void Promise.all(queries.map((query) => query.refetch()));

  return (
    <div className="space-y-10 pb-8">
      <PageHeader
        title="Overview"
        description="A snapshot of Nile's platform performance, orders and subscriptions."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={refreshAll}
              disabled={isRefreshing}
              className={cn("btn-secondary", focusRing)}
              aria-label="Refresh dashboard"
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} aria-hidden />
              <span className="hidden sm:inline">{isRefreshing ? "Refreshing" : "Refresh"}</span>
            </button>
            <Link to="/merchants" className={cn("btn-secondary", focusRing)}>
              <Store className="h-4 w-4" aria-hidden />
              Find a merchant
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        }
      />

      {/* ------------------------------------------------------------------ */}
      {/* Financial overview                                                 */}
      {/* ------------------------------------------------------------------ */}

      <section aria-labelledby="financial-heading">
        <SectionHeading
          title="Financial overview"
          description="Total business volume versus successfully processed payments."
        />

        {orders.isError ? (
          <Card>
            <ErrorState message={errorMessage(orders.error)} onRetry={() => void orders.refetch()} />
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Total order value"
                value={formatMoney(analytics?.absoluteValue)}
                description="Value of all orders"
                icon={ShoppingCart}
                featured
                loading={orders.isPending}
              />

              <MetricCard
                label="Total orders"
                value={formatNumber(analytics?.totalOrders)}
                description={`${analytics?.paidOrderRate?.toFixed(1) ?? "—"}% paid conversion`}
                icon={Percent}
                loading={orders.isPending}
              />
              <MetricCard
                label="Average paid order"
                value={formatMoney(analytics?.averageOrderValue)}
                description="Per paid order"
                icon={Banknote}
                loading={orders.isPending}
              />
            </div>

            {/* Value flow: how much of total volume was paid, and what's left after refunds */}
            <Card className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-ink-900">Order value flow</h3>
                  <p className="mt-0.5 text-xs text-ink-500">Share of total order value that was paid.</p>
                </div>
                {!orders.isPending && (
                  <span className="text-sm font-semibold tabular-nums text-ink-900">{paidShare}% paid</span>
                )}
              </div>

              <div className="mt-4">
                {orders.isPending ? <Skeleton className="h-2.5 w-full" /> : <ProgressBar value={paidShare} />}
              </div>

              <dl className="mt-5 grid gap-4 sm:grid-cols-3">
                {[
                  { term: "Paid value", icon: CircleDollarSign, value: analytics?.grossProcessedValue, tone: "success" as Tone },
                  { term: "Refunded value", icon: Undo2, value: analytics?.refundedValue, tone: "warning" as Tone },
                  { term: "Net processed value", icon: TrendingUp, value: analytics?.netProcessedValue, tone: "success" as Tone },
                ].map((item) => (
                  <div key={item.term} className="flex items-center gap-3 rounded-xl bg-ink-50 p-3">
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                        item.tone === "warning" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700",
                      )}
                    >
                      <item.icon className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <dt className="text-xs font-medium text-ink-500">{item.term}</dt>
                      <dd className="mt-0.5 truncate text-base font-semibold tabular-nums text-ink-900">
                        {orders.isPending ? <Skeleton className="h-5 w-24" /> : formatMoney(item.value)}
                      </dd>
                    </div>
                  </div>
                ))}
              </dl>
            </Card>
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Subscriptions                                                      */}
      {/* ------------------------------------------------------------------ */}

      <section>
        <SectionHeading
          title="Subscription overview"
          description="Plan distribution and subscription performance across Nile."
        />

        {subscriptions.isError ? (
          <Card>
            <ErrorState message={errorMessage(subscriptions.error)} onRetry={() => void subscriptions.refetch()} />
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Active subscription value"
                value={formatMoney(subscriptions.data?.activeSubscriptionValue ?? 0)}
                description="Active paid subscriptions value"
                badge="ACTIVE · PAID"
                badgeTone="success"
                icon={TrendingUp}
                featured
                loading={subscriptions.isPending}
              />
              <MetricCard
                label="Active subscriptions"
                value={formatNumber(activeSubscriptions)}
                description="Active subscriptions are paid"
                badge="ACTIVE · PAID"
                badgeTone="success"
                icon={CreditCard}
                loading={subscriptions.isPending}
              />
              <MetricCard
                label="Total stores"
                value={formatNumber(subscriptionData?.totalStores)}
                description="Registered merchant stores"
                icon={Store}
                loading={subscriptions.isPending}
              />
              <MetricCard
                label="Custom / manual plans"
                value={formatNumber(subscriptionData?.totalCustomOrManual)}
                description="Manually managed plans"
                icon={Banknote}
                loading={subscriptions.isPending}
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <Panel
                className="lg:col-span-2"
                title="Subscription plans"
                description="Distribution and active revenue by tier."
                right={<Badge tone="success">{formatNumber(activeSubscriptions)} ACTIVE · PAID</Badge>}
              >
                {subscriptions.isPending ? (
                  <PanelSkeleton rows={4} />
                ) : plans.length === 0 ? (
                  <EmptyState title="No subscription plans found" />
                ) : (
                  <div className="divide-y divide-ink-100">
                    {plans.map((plan) => {
                      const share = pct(Number(plan.activeCount ?? 0), activeSubscriptions || 1);
                      return (
                        <div key={plan.name} className="px-5 py-4 transition-colors hover:bg-ink-50/60">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-ink-900">{plan.name}</span>
                                {plan.isCustom && <Badge tone="warning">CUSTOM</Badge>}
                                {plan.type === "FREE" && <Badge tone="neutral">FREE</Badge>}
                                {plan.type === "PREMIUM" && <Badge tone="success">PREMIUM</Badge>}
                              </div>
                              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
                                <span>Tier price: <strong className="font-medium text-ink-700">{formatMoney(plan.price)}</strong></span>
                                <span>·</span>
                                <span>Total: <strong className="font-medium text-ink-700">{formatNumber(plan.count)}</strong> subscriptions</span>
                                <span>·</span>
                                <span>Active: <strong className="font-medium text-emerald-700">{formatNumber(plan.activeCount)}</strong> paid</span>
                              </div>
                            </div>
                            <div className="text-right tabular-nums">
                              <p className="font-semibold text-ink-900">{formatMoney(plan.activeValue)}</p>
                              <p className="text-xs text-ink-400">Active subscription value</p>
                            </div>
                          </div>
                          <div className="mt-3">
                            <ProgressBar value={share} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="border-t border-ink-100 bg-ink-50/60 px-5 py-3">
                  <p className="text-xs leading-relaxed text-ink-500">
                    Active subscription value is calculated from active subscriptions and tier prices. Inactive subscriptions (pending, canceled, expired) do not contribute to revenue.
                  </p>
                </div>
              </Panel>

              <Panel title="Subscription status" description="Current distribution by lifecycle.">
                {subscriptions.isPending ? (
                  <PanelSkeleton rows={4} />
                ) : subscriptionStatuses.length === 0 ? (
                  <EmptyState title="No subscription status data" />
                ) : (
                  <div className="divide-y divide-ink-100">
                    {subscriptionStatuses.map(([status, count]) => (
                      <StatusRow key={status} status={status} count={Number(count)} total={totalSubscriptions} />
                    ))}
                  </div>
                )}
              </Panel>
            </div>
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Platform activity                                                  */}
      {/* ------------------------------------------------------------------ */}

      <section>
        <SectionHeading title="Platform activity" description="Merchant activity and operational metrics." />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Platform users"
            value={users.isError ? "—" : formatNumber(users.data)}
            description={users.isError ? "Couldn't load" : "Registered platform users"}
            icon={Users}
            loading={users.isPending}
          />
          <MetricCard
            label="Support tickets"
            value={tickets.isError ? "—" : formatNumber(tickets.data)}
            description={tickets.isError ? "Couldn't load" : "All tickets recorded"}
            icon={LifeBuoy}
            loading={tickets.isPending}
          />
          <MetricCard
            label="Shipping wallet float"
            value={wallet.isError ? "—" : formatMoney(wallet.data?.totalWalletBalance)}
            description={wallet.isError ? "Couldn't load" : "Current wallet balances"}
            icon={Wallet}
            loading={wallet.isPending}
          />
          <MetricCard
            label="Lifetime wallet funding"
            value={wallet.isError ? "—" : formatMoney(wallet.data?.totalLifetimeFunded)}
            description={wallet.isError ? "Couldn't load" : "Total historical funding"}
            icon={TrendingUp}
            loading={wallet.isPending}
          />
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Order activity                                                     */}
      {/* ------------------------------------------------------------------ */}

      <section>
        <SectionHeading
          title="Order activity"
          description="Daily order volume over the last 14 days."
          action={<Badge tone="neutral">Last 14 days</Badge>}
        />

        <div className="grid gap-4 lg:grid-cols-3">
          <Panel
            className="lg:col-span-2"
            title="Orders over time"
            description="Orders created per day"
            right={
              trend.length > 0 && (
                <span className="text-xs text-ink-400">
                  Through {formatRelative(trend[trend.length - 1]?.date)}
                </span>
              )
            }
          >
            {orders.isError ? (
              <ErrorState message={errorMessage(orders.error)} onRetry={() => void orders.refetch()} />
            ) : orders.isPending ? (
              <div className="p-5">
                <Skeleton className="h-56 w-full" />
              </div>
            ) : trend.length === 0 ? (
              <EmptyState title="No order activity in this period" />
            ) : (
              <div className="px-5 pb-5 pt-4">
                <div className="mb-5 grid grid-cols-3 gap-3">
                  {[
                    { k: "Total", v: formatNumber(trendTotal) },
                    { k: "Daily average", v: formatNumber(Math.round(trendAverage)) },
                    { k: "Peak day", v: formatNumber(peakOrders) },
                  ].map((stat) => (
                    <div key={stat.k} className="rounded-lg bg-ink-50 px-3 py-2">
                      <p className="text-[11px] font-medium text-ink-500">{stat.k}</p>
                      <p className="text-base font-semibold tabular-nums text-ink-900">{stat.v}</p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  {/* Y axis */}
                  <div className="flex h-48 w-8 shrink-0 flex-col justify-between pb-0 text-right text-[10px] tabular-nums text-ink-400">
                    <span>{formatNumber(peakOrders)}</span>
                    <span>{formatNumber(Math.round(peakOrders / 2))}</span>
                    <span>0</span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="relative h-48">
                      {/* gridlines */}
                      <div className="absolute inset-0 flex flex-col justify-between" aria-hidden>
                        <div className="border-t border-dashed border-ink-100" />
                        <div className="border-t border-dashed border-ink-100" />
                        <div className="border-t border-ink-200" />
                      </div>

                      <div className="relative flex h-full items-end gap-1.5 sm:gap-2">
                        {trend.map((point) => {
                          const value = Number(point.orders ?? 0);
                          const height = value === 0 ? 1 : Math.max(3, (value / peakOrders) * 100);
                          const isPeak = value === peakOrders && value > 0;
                          return (
                            <div
                              key={point.date}
                              tabIndex={0}
                              aria-label={`${point.date}: ${formatNumber(value)} orders`}
                              className="group relative flex h-full min-w-0 flex-1 items-end focus:outline-none"
                            >
                              <div
                                className={cn(
                                  "w-full rounded-t-md transition-colors",
                                  isPeak ? "bg-brand-600" : "bg-brand-500/70",
                                  "group-hover:bg-brand-600 group-focus-visible:bg-brand-600",
                                )}
                                style={{ height: `${height}%` }}
                              />
                              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink-950 px-3 py-2 text-xs text-white shadow-lg group-hover:block group-focus-visible:block">
                                <p className="font-semibold tabular-nums">{formatNumber(value)} orders</p>
                                <p className="text-ink-300">{point.date}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* X axis */}
                    <div className="mt-2 flex gap-1.5 sm:gap-2">
                      {trend.map((point, index) => (
                        <span
                          key={point.date}
                          className={cn(
                            "min-w-0 flex-1 text-center text-[9px] tabular-nums text-ink-400 sm:text-[10px]",
                            index % 2 === 1 && "invisible sm:visible",
                          )}
                        >
                          {String(point.date).slice(5)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Panel>

          <Panel title="Payment breakdown" description="Orders grouped by payment status.">
            {orders.isError ? (
              <ErrorState message={errorMessage(orders.error)} onRetry={() => void orders.refetch()} />
            ) : orders.isPending ? (
              <PanelSkeleton rows={4} />
            ) : paymentStatuses.length === 0 ? (
              <EmptyState title="No payment data" />
            ) : (
              <div className="divide-y divide-ink-100">
                {paymentStatuses.map(([status, count]) => (
                  <StatusRow key={status} status={status} count={Number(count)} total={totalPaymentOrders} />
                ))}
              </div>
            )}
          </Panel>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Operations                                                         */}
      {/* ------------------------------------------------------------------ */}

      <section>
        <SectionHeading title="Operations" description="Order lifecycle and merchant wallet activity." />

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Order status" description="Distribution across the order lifecycle.">
            {orders.isError ? (
              <ErrorState message={errorMessage(orders.error)} onRetry={() => void orders.refetch()} />
            ) : orders.isPending ? (
              <PanelSkeleton rows={5} />
            ) : orderStatuses.length === 0 ? (
              <EmptyState title="No order status data" />
            ) : (
              <div className="divide-y divide-ink-100">
                {orderStatuses.map(([status, count]) => (
                  <StatusRow
                    key={status}
                    status={status}
                    count={Number(count)}
                    total={Number(analytics?.totalOrders ?? 0)}
                  />
                ))}
              </div>
            )}
          </Panel>

          <Panel
            title="Top shipping wallets"
            description="Merchants with the highest wallet balances."
            right={<Wallet className="h-5 w-5 text-ink-400" aria-hidden />}
          >
            {wallet.isError ? (
              <ErrorState message={errorMessage(wallet.error)} onRetry={() => void wallet.refetch()} />
            ) : wallet.isPending ? (
              <PanelSkeleton rows={5} />
            ) : wallet.data?.topWallets?.length ? (
              <ol className="divide-y divide-ink-100">
                {wallet.data.topWallets.map((entry: any, index: number) => (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-ink-50/60"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-semibold",
                          index === 0 ? "bg-brand-600 text-white" : "bg-ink-50 text-ink-600",
                        )}
                      >
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <Link
                          to={`/merchants/${entry.storeId}`}
                          className={cn(
                            "block truncate rounded text-sm font-medium text-ink-900 hover:text-brand-600",
                            focusRing,
                          )}
                        >
                          {entry.storeName}
                        </Link>
                        <p className="mt-0.5 text-xs text-ink-400">Shipping wallet</p>
                      </div>
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums text-ink-900">
                      {formatMoney(entry.balance, entry.currency)}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState title="No wallet balances available" />
            )}
          </Panel>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Footer                                                             */}
      {/* ------------------------------------------------------------------ */}

      <div className="flex items-center justify-between border-t border-ink-100 pt-4 text-xs text-ink-400">
        <div className="flex items-center gap-2">
          <Activity className="h-3.5 w-3.5" aria-hidden />
          Platform analytics
          {lastUpdated > 0 && <span>· Updated {formatRelative(new Date(lastUpdated).toISOString())}</span>}
        </div>
      </div>
    </div>
  );
};