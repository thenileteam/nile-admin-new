import {
  Activity,
  Banknote,
  Clock,
  CreditCard,
  FileCheck2,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  ListChecks,
  Mail,
  Megaphone,
  MonitorSmartphone,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Store,
  Truck,
  Users,
  X,
  Menu,
} from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { fetchMe } from "@/api/auth";
import { adminName, useAuth } from "@/auth/store";
import { useIdleTimeout } from "@/auth/useIdleTimeout";
import { useSignOut } from "@/auth/useSignOut";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";
import { Badge } from "./ui";

const NAV = [
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
      { to: "/transfers", label: "Bank transfers", icon: Banknote },
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

export const Shell = () => {
  const user = useAuth((state) => state.user);
  const status = useAuth((state) => state.status);
  const setUser = useAuth((state) => state.setUser);
  const signOut = useSignOut();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);

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
          id: String((profile as unknown as { id?: string; _id?: string }).id ?? (profile as unknown as { _id?: string })._id ?? user?.id ?? ""),
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
  }, []);

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex h-screen overflow-hidden">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 flex h-screen w-64 shrink-0 flex-col border-r border-ink-200 bg-white px-4 py-5 transition-transform lg:static lg:translate-x-0",
          navOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <img src="/nilelogo-green.svg" alt="Nile" className="h-8 w-auto" />
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700">
                Admin
              </span>
            </div>
            <p className="mt-1 text-xs text-ink-400">admin.nile.ng</p>
          </div>
          <button
            type="button"
            className="rounded p-1 text-ink-400 hover:bg-ink-100 lg:hidden"
            onClick={() => setNavOpen(false)}
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="mt-6 min-h-0 flex-1 space-y-6 overflow-y-auto pb-6">
          {NAV.map((group) => (
            <div key={group.label}>
              <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                {group.label}
              </p>
              <ul className="space-y-1">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition",
                          isActive
                            ? "bg-brand-600 text-white"
                            : "text-ink-600 hover:bg-brand-50 hover:text-brand-700",
                        )
                      }
                    >
                      <item.icon className="h-4 w-4" aria-hidden />
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {navOpen ? (
        <button
          type="button"
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-20 bg-ink-900/30 lg:hidden"
          onClick={() => setNavOpen(false)}
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-10 flex shrink-0 items-center justify-between gap-3 border-b border-ink-200 bg-white/90 px-4 py-3 backdrop-blur">
          <button
            type="button"
            className="rounded p-1.5 text-ink-600 hover:bg-ink-100 lg:hidden"
            onClick={() => setNavOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="hidden text-xs text-ink-400 lg:block">
            Signed in as {adminName(user)} · {user?.role === "SUPERADMIN" ? "superadmin" : "admin"}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
                {initials(adminName(user))}
              </span>
              <div className="hidden sm:block">
                <p className="text-sm font-medium leading-tight text-ink-900">{adminName(user)}</p>
                <p className="text-xs leading-tight text-ink-400">{user?.email}</p>
              </div>
            </div>
            <Badge tone={user?.role === "SUPERADMIN" ? "brand" : "neutral"}>{user?.role ?? "ADMIN"}</Badge>
            <button
              type="button"
              className="text-sm font-medium text-ink-600 hover:text-ink-900"
              onClick={() => void signOut()}
            >
              Sign out
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
