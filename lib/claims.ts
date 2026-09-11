import clientPromise from "./mongodb";
import type { Claim } from "./types";

const DB_NAME = "4th-and-long";
const COL = "claims";

function serialize(doc: Record<string, unknown>): Claim {
  return {
    _id:              String(doc._id),
    user_id:          doc.user_id as string,
    user_email:       doc.user_email as string,
    user_name:        doc.user_name as string,
    user_image:       (doc.user_image as string | null) ?? null,
    participant_name: doc.participant_name as string,
    division:         doc.division as string,
    claimed_at:       doc.claimed_at as string,
  };
}

export async function getClaimByUserId(userId: string): Promise<Claim | null> {
  const client = await clientPromise;
  const doc = await client.db(DB_NAME).collection(COL).findOne({ user_id: userId });
  return doc ? serialize(doc as Record<string, unknown>) : null;
}

export async function getClaimByParticipantName(name: string): Promise<Claim | null> {
  const client = await clientPromise;
  const doc = await client.db(DB_NAME).collection(COL).findOne({ participant_name: name });
  return doc ? serialize(doc as Record<string, unknown>) : null;
}

export async function getAllClaims(): Promise<Claim[]> {
  const client = await clientPromise;
  const docs = await client.db(DB_NAME).collection(COL).find({}).toArray();
  return docs.map(d => serialize(d as Record<string, unknown>));
}

export async function deleteClaim(userId: string): Promise<boolean> {
  const client = await clientPromise;
  const result = await client.db(DB_NAME).collection(COL).deleteOne({ user_id: userId });
  return result.deletedCount === 1;
}

export async function createClaim(opts: {
  userId: string;
  userEmail: string;
  userName: string;
  userImage: string | null;
  participantName: string;
  division: string;
}): Promise<{ claim: Claim } | { error: string }> {
  const client = await clientPromise;
  const col = client.db(DB_NAME).collection(COL);

  const [existingUser, existingName] = await Promise.all([
    col.findOne({ user_id: opts.userId }),
    col.findOne({ participant_name: opts.participantName }),
  ]);

  if (existingUser) return { error: "You already have a claimed name" };
  if (existingName) return { error: "That name has already been claimed" };

  const now = new Date().toISOString();
  const doc = {
    user_id:          opts.userId,
    user_email:       opts.userEmail,
    user_name:        opts.userName,
    user_image:       opts.userImage,
    participant_name: opts.participantName,
    division:         opts.division,
    claimed_at:       now,
  };

  const result = await col.insertOne(doc);
  return { claim: serialize({ ...doc, _id: result.insertedId }) };
}
