import { NextRequest, NextResponse } from "next/server";
import { getPreferences, getSession } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(params.id);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const prefs = await getPreferences(params.id);
  return NextResponse.json({
    id: session.id,
    status: session.status,
    round: session.round,
    hasA: !!prefs.a,
    hasB: !!prefs.b,
  });
}
