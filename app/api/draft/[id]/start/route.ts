import { auth } from "@/auth";
import { startDraft } from "@/lib/draft";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  let pickDurationHours: number | undefined;
  try {
    const body = await req.json();
    if (body.pick_duration_hours && Number(body.pick_duration_hours) > 0) {
      pickDurationHours = Number(body.pick_duration_hours);
    }
  } catch { /* no body is fine */ }

  const draft = await startDraft(id, pickDurationHours);
  if (!draft) return NextResponse.json({ error: "Draft not found or not in pending state" }, { status: 404 });

  return NextResponse.json({ draft });
}
