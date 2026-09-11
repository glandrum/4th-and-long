import clientPromise from "./mongodb";
import { DIVISION_PARTICIPANTS } from "./divisions";
import type { Division } from "./types";

const DB_NAME = "4th-and-long";
const COL = "divisions";

function serializeDivision(doc: Record<string, unknown>): Division {
  return {
    _id:          String(doc._id),
    name:         doc.name as string,
    participants: doc.participants as string[],
  };
}

export async function getAllDivisions(): Promise<Division[]> {
  const client = await clientPromise;
  const docs = await client
    .db(DB_NAME)
    .collection(COL)
    .find({})
    .sort({ name: 1 })
    .toArray();
  return docs.map(d => serializeDivision(d as Record<string, unknown>));
}

// Returns a map of division name → base participant names for fast join lookups.
export async function getDivisionsMap(): Promise<Map<string, string[]>> {
  const divisions = await getAllDivisions();
  return new Map(divisions.map(d => [d.name, d.participants]));
}

export async function getDivisionByName(name: string): Promise<Division | null> {
  const client = await clientPromise;
  const doc = await client.db(DB_NAME).collection(COL).findOne({ name });
  if (!doc) return null;
  return serializeDivision(doc as Record<string, unknown>);
}

// Upsert all 8 divisions from the local static data. Safe to run multiple times.
export async function seedDivisionsInDB(): Promise<{ created: number }> {
  const client = await clientPromise;
  const col = client.db(DB_NAME).collection(COL);

  const ops = Object.entries(DIVISION_PARTICIPANTS).map(([name, participants]) => ({
    replaceOne: {
      filter:      { name },
      replacement: { name, participants },
      upsert:      true,
    },
  }));

  await col.bulkWrite(ops);
  return { created: ops.length };
}
