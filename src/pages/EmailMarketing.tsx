import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { errorMessage } from "@/api/client";
import { fetchEmailOverview, fetchFailedEmailCampaigns, retryEmailCampaign } from "@/api/ops";
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, Spinner, statusTone } from "@/components/ui";
import { formatDateTime, formatNumber } from "@/lib/format";

export const EmailMarketing = () => {
  const queryClient = useQueryClient();
  const overview = useQuery({ queryKey: ["email", "overview"], queryFn: fetchEmailOverview });
  const failed = useQuery({ queryKey: ["email", "failed"], queryFn: fetchFailedEmailCampaigns });

  const retry = useMutation({
    mutationFn: retryEmailCampaign,
    onSuccess: () => {
      toast.success("Retry queued");
      void queryClient.invalidateQueries({ queryKey: ["email"] });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const payload =
    (overview.data?.responseObject as Record<string, unknown> | undefined) ??
    (overview.data?.data as Record<string, unknown> | undefined) ??
    overview.data ??
    {};
  const metrics = Object.entries(payload).filter(([, value]) => typeof value === "number");

  return (
    <div>
      <PageHeader title="Email marketing" description="Platform-wide sending health and failed campaigns." />

      {overview.isPending ? (
        <Card>
          <Spinner />
        </Card>
      ) : overview.isError ? (
        <Card>
          <ErrorState message={errorMessage(overview.error)} onRetry={() => void overview.refetch()} />
        </Card>
      ) : (
        <>
          {metrics.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {metrics.slice(0, 8).map(([key, value]) => (
                <div key={key} className="card p-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-600">
                    {key.replace(/([A-Z])/g, " $1").trim()}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-ink-900">{formatNumber(value as number)}</p>
                </div>
              ))}
            </div>
          ) : null}

          <Card className="mt-4 overflow-hidden">
            <div className="border-b border-ink-100 px-5 py-3">
              <h2 className="text-sm font-semibold text-ink-900">Failed campaigns</h2>
            </div>

            {failed.isPending ? (
              <Spinner />
            ) : failed.isError ? (
              <ErrorState message={errorMessage(failed.error)} onRetry={() => void failed.refetch()} />
            ) : (failed.data?.length ?? 0) === 0 ? (
              <EmptyState title="Nothing failed" description="No campaigns need a retry." />
            ) : (
              <ul className="divide-y divide-ink-100">
                {failed.data?.map((campaign, index) => {
                  const row = campaign as Record<string, unknown>;
                  const id = String(row.id ?? row.campaignId ?? index);
                  return (
                    <li key={id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                      <div>
                        <p className="text-sm font-medium text-ink-900">
                          {String(row.name ?? row.subject ?? id)}
                        </p>
                        <p className="text-xs text-ink-400">
                          {formatDateTime(String(row.createdAt ?? row.failedAt ?? ""))}
                          {row.error ? ` · ${String(row.error)}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone={statusTone("FAILED")}>failed</Badge>
                        <Button
                          variant="secondary"
                          disabled={retry.isPending}
                          onClick={() => retry.mutate(id)}
                        >
                          Retry
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
};
