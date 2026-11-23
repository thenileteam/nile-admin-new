import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { errorMessage } from "@/api/client";
import {
  fetchOfficeHours,
  fetchOfficeHoursAnalytics,
  updateOfficeHours,
  type OfficeHoursConfig,
} from "@/api/ops";
import { Badge, Button, Card, ErrorState, Field, Input, PageHeader, Spinner, StatCard, Textarea, statusTone } from "@/components/ui";

export const OfficeHours = () => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Partial<OfficeHoursConfig>>({});

  const config = useQuery({ queryKey: ["office-hours"], queryFn: fetchOfficeHours });
  const analytics = useQuery({ queryKey: ["office-hours", "analytics"], queryFn: fetchOfficeHoursAnalytics });

  useEffect(() => {
    if (config.data) setForm(config.data);
  }, [config.data]);

  const save = useMutation({
    mutationFn: () =>
      updateOfficeHours({
        enabled: form.enabled,
        timezone: form.timezone,
        openingTime: form.openingTime,
        closingTime: form.closingTime,
        activeDays: form.activeDays,
        meetingUrl: form.meetingUrl ?? null,
        notice: form.notice ?? null,
      }),
    onSuccess: () => {
      toast.success("Office hours updated");
      void queryClient.invalidateQueries({ queryKey: ["office-hours"] });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  if (config.isPending) return <Spinner label="Loading office hours…" />;
  if (config.isError) {
    return (
      <Card>
        <ErrorState message={errorMessage(config.error)} onRetry={() => void config.refetch()} />
      </Card>
    );
  }

  return (
    <div>
      <PageHeader
        title="Office hours"
        description="The public drop-in schedule and its usage."
        actions={
          config.data?.status ? (
            <Badge tone={statusTone(config.data.status)}>{config.data.status}</Badge>
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Joins today" value={analytics.data?.today ?? 0} />
        <StatCard label="Last 7 days" value={analytics.data?.sevenDays ?? 0} />
        <StatCard label="Last 30 days" value={analytics.data?.thirtyDays ?? 0} />
      </div>

      <Card className="mt-4 p-5">
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate();
          }}
        >
          <label className="flex items-center gap-2 text-sm text-ink-800">
            <input
              type="checkbox"
              checked={Boolean(form.enabled)}
              onChange={(event) => setForm({ ...form, enabled: event.target.checked })}
              className="h-4 w-4 rounded border-ink-200"
            />
            Office hours are enabled
          </label>

          <Field label="Meeting URL" hint="Must be a full https URL.">
            <Input
              type="url"
              value={form.meetingUrl ?? ""}
              onChange={(event) => setForm({ ...form, meetingUrl: event.target.value })}
              placeholder="https://meet.google.com/…"
            />
          </Field>

          <Field label="Timezone">
            <Input
              value={form.timezone ?? ""}
              onChange={(event) => setForm({ ...form, timezone: event.target.value })}
              placeholder="Africa/Lagos"
            />
          </Field>

          <Field label="Active days" hint="Comma separated, e.g. Mon,Tue,Wed,Thu,Fri">
            <Input
              value={form.activeDays ?? ""}
              onChange={(event) => setForm({ ...form, activeDays: event.target.value })}
            />
          </Field>

          <Field label="Opening time" hint="24-hour HH:mm">
            <Input
              value={form.openingTime ?? ""}
              onChange={(event) => setForm({ ...form, openingTime: event.target.value })}
              placeholder="09:00"
            />
          </Field>

          <Field label="Closing time" hint="24-hour HH:mm">
            <Input
              value={form.closingTime ?? ""}
              onChange={(event) => setForm({ ...form, closingTime: event.target.value })}
              placeholder="17:00"
            />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Notice">
              <Textarea
                value={form.notice ?? ""}
                onChange={(event) => setForm({ ...form, notice: event.target.value })}
                placeholder="Shown to merchants on the office hours card."
              />
            </Field>
          </div>

          <div className="sm:col-span-2 flex justify-end">
            <Button type="submit" loading={save.isPending}>
              Save office hours
            </Button>
          </div>
        </form>

        {config.data?.displaySchedule ? (
          <p className="mt-4 border-t border-ink-100 pt-3 text-sm text-ink-600">
            Merchants currently see: <span className="text-ink-900">{config.data.displaySchedule}</span>
          </p>
        ) : null}
      </Card>
    </div>
  );
};
