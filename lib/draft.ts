import { ObjectId } from "mongodb";
import clientPromise from "./mongodb";
import { getDivisionsMap, seedDivisionsInDB } from "./divisions-db";
export { ALL_DIVISIONS } from "./divisions";
import { ALL_DIVISIONS as ALL_DIVS } from "./divisions";
import type {
  Draft,
  DraftParticipant,
  DraftPick,
  CreateDraftInput,
  PositionSelection,
} from "./types";

const DB_NAME = "4th-and-long";
const COL = "drafts";

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Derive the rotated participant list for a given division + week number.
function rotateParticipants(baseNames: string[], week: number): DraftParticipant[] {
  const n = baseNames.length;
  const offset = (week - 1) % n;
  const rotated = [...baseNames.slice(offset), ...baseNames.slice(0, offset)];
  return rotated.map((name, i) => ({ name, order: i + 1 }));
}

function serializeDraft(
  doc: Record<string, unknown>,
  participants: DraftParticipant[]
): Draft {
  return {
    _id:                  String(doc._id),
    week:                 doc.week as number,
    season:               doc.season as number,
    division:             (doc.division as string) ?? "",
    participants,
    start_time:           doc.start_time as string,
    timezone:             doc.timezone as string,
    pick_duration_hours:  doc.pick_duration_hours as number,
    picks:                doc.picks as DraftPick[],
    status:               doc.status as Draft["status"],
    created_at:           doc.created_at as string,
    updated_at:           doc.updated_at as string,
  };
}

// Resolve participants for a raw draft doc using the divisions map.
// Falls back to the doc's own participants field for custom (division="") drafts,
// and for legacy docs created before the divisions collection existed.
function resolveParticipants(
  doc: Record<string, unknown>,
  divisionsMap: Map<string, string[]>
): DraftParticipant[] {
  const division = (doc.division as string) ?? "";
  const week = doc.week as number;

  if (division) {
    const baseNames = divisionsMap.get(division);
    if (baseNames) return rotateParticipants(baseNames, week);
  }

  // Custom draft or legacy doc — use stored participants
  return (doc.participants as DraftParticipant[]) ?? [];
}

