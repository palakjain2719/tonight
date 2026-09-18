import { NextRequest, NextResponse } from "next/server";
import { createSession, getOrCreateCouple } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const coupleId = await getOrCreateCouple(body?.coupleId);
    const session = await createSession(coupleId);
    return NextResponse.json({ sessionId: session.id, coupleId });
  } catch (err) {
    console.error("POST /api/sessions failed", err);
    return NextResponse.json({ error: "Could not start a session. Please try again." }, { status: 500 });
  }
}
