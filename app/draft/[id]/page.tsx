import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppHeader } from "@/components/AppHeader";
import { DraftBoard } from "@/components/DraftBoard";
import { autoStartIfReady } from "@/lib/draft";
import { getClaimByUserId, getAllClaims } from "@/lib/claims";
import clientPromise from "@/lib/mongodb";
import type { PickerPlayer } from "@/lib/types";

async function getPickerPlayers(): Promise<PickerPlayer[]> {
  const client = await clientPromise;
  const docs = await client
    .db("4th-and-long")
    .collection("players")
    .find(
      { active: true, team: { $nin: [null, ""] } },
      { projection: { player_id: 1, full_name: 1, position: 1, team: 1, _id: 0 } }
    )
    .sort({ full_name: 1 })
    .toArray();
  return docs as unknown as PickerPlayer[];
}

export default async function DraftDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const userId = session.user.id!;

  const [draft, players, claim, allClaims] = await Promise.all([
    autoStartIfReady(id),
    getPickerPlayers(),
    getClaimByUserId(userId),
    getAllClaims(),
  ]);

  if (!draft) notFound();

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "radial-gradient(ellipse 900px 700px at 78% -8%, rgba(6,78,59,0.18) 0%, transparent 68%), #09090B",
      }}
    >
      <AppHeader />
      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <DraftBoard
          initialDraft={draft}
          players={players}
          week={draft.week}
          season={draft.season}
          claimedName={claim?.participant_name ?? null}
          claims={allClaims}
        />
      </main>
    </div>
  );
}
