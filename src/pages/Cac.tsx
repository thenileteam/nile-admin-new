import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { errorMessage } from "@/api/client";
import {
  CAC_DECISIONS,
  fetchCacApplications,
  reviewCacApplication,
  type CacApplication,
} from "@/api/ops";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Input,
  PageHeader,
  Pagination,
  Select,
  Spinner,
  statusTone,
} from "@/components/ui";
import { formatDate } from "@/lib/format";

export const Cac = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [reviewing, setReviewing] = useState<CacApplication | null>(null);
  const [decision, setDecision] = useState<(typeof CAC_DECISIONS)[number]>("UNDER_REVIEW");
  const [note, setNote] = useState("");

  const query = useQuery({
    queryKey: ["cac", page, status, search],
    queryFn: () =>
      fetchCacApplications({
        page,
        limit: 25,
        status: status || undefined,
        search: search.trim() || undefined,
      }),
  });

  const review = useMutation({
    mutationFn: () =>
      reviewCacApplication(reviewing?.id as string, {
        decision,
        note: note.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success("Application updated");
      setReviewing(null);
      setNote("");
      void queryClient.invalidateQueries({ queryKey: ["cac"] });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <div>
      <PageHeader title="CAC registrations" description="Business name and limited company filings." />

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-ink-100 px-4 py-3">
          <input
            className="input max-w-xs"
            placeholder="Search business or store"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          <Select
            className="w-48"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Any status</option>
            {["SUBMITTED", "UNDER_REVIEW", "INFO_REQUIRED", "PROCESSING", "APPROVED", "REJECTED"].map((option) => (
              <option key={option} value={option}>
                {option.replaceAll("_", " ")}
              </option>
            ))}
          </Select>
          <span className="ml-auto text-xs text-ink-400">
            {query.data?.pagination?.total ?? 0} applications
          </span>
        </div>

        {query.isPending ? (
          <Spinner />
        ) : query.isError ? (
          <ErrorState message={errorMessage(query.error)} onRetry={() => void query.refetch()} />
        ) : (query.data?.applications.length ?? 0) === 0 ? (
          <EmptyState title="No applications" />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-ink-50">
                <tr>
                  <th className="th">Application</th>
                  <th className="th">Package</th>
                  <th className="th">Payment</th>
                  <th className="th">Status</th>
                  <th className="th">Created</th>
                  <th className="th text-right">Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {query.data?.applications.map((application) => (
                  <tr key={application.id}>
                    <td className="td">
                      <p className="font-medium text-ink-900">
                        {application.businessName ?? application.id.slice(0, 8)}
                      </p>
                      <p className="font-mono text-xs text-ink-400">
                        {application.storeId ?? application.id}
                      </p>
                    </td>
                    <td className="td text-sm">{(application.packageKey ?? "—").replaceAll("_", " ")}</td>
                    <td className="td">
                      <Badge tone={statusTone(application.paymentStatus)}>
                        {application.paymentStatus ?? "—"}
                      </Badge>
                    </td>
                    <td className="td">
                      <Badge tone={statusTone(application.status)}>
                        {application.status.replaceAll("_", " ")}
                      </Badge>
                    </td>
                    <td className="td text-sm text-ink-600">{formatDate(application.createdAt)}</td>
                    <td className="td text-right">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setReviewing(application);
                          setDecision("UNDER_REVIEW");
                        }}
                      >
                        Decide
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {query.data?.pagination ? (
          <Pagination
            page={query.data.pagination.currentPage}
            totalPages={query.data.pagination.totalPages}
            total={query.data.pagination.total}
            onChange={setPage}
          />
        ) : null}
      </Card>

      {reviewing ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink-900/40 px-4">
          <Card className="w-full max-w-md p-5">
            <h2 className="text-sm font-semibold text-ink-900">Review application</h2>
            <p className="mt-1 text-sm text-ink-600">{reviewing.businessName ?? reviewing.id}</p>
            <form
              className="mt-4 space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                review.mutate();
              }}
            >
              <Field label="Decision">
                <Select
                  value={decision}
                  onChange={(event) => setDecision(event.target.value as typeof decision)}
                >
                  {CAC_DECISIONS.map((option) => (
                    <option key={option} value={option}>
                      {option.replaceAll("_", " ")}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Note to the merchant">
                <Input value={note} onChange={(event) => setNote(event.target.value)} />
              </Field>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" type="button" onClick={() => setReviewing(null)}>
                  Cancel
                </Button>
                <Button type="submit" loading={review.isPending}>
                  Apply decision
                </Button>
              </div>
            </form>
          </Card>
        </div>
      ) : null}
    </div>
  );
};
