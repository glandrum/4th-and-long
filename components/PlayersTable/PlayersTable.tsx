"use client";

import { useState, useMemo } from "react";
import type { Player } from "@/lib/types";

// ─── Position metadata ────────────────────────────────────────────────────────

const POSITION_GROUPS: Record<string, string[]> = {
  QB: ["QB"],
  RB: ["RB"],
  WR: ["WR"],
  TE: ["TE"],
};

const POSITION_STYLES: Record<string, string> = {
  QB: "bg-blue-500/15 text-blue-400",
  RB: "bg-emerald-500/15 text-emerald-400",
  WR: "bg-violet-500/15 text-violet-400",
  TE: "bg-orange-500/15 text-orange-400",
};

function getPositionGroup(pos: string): string {
  for (const [group, positions] of Object.entries(POSITION_GROUPS)) {
    if (positions.includes(pos)) return group;
  }
  return pos;
}

function positionStyle(pos: string): string {
  return POSITION_STYLES[getPositionGroup(pos)] ?? "bg-zinc-500/15 text-zinc-500";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatHeight(inches: string | null): string {
  if (!inches) return "—";
  const n = parseInt(inches, 10);
  return `${Math.floor(n / 12)}′${n % 12}″`;
}

function formatExp(years: number | null): string {
  if (years === null) return "—";
  if (years === 0) return "Rookie";
  return `${years} yr${years === 1 ? "" : "s"}`;
}

// ─── Injury badge ─────────────────────────────────────────────────────────────

function InjuryDot({ status }: { status: string | null }) {
  if (!status) return null;
  const colors: Record<string, string> = {
    Out: "bg-red-500",
    Doubtful: "bg-red-400",
    Questionable: "bg-yellow-400",
    "Day-To-Day": "bg-yellow-300",
    IR: "bg-zinc-500",
  };
  return (
    <span
      title={status}
      className={`inline-block w-1.5 h-1.5 rounded-full ml-1.5 shrink-0 ${colors[status] ?? "bg-zinc-500"}`}
    />
  );
}

// ─── Sort ─────────────────────────────────────────────────────────────────────

type SortKey = "full_name" | "position" | "team" | "number" | "age" | "years_exp";

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  return (
    <span className={`ml-1 text-[10px] ${active ? "text-[#C9A84C]" : "text-zinc-600"}`}>
      {active ? (dir === "asc" ? "↑" : "↓") : "↕"}
    </span>
  );
}

// ─── NFL Teams ────────────────────────────────────────────────────────────────

const NFL_TEAMS = [
  "ARI","ATL","BAL","BUF","CAR","CHI","CIN","CLE",
  "DAL","DEN","DET","GB","HOU","IND","JAX","KC",
  "LAC","LAR","LV","MIA","MIN","NE","NO","NYG",
  "NYJ","PHI","PIT","SF","SEA","TB","TEN","WAS",
];

const PAGE_SIZE = 50;

// ─── Component ────────────────────────────────────────────────────────────────

interface PlayersTableProps {
  players: Player[];
}

