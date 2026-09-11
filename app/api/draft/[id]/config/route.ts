import { auth } from "@/auth";
import { updateDraftConfig } from "@/lib/draft";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { start_time, pick_duration_hours } = await req.json();

  if (!start_time || !pick_duration_hours) {
    return NextResponse.json({ error: "start_time and pick_duration_hours are required" }, { status: 400 });
  }

  const draft = await updateDraftConfig(id, start_time, Number(pick_duration_hours));
  if (!draft) return NextResponse.json({ error: "Draft not found or not in pending state" }, { status: 404 });

  return NextResponse.json({ draft });
}
