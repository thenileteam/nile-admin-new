import { format, isValid, parseISO } from "date-fns";

export type ActivityType = "order" | "product" | "design" | "support" | "billing" | "staff";

export interface ActivityItem {
  id: string;
  type: ActivityType;
  at: string;
  title: string;
  detail?: string | null;
}

export const ACTIVITY_META: Record<ActivityType, { label: string; className: string; dot: string }> = {
  order: {
    label: "Orders",
    className: "bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
  },
  product: {
    label: "Products",
    className: "bg-brand-50 text-brand-700",
    dot: "bg-brand-500",
  },
  design: {
    label: "Design",
    className: "bg-purple-50 text-purple-700",
    dot: "bg-purple-500",
  },
  support: {
    label: "Support",
    className: "bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
  },
  billing: {
    label: "Billing",
    className: "bg-sky-50 text-sky-700",
    dot: "bg-sky-500",
  },
  staff: {
    label: "Staff",
    className: "bg-ink-100 text-ink-700",
    dot: "bg-ink-400",
  },
};

export const ACTIVITY_FILTERS: Array<{ value: ActivityType | "all"; label: string }> = [
  { value: "all", label: "Everything" },
  ...(Object.keys(ACTIVITY_META) as ActivityType[]).map((type) => ({
    value: type,
    label: ACTIVITY_META[type].label,
  })),
];

export interface ActivityDay<T extends { at: string }> {
  day: string;
  label: string;
  items: T[];
}

/** Groups a newest-first timeline into days, preserving order. */
export function groupActivityByDay<T extends { at: string }>(items: T[]): ActivityDay<T>[] {
  const groups: ActivityDay<T>[] = [];

  for (const item of items) {
    const parsed = parseISO(item.at);
    const day = isValid(parsed) ? format(parsed, "yyyy-MM-dd") : "unknown";
    const label = isValid(parsed) ? format(parsed, "EEEE, d MMM yyyy") : "Unknown date";

    const last = groups[groups.length - 1];
    if (last && last.day === day) {
      last.items.push(item);
    } else {
      groups.push({ day, label, items: [item] });
    }
  }

  return groups;
}
