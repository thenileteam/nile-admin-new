import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { errorMessage } from "@/api/client";
import {
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  fetchSupportTicket,
  fetchSupportTickets,
  replyToTicket,
  updateTicketStatus,
} from "@/api/ops";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  Pagination,
  Select,
  Spinner,
  Textarea,
  statusTone,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatDateTime, formatRelative } from "@/lib/format";

export const Support = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("OPEN");
  const [selected, setSelected] = useState<string | null>(null);
  const [reply, setReply] = useState("");

  const tickets = useQuery({
    queryKey: ["support", page, status],
    queryFn: () => fetchSupportTickets({ page, limit: 20, status: status || undefined }),
  });

  const ticket = useQuery({
    queryKey: ["support", "ticket", selected],
    queryFn: () => fetchSupportTicket(selected as string),
    enabled: Boolean(selected),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["support"] });
  };

  const sendReply = useMutation({
    mutationFn: () => replyToTicket(selected as string, reply.trim()),
    onSuccess: () => {
      setReply("");
      toast.success("Reply sent to the merchant");
      invalidate();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const changeStatus = useMutation({
    mutationFn: (input: { status: string; priority?: string }) =>
      updateTicketStatus(selected as string, input),
    onSuccess: () => {
      toast.success("Ticket updated");
      invalidate();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <div>
      <PageHeader title="Support" description="Merchant tickets, replies and status." />

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="overflow-hidden lg:col-span-2">
          <div className="flex items-center gap-2 border-b border-ink-100 px-4 py-3">
            <Select
              className="w-40"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              {TICKET_STATUSES.map((option) => (
                <option key={option} value={option}>
                  {option.replaceAll("_", " ")}
                </option>
              ))}
            </Select>
          </div>

          {tickets.isPending ? (
            <Spinner />
          ) : tickets.isError ? (
            <ErrorState message={errorMessage(tickets.error)} onRetry={() => void tickets.refetch()} />
          ) : (tickets.data?.tickets.length ?? 0) === 0 ? (
            <EmptyState title="No tickets" />
          ) : (
            <ul className="max-h-[32rem] divide-y divide-ink-100 overflow-y-auto">
              {tickets.data?.tickets.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(row.id)}
                    className={cn(
                      "w-full px-4 py-3 text-left transition hover:bg-ink-50",
                      selected === row.id && "bg-ink-50",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-ink-900">{row.ticketNumber}</p>
                      <Badge tone={statusTone(row.status)}>{row.status.replaceAll("_", " ")}</Badge>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-ink-700">{row.issueLabel}</p>
                    <p className="text-xs text-ink-400">
                      {row.categoryLabel} · {formatRelative(row.createdAt)}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {tickets.data?.pagination ? (
            <Pagination
              page={tickets.data.pagination.currentPage}
              totalPages={tickets.data.pagination.totalPages}
              total={tickets.data.pagination.total}
              onChange={setPage}
            />
          ) : null}
        </Card>

        <Card className="overflow-hidden lg:col-span-3">
          {!selected ? (
            <EmptyState title="Select a ticket" description="Open a ticket to read the thread and reply." />
          ) : ticket.isPending ? (
            <Spinner />
          ) : ticket.isError ? (
            <ErrorState message={errorMessage(ticket.error)} onRetry={() => void ticket.refetch()} />
          ) : (
            <div>
              <div className="border-b border-ink-100 px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-ink-900">
                    {ticket.data?.ticket.ticketNumber} · {ticket.data?.ticket.issueLabel}
                  </h2>
                  <div className="flex gap-2">
                    <Select
                      className="w-36"
                      value={ticket.data?.ticket.status}
                      onChange={(event) => changeStatus.mutate({ status: event.target.value })}
                    >
                      {TICKET_STATUSES.map((option) => (
                        <option key={option} value={option}>
                          {option.replaceAll("_", " ")}
                        </option>
                      ))}
                    </Select>
                    <Select
                      className="w-32"
                      value={ticket.data?.ticket.priority}
                      onChange={(event) =>
                        changeStatus.mutate({
                          status: ticket.data?.ticket.status ?? "OPEN",
                          priority: event.target.value,
                        })
                      }
                    >
                      {TICKET_PRIORITIES.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
                <p className="mt-1 text-xs text-ink-400">
                  {ticket.data?.ticket.categoryLabel} · submitted{" "}
                  {formatDateTime(ticket.data?.ticket.createdAt)}
                </p>
              </div>

              <div className="max-h-80 space-y-3 overflow-y-auto px-5 py-4">
                {(ticket.data?.messages.length ?? 0) === 0 ? (
                  <p className="text-sm text-ink-500">No messages on this ticket yet.</p>
                ) : (
                  ticket.data?.messages.map((message) => (
                    <div key={message.id} className="rounded-lg border border-ink-100 bg-ink-50 px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-ink-700">
                          {message.authorName ?? message.authorRole ?? "Message"}
                        </p>
                        <span className="text-xs text-ink-400">{formatRelative(message.createdAt)}</span>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-ink-800">{message.body}</p>
                    </div>
                  ))
                )}
              </div>

              <form
                className="border-t border-ink-100 px-5 py-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (reply.trim()) sendReply.mutate();
                }}
              >
                <Textarea
                  placeholder="Write a reply to the merchant…"
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                />
                <div className="mt-2 flex justify-end">
                  <Button type="submit" loading={sendReply.isPending} disabled={!reply.trim()}>
                    Send reply
                  </Button>
                </div>
              </form>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
