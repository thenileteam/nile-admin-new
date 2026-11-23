import { Card, PageHeader } from "@/components/ui";

export const MarketingAi = () => (

  <div>
    <PageHeader
      title="Marketing monitor"
      description="Marketing automation health."
    />
    <Card>
      <div className="p-5">
        <h2 className="text-sm font-semibold text-ink-900">Not available</h2>
        <p className="mt-2 text-sm text-ink-600">
          The marketing-service and API gateway do not provide a marketing monitor endpoint yet.
          This section does not make a request to the missing route.
        </p>
      </div>
    </Card>
  </div>
);

