import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { HEALTH_ENDPOINTS, checkHealth } from "@/api/overview";
import { Badge, Button, Card, PageHeader, Spinner } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatRelative } from "@/lib/format";

export const Health = () => {
  const query = useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const results = await Promise.all(
        HEALTH_ENDPOINTS.map(async (endpoint) => ({
          ...endpoint,
          ...(await checkHealth(endpoint.path)),
        })),
      );
      return results;
    },
    refetchInterval: 60_000,
  });

  return (
    <div>
      <PageHeader
        title="System health"
        description="Direct health checks through the gateway. Refreshes every minute."
        actions={
          <Button variant="secondary" onClick={() => void query.refetch()} loading={query.isFetching}>
            <RefreshCw className="h-4 w-4" /> Check now
          </Button>
        }
      />

      <Card className="overflow-hidden">
        {query.isPending ? (
          <Spinner label="Checking services…" />
        ) : (
          <ul className="divide-y divide-ink-100">
            {query.data?.map((result) => (
              <li key={result.name} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "h-2.5 w-2.5 rounded-full",
                      result.ok ? "bg-emerald-500" : "bg-red-500",
                    )}
                  />
                  <div>
                    <p className="text-sm font-medium text-ink-900">{result.name}</p>
                    <p className="font-mono text-xs text-ink-400">{result.path}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-ink-400">{result.latencyMs} ms</span>
                  <Badge tone={result.ok ? "success" : "danger"}>{result.ok ? "Healthy" : "Unreachable"}</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <p className="mt-3 text-xs text-ink-400">
        Last checked {query.dataUpdatedAt ? formatRelative(new Date(query.dataUpdatedAt)) : "—"}.
      </p>
    </div>
  );
};
