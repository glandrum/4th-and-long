// ─── Player ───────────────────────────────────────────────────────────────────

export interface Player {
  player_id: string;
  full_name: string;
  position: string;
  team: string;
  number: number | null;
  age: number | null;
  years_exp: number | null;
  height: string | null;
  weight: string | null;
  college: string | null;
  status: string | null;
  injury_status: string | null;
}

// Lightweight player shape used inside the draft pick form
export interface PickerPlayer {
  player_id: string;
  full_name: string;
  position: string;
  team: string;
}

// ─── Division ────────────────────────────────────────────────────────────────

export interface Division {
  _id: string;
  name: string;
  participants: string[];  // base/permanent order — rotation is derived per week
}

// ─── Draft ────────────────────────────────────────────────────────────────────

export type DraftPosition = "QB" | "RB" | "WR" | "DEF";

export interface DraftParticipant {
  name: string;
  order: number; // 1–5
}

export interface PositionSelection {
  slot: DraftPosition;
  player_id: string;
  player_name: string;
}

export interface DraftPick {
  pick_num: number;       // 1–10
  pass: 1 | 2;
  drafter_idx: number;    // 0–4, index into participants array
  positions: PositionSelection[];
  winning_team: string | null;
  submitted_at: string | null; // ISO string
  unlock_at: string;           // ISO string — when this pick becomes available
}

export interface Draft {
  _id: string;
  week: number;
  season: number;
  division: string;
  participants: DraftParticipant[];
  start_time: string;         // ISO string (UTC)
  timezone: string;           // IANA tz identifier, e.g. "America/Chicago"
  pick_duration_hours: number;
  picks: DraftPick[];
  status: "pending" | "active" | "complete";
  created_at: string;
  updated_at: string;
}

// ─── Claim ────────────────────────────────────────────────────────────────────

export interface Claim {
  _id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  user_image: string | null;
  participant_name: string;
  division: string;
  claimed_at: string;
}

export interface CreateDraftInput {
  week: number;
  season: number;
  division: string;
  // Only required when division is "" (custom draft — not backed by a division doc)
  participants?: DraftParticipant[];
  start_time: string;
  timezone: string;
  pick_duration_hours: number;
}
