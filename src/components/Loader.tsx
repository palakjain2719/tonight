const MESSAGES = [
  "Reading what you both wrote...",
  "Looking for where your tastes overlap...",
  "Asking Gemini to referee...",
  "Pulling titles from TMDB...",
  "Almost there...",
];

export function Loader({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="relative h-12 w-12">
        <div className="absolute inset-0 rounded-full border-2 border-base-700" />
        <div className="absolute inset-0 rounded-full border-2 border-t-ember-500 border-r-ember-500/40 border-b-transparent border-l-transparent animate-spin" />
      </div>
      <p className="text-sm text-muted">{label}</p>
    </div>
  );
}

export function rotatingMessage(seconds: number): string {
  const idx = Math.min(MESSAGES.length - 1, Math.floor(seconds / 3));
  return MESSAGES[idx] ?? MESSAGES[0]!;
}
