import {
  Activity,
  ArrowLeftRight,
  Banknote,
  Clock,
  CreditCard,
  FileCheck2,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  ListChecks,
  LogOut,
  Mail,
  Megaphone,
  Menu,
  MonitorSmartphone,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Store,
  Truck,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { fetchMe } from "@/api/auth";
import { adminName, useAuth } from "@/auth/store";
import { useIdleTimeout } from "@/auth/useIdleTimeout";
import { useSignOut } from "@/auth/useSignOut";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";
import { Badge } from "./ui";

type NavItem = {
  to: string;
  label: string;
  icon: typeof Store;
  end?: boolean;
};

const NAV: { label: string; items: NavItem[] }[] = [
  {
    label: "Operations",
    items: [
      { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
      { to: "/merchants", label: "Merchants", icon: Store },
      { to: "/orders", label: "Orders", icon: ShoppingCart },
      { to: "/payments", label: "Payments", icon: CreditCard },
      { to: "/support", label: "Support", icon: LifeBuoy },
      { to: "/tasks", label: "Tasks", icon: ListChecks },
    ],
  },
  {
    label: "Growth",
    items: [
      { to: "/office-hours", label: "Office hours", icon: Clock },
      { to: "/marketing/blast", label: "Marketing blast", icon: Megaphone },
      { to: "/marketing/ai", label: "Marketing monitor", icon: Sparkles },
      { to: "/marketing/email", label: "Email marketing", icon: Mail },
      { to: "/cac", label: "CAC registrations", icon: FileCheck2 },
    ],
  },
  {
    label: "Finance & logistics",
    items: [
      { to: "/settlements", label: "Settlements", icon: Banknote },
      { to: "/transfers", label: "Bank transfers", icon: ArrowLeftRight },
      { to: "/logistics", label: "Logistics", icon: Truck },
    ],
  },
  {
    label: "Platform",
    items: [
      { to: "/admins", label: "Admins", icon: ShieldCheck },
      { to: "/users", label: "Users", icon: Users },
      { to: "/sessions", label: "My sessions", icon: MonitorSmartphone },
      { to: "/login-activity", label: "Login activity", icon: KeyRound },
      { to: "/health", label: "System health", icon: Activity },
    ],
  },
];

const ALL_ITEMS = NAV.flatMap((group) => group.items.map((item) => ({ ...item, group: group.label })));

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1";

export const Shell = () => {
  const user = useAuth((state) => state.user);
  const status = useAuth((state) => state.status);
  const setUser = useAuth((state) => state.setUser);
  const signOut = useSignOut();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);

  const name = adminName(user);
  const isSuper = user?.role === "SUPERADMIN";

  // Current section, used for the header title / breadcrumb.
  const current = useMemo(() => {
    const path = location.pathname;
    const matches = ALL_ITEMS.filter((item) =>
      item.end ? path === item.to : path === item.to || path.startsWith(`${item.to}/`),
    );
    return matches.sort((a, b) => b.to.length - a.to.length)[0];
  }, [location.pathname]);

  useIdleTimeout({
    enabled: status === "authenticated",
    onWarn: () =>
      toast.warning("Signing out in 5 minutes", {
        id: "idle-warning",
        description: "Move the mouse or press a key to stay signed in.",
      }),
    onIdle: () => {
      toast.dismiss("idle-warning");
      void signOut({ silent: true });
      toast.error("Signed out after 30 minutes of inactivity");
    },
  });

  useEffect(() => {
    let cancelled = false;

    fetchMe()
      .then((profile) => {
        if (cancelled || !profile) return;
        setUser({
          id: String(
            (profile as unknown as { id?: string; _id?: string }).id ??
            (profile as unknown as { _id?: string })._id ??
            user?.id ??
            "",
          ),
          firstName: profile.firstName ?? "",
          lastName: profile.lastName ?? "",
          email: profile.email,
          role: profile.role,
          active: profile.active,
          lastLoginAt: profile.lastLoginAt ?? null,
          lastLoginIp: (profile as unknown as { lastLoginIp?: string | null }).lastLoginIp ?? null,
        });
      })
      .catch((error: unknown) => {
        const statusCode = (error as { response?: { status?: number } }).response?.status;
        if (statusCode === 403) {
          // The token is valid but this account lost admin access.
          void signOut();
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close the mobile drawer on navigation.
  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  // Close the mobile drawer with Escape.
  useEffect(() => {
    if (!navOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navOpen]);

  return (
    <div className="flex h-screen overflow-hidden bg-ink-50">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-brand-700 focus:shadow-lg"
      >
        Skip to content
      </a>

      <aside
        id="primary-navigation"
        className={cn(
          "fixed inset-y-0 left-0 z-30 flex h-screen w-64 shrink-0 flex-col border-r border-ink-200 bg-white shadow-xl transition-transform duration-200 ease-out lg:static lg:translate-x-0 lg:shadow-none",
          navOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-ink-100 px-5">
          <div className="flex items-center gap-2.5">
            <img src="/nile_logo.png" alt="Nile" className="h-8 w-auto" />

          </div>
          <button
            type="button"
            className={cn("rounded-md p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-600 lg:hidden", focusRing)}
            onClick={() => setNavOpen(false)}
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav aria-label="Primary" className="min-h-0 flex-1 space-y-6 overflow-y-auto px-3 py-5">
          {NAV.map((group) => (
            <div key={group.label}>
              <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        cn(
                          "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          focusRing,
                          isActive
                            ? "bg-brand-50 text-brand-700"
                            : "text-ink-600 hover:bg-ink-50 hover:text-ink-900",
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span
                            aria-hidden
                            className={cn(
                              "absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand-600 transition-opacity",
                              isActive ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <item.icon
                            className={cn(
                              "h-4 w-4 shrink-0 transition-colors",
                              isActive ? "text-brand-600" : "text-ink-400 group-hover:text-ink-600",
                            )}
                            aria-hidden
                          />
                          <span className="truncate">{item.label}</span>
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Account card pinned to the bottom of the sidebar */}
        <div className="shrink-0 border-t border-ink-100 p-3">
          <div className="flex items-center gap-3 rounded-xl bg-ink-50 p-2.5">
            <span
              aria-hidden
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white"
            >
              {initials(name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium leading-tight text-ink-900">{name}</p>
              <p className="truncate text-xs leading-tight text-ink-400" title={user?.email}>
                {user?.email}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void signOut()}
              className={cn("rounded-md p-1.5 text-ink-400 hover:bg-white hover:text-ink-900", focusRing)}
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {navOpen ? (
        <button
          type="button"
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-20 bg-ink-900/40 backdrop-blur-[1px] lg:hidden"
          onClick={() => setNavOpen(false)}
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-10 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-ink-200 bg-white/90 px-4 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className={cn("rounded-md p-1.5 text-ink-600 hover:bg-ink-100 lg:hidden", focusRing)}
              onClick={() => setNavOpen(true)}
              aria-label="Open navigation"
              aria-expanded={navOpen}
              aria-controls="primary-navigation"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="min-w-0">
              {current ? (
                <>
                  <p className="hidden truncate text-[11px] font-medium uppercase tracking-wider text-ink-400 sm:block">
                    {current.group}
                  </p>
                  <h1 className="truncate text-base font-semibold leading-tight text-ink-900">{current.label}</h1>
                </>
              ) : (
                <h1 className="truncate text-base font-semibold text-ink-900">Nile Admin</h1>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <Badge tone={isSuper ? "brand" : "neutral"}>{user?.role ?? "ADMIN"}</Badge>
            <span className="hidden h-5 w-px bg-ink-200 sm:block" aria-hidden />
            <span
              aria-hidden
              className="hidden h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white sm:flex lg:hidden"
            >
              {initials(name)}
            </span>
            <p className="hidden text-xs text-ink-400 lg:block">
              Signed in as <span className="font-medium text-ink-600">{name}</span>
            </p>
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-2.5 py-1.5 text-sm font-medium text-ink-600 transition-colors hover:border-ink-300 hover:bg-ink-50 hover:text-ink-900 lg:hidden",
                focusRing,
              )}
              onClick={() => void signOut()}
            >
              <LogOut className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </header>

        <main id="main" tabIndex={-1} className="flex-1 overflow-y-auto px-4 py-6 focus:outline-none sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};