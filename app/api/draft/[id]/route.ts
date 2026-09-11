import { auth } from "@/auth";
import { autoStartIfReady, getDraftById, deleteDraftById } from "@/lib/draft";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const draft = await autoStartIfReady(id);

  if (!draft) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ draft });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const draft = await getDraftById(id);
  if (!draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  if (draft.division !== "") return NextResponse.json({ error: "Cannot delete division drafts" }, { status: 403 });

  await deleteDraftById(id);
  return NextResponse.json({ ok: true });
}
