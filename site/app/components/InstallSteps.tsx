const STEPS = [
  {
    step: 1,
    title: "Add CNAME",
    detail: "Point go.company.com (or your link subdomain) to the Suqram rail.",
  },
  {
    step: 2,
    title: "Swap links in email templates",
    detail: "Use the rail URL format instead of direct app links for login, verify, reset.",
  },
  {
    step: 3,
    title: "(Optional) Send signed receipts",
    detail: "Send signed receipts to HubSpot or a webhook endpoint.",
  },
];

export default function InstallSteps() {
  return (
    <div className="space-y-6">
      {STEPS.map(({ step, title, detail }) => (
        <div key={step} className="flex gap-4">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#e5e7eb] bg-white text-sm font-medium text-foreground"
            aria-hidden
          >
            {step}
          </span>
          <div>
            <p className="font-medium text-foreground">{title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