export function PlayersTable({ players }: PlayersTableProps) {
  const [search, setSearch]           = useState("");
  const [posFilter, setPosFilter]     = useState<string>("All");
  const [teamFilter, setTeamFilter]   = useState<string>("All");
  const [sortKey, setSortKey]         = useState<SortKey>("full_name");
  const [sortDir, setSortDir]         = useState<"asc" | "desc">("asc");
  const [page, setPage]               = useState(0);

  const posGroups = ["All", ...Object.keys(POSITION_GROUPS)];

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(0);
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const groupPositions = posFilter !== "All" ? POSITION_GROUPS[posFilter] : null;

    return players
      .filter(p => {
        if (q && !p.full_name.toLowerCase().includes(q)) return false;
        if (groupPositions && !groupPositions.includes(p.position)) return false;
        if (teamFilter !== "All" && p.team !== teamFilter) return false;
        return true;
      })
      .sort((a, b) => {
        let av: string | number = a[sortKey] ?? "";
        let bv: string | number = b[sortKey] ?? "";
        if (typeof av === "number" && typeof bv === "number") {
          return sortDir === "asc" ? av - bv : bv - av;
        }
        av = String(av);
        bv = String(bv);
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      });
  }, [players, search, posFilter, teamFilter, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function handleSearch(v: string) {
    setSearch(v);
    setPage(0);
  }

  function handlePosFilter(v: string) {
    setPosFilter(v);
    setPage(0);
  }

  function handleTeamFilter(v: string) {
    setTeamFilter(v);
    setPage(0);
  }

  const cols: { label: string; key: SortKey; className: string }[] = [
    { label: "Player",      key: "full_name",  className: "text-left w-52" },
    { label: "Pos",         key: "position",   className: "text-left w-16" },
    { label: "Team",        key: "team",       className: "text-left w-16" },
    { label: "#",           key: "number",     className: "text-right w-12" },
    { label: "Age",         key: "age",        className: "text-right w-12" },
    { label: "Experience",  key: "years_exp",  className: "text-right w-24" },
  ];

  return (
    <div className="space-y-4">

      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative w-full sm:w-64">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none"
            viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
          >
            <circle cx="6.5" cy="6.5" r="5" />
            <path d="M10.5 10.5L14 14" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Search players…"
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="w-full h-9 pl-8 pr-3 rounded-lg bg-zinc-900 border border-zinc-800 text-[13px] text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Team filter */}
          <select
            value={teamFilter}
            onChange={e => handleTeamFilter(e.target.value)}
            className="h-9 px-3 rounded-lg bg-zinc-900 border border-zinc-800 text-[13px] text-zinc-300 focus:outline-none focus:border-zinc-600 cursor-pointer"
          >
            <option value="All">All Teams</option>
            {NFL_TEAMS.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          {/* Count */}
          <span className="text-[12px] text-zinc-600 whitespace-nowrap">
            {filtered.length.toLocaleString()} players
          </span>
        </div>
      </div>

      {/* Position filter chips */}
      <div className="flex flex-wrap gap-1.5">
        {posGroups.map(pos => (
          <button
            key={pos}
            onClick={() => handlePosFilter(pos)}
            className={[
              "h-7 px-3 rounded-full text-[11px] font-medium tracking-wide transition-colors cursor-pointer",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]",
              posFilter === pos
                ? "bg-[#C9A84C] text-zinc-950"
                : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200",
            ].join(" ")}
          >
            {pos}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/80">
                {cols.map(col => (
                  <th
                    key={col.key}
                    className={`${col.className} px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase tracking-wider cursor-pointer select-none hover:text-zinc-300 transition-colors`}
                    onClick={() => handleSort(col.key)}
                  >
                    {col.label}
                    <SortIcon active={sortKey === col.key} dir={sortDir} />
                  </th>
                ))}
                <th className="text-right px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase tracking-wider w-20">
                  Height
                </th>
                <th className="text-right px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase tracking-wider w-20">
                  Weight
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-zinc-600 text-[13px]">
                    No players match your filters
                  </td>
                </tr>
              ) : (
                visible.map((player, i) => (
                  <tr
                    key={player.player_id}
                    className={[
                      "border-b border-zinc-800/60 transition-colors",
                      "hover:bg-zinc-800/40",
                      i % 2 === 0 ? "bg-transparent" : "bg-zinc-900/20",
                    ].join(" ")}
                  >
                    {/* Name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-zinc-100 font-medium text-[13px] whitespace-nowrap">
                          {player.full_name}
                        </span>
                        <InjuryDot status={player.injury_status} />
                      </div>
                    </td>

                    {/* Position */}
                    <td className="px-4 py-3">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold tracking-wide ${positionStyle(player.position)}`}>
                        {player.position}
                      </span>
                    </td>

                    {/* Team */}
                    <td className="px-4 py-3">
                      <span className="text-zinc-300 font-medium text-[13px]">{player.team}</span>
                    </td>

                    {/* Jersey */}
                    <td className="px-4 py-3 text-right">
                      <span className="text-zinc-400 text-[13px] font-mono">
                        {player.number != null ? `#${player.number}` : "—"}
                      </span>
                    </td>

                    {/* Age */}
                    <td className="px-4 py-3 text-right">
                      <span className="text-zinc-400 text-[13px]">
                        {player.age ?? "—"}
                      </span>
                    </td>

                    {/* Experience */}
                    <td className="px-4 py-3 text-right">
                      <span className={`text-[12px] ${player.years_exp === 0 ? "text-[#C9A84C]" : "text-zinc-500"}`}>
                        {formatExp(player.years_exp)}
                      </span>
                    </td>

                    {/* Height */}
                    <td className="px-4 py-3 text-right">
                      <span className="text-zinc-500 text-[12px]">{formatHeight(player.height)}</span>
                    </td>

                    {/* Weight */}
                    <td className="px-4 py-3 text-right">
                      <span className="text-zinc-500 text-[12px]">
                        {player.weight ? `${player.weight} lb` : "—"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <span className="text-[12px] text-zinc-600">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length.toLocaleString()}
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              className="h-8 px-3 rounded-lg text-[12px] text-zinc-400 border border-zinc-800 hover:border-zinc-600 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              ← Prev
            </button>
            <span className="text-[12px] text-zinc-600 px-2">
              {page + 1} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
              className="h-8 px-3 rounded-lg text-[12px] text-zinc-400 border border-zinc-800 hover:border-zinc-600 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
