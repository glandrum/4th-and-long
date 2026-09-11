import clientPromise from "./mongodb";
import type { Player } from "./types";

const DB_NAME = "4th-and-long";
const COLLECTION = "players";

export async function getPlayersFromDB(): Promise<Player[]> {
  const client = await clientPromise;
  const col = client.db(DB_NAME).collection(COLLECTION);

  const docs = await col
    .find({ active: true, team: { $nin: [null, ""] }, position: { $in: ["QB", "RB", "WR", "TE"] } })
    .sort({ full_name: 1 })
    .toArray();

  return docs.map((doc) => ({
    player_id:     String(doc.player_id ?? ""),
    full_name:     String(doc.full_name ?? ""),
    position:      String(doc.position ?? ""),
    team:          String(doc.team ?? ""),
    number:        typeof doc.number === "number" ? doc.number : null,
    age:           typeof doc.age === "number" ? doc.age : null,
    years_exp:     typeof doc.years_exp === "number" ? doc.years_exp : null,
    height:        typeof doc.height === "string" ? doc.height : null,
    weight:        typeof doc.weight === "string" ? doc.weight : null,
    college:       typeof doc.college === "string" ? doc.college : null,
    status:        typeof doc.status === "string" ? doc.status : null,
    injury_status: typeof doc.injury_status === "string" ? doc.injury_status : null,
  }));
}

export async function getPlayerTeamMap(playerIds: string[]): Promise<Map<string, string>> {
  if (playerIds.length === 0) return new Map();
  const client = await clientPromise;
  const docs = await client
    .db(DB_NAME)
    .collection(COLLECTION)
    .find({ player_id: { $in: playerIds } }, { projection: { player_id: 1, team: 1 } })
    .toArray();
  return new Map(docs.map(d => [String(d.player_id), String(d.team ?? "")]));
}

export async function getPlayerCount(): Promise<number> {
  const client = await clientPromise;
  return client
    .db(DB_NAME)
    .collection(COLLECTION)
    .countDocuments({ active: true });
}

export async function syncPlayersFromSleeper(): Promise<{
  synced: number;
  deactivated: number;
  duration: number;
}> {
  const start = Date.now();

  const res = await fetch("https://api.sleeper.app/v1/players/nfl");
  if (!res.ok) throw new Error(`Sleeper API responded ${res.status}`);

  const raw: Record<string, Record<string, unknown>> = await res.json();

  const active = Object.values(raw).filter(
    (p) =>
      p.active === true &&
      typeof p.team === "string" && p.team &&
      typeof p.full_name === "string" && p.full_name &&
      typeof p.position === "string" &&
      ["QB", "RB", "WR", "TE"].includes(p.position as string)
  );

  const client = await clientPromise;
  const col = client.db(DB_NAME).collection(COLLECTION);

  // Ensure indexes exist (no-op if already present)
  await col.createIndex({ player_id: 1 }, { unique: true });
  await col.createIndex({ team: 1 });
  await col.createIndex({ position: 1 });

  // Upsert all active players in one bulk operation
  const ops = active.map((p) => ({
    updateOne: {
      filter: { player_id: String(p.player_id) },
      update: {
        $set: {
          player_id:     String(p.player_id),
          full_name:     String(p.full_name),
          position:      String(p.position),
          team:          String(p.team),
          number:        typeof p.number === "number" ? p.number : null,
          age:           typeof p.age === "number" ? p.age : null,
          years_exp:     typeof p.years_exp === "number" ? p.years_exp : null,
          height:        typeof p.height === "string" ? p.height : null,
          weight:        typeof p.weight === "string" ? p.weight : null,
          college:       typeof p.college === "string" ? p.college : null,
          status:        typeof p.status === "string" ? p.status : null,
          injury_status: typeof p.injury_status === "string" ? p.injury_status : null,
          active:        true,
          synced_at:     new Date(),
        },
      },
      upsert: true,
    },
  }));

  await col.bulkWrite(ops, { ordered: false });

  // Mark players no longer on a team as inactive
  const activeIds = active.map((p) => String(p.player_id));
  const { modifiedCount: deactivated } = await col.updateMany(
    { player_id: { $nin: activeIds }, active: true },
    { $set: { active: false, synced_at: new Date() } }
  );

  return {
    synced: active.length,
    deactivated,
    duration: Date.now() - start,
  };
}
