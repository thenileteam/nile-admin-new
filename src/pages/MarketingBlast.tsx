import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { errorMessage } from "@/api/client";
import { sendMarketingBlast } from "@/api/ops";
import { Button, Card, Field, Input, PageHeader, Textarea } from "@/components/ui";

const EMPTY = { storeId: "", campaignName: "", subject: "", html: "", audience: "" };

export const MarketingBlast = () => {
  const [form, setForm] = useState(EMPTY);

  const send = useMutation({
    mutationFn: () => sendMarketingBlast(form),
    onSuccess: () => {
      toast.success("Campaign queued");
      setForm(EMPTY);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <div>
      <PageHeader
        title="Marketing blast"
        description="Send an email campaign to a store's audience. Sending is immediate."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              send.mutate();
            }}
          >
            <Field label="Store id">
              <Input
                required
                value={form.storeId}
                onChange={(event) => setForm({ ...form, storeId: event.target.value })}
              />
            </Field>
            <Field label="Campaign name">
              <Input
                required
                value={form.campaignName}
                onChange={(event) => setForm({ ...form, campaignName: event.target.value })}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Subject">
                <Input
                  required
                  value={form.subject}
                  onChange={(event) => setForm({ ...form, subject: event.target.value })}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Audience" hint="The audience key expected by the marketing service (e.g. all).">
                <Input
                  required
                  value={form.audience}
                  onChange={(event) => setForm({ ...form, audience: event.target.value })}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="HTML body">
                <Textarea
                  required
                  className="min-h-40 font-mono text-xs"
                  value={form.html}
                  onChange={(event) => setForm({ ...form, html: event.target.value })}
                  placeholder="<p>Hello…</p>"
                />
              </Field>
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit" loading={send.isPending}>
                Send campaign
              </Button>
            </div>
          </form>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold text-ink-900">Before you send</h2>
          <ul className="mt-2 space-y-2 text-sm text-ink-600">
            <li>• The campaign goes out immediately; there is no draft step.</li>
            <li>• Content is rendered as HTML — check links and merge tags.</li>
            <li>• Sending is recorded against this admin account.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
};
