// Manual subscription upgrade for one merchant, mirroring the old console flow:
// pick a plan, pick how long it runs, then write the plan and end date through
// the store-service manual-upgrade endpoint.
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addMonths } from "date-fns";
import { CalendarClock, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { errorMessage } from "@/api/client";
import { upgradeStorePlan, type StorePlanName } from "@/api/merchants";
import { Badge, Button, Modal } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";

interface UpgradePlanModalProps {
  open: boolean;
  store: { id: string; name: string };
  currentPlanName?: string | null;
  onClose: () => void;
}

const PLANS: Array<{ backend: StorePlanName; label: string; blurb: string }> = [
  {
    backend: "BASIC PLAN",
    label: "Starter",
    blurb: "Essentials for a store taking its first orders.",
  },
  {
    backend: "BUSINESS PLAN",
    label: "Growth",
    blurb: "More products, staff seats and marketing tools.",
  },
  {
    backend: "PRO PLAN",
    label: "Pro",
    blurb: "The full catalogue, advanced marketing and priority support.",
  },
];

const DURATIONS = [
  { label: "1 month", months: 1 },
  { label: "3 months", months: 3 },
  { label: "6 months", months: 6 },
  { label: "1 year", months: 12 },
];

export const UpgradePlanModal = ({ open, store, currentPlanName, onClose }: UpgradePlanModalProps) => {
  const queryClient = useQueryClient();
  const [planName, setPlanName] = useState<StorePlanName | null>(null);
  const [months, setMonths] = useState<number | null>(null);

  const plan = PLANS.find((option) => option.backend === planName) ?? null;
  const endDate = months ? addMonths(new Date(), months) : null;

  const close = () => {
    setPlanName(null);
    setMonths(null);
    onClose();
  };

  const mutation = useMutation({
    mutationFn: () => {
      if (!planName || !endDate) throw new Error("Choose a plan and a duration first");
      return upgradeStorePlan({
        storeId: store.id,
        subscriptionName: planName,
        endDate: endDate.toISOString(),
      });
    },
    onSuccess: () => {
      toast.success(`${store.name} upgraded to ${plan?.label ?? planName}`);
      void queryClient.invalidateQueries({ queryKey: ["store-follow", store.id] });
      void queryClient.invalidateQueries({ queryKey: ["merchants"] });
      close();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <Modal
      open={open}
      onClose={close}
      title="Upgrade merchant plan"
      description={`Set a new plan for ${store.name}. This replaces their current plan immediately.`}
      maxWidth="max-w-lg"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
        className="space-y-5"
      >
        <div className="rounded-xl border border-ink-100 bg-ink-50 px-3 py-2.5 text-xs text-ink-600">
          Current plan:{" "}
          <span className="font-semibold text-ink-900">{currentPlanName ?? "No subscription"}</span>
        </div>

        <fieldset>
          <legend className="label">Plan</legend>
          <div className="space-y-2">
            {PLANS.map((option) => {
              const selected = planName === option.backend;
              return (
                <button
                  key={option.backend}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setPlanName(option.backend)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                    selected
                      ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500"
                      : "border-ink-200 hover:border-ink-300 hover:bg-ink-50",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                      selected ? "border-brand-600 bg-brand-600 text-white" : "border-ink-300 bg-white",
                    )}
                  >
                    {selected ? <Check className="h-3 w-3" /> : null}
                  </span>
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-ink-900">{option.label}</span>
                      {selected ? <Badge tone="brand">Selected</Badge> : null}
                    </span>
                    <span className="mt-0.5 block text-xs text-ink-600">{option.blurb}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="label">Duration</legend>
          <div className="flex flex-wrap gap-2">
            {DURATIONS.map((option) => {
              const selected = months === option.months;
              return (
                <button
                  key={option.months}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setMonths(option.months)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                    selected
                      ? "border-brand-600 bg-brand-600 text-white"
                      : "border-ink-200 text-ink-700 hover:border-ink-300 hover:bg-ink-50",
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="flex items-start gap-2 rounded-xl border border-ink-100 px-3 py-2.5 text-xs text-ink-600">
          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" aria-hidden />
          <p>
            {endDate ? (
              <>
                The new period ends on{" "}
                <span className="font-semibold text-ink-900">{formatDate(endDate)}</span>. The merchant gets an
                activation email confirming the manual upgrade.
              </>
            ) : (
              "Choose a duration to see when the new plan period ends."
            )}
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending} disabled={!planName || !months}>
            {plan ? `Upgrade to ${plan.label}` : "Upgrade plan"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
