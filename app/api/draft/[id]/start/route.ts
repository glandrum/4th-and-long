import { auth } from "@/auth";
import { startDraft } from "@/lib/draft";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const draft = await startDraft(id);
  if (!draft) return NextResponse.json({ error: "Draft not found or not in pending state" }, { status: 404 });

  return NextResponse.json({ draft });
}