// Build the pick slots for a snake draft.
function buildPicks(
  input: { start_time: string; pick_duration_hours: number },
  participantCount: number
): DraftPick[] {
  const n = participantCount;
  const startMs = new Date(input.start_time).getTime();
  const windowMs = input.pick_duration_hours * 60 * 60 * 1000;
  const picks: DraftPick[] = [];

  // Pass 1: picks 1–n, forward (drafter 0 → n-1)
  for (let i = 0; i < n; i++) {
    picks.push({
      pick_num:     i + 1,
      pass:         1,
      drafter_idx:  i,
      positions:    [],
      winning_team: null,
      submitted_at: null,
      unlock_at:    new Date(startMs + i * windowMs).toISOString(),
    });
  }

  // Pass 2: picks n+1–2n, snake back (drafter n-1 → 0)
  for (let i = 0; i < n; i++) {
    picks.push({
      pick_num:     n + i + 1,
      pass:         2,
      drafter_idx:  (n - 1) - i,
      positions:    [],
      winning_team: null,
      submitted_at: null,
      unlock_at:    new Date(startMs + (n + i) * windowMs).toISOString(),
    });
  }

  return picks;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getDraftById(id: string): Promise<Draft | null> {
  let oid: ObjectId;
  try { oid = new ObjectId(id); } catch { return null; }

  const client = await clientPromise;
  const doc = await client.db(DB_NAME).collection(COL).findOne({ _id: oid });
  if (!doc) return null;

  const divisionsMap = await getDivisionsMap();
  const participants = resolveParticipants(doc as Record<string, unknown>, divisionsMap);
  return serializeDraft(doc as Record<string, unknown>, participants);
}

export async function getAllDrafts(): Promise<Draft[]> {
  const client = await clientPromise;
  const [docs, divisionsMap] = await Promise.all([
    client.db(DB_NAME).collection(COL)
      .find({})
      .sort({ season: -1, week: 1, division: 1 })
      .toArray(),
    getDivisionsMap(),
  ]);

  return docs.map(d => {
    const doc = d as Record<string, unknown>;
    return serializeDraft(doc, resolveParticipants(doc, divisionsMap));
  });
}

export async function getDraftByWeek(week: number, season: number): Promise<Draft | null> {
  const client = await clientPromise;
  const doc = await client.db(DB_NAME).collection(COL).findOne({ week, season });
  if (!doc) return null;

  const divisionsMap = await getDivisionsMap();
  const participants = resolveParticipants(doc as Record<string, unknown>, divisionsMap);
  return serializeDraft(doc as Record<string, unknown>, participants);
}

export async function createDraft(input: CreateDraftInput): Promise<Draft> {
  const client = await clientPromise;
  const col = client.db(DB_NAME).collection(COL);

  await col.deleteOne({ week: input.week, season: input.season, division: input.division });

  const divisionsMap = await getDivisionsMap();
  const participants = resolveParticipants(
    { division: input.division, week: input.week, participants: input.participants },
    divisionsMap
  );
  const participantCount = participants.length || 5;

  const now = new Date().toISOString();
  // For division-based drafts, do NOT store participants — they're derived at read time.
  // For custom drafts (division=""), store them since there's no division doc to look up.
  const doc: Record<string, unknown> = {
    week:                input.week,
    season:              input.season,
    division:            input.division,
    start_time:          input.start_time,
    timezone:            input.timezone,
    pick_duration_hours: input.pick_duration_hours,
    picks:               buildPicks(input, participantCount),
    status:              "active" as const,
    created_at:          now,
    updated_at:          now,
  };

  if (!input.division) {
    doc.participants = input.participants ?? [];
  }

  const result = await col.insertOne(doc);
  return serializeDraft({ ...doc, _id: result.insertedId }, participants);
}

export async function submitPick(
  draftId: string,
  pickNum: number,
  positions: PositionSelection[],
  winningTeam: string | null
): Promise<{ draft: Draft } | { error: string }> {
  const client = await clientPromise;
  const col = client.db(DB_NAME).collection(COL);

  let oid: ObjectId;
  try {
    oid = new ObjectId(draftId);
  } catch {
    return { error: "Invalid draft ID" };
  }

  const doc = await col.findOne({ _id: oid });
  if (!doc) return { error: "Draft not found" };

  const picks = doc.picks as DraftPick[];
  const pickIdx = pickNum - 1;
  const pick = picks[pickIdx];

  if (!pick || pick.pick_num !== pickNum) return { error: "Pick not found" };
  if (pick.submitted_at) return { error: "Pick already submitted" };

  const now = new Date();
  if (now < new Date(pick.unlock_at)) return { error: "Pick is not yet unlocked" };

  const expected = 2;
  if (positions.length !== expected) {
    return { error: `Expected ${expected} position picks, got ${positions.length}` };
  }

  if (pick.pass === 1 && !winningTeam) return { error: "Winning team is required for Pass 1" };
  if (pick.pass === 2 && winningTeam)  winningTeam = null;

  const slots = positions.map(p => p.slot);
  if (new Set(slots).size !== slots.length) {
    return { error: "Cannot pick the same position twice in one turn" };
  }

  const otherPass = pick.pass === 1 ? 2 : 1;
  const otherPick = picks.find(
    p => p.drafter_idx === pick.drafter_idx && p.pass === otherPass
  );
  if (otherPick?.submitted_at) {
    const otherSlots = otherPick.positions.map(p => p.slot);
    const overlap = slots.filter(s => otherSlots.includes(s));
    if (overlap.length > 0) {
      return { error: `Position ${overlap.join(", ")} already picked in your other turn` };
    }
  }

  const allPickedIds = new Set(
    picks
      .filter(p => p.submitted_at)
      .flatMap(p => p.positions.map(pp => pp.player_id))
  );
  for (const pos of positions) {
    if (allPickedIds.has(pos.player_id)) {
      return { error: `${pos.player_name} has already been picked` };
    }
  }

  if (winningTeam) {
    const takenWinTeam = picks
      .filter(p => p.submitted_at && p.pass === 1 && p.drafter_idx !== pick.drafter_idx)
      .some(p => p.winning_team === winningTeam);
    if (takenWinTeam) {
      return { error: `${winningTeam} has already been picked as a winning team` };
    }
  }

  const $set: Record<string, unknown> = {
    [`picks.${pickIdx}.positions`]:    positions,
    [`picks.${pickIdx}.winning_team`]: winningTeam ?? null,
    [`picks.${pickIdx}.submitted_at`]: now.toISOString(),
    updated_at:                        now.toISOString(),
  };

  // Early-unlock: open the next pick window immediately
  const nextIdx = pickNum;
  if (nextIdx < picks.length) {
    const nextPick = picks[nextIdx];
    if (nextPick && !nextPick.submitted_at && new Date(nextPick.unlock_at) > now) {
      $set[`picks.${nextIdx}.unlock_at`] = now.toISOString();
    }
  }

  await col.updateOne({ _id: oid }, { $set });

  // Re-fetch through getDraftById to get the joined participants
  const updated = await getDraftById(draftId);
  if (!updated) return { error: "Draft not found after update" };
  return { draft: updated };
}

// ─── Seed all drafts ──────────────────────────────────────────────────────────

// Thursday 8 AM start times for the 2026 season.
// Weeks 1-8 are CDT (UTC-5 → 13:00 UTC); Weeks 9-17 are CST (UTC-6 → 14:00 UTC).
const WEEK_START_TIMES = [
  "2026-09-10T13:00:00.000Z", // Week 1
  "2026-09-17T13:00:00.000Z", // Week 2
  "2026-09-24T13:00:00.000Z", // Week 3
  "2026-10-01T13:00:00.000Z", // Week 4
  "2026-10-08T13:00:00.000Z", // Week 5
  "2026-10-15T13:00:00.000Z", // Week 6
  "2026-10-22T13:00:00.000Z", // Week 7
  "2026-10-29T13:00:00.000Z", // Week 8
  "2026-11-05T14:00:00.000Z", // Week 9  (CST begins Nov 1)
  "2026-11-12T14:00:00.000Z", // Week 10
  "2026-11-19T14:00:00.000Z", // Week 11
  "2026-11-26T14:00:00.000Z", // Week 12
  "2026-12-03T14:00:00.000Z", // Week 13
  "2026-12-10T14:00:00.000Z", // Week 14
  "2026-12-17T14:00:00.000Z", // Week 15
  "2026-12-24T14:00:00.000Z", // Week 16
  "2026-12-31T14:00:00.000Z", // Week 17
];

export async function seedDrafts(season: number): Promise<{ divisions: number; drafts: number }> {
  // Ensure divisions collection is populated first
  const { created: divCount } = await seedDivisionsInDB();

  const client = await clientPromise;
  const col = client.db(DB_NAME).collection(COL);

  const now = new Date().toISOString();
  const ops = [];

  for (const division of ALL_DIVS) {
    for (let week = 1; week <= 17; week++) {
      const start_time = WEEK_START_TIMES[week - 1];
      const input = { start_time, pick_duration_hours: 1 };

      // Draft docs do NOT store participants — derived from divisions collection at read time
      const doc = {
        week,
        season,
        division,
        start_time,
        timezone:            "America/Chicago",
        pick_duration_hours: 24,
        picks:               buildPicks(input, 5),
        status:              "pending" as const,
        created_at:          now,
        updated_at:          now,
      };

      ops.push({
        replaceOne: {
          filter:      { week, season, division },
          replacement: doc,
          upsert:      true,
        },
      });
    }
  }

  await col.bulkWrite(ops);
  return { divisions: divCount, drafts: ops.length };
}

export async function deleteDraftById(id: string): Promise<boolean> {
  let oid: ObjectId;
  try { oid = new ObjectId(id); } catch { return false; }

  const client = await clientPromise;
  const result = await client
    .db(DB_NAME)
    .collection(COL)
    .deleteOne({ _id: oid });

  return result.deletedCount === 1;
}

// ─── Draft lifecycle operations ───────────────────────────────────────────────

// Update start_time and pick_duration_hours; recomputes all unlock_at timestamps.
// Only valid while status is "pending".
export async function updateDraftConfig(
  id: string,
  startTime: string,
  pickDurationHours: number
): Promise<Draft | null> {
  let oid: ObjectId;
  try { oid = new ObjectId(id); } catch { return null; }

  const client = await clientPromise;
  const col = client.db(DB_NAME).collection(COL);
  const doc = await col.findOne({ _id: oid });
  if (!doc || doc.status !== "pending") return null;

  const picks = doc.picks as DraftPick[];
  const windowMs = pickDurationHours * 60 * 60 * 1000;
  const startMs = new Date(startTime).getTime();

  const $set: Record<string, unknown> = {
    start_time:          startTime,
    pick_duration_hours: pickDurationHours,
    updated_at:          new Date().toISOString(),
  };
  picks.forEach((_, i) => {
    $set[`picks.${i}.unlock_at`] = new Date(startMs + i * windowMs).toISOString();
  });

  await col.updateOne({ _id: oid }, { $set });
  return getDraftById(id);
}

// Transition a pending draft to active.
// Sets start_time to NOW so pick 1 is immediately available, then recomputes
// all unlock_at offsets from that moment using the draft's pick_duration_hours.
export async function startDraft(id: string): Promise<Draft | null> {
  let oid: ObjectId;
  try { oid = new ObjectId(id); } catch { return null; }

  const client = await clientPromise;
  const col = client.db(DB_NAME).collection(COL);
  const doc = await col.findOne({ _id: oid });
  if (!doc || doc.status !== "pending") return null;

  const now = new Date();
  const windowMs = (doc.pick_duration_hours as number) * 60 * 60 * 1000;
  const picks = doc.picks as DraftPick[];

  const $set: Record<string, unknown> = {
    status:     "active",
    start_time: now.toISOString(),
    updated_at: now.toISOString(),
  };
  picks.forEach((_, i) => {
    $set[`picks.${i}.unlock_at`] = new Date(now.getTime() + i * windowMs).toISOString();
  });

  await col.updateOne({ _id: oid }, { $set });
  return getDraftById(id);
}

// Reset all picks and return draft to pending so it can be reconfigured and restarted.
export async function resetDraft(id: string): Promise<Draft | null> {
  let oid: ObjectId;
  try { oid = new ObjectId(id); } catch { return null; }

  const client = await clientPromise;
  const col = client.db(DB_NAME).collection(COL);
  const doc = await col.findOne({ _id: oid });
  if (!doc) return null;

  const picks = doc.picks as DraftPick[];
  const windowMs = (doc.pick_duration_hours as number) * 60 * 60 * 1000;
  const startMs = new Date(doc.start_time as string).getTime();

  const $set: Record<string, unknown> = {
    status:     "pending",
    updated_at: new Date().toISOString(),
  };
  picks.forEach((_, i) => {
    $set[`picks.${i}.positions`]    = [];
    $set[`picks.${i}.winning_team`] = null;
    $set[`picks.${i}.submitted_at`] = null;
    $set[`picks.${i}.unlock_at`]    = new Date(startMs + i * windowMs).toISOString();
  });

  await col.updateOne({ _id: oid }, { $set });
  return getDraftById(id);
}
