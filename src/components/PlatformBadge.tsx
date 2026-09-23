import type { StreamingLink } from "@/types";

const TYPE_LABEL: Record<StreamingLink["type"], string> = {
  free: "Free",
  subscription: "Subscription",
  buy: "Buy",
  rent: "Rent",
  addon: "Add-on",
};

export function PlatformBadge({ platform }: { platform: StreamingLink }) {
  return (
    <a
      href={platform.link}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between gap-3 rounded-2xl border border-base-700 bg-white px-4 py-3.5 shadow-card transition-colors hover:border-ember-500/60 hover:bg-base-950"
    >
      <span className="font-medium text-ink">{platform.serviceName}</span>
      <span className="flex items-center gap-2 text-sm text-muted">
        {TYPE_LABEL[platform.type]}
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
          <path d="M7 17 17 7M17 7H9M17 7v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </a>
  );
}
