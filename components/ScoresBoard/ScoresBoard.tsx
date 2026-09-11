"use client";

import { useState, useMemo } from "react";

const DIVISIONS = [
  "All",
  "NFC East", "NFC North", "NFC South", "NFC West",
  "AFC East", "AFC North", "AFC South", "AFC West",
];

export interface PickDetail {
  slot: string;
  playerName: string;
  score: number;
  yards: number;
  tds: number;
  turnovers: number;
  hasStats: boolean;
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

export interface ParticipantData {
  name: string;
  division: string;
  weekScores: Record<number, number>;
  weekDetails: Record<number, WeekDetail>;
  total: number;
}

interface ScoresBoardProps {
  participants: ParticipantData[];
  activeWeeks: number[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n === 0) return "—";
  return n % 1 === 0 ? String(n) : n.toFixed(1);
}

const SLOT_STYLES: Record<string, string> = {
  QB:  "bg-blue-500/15 text-blue-400 border-blue-500/25",
  RB:  "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  WR:  "bg-violet-500/15 text-violet-400 border-violet-500/25",
  DEF: "bg-red-500/15 text-red-400 border-red-500/25",
};

const SLOT_LABEL: Record<string, string> = { WR: "WR/TE" };

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={`w-3 h-3 shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
    >
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}

// ── Scoring rules sidebar ──────────────────────────────────────────────────────

const SCORING_RULES = [
  {
    label: "QB",
    color: "text-blue-400",
    rows: [
      { desc: "Passing / rushing / rec yds", value: "0.01 / yd" },
      { desc: "All touchdowns", value: "1 pt" },
    ],
  },
  {
    label: "RB / WR / TE",
    color: "text-emerald-400",
    rows: [
      { desc: "Passing / rushing / rec yds", value: "0.02 / yd" },
      { desc: "All touchdowns", value: "1 pt" },
    ],
  },
  {
    label: "DEF",
    color: "text-red-400",
    rows: [
      { desc: "Turnovers forced (INT + fumble rec)", value: "1 pt" },
    ],
  },
  {
    label: "Winner Pick",
    color: "text-[#C9A84C]",
    rows: [
      { desc: "Correct team wins", value: "3 pts", gold: true },
      { desc: "All other outcomes", value: "0 pts", dim: true },
    ],
  },
];

function ScoringRules() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800">
        <h3 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Scoring Rules</h3>
      </div>
      <div className="divide-y divide-zinc-800">
        {SCORING_RULES.map(section => (
          <div key={section.label} className="px-4 py-3 space-y-2">
            <p className={`text-[11px] font-bold ${section.color}`}>{section.label}</p>
            {section.rows.map(row => (
              <div key={row.desc} className="flex items-start justify-between gap-2">
                <span className="text-[11px] text-zinc-500 leading-tight">{row.desc}</span>
                <span className={[
                  "text-[11px] font-mono font-semibold shrink-0",
                  "gold" in row && row.gold ? "text-[#C9A84C]" : "dim" in row && row.dim ? "text-zinc-600" : "text-zinc-300",
                ].join(" ")}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="px-4 py-3 bg-zinc-950/40 border-t border-zinc-800">
        <p className="text-[10px] text-zinc-700 leading-relaxed">
          100 QB yds = 1 pt<br />
          50 RB/WR/TE yds = 1 pt
        </p>
      </div>
    </div>
  );
}

// ── Pick detail rows (level 3) ─────────────────────────────────────────────────

function statLine(pick: PickDetail): string {
  if (!pick.hasStats) return "TBD";
  if (pick.slot === "DEF") {
    return `${pick.turnovers} TO`;
  }
  const parts: string[] = [`${Math.round(pick.yards)} yds`];
  if (pick.tds > 0) parts.push(`${pick.tds} TD`);
  return parts.join(" · ");
}

function PickDetailRows({ detail }: { detail: WeekDetail }) {
  return (
    <div className="bg-zinc-950/60 border-t border-zinc-800/60">
      {detail.picks.map((pick, i) => (
        <div key={i} className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800/40 last:border-0">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${SLOT_STYLES[pick.slot] ?? "bg-zinc-800 text-zinc-400 border-zinc-700"}`}>
            {SLOT_LABEL[pick.slot] ?? pick.slot}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] text-zinc-300 truncate">{pick.playerName}</div>
            <div className="text-[10px] text-zinc-600">{statLine(pick)}</div>
          </div>
          <span className={`text-[11px] font-mono shrink-0 ${pick.score > 0 ? "text-zinc-300" : "text-zinc-600"}`}>
            {fmt(pick.score)}
          </span>
        </div>
      ))}
      {detail.winnerTeam && (
        <div className="flex items-center gap-2 px-4 py-2">
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 bg-[#C9A84C]/10 text-[#C9A84C] border-[#C9A84C]/25">
            WIN
          </span>
          {!detail.winnerGameComplete ? (
            <>
              <span className="text-[11px] flex-1 truncate text-zinc-500">{detail.winnerTeam}</span>
              <span className="text-[11px] font-mono shrink-0 text-zinc-600">TBD</span>
            </>
          ) : (
            <>
              <span className={`text-[11px] flex-1 truncate ${detail.winnerCorrect ? "text-[#C9A84C]" : "text-zinc-500"}`}>
                {detail.winnerTeam}{detail.winnerCorrect ? " ✓" : " ✗"}
              </span>
              <span className={`text-[11px] font-mono shrink-0 ${detail.winnerCorrect ? "text-[#C9A84C] font-semibold" : "text-zinc-600"}`}>
                {detail.winnerCorrect ? "3" : "0"}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Division card (level 1 + 2 + 3) ──────────────────────────────────────────

interface DivisionCardProps {
  division: string;
  participants: ParticipantData[];
  activeWeeks: number[];
}

function DivisionCard({ division, participants, activeWeeks }: DivisionCardProps) {
  const [openParticipant, setOpenParticipant] = useState<string | null>(null);
  const [openWeek, setOpenWeek] = useState<number | null>(null);

  const sorted = useMemo(
    () => [...participants].sort((a, b) => b.total - a.total),
    [participants]
  );

  function toggleParticipant(name: string) {
    if (openParticipant === name) {
      setOpenParticipant(null);
      setOpenWeek(null);
    } else {
      setOpenParticipant(name);
      setOpenWeek(null);
    }
  }

  function toggleWeek(week: number) {
    setOpenWeek(w => (w === week ? null : week));
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      {/* Division header */}
      <div className="px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/80">
        <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">{division}</span>
      </div>

      {/* Participant rows */}
      <div className="divide-y divide-zinc-800/60">
        {sorted.map((p, i) => {
          const isOpen = openParticipant === p.name;
          const hasAnyPicks = activeWeeks.some(w => !!p.weekDetails[w]);

          return (
            <div key={p.name}>
              {/* Level 1: participant row */}
              <button
                onClick={() => hasAnyPicks && toggleParticipant(p.name)}
                disabled={!hasAnyPicks}
                className={[
                  "w-full flex items-center gap-2.5 px-4 py-3 text-left transition-colors",
                  hasAnyPicks ? "cursor-pointer hover:bg-zinc-800/40" : "cursor-default",
                  isOpen ? "bg-zinc-800/30" : "",
                ].join(" ")}
              >
                <span className="text-[11px] text-zinc-600 font-mono w-4 shrink-0 tabular-nums">{i + 1}</span>
                <span className={`text-[13px] flex-1 truncate ${i === 0 && p.total > 0 ? "font-semibold text-white" : "text-zinc-300"}`}>
                  {p.name}
                </span>
                <span className={`text-[13px] font-mono tabular-nums shrink-0 ${i === 0 && p.total > 0 ? "text-[#C9A84C] font-semibold" : p.total > 0 ? "text-zinc-300" : "text-zinc-700"}`}>
                  {fmt(p.total)}
                </span>
                {hasAnyPicks && (
                  <span className={`text-zinc-600 ${isOpen ? "text-zinc-400" : ""}`}>
                    <ChevronIcon open={isOpen} />
                  </span>
                )}
              </button>

              {/* Level 2: week rows */}
              {isOpen && (
                <div className="bg-zinc-950/40 border-t border-zinc-800/60 divide-y divide-zinc-800/40">
                  {activeWeeks.map(week => {
                    const weekScore = p.weekScores[week] ?? 0;
                    const detail = p.weekDetails[week];
                    const weekOpen = openWeek === week;

                    return (
                      <div key={week}>
                        <button
                          onClick={() => detail && toggleWeek(week)}
                          disabled={!detail}
                          className={[
                            "w-full flex items-center gap-2.5 pl-8 pr-4 py-2.5 text-left transition-colors",
                            detail ? "cursor-pointer hover:bg-zinc-800/30" : "cursor-default",
                            weekOpen ? "bg-zinc-800/20" : "",
                          ].join(" ")}
                        >
                          <span className="text-[11px] text-zinc-500 flex-1">Week {week}</span>
                          <span className={`text-[11px] font-mono tabular-nums shrink-0 ${weekScore > 0 ? "text-zinc-300" : "text-zinc-600"}`}>
                            {fmt(weekScore)}
                          </span>
                          {detail && (
                            <span className="text-zinc-600 ml-1">
                              <ChevronIcon open={weekOpen} />
                            </span>
                          )}
                        </button>

                        {/* Level 3: pick detail rows */}
                        {weekOpen && detail && <PickDetailRows detail={detail} />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ScoresBoard({ participants, activeWeeks }: ScoresBoardProps) {
  const [divFilter, setDivFilter] = useState("All");

  const filtered = useMemo(() =>
    participants.filter(p => divFilter === "All" || p.division === divFilter),
    [participants, divFilter]
  );

  const divisionGroups = useMemo(() => {
    const groups = new Map<string, ParticipantData[]>();
    for (const div of DIVISIONS.slice(1)) groups.set(div, []);
    for (const p of participants) groups.get(p.division)?.push(p);
    return groups;
  }, [participants]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 items-start">

      {/* ── Main board ── */}
      <div className="flex-1 min-w-0 space-y-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-white">Standings</h1>
          <p className="text-[13px] text-zinc-500 mt-0.5">
            2026 season
          </p>
        </div>

        {/* Division filter chips */}
        <div className="flex flex-wrap gap-1.5">
          {DIVISIONS.map(div => (
            <button
              key={div}
              onClick={() => setDivFilter(div)}
              className={[
                "h-7 px-3 rounded-full text-[11px] font-medium transition-colors cursor-pointer",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]",
                divFilter === div
                  ? "bg-[#C9A84C] text-zinc-950"
                  : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200",
              ].join(" ")}
            >
              {div}
            </button>
          ))}
        </div>

        {activeWeeks.length === 0 && divFilter === "All" ? (
          <div className="border border-dashed border-zinc-800 rounded-xl px-6 py-14 text-center">
            <p className="text-[13px] text-zinc-500">No picks submitted yet — scores will appear once drafts go live.</p>
          </div>
        ) : divFilter === "All" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {DIVISIONS.slice(1).map(div => (
              <DivisionCard
                key={div}
                division={div}
                participants={divisionGroups.get(div) ?? []}
                activeWeeks={activeWeeks}
              />
            ))}
          </div>
        ) : (
          <DivisionCard
            division={divFilter}
            participants={filtered}
            activeWeeks={activeWeeks}
          />
        )}
      </div>

      {/* ── Scoring rules sidebar ── */}
      <div className="w-full lg:w-60 shrink-0 lg:sticky lg:top-[80px]">
        <ScoringRules />
      </div>

    </div>
  );
}
