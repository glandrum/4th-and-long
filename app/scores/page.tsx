import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppHeader } from "@/components/AppHeader";
import { ScoresBoard } from "@/components/ScoresBoard";
import { getAllDrafts } from "@/lib/draft";
import { getWeeklyStats, getGameData, calcPickDetails } from "@/lib/stats";
import { getPlayerTeamMap } from "@/lib/players";
import { DIVISION_PARTICIPANTS } from "@/lib/divisions";
import type { ParticipantData, WeekDetail } from "@/components/ScoresBoard";

const SEASON = 2026;

export default async function ScoresPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const allDrafts = await getAllDrafts();
  const divisionDrafts = allDrafts.filter(d => d.division !== "");

  // Weeks that have at least one submitted pick
  const activeWeeks = [
    ...new Set(
      divisionDrafts
        .filter(d => d.picks.some(p => p.submitted_at))
        .map(d => d.week)
    ),
  ].sort((a, b) => a - b);

  // Collect all offensive player IDs across all picks to batch-fetch their teams
  const offensivePlayerIds = [
    ...new Set(
      divisionDrafts.flatMap(d =>
        d.picks.flatMap(p =>
          p.positions.filter(pos => pos.slot !== "DEF").map(pos => pos.player_id)
        )
      )
    ),
  ];
  const playerTeamMap = await getPlayerTeamMap(offensivePlayerIds);

  // Fetch stats and game data (winners + completed teams) per active week
  const weekData = await Promise.all(
    activeWeeks.map(async week => {
      const [stats, gameData] = await Promise.all([
        getWeeklyStats(SEASON, week),
        getGameData(SEASON, week),
      ]);
      return { week, stats, winners: gameData.winners, completedTeams: gameData.completedTeams };
    })
  );

  // Seed maps for all known participants
  const weekScoresMap  = new Map<string, Record<number, number>>();
  const weekDetailsMap = new Map<string, Record<number, WeekDetail>>();
  const divisionMap    = new Map<string, string>();

  for (const [division, names] of Object.entries(DIVISION_PARTICIPANTS)) {
    for (const name of names) {
      weekScoresMap.set(name, {});
      weekDetailsMap.set(name, {});
      divisionMap.set(name, division);
    }
  }

  // Accumulate scores and details from submitted picks
  for (const { week, stats, winners, completedTeams } of weekData) {
    for (const draft of divisionDrafts.filter(d => d.week === week)) {
      for (const pick of draft.picks) {
        if (!pick.submitted_at) continue;
        const name = draft.participants[pick.drafter_idx]?.name;
        if (!name) continue;

        const details = calcPickDetails(pick, stats, winners, completedTeams, playerTeamMap);
        const wd = weekDetailsMap.get(name)!;
        if (!wd[week]) {
          wd[week] = { week, score: 0, picks: [], winnerTeam: null, winnerGameComplete: false, winnerCorrect: false, winnerScore: 0 };
        }
        wd[week].picks.push(...details.picks);
        if (details.winnerTeam !== null) {
          wd[week].winnerTeam    = details.winnerTeam;
          wd[week].winnerCorrect = details.winnerCorrect;
          wd[week].winnerScore   = details.winnerScore;
        }
        wd[week].score = wd[week].picks.reduce((a, p) => a + p.score, 0) + wd[week].winnerScore;

        const ws = weekScoresMap.get(name)!;
        ws[week] = wd[week].score;
      }
    }
  }

  const participants: ParticipantData[] = [...weekScoresMap.entries()].map(
    ([name, weekScores]) => ({
      name,
      division: divisionMap.get(name) ?? "",
      weekScores,
      weekDetails: weekDetailsMap.get(name) ?? {},
      total: Object.values(weekScores).reduce((a, b) => a + b, 0),
    })
  );

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
        <ScoresBoard participants={participants} activeWeeks={activeWeeks} />
      </main>
    </div>
  );
}
