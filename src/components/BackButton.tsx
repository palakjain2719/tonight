"use client";

import { useRouter } from "next/navigation";

export function BackButton({ href }: { href?: string }) {
  const router = useRouter();

  function handleBack() {
    if (href) router.push(href);
    else router.back();
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      aria-label="Go back"
      className="inline-flex items-center gap-1.5 text-muted hover:text-ink transition-colors"
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="text-sm font-medium">Back</span>
    </button>
  );
}
