import { auth } from "@/auth";
import { seedDrafts } from "@/lib/draft";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const season = Number(body.season ?? new Date().getFullYear());

  try {
    const result = await seedDrafts(season);
    return NextResponse.json({
      message: `Seeded ${result.divisions} divisions and ${result.drafts} drafts for ${season} season.`,
      ...result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
