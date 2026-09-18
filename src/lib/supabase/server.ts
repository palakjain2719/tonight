import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/**
 * Server-only client using the service-role key. Bypasses RLS, so it must
 * never be imported from a client component or exposed to the browser.
 */
export function getServiceClient(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local."
    );
  }

  cached = createClient(url, key, {
    auth: { persistSession: false },
  });
  return cached;
}

export async function broadcast(
  sessionId: string,
  event: string,
  payload: Record<string, unknown> = {}
) {
  const client = getServiceClient();
  const channel = client.channel(`session:${sessionId}`);
  await channel.send({ type: "broadcast", event, payload });
  await client.removeChannel(channel);
}
