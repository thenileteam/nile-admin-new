import { Eye, EyeOff, Loader2, type LucideIcon } from "lucide-react";
import { useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const VARIANTS: Record<Variant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  danger: "btn-danger",
  ghost: "btn text-ink-600 hover:bg-ink-100",
};

export const Button = ({
  variant = "primary",
  loading = false,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) => (
  <button className={cn(VARIANTS[variant], className)} disabled={loading || props.disabled} {...props}>
    {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
    {children}
  </button>
);

export const Field = ({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
}) => (
  <label className="block">
    <span className="label">{label}</span>
    {children}
    {hint && !error ? <span className="mt-1 block text-xs text-ink-400">{hint}</span> : null}
    {error ? <span className="mt-1 block text-xs text-red-600">{error}</span> : null}
  </label>
);

export const Input = ({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) => (
  <input className={cn("input", className)} {...props} />
);

export const PasswordInput = ({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) => {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={cn("input pr-10", className)}
      />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        title={visible ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-ink-400 transition hover:text-ink-700"
      >
        {visible ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
      </button>
    </div>
  );
};

export const Textarea = ({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea className={cn("input min-h-24", className)} {...props} />
);

export const Select = ({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select className={cn("input", className)} {...props}>
    {children}
  </select>
);

const TONES = {
  neutral: "bg-ink-100 text-ink-700",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-red-700",
  brand: "bg-brand-50 text-brand-700",
} as const;

export type Tone = keyof typeof TONES;

export const Badge = ({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) => (
  <span className={cn("chip", TONES[tone])}>{children}</span>
);

export const statusTone = (status?: string | null): Tone => {
  const value = (status ?? "").toUpperCase();
  if (["ACTIVE", "PAID", "APPROVED", "DONE", "RESOLVED", "LIVE", "SUCCESS", "SUCCESSFUL"].includes(value)) return "success";
  if (["PENDING", "OPEN", "TODO", "IN_PROGRESS", "REVIEW", "UNDER_REVIEW", "PROCESSING", "PAYMENT_CONFIRMED", "INFO_REQUIRED"].includes(value)) return "warning";
  if (["SUSPENDED", "FAILED", "REJECTED", "CANCELLED", "CLOSED", "BLOCKED", "EXPIRED"].includes(value)) return "danger";
  return "neutral";
};

export const Card = ({ className, children }: { className?: string; children: ReactNode }) => (
  <section className={cn("card", className)}>{children}</section>
);

export const PageHeader = ({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) => (
  <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-ink-900">{title}</h1>
      {description ? <p className="mt-1 text-sm text-ink-600">{description}</p> : null}
    </div>
    {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
  </header>
);

export const StatCard = ({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: LucideIcon;
}) => (
  <div className="card p-5">
    <div className="flex items-center justify-between">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-600">{label}</p>
      {Icon ? <Icon className="h-4 w-4 text-ink-400" aria-hidden /> : null}
    </div>
    <p className="mt-2 text-2xl font-semibold text-ink-900">{value}</p>
    {hint ? <p className="mt-1 text-xs text-ink-400">{hint}</p> : null}
  </div>
);

export const Spinner = ({ label = "Loading…" }: { label?: string }) => (
  <div className="flex items-center justify-center gap-2 py-10 text-sm text-ink-600">
    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
    {label}
  </div>
);

export const EmptyState = ({ title, description }: { title: string; description?: string }) => (
  <div className="px-5 py-12 text-center">
    <p className="text-sm font-medium text-ink-800">{title}</p>
    {description ? <p className="mt-1 text-sm text-ink-600">{description}</p> : null}
  </div>
);

export const ErrorState = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div className="px-5 py-10 text-center">
    <p className="text-sm font-medium text-red-600">{message}</p>
    {onRetry ? (
      <Button variant="secondary" className="mt-3" onClick={onRetry}>
        Try again
      </Button>
    ) : null}
  </div>
);

export const Pagination = ({
  page,
  totalPages,
  onChange,
  total,
}: {
  page: number;
  totalPages: number;
  total?: number;
  onChange: (page: number) => void;
}) => (
  <div className="flex items-center justify-between border-t border-ink-100 px-4 py-3 text-sm text-ink-600">
    <span>
      Page {page} of {Math.max(1, totalPages)}
      {typeof total === "number" ? ` · ${total.toLocaleString()} total` : ""}
    </span>
    <div className="flex gap-2">
      <Button variant="secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Previous
      </Button>
      <Button variant="secondary" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        Next
      </Button>
    </div>
  </div>
);

export const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn("animate-pulse rounded bg-ink-100", className)} />
);

export const TableSkeleton = ({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) => (
  <div className="divide-y divide-ink-100">
    {Array.from({ length: rows }).map((_, r) => (
      <div key={r} className="flex items-center gap-4 px-4 py-3.5">
        {Array.from({ length: cols }).map((_, c) => (
          <Skeleton
            key={c}
            className={cn(
              "h-4",
              c === 0 ? "w-48" : c === cols - 1 ? "ml-auto w-20" : "w-28",
            )}
          />
        ))}
      </div>
    ))}
  </div>
);

export const Modal = ({
  open,
  onClose,
  title,
  description,
  children,
  maxWidth = "max-w-md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  maxWidth?: string;
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink-900/40 px-4">
      <Card className={cn("w-full p-5 shadow-lg", maxWidth)}>
        <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
        {description ? <p className="mt-1 text-sm text-ink-600">{description}</p> : null}
        <div className="mt-4">{children}</div>
      </Card>
    </div>
  );
};
