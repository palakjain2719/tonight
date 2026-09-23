// Prompt-injection defense for the free-text mood field that reaches the Gemini prompt.
// This is the primary control; the system prompt instruction to treat it as untrusted data
// is defence-in-depth on top of this, not the sole mitigation.
export function sanitizeMoodText(input: string): string {
  return input
    .slice(0, 280)
    .replace(/[\x00-\x1F\x7F]/g, "") // strip control chars
    .replace(/```/g, "'''")           // neutralise code-fence breakout
    .replace(/\{\{|\}\}/g, "")        // strip template markers
    .trim();
}
