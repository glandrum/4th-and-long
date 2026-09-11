import { auth } from "@/auth";
import { getDraftById, submitPick } from "@/lib/draft";
import { getClaimByParticipantName } from "@/lib/claims";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { pick_num, positions, winning_team } = await req.json();

  if (!pick_num || !positions) {
    return NextResponse.json({ error: "pick_num and positions are required" }, { status: 400 });
  }

  // If the pick's drafter has a claimed account, only that account may submit.
  // Unclaimed drafters remain open to anyone.
  const draft = await getDraftById(id);
  if (!draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 });

  const pick = draft.picks.find(p => p.pick_num === pick_num);
  if (pick) {
    const drafterName = draft.participants[pick.drafter_idx]?.name;
    if (drafterName) {
      const drafterClaim = await getClaimByParticipantName(drafterName);
      if (drafterClaim && drafterClaim.user_id !== session.user.id) {
        return NextResponse.json(
          { error: `${drafterName} has been claimed by another account` },
          { status: 403 }
        );
      }
    }
  }

  const result = await submitPick(id, pick_num, positions, winning_team ?? null);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ draft: result.draft });
}
