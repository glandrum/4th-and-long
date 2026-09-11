import { auth } from "@/auth";
import { getDraftByWeek, createDraft } from "@/lib/draft";
import { NextRequest, NextResponse } from "next/server";
import type { CreateDraftInput } from "@/lib/types";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const week   = Number(req.nextUrl.searchParams.get("week") ?? 1);
  const season = Number(req.nextUrl.searchParams.get("season") ?? new Date().getFullYear());

  const draft = await getDraftByWeek(week, season);
  return NextResponse.json({ draft });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: CreateDraftInput = await req.json();

  // Basic validation
  if (!body.week || body.week < 1 || body.week > 18) {
    return NextResponse.json({ error: "Week must be 1–18" }, { status: 400 });
  }
  // For division-based drafts, participants are derived from the divisions collection.
  // For custom drafts (division=""), participants must be provided.
  if (!body.division && (!body.participants || body.participants.length < 2 || body.participants.length > 5)) {
    return NextResponse.json({ error: "Custom drafts need 2–5 participants" }, { status: 400 });
  }
  if (!body.start_time) {
    return NextResponse.json({ error: "Start time is required" }, { status: 400 });
  }
  if (!body.pick_duration_hours || body.pick_duration_hours <= 0) {
    return NextResponse.json({ error: "Pick duration must be positive" }, { status: 400 });
  }

  try {
    const draft = await createDraft({
      ...body,
      season: body.season ?? new Date().getFullYear(),
    });
    return NextResponse.json({ draft }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
