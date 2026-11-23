import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { errorMessage } from "@/api/client";
import { fetchStoreTransfers, initiateTransfer } from "@/api/ops";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Input,
  PageHeader,
  Spinner,
  statusTone,
} from "@/components/ui";
import { formatDateTime, formatMoney } from "@/lib/format";

export const Transfers = () => {
  const [storeId, setStoreId] = useState("");
  const [lookup, setLookup] = useState("");
  const [form, setForm] = useState({ bankAccountId: "", amount: "", narration: "" });

  const transfers = useQuery({
    queryKey: ["transfers", lookup],
    queryFn: () => fetchStoreTransfers(lookup),
    enabled: Boolean(lookup),
  });

  const initiate = useMutation({
    mutationFn: () =>
      initiateTransfer({
        storeId: lookup,
        bankAccountId: form.bankAccountId.trim(),
        amount: Number(form.amount),
        narration: form.narration.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success("Transfer initiated");
      setForm({ bankAccountId: "", amount: "", narration: "" });
      void transfers.refetch();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <div>
      <PageHeader
        title="Bank transfers"
        description="Move a store's settlement to its verified bank account."
      />

      <Card className="mb-4 p-4">
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            setLookup(storeId.trim());
          }}
        >
          <div className="min-w-64 flex-1">
            <Field label="Store id">
              <Input
                required
                value={storeId}
                onChange={(event) => setStoreId(event.target.value)}
                placeholder="Open a merchant from Merchants to copy its id"
              />
            </Field>
          </div>
          <Button type="submit" disabled={!storeId.trim()}>
            Load transfers
          </Button>
        </form>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          <div className="border-b border-ink-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-ink-900">Transfers</h2>
          </div>
          {!lookup ? (
            <EmptyState title="Load a store" description="Enter a store id above to see its transfer history." />
          ) : transfers.isPending ? (
            <Spinner />
          ) : transfers.isError ? (
            <ErrorState message={errorMessage(transfers.error)} onRetry={() => void transfers.refetch()} />
          ) : (transfers.data?.length ?? 0) === 0 ? (
            <EmptyState title="No transfers for this store" />
          ) : (
            <ul className="divide-y divide-ink-100">
              {transfers.data?.map((transfer) => (
                <li key={transfer.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-ink-900">{formatMoney(transfer.amount)}</p>
                    <p className="text-xs text-ink-400">
                      {formatDateTime(transfer.createdAt)}
                      {transfer.reference ? ` · ${transfer.reference}` : ""}
                    </p>
                  </div>
                  <Badge tone={statusTone(transfer.status)}>{transfer.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold text-ink-900">Initiate transfer</h2>
          <form
            className="mt-3 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              initiate.mutate();
            }}
          >
            <Field label="Bank account id" hint="The store's verified NGN account record.">
              <Input
                required
                value={form.bankAccountId}
                onChange={(event) => setForm({ ...form, bankAccountId: event.target.value })}
              />
            </Field>
            <Field label="Amount (NGN)">
              <Input
                type="number"
                min={1}
                step="0.01"
                required
                value={form.amount}
                onChange={(event) => setForm({ ...form, amount: event.target.value })}
              />
            </Field>
            <Field label="Narration">
              <Input
                value={form.narration}
                onChange={(event) => setForm({ ...form, narration: event.target.value })}
              />
            </Field>
            <Button type="submit" loading={initiate.isPending} disabled={!lookup} className="w-full">
              Initiate
            </Button>
            {!lookup ? <p className="text-xs text-ink-400">Load a store first.</p> : null}
          </form>
        </Card>
      </div>
    </div>
  );
};
