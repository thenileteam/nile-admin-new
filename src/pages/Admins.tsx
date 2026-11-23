import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { createAdmin, listAdmins, resetAdminPassword, updateAdmin, type AdminSummary } from "@/api/admins";
import { errorMessage } from "@/api/client";
import { useAuth } from "@/auth/store";
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
  PasswordInput,
  Select,
  Spinner,
  statusTone,
} from "@/components/ui";
import { formatDateTime, formatRelative } from "@/lib/format";

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  role: "ADMIN" as "ADMIN" | "SUPERADMIN",
};

export const Admins = () => {
  const currentUser = useAuth((state) => state.user);
  const isSuperAdmin = currentUser?.role === "SUPERADMIN";
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [resetFor, setResetFor] = useState<AdminSummary | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const query = useQuery({
    queryKey: ["admins", page, search],
    queryFn: () => listAdmins({ page, limit: 20, search: search.trim() || undefined }),
  });

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ["admins"] });

  const createMutation = useMutation({
    mutationFn: () => createAdmin(form),
    onSuccess: (admin) => {
      toast.success(`${admin.firstName} ${admin.lastName} can now sign in`);
      setForm(EMPTY_FORM);
      setCreating(false);
      invalidate();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const updateMutation = useMutation({
    mutationFn: (input: { id: string; changes: Parameters<typeof updateAdmin>[1]; message: string }) =>
      updateAdmin(input.id, input.changes).then((admin) => ({ admin, message: input.message })),
    onSuccess: ({ message }) => {
      toast.success(message);
      invalidate();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const resetMutation = useMutation({
    mutationFn: () => resetAdminPassword(resetFor?.id ?? "", newPassword),
    onSuccess: () => {
      toast.success("Password updated. Their sessions were signed out.");
      setResetFor(null);
      setNewPassword("");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const admins = query.data?.admins ?? [];
  const pagination = query.data?.pagination;

  return (
    <div>
      <PageHeader
        title="Admins"
        description="Who can sign in to admin.nile.ng."
        actions={
          isSuperAdmin ? (
            <Button onClick={() => setCreating((value) => !value)}>
              <Plus className="h-4 w-4" /> {creating ? "Close" : "Add admin"}
            </Button>
          ) : (
            <Badge tone="neutral">Read-only as ADMIN</Badge>
          )
        }
      />

      {creating && isSuperAdmin ? (
        <Card className="mb-4 p-5">
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              createMutation.mutate();
            }}
          >
            <Field label="First name">
              <Input
                required
                value={form.firstName}
                onChange={(event) => setForm({ ...form, firstName: event.target.value })}
              />
            </Field>
            <Field label="Last name">
              <Input
                required
                value={form.lastName}
                onChange={(event) => setForm({ ...form, lastName: event.target.value })}
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                required
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </Field>
            <Field label="Temporary password" hint="At least 8 characters. They can change it after signing in.">
              <PasswordInput
                autoComplete="new-password"
                required
                minLength={8}
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
              />
            </Field>
            <Field label="Role">
              <Select
                value={form.role}
                onChange={(event) => setForm({ ...form, role: event.target.value as "ADMIN" | "SUPERADMIN" })}
              >
                <option value="ADMIN">ADMIN — read-only console access</option>
                <option value="SUPERADMIN">SUPERADMIN — can manage admins</option>
              </Select>
            </Field>
            <div className="flex items-end">
              <Button type="submit" loading={createMutation.isPending} className="w-full sm:w-auto">
                Create admin
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-4 py-3">
          <input
            className="input max-w-xs"
            placeholder="Search name or email"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          <span className="text-xs text-ink-400">{pagination?.total ?? admins.length} admins</span>
        </div>

        {query.isPending ? (
          <Spinner />
        ) : query.isError ? (
          <ErrorState message={errorMessage(query.error)} onRetry={() => void query.refetch()} />
        ) : admins.length === 0 ? (
          <EmptyState title="No admins found" description="Create the first admin account above." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-ink-50">
                <tr>
                  <th className="th">Admin</th>
                  <th className="th">Role</th>
                  <th className="th">Status</th>
                  <th className="th">Last sign-in</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {admins.map((admin) => {
                  const isSelf = admin.id === currentUser?.id;
                  return (
                    <tr key={admin.id}>
                      <td className="td">
                        <p className="font-medium text-ink-900">
                          {admin.firstName} {admin.lastName} {isSelf ? <span className="text-xs text-ink-400">(you)</span> : null}
                        </p>
                        <p className="text-xs text-ink-400">{admin.email}</p>
                      </td>
                      <td className="td">
                        <Badge tone={admin.role === "SUPERADMIN" ? "brand" : "neutral"}>{admin.role}</Badge>
                      </td>
                      <td className="td">
                        <Badge tone={admin.active ? "success" : "danger"}>{admin.active ? "Active" : "Deactivated"}</Badge>
                      </td>
                      <td className="td">
                        <span title={formatDateTime(admin.lastLoginAt)}>
                          {admin.lastLoginAt ? formatRelative(admin.lastLoginAt) : "Never"}
                        </span>
                      </td>
                      <td className="td">
                        <div className="flex flex-wrap justify-end gap-2">
                          {isSuperAdmin ? (
                            <>
                              <Button
                                variant="secondary"
                                disabled={updateMutation.isPending}
                                onClick={() =>
                                  updateMutation.mutate({
                                    id: admin.id,
                                    changes: { active: !admin.active },
                                    message: admin.active ? "Admin deactivated" : "Admin reactivated",
                                  })
                                }
                              >
                                {admin.active ? "Deactivate" : "Reactivate"}
                              </Button>
                              <Button
                                variant="secondary"
                                disabled={updateMutation.isPending}
                                onClick={() =>
                                  updateMutation.mutate({
                                    id: admin.id,
                                    changes: { role: admin.role === "SUPERADMIN" ? "ADMIN" : "SUPERADMIN" },
                                    message: "Role updated",
                                  })
                                }
                              >
                                {admin.role === "SUPERADMIN" ? "Make admin" : "Make superadmin"}
                              </Button>
                              <Button variant="danger" onClick={() => setResetFor(admin)}>
                                Reset password
                              </Button>
                            </>
                          ) : (
                            <span className="text-xs text-ink-400">Superadmin required</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pagination ? (
          <Pagination
            page={pagination.currentPage}
            totalPages={pagination.totalPages}
            total={pagination.total}
            onChange={setPage}
          />
        ) : null}
      </Card>

      {resetFor ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink-900/40 px-4">
          <Card className="w-full max-w-sm p-5">
            <h2 className="text-sm font-semibold text-ink-900">Reset password</h2>
            <p className="mt-1 text-sm text-ink-600">
              {resetFor.email} will be signed out of all sessions.
            </p>
            <form
              className="mt-4 space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                resetMutation.mutate();
              }}
            >
              <Field label="New password" hint="At least 8 characters.">
                <PasswordInput
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
              </Field>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" type="button" onClick={() => setResetFor(null)}>
                  Cancel
                </Button>
                <Button type="submit" loading={resetMutation.isPending}>
                  Update password
                </Button>
              </div>
            </form>
          </Card>
        </div>
      ) : null}

      {!isSuperAdmin ? (
        <p className="mt-3 text-xs text-ink-400">
          You are signed in as ADMIN: you can review accounts and sessions, while only a SUPERADMIN can change them.
        </p>
      ) : null}
      <p className="mt-3 text-xs text-ink-400">
        Status colours: <Badge tone={statusTone("ACTIVE")}>active</Badge>{" "}
        <Badge tone={statusTone("SUSPENDED")}>deactivated</Badge>
      </p>
    </div>
  );
};
