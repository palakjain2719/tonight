"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/Button";

export function QRShare({ link }: { link: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(link, { width: 480, margin: 2, color: { dark: "#1c1510", light: "#f6f0e8" } }).then((url) => {
      if (!cancelled) setDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [link]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  async function shareLink() {
    const nav = navigator as Navigator & { canShare?: (data?: ShareData & { files?: File[] }) => boolean };
    if (dataUrl && nav.share) {
      try {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], "movie-night-qr.png", { type: "image/png" });
        if (nav.canShare?.({ files: [file] })) {
          await nav.share({ files: [file], title: "Movie night", text: `Scan to join tonight's watch: ${link}` });
          return;
        }
        await nav.share({ title: "Movie night", text: "Join tonight's watch", url: link });
        return;
      } catch {
        // fall back to copy
      }
    }
    await copyLink();
  }

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="rounded-3xl bg-base-950 p-4 shadow-card border border-base-700">
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dataUrl} alt="QR code to join tonight's watch" className="h-56 w-56" />
        ) : (
          <div className="h-56 w-56 animate-pulse rounded-2xl bg-base-900" />
        )}
      </div>

      <Button onClick={shareLink} fullWidth>
        Share with your partner
      </Button>

      <button type="button" onClick={copyLink} className="text-sm text-muted underline underline-offset-2 hover:text-ink">
        {copied ? "Link copied!" : "Or copy the link instead"}
      </button>
    </div>
  );
}
