import { auth } from "@/auth";
import { getAllClaims, getClaimByUserId, createClaim, deleteClaim } from "@/lib/claims";
import { DIVISION_PARTICIPANTS } from "@/lib/divisions";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [claims, myClaim] = await Promise.all([
    getAllClaims(),
    getClaimByUserId(session.user.id!),
  ]);

  return NextResponse.json({ claims, myClaim });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { participant_name } = await req.json();
  if (!participant_name) {
    return NextResponse.json({ error: "participant_name is required" }, { status: 400 });
  }

  // Find which division this name belongs to
  const division = Object.entries(DIVISION_PARTICIPANTS).find(([, names]) =>
    names.includes(participant_name)
  )?.[0];

  if (!division) {
    return NextResponse.json({ error: "Name not found in any division" }, { status: 400 });
  }

  const user = session.user as { id?: string; email?: string | null; name?: string | null; image?: string | null };

  const result = await createClaim({
    userId:          user.id!,
    userEmail:       user.email ?? "",
    userName:        user.name ?? user.email ?? "Unknown",
    userImage:       user.image ?? null,
    participantName: participant_name,
    division,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  return NextResponse.json({ claim: result.claim });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const deleted = await deleteClaim(session.user.id!);
  if (!deleted) return NextResponse.json({ error: "No claim found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
