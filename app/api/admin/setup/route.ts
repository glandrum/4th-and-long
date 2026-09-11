import { auth } from "@/auth";
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { seedDivisionsInDB } from "@/lib/divisions-db";

const DB_NAME = "4th-and-long";

// One-time production setup: creates all indexes and seeds divisions.
// Safe to run multiple times — indexes and divisions are idempotent.
export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = await clientPromise;
  const db = client.db(DB_NAME);

  // players
  const players = db.collection("players");
  await players.createIndex({ player_id: 1 }, { unique: true });
  await players.createIndex({ team: 1 });
  await players.createIndex({ position: 1 });

  // drafts
  const drafts = db.collection("drafts");
  await drafts.createIndex({ week: 1, season: 1, division: 1 });
  await drafts.createIndex({ division: 1 });

  // divisions
  const divisions = db.collection("divisions");
  await divisions.createIndex({ name: 1 }, { unique: true });

  // claims
  const claims = db.collection("claims");
  await claims.createIndex({ user_id: 1 }, { unique: true });
  await claims.createIndex({ participant_name: 1 }, { unique: true });

  // Seed divisions
  const { created } = await seedDivisionsInDB();

  return NextResponse.json({
    message: "Production setup complete.",
    indexes: { players: 3, drafts: 2, divisions: 1, claims: 2 },
    divisions: created,
  });
}
