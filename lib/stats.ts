import type { DraftPick } from "./types";

interface RawStatLine {
  // Offense
  pass_yd?: number;
  rush_yd?: number;
  rec_yd?: number;
  pass_td?: number;
  rush_td?: number;
  rec_td?: number;
  // Team defense (Sleeper field names)
  int?: number;     // interceptions
  fum_rec?: number; // fumble recoveries
  td?: number;      // defensive + special teams TDs
  [key: string]: number | undefined;
}

export type WeeklyStats = Record<string, RawStatLine>;

export interface ScoreBreakdown {
  qb: number;
  rb: number;
  wr: number;
  def: number;
  winner: number;
  total: number;
}

// ESPN uses different abbreviations for two teams
const ESPN_TO_OURS: Record<string, string> = {
  WSH: "WAS",
  JAC: "JAX",
};

export async function getWeeklyStats(season: number, week: number): Promise<WeeklyStats> {
  try {
    const res = await fetch(
      `https://api.sleeper.app/v1/stats/nfl/regular/${season}/${week}`,
      { cache: "no-store" }
    );
    if (!res.ok) return {};
    return await res.json() as WeeklyStats;
  } catch {
    return {};
  }
}

export async function getGameData(
  season: number,
  week: number
): Promise<{ winners: string[]; completedTeams: Set<string> }> {
  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=2&week=${week}&season=${season}`,
      { cache: "no-store" }
    );
    if (!res.ok) return { winners: [], completedTeams: new Set() };
    const data = await res.json() as {
      events?: {
        competitions?: {
          status?: { type?: { completed?: boolean } };
          competitors?: { winner?: boolean; team?: { abbreviation?: string } }[];
        }[];
      }[];
    };

    const winners: string[] = [];
    const completedTeams = new Set<string>();
    for (const event of data.events ?? []) {
      for (const competition of event.competitions ?? []) {
        const done = competition.status?.type?.completed ?? false;
        for (const competitor of competition.competitors ?? []) {
          const raw = competitor.team?.abbreviation ?? "";
          const abbrev = ESPN_TO_OURS[raw] ?? raw;
          if (!abbrev) continue;
          if (done) {
            completedTeams.add(abbrev);
            if (competitor.winner) winners.push(abbrev);
          }
        }
      }
    }
    return { winners, completedTeams };
  } catch {
    return { winners: [], completedTeams: new Set() };
  }
}

export interface PickDetail {
  slot: string;
  playerName: string;
  score: number;
  yards: number;
  tds: number;
  turnovers: number; // DEF only (INT + fum rec)
  hasStats: boolean; // false = game not yet finished or stats unavailable
}

export interface WeekDetail {
  week: number;
  score: number;
  picks: PickDetail[];
  winnerTeam: string | null;
  winnerGameComplete: boolean;
  winnerCorrect: boolean;
  winnerScore: number;
}

function slotScore(slot: string, s: RawStatLine): number {
  const yards = (s.pass_yd ?? 0) + (s.rush_yd ?? 0) + (s.rec_yd ?? 0);
  const tds   = (s.pass_td ?? 0) + (s.rush_td ?? 0) + (s.rec_td ?? 0);
  if (slot === "QB")  return yards * 0.01 + tds;
  if (slot === "RB" || slot === "WR") return yards * 0.02 + tds;
  if (slot === "DEF") {
    return (s.int ?? 0) + (s.fum_rec ?? 0);
  }
  return 0;
}

export function calcPickDetails(
  pick: DraftPick,
  stats: WeeklyStats,
  winners: string[],
  completedTeams: Set<string>,
  playerTeamMap: Map<string, string>
): { picks: PickDetail[]; winnerTeam: string | null; winnerGameComplete: boolean; winnerCorrect: boolean; winnerScore: number } {
  const picks: PickDetail[] = pick.positions.map(pos => {
    const raw  = stats[pos.player_id];
    // For DEF, player_id is the team abbreviation; for offense, look up via playerTeamMap
    const team = pos.slot === "DEF" ? pos.player_id : (playerTeamMap.get(pos.player_id) ?? "");
    const gameComplete = completedTeams.has(team);
    const hasStats = !!raw && Object.keys(raw).length > 0 && gameComplete;
    const s         = raw ?? {};
    const yards     = (s.pass_yd ?? 0) + (s.rush_yd ?? 0) + (s.rec_yd ?? 0);
    const tds       = pos.slot !== "DEF"
      ? (s.pass_td ?? 0) + (s.rush_td ?? 0) + (s.rec_td ?? 0)
      : 0;
    const turnovers = (s.int ?? 0) + (s.fum_rec ?? 0);
    return {
      slot: pos.slot,
      playerName: pos.player_name,
      score: hasStats ? slotScore(pos.slot, s) : 0,
      yards,
      tds,
      turnovers,
      hasStats,
    };
  });

  const winnerTeam         = pick.pass === 1 ? (pick.winning_team ?? null) : null;
  const winnerGameComplete = !!(winnerTeam && completedTeams.has(winnerTeam));
  // winners only contains teams from completed games, so winnerCorrect is false mid-game
  const winnerCorrect      = !!(winnerTeam && winners.includes(winnerTeam));
  const winnerScore        = winnerCorrect ? 3 : 0;

  return { picks, winnerTeam, winnerGameComplete, winnerCorrect, winnerScore };
}
