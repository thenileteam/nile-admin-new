import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { errorMessage } from "@/api/client";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  createTask,
  fetchTasks,
  updateTask,
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
  Textarea,
  statusTone,
} from "@/components/ui";
import { formatDate } from "@/lib/format";

export const Tasks = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", priority: "MEDIUM", dueDate: "" });

  const query = useQuery({
    queryKey: ["tasks", page, status],
    queryFn: () => fetchTasks({ page, limit: 25, status: status || undefined }),
  });

  const create = useMutation({
    mutationFn: () =>
      createTask({
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
        dueDate: form.dueDate || null,
      }),
    onSuccess: () => {
      toast.success("Task created");
      setForm({ title: "", description: "", priority: "MEDIUM", dueDate: "" });
      setCreating(false);
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const update = useMutation({
    mutationFn: (input: { id: string; status?: string; priority?: string }) =>
      updateTask(input.id, { status: input.status, priority: input.priority }),
    onSuccess: () => {
      toast.success("Task updated");
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <div>
      <PageHeader
        title="Tasks"
        description="The internal task list shared by the team."
        actions={
          <Button onClick={() => setCreating((value) => !value)}>
            <Plus className="h-4 w-4" /> {creating ? "Close" : "New task"}
          </Button>
        }
      />

      {creating ? (
        <Card className="mb-4 p-5">
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              create.mutate();
            }}
          >
            <Field label="Title">
              <Input
                required
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />
            </Field>
            <Field label="Priority">
              <Select
                value={form.priority}
                onChange={(event) => setForm({ ...form, priority: event.target.value })}
              >
                {TASK_PRIORITIES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Description">
                <Textarea
                  required
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                />
              </Field>
            </div>
            <Field label="Due date">
              <Input
                type="date"
                value={form.dueDate}
                onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
              />
            </Field>
            <div className="flex items-end">
              <Button type="submit" loading={create.isPending} disabled={!form.title || !form.description}>
                Create task
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-4 py-3">
          <Select
            className="w-44"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Any status</option>
            {TASK_STATUSES.map((option) => (
              <option key={option} value={option}>
                {option.replaceAll("_", " ")}
              </option>
            ))}
          </Select>
          <span className="text-xs text-ink-400">{query.data?.pagination?.total ?? 0} tasks</span>
        </div>

        {query.isPending ? (
          <Spinner />
        ) : query.isError ? (
          <ErrorState message={errorMessage(query.error)} onRetry={() => void query.refetch()} />
        ) : (query.data?.tasks.length ?? 0) === 0 ? (
          <EmptyState title="No tasks" description="Create one to get started." />
        ) : (
          <ul className="divide-y divide-ink-100">
            {query.data?.tasks.map((task) => (
              <li key={task.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-ink-900">{task.title}</p>
                    <Badge tone={statusTone(task.priority)}>{task.priority}</Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-ink-600">{task.description}</p>
                  <p className="mt-1 text-xs text-ink-400">
                    Created {formatDate(task.createdAt)}
                    {task.dueDate ? ` · due ${formatDate(task.dueDate)}` : ""}
                  </p>
                </div>
                <Select
                  className="w-44"
                  value={task.status}
                  disabled={update.isPending}
                  onChange={(event) =>
                    update.mutate({ id: task.id, status: event.target.value })
                  }
                >
                  {TASK_STATUSES.map((option) => (
                    <option key={option} value={option}>
                      {option.replaceAll("_", " ")}
                    </option>
                  ))}
                </Select>
              </li>
            ))}
          </ul>
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
    </div>
  );
};
