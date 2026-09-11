"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { DraftSetup } from "@/components/DraftSetup";
import type { Draft, DraftPick, DraftPosition, PickerPlayer, PositionSelection, Claim } from "@/lib/types";

const PICK_DURATIONS = [
  { label: "30 min", value: 0.5 },
  { label: "1 hour", value: 1   },
  { label: "2 hours", value: 2  },
];

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
function toUTC(local: string): string { return new Date(local).toISOString(); }

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_POSITIONS: DraftPosition[] = ["QB", "RB", "WR", "DEF"];

const NFL_TEAMS = [
  "ARI","ATL","BAL","BUF","CAR","CHI","CIN","CLE",
  "DAL","DEN","DET","GB","HOU","IND","JAX","KC",
  "LAC","LAR","LV","MIA","MIN","NE","NO","NYG",
  "NYJ","PHI","PIT","SF","SEA","TB","TEN","WAS",
];

const POS_STYLES: Record<DraftPosition, string> = {
  QB:  "bg-blue-500/15 text-blue-400 border-blue-500/25",
  RB:  "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  WR:  "bg-violet-500/15 text-violet-400 border-violet-500/25",
  DEF: "bg-red-500/15 text-red-400 border-red-500/25",
};

// Display label for each position slot (WR slot accepts WR or TE)
const POS_LABEL: Record<DraftPosition, string> = {
  QB:  "QB",
  RB:  "RB",
  WR:  "WR/TE",
  DEF: "DEF",
};

const DRAFTER_ACCENT = [
  "text-blue-400", "text-violet-400", "text-emerald-400", "text-orange-400", "text-pink-400",
];
const DRAFTER_BG = [
  "bg-blue-500/20 border-blue-500/30",
  "bg-violet-500/20 border-violet-500/30",
  "bg-emerald-500/20 border-emerald-500/30",
  "bg-orange-500/20 border-orange-500/30",
  "bg-pink-500/20 border-pink-500/30",
];

// ─── Pick status helper ───────────────────────────────────────────────────────

type PickStatus = "locked" | "active" | "overdue" | "complete";

function getPickStatus(pick: DraftPick, now: Date, durationMs: number): PickStatus {
  if (pick.submitted_at) return "complete";
  const unlockAt = new Date(pick.unlock_at);
  if (now < unlockAt) return "locked";
  const overdueAt = new Date(unlockAt.getTime() + durationMs);
  if (now >= overdueAt) return "overdue";
  return "active";
}

function msToHMS(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function formatTime(iso: string, tz: string) {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: tz,
    month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
    hour12: true,
  });
}

// ─── Slot form state ──────────────────────────────────────────────────────────

interface FormSlot {
  position: DraftPosition | null;
  player_id: string;
  player_name: string;
}

const emptySlot = (): FormSlot => ({ position: null, player_id: "", player_name: "" });

// ─── Sub-components ───────────────────────────────────────────────────────────

function Avatar({ idx, name, image }: { idx: number; name: string; image?: string | null }) {
  if (image) {
    return (
      <Image
        src={image}
        alt={name}
        width={24}
        height={24}
        className="w-6 h-6 rounded-full shrink-0 object-cover ring-1 ring-zinc-600"
      />
    );
  }
  return (
    <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0 ${DRAFTER_BG[idx]}`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function PosBadge({ pos }: { pos: DraftPosition }) {
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${POS_STYLES[pos]}`}>{POS_LABEL[pos]}</span>
  );
}

interface PickCardProps {
  pick: DraftPick;
  status: PickStatus;
  drafterName: string;
  drafterImage?: string | null;
  isSelected: boolean;
  isYours: boolean;
  durationMs: number;
  now: Date;
  tz: string;
  onClick: () => void;
}

function PickCard({ pick, status, drafterName, drafterImage, isSelected, isYours, durationMs, now, tz, onClick }: PickCardProps) {
  const unlockAt = new Date(pick.unlock_at);
  const overdueAt = new Date(unlockAt.getTime() + durationMs);
  const msUntilUnlock = unlockAt.getTime() - now.getTime();
  const msUntilOverdue = overdueAt.getTime() - now.getTime();

  const borderClass =
    isSelected       ? "border-[#C9A84C] shadow-[0_0_18px_rgba(201,168,76,0.15)]" :
    status === "active"  ? "border-[#C9A84C]/50 hover:border-[#C9A84C]" :
    status === "overdue" ? "border-red-500/50 hover:border-red-400" :
    status === "complete"? "border-zinc-800" :
                           "border-zinc-800/60";

  const bgClass =
    status === "complete" ? "bg-zinc-900/60" :
    status === "locked"   ? "bg-zinc-900/20" :
                            "bg-zinc-900";

  const clickable = status === "active" || status === "overdue";

  return (
    <div
      onClick={clickable ? onClick : undefined}
      className={[
        "rounded-xl border p-3 flex flex-col gap-1.5 transition-all duration-150 min-w-0",
        bgClass, borderClass,
        clickable ? "cursor-pointer" : "",
      ].join(" ")}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <Avatar idx={pick.drafter_idx} name={drafterName} image={drafterImage} />
          <span className={`text-[12px] font-semibold truncate ${status === "locked" ? "text-zinc-600" : "text-zinc-200"}`}>
            {drafterName}
          </span>
          {isYours && (
            <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-[#C9A84C]/20 text-[#C9A84C] border border-[#C9A84C]/30 shrink-0 uppercase tracking-wide">
              You
            </span>
          )}
        </div>
        <span className={`text-[9px] font-mono shrink-0 ${status === "locked" ? "text-zinc-700" : "text-zinc-500"}`}>
          #{pick.pick_num}
        </span>
      </div>

      {/* Status badge */}
      {status === "active" && (
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] animate-pulse shrink-0" />
          <span className="text-[10px] text-[#C9A84C] font-medium">
            {msToHMS(msUntilOverdue)} left
          </span>
        </div>
      )}
      {status === "overdue" && (
        <span className="text-[10px] text-red-400 font-semibold">OVERDUE — still open</span>
      )}
      {status === "locked" && (
        <span className="text-[10px] text-zinc-600">
          Unlocks {msToHMS(msUntilUnlock)}
        </span>
      )}

      {/* Slots */}
      <div className="flex flex-col gap-1 mt-0.5">
        {status === "complete" ? (
          <>
            {pick.positions.map(pp => (
              <div key={pp.slot} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-800/60">
                <PosBadge pos={pp.slot} />
                <span className="text-[11px] text-zinc-300 truncate">{pp.player_name}</span>
              </div>
            ))}
            {pick.pass === 1 && pick.winning_team && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#C9A84C]/10 border border-[#C9A84C]/20">
                <span className="text-[9px] font-bold text-[#C9A84C]">WIN</span>
                <span className="text-[11px] text-[#C9A84C]/80 font-medium">{pick.winning_team}</span>
              </div>
            )}
          </>
        ) : (
          <>
            <div className={`px-2 py-1 rounded-lg border border-dashed text-[10px] ${status === "locked" ? "border-zinc-800 text-zinc-700" : "border-zinc-700 text-zinc-600"}`}>
              POS —
            </div>
            <div className={`px-2 py-1 rounded-lg border border-dashed text-[10px] ${status === "locked" ? "border-zinc-800 text-zinc-700" : "border-zinc-700 text-zinc-600"}`}>
              POS —
            </div>
            {pick.pass === 1 && (
              <div className={`px-2 py-1 rounded-lg border border-dashed text-[10px] font-bold ${status === "locked" ? "border-zinc-800 text-zinc-700" : "border-[#C9A84C]/25 text-[#C9A84C]/40"}`}>
                WIN —
              </div>
            )}
          </>
        )}
      </div>

      {/* Pass label */}
      <div className={`text-[9px] uppercase tracking-widest mt-0.5 ${status === "locked" ? "text-zinc-700" : "text-zinc-600"}`}>
        {pick.pass === 1 ? "Pass 1 · 2 picks + win" : "Pass 2 · 2 picks"}
      </div>

      {/* Unlock time for locked picks */}
      {status === "locked" && (
        <div className="text-[9px] text-zinc-700 truncate">{formatTime(pick.unlock_at, tz)}</div>
      )}
    </div>
  );
}

// ─── Pick form sidebar ────────────────────────────────────────────────────────

interface PickFormProps {
  draft: Draft;
  pick: DraftPick;
  players: PickerPlayer[];
  pickedIds: Set<string>;
  imageMap: Map<string, string | null>;
  onSubmitted: (updated: Draft) => void;
  onClose: () => void;
}

function PickForm({ draft, pick, players, pickedIds, imageMap, onSubmitted, onClose }: PickFormProps) {
  const drafterName = draft.participants[pick.drafter_idx]?.name ?? "?";

  // Determine available positions for this pass
  const otherPassPick = draft.picks.find(
    p => p.drafter_idx === pick.drafter_idx && p.pass !== pick.pass
  );
  const takenByOtherPass = otherPassPick?.submitted_at
    ? new Set(otherPassPick.positions.map(p => p.slot))
    : new Set<DraftPosition>();
  const availablePositions = ALL_POSITIONS.filter(p => !takenByOtherPass.has(p));

  const [slots, setSlots] = useState<[FormSlot, FormSlot]>([emptySlot(), emptySlot()]);
  const [winTeam, setWinTeam]   = useState("");
  const [activeSlot, setActiveSlot] = useState<0 | 1>(0);
  const [search, setSearch]     = useState("");
  const [teamSearch, setTeamSearch] = useState("");
  const [defSearch, setDefSearch]   = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const currentPos = slots[activeSlot].position;

  // Winning teams already locked in by other drafters
  const usedWinTeams = useMemo(() => new Set(
    draft.picks
      .filter(p => p.submitted_at && p.pass === 1 && p.drafter_idx !== pick.drafter_idx)
      .map(p => p.winning_team)
      .filter(Boolean) as string[]
  ), [draft.picks, pick.drafter_idx]);

  // Filtered player list for active slot (non-DEF only — DEF uses team picker)
  const filteredPlayers = useMemo(() => {
    if (!currentPos || currentPos === "DEF") return [];
    const q = search.toLowerCase();
    return players.filter(p =>
      (p.position === currentPos || (currentPos === "WR" && p.position === "TE")) &&
      !pickedIds.has(p.player_id) &&
      slots.every(s => s.player_id !== p.player_id) &&
      (q === "" || p.full_name.toLowerCase().includes(q) || p.team.toLowerCase().includes(q))
    );
  }, [players, currentPos, pickedIds, slots, search]);

  // Winning team list — all teams, marking taken ones
  const filteredWinTeams = NFL_TEAMS.filter(t =>
    teamSearch === "" || t.toLowerCase().includes(teamSearch.toLowerCase())
  );

  // DEF team list — exclude already-picked team defenses
  const filteredDefTeams = NFL_TEAMS.filter(t =>
    !pickedIds.has(t) &&
    slots.every(s => s.player_id !== t) &&
    (defSearch === "" || t.toLowerCase().includes(defSearch.toLowerCase()))
  );

  function setSlotPos(idx: 0 | 1, pos: DraftPosition) {
    setSlots(prev => {
      const next: [FormSlot, FormSlot] = [{ ...prev[0] }, { ...prev[1] }];
      // Clear the other slot if it has the same position
      if (idx === 0 && next[1].position === pos) next[1] = emptySlot();
      if (idx === 1 && next[0].position === pos) next[0] = emptySlot();
      next[idx] = { ...emptySlot(), position: pos };
      return next;
    });
    setSearch("");
    setActiveSlot(idx);
  }

  function setSlotPlayer(idx: 0 | 1, player: PickerPlayer) {
    setSlots(prev => {
      const next: [FormSlot, FormSlot] = [{ ...prev[0] }, { ...prev[1] }];
      next[idx] = { position: next[idx].position, player_id: player.player_id, player_name: player.full_name };
      return next;
    });
    const other = idx === 0 ? 1 : 0;
    if (!slots[other].player_id) setActiveSlot(other as 0 | 1);
    setSearch("");
  }

  function setSlotDefense(idx: 0 | 1, team: string) {
    setSlots(prev => {
      const next: [FormSlot, FormSlot] = [{ ...prev[0] }, { ...prev[1] }];
      next[idx] = { position: "DEF", player_id: team, player_name: `${team} Defense` };
      return next;
    });
    const other = idx === 0 ? 1 : 0;
    if (!slots[other].player_id) setActiveSlot(other as 0 | 1);
    setDefSearch("");
  }

  const canSubmit =
    slots[0].player_id &&
    slots[1].player_id &&
    (pick.pass === 2 || winTeam !== "");

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const positions: PositionSelection[] = slots.map(s => ({
        slot: s.position!,
        player_id: s.player_id,
        player_name: s.player_name,
      }));
      const res = await fetch(`/api/draft/${draft._id}/pick`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pick_num: pick.pick_num,
          positions,
          winning_team: pick.pass === 1 ? winTeam : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to submit pick");
      onSubmitted(data.draft);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  const slotLabelClass = "text-[10px] font-semibold uppercase tracking-wider";

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-zinc-800 flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <Avatar idx={pick.drafter_idx} name={drafterName} image={imageMap.get(drafterName)} />
            <span className={`text-[13px] font-semibold ${DRAFTER_ACCENT[pick.drafter_idx]}`}>{drafterName}</span>
          </div>
          <p className="text-[11px] text-zinc-500">
            Pick #{pick.pick_num} · Pass {pick.pass}
            {pick.pass === 1 ? " · choose 2 positions + winning team" : " · choose 2 remaining positions"}
          </p>
        </div>
        <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 text-lg leading-none cursor-pointer mt-0.5">×</button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Slot selectors */}
        <div className="px-4 py-3 border-b border-zinc-800 space-y-3">
          {([0, 1] as const).map(slotIdx => {
            const slot = slots[slotIdx];
            const isActive = activeSlot === slotIdx;
            return (
              <div key={slotIdx}>
                <div className={`${slotLabelClass} mb-1.5 ${isActive ? "text-zinc-400" : "text-zinc-600"}`}>
                  Slot {slotIdx + 1}
                </div>

                {/* Position buttons */}
                <div className="flex gap-1.5 flex-wrap mb-1.5">
                  {availablePositions.map(pos => {
                    const takenByOther = slots[slotIdx === 0 ? 1 : 0].position === pos;
                    return (
                      <button
                        key={pos}
                        onClick={() => setSlotPos(slotIdx, pos)}
                        disabled={takenByOther}
                        className={[
                          "h-7 px-2.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer",
                          "border focus-visible:outline-none disabled:opacity-30 disabled:cursor-not-allowed",
                          slot.position === pos
                            ? `${POS_STYLES[pos]} border-current`
                            : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200",
                        ].join(" ")}
                      >
                        {POS_LABEL[pos]}
                      </button>
                    );
                  })}
                </div>

                {/* Picked player display */}
                {slot.player_id ? (
                  <div
                    onClick={() => setActiveSlot(slotIdx)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 cursor-pointer hover:border-zinc-500 transition-colors"
                  >
                    <PosBadge pos={slot.position!} />
                    <span className="text-[12px] text-zinc-200 flex-1">{slot.player_name}</span>
                    <button
                      onClick={e => { e.stopPropagation(); setSlots(prev => { const n: [FormSlot, FormSlot] = [{ ...prev[0] }, { ...prev[1] }]; n[slotIdx] = emptySlot(); return n; }); }}
                      className="text-zinc-600 hover:text-zinc-300 text-sm cursor-pointer"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setActiveSlot(slotIdx); }}
                    className={[
                      "w-full text-left px-2.5 py-1.5 rounded-lg border border-dashed text-[11px] transition-colors cursor-pointer",
                      isActive && slot.position
                        ? "border-zinc-500 text-zinc-400 bg-zinc-800/30"
                        : "border-zinc-700 text-zinc-600 hover:border-zinc-600",
                    ].join(" ")}
                  >
                    {slot.position === "DEF" ? "Select team defense…" : slot.position ? `Search ${POS_LABEL[slot.position]}…` : "Select position above"}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Winning team (pass 1 only) */}
        {pick.pass === 1 && (
          <div className="px-4 py-3 border-b border-zinc-800">
            <div className={`${slotLabelClass} text-zinc-400 mb-1.5`}>Winning Team</div>
            <input
              type="text"
              placeholder="Search teams…"
              value={teamSearch}
              onChange={e => setTeamSearch(e.target.value)}
              className="w-full h-8 px-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-[12px] text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 mb-1.5"
            />
            {winTeam && (
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#C9A84C]/10 border border-[#C9A84C]/20 mb-1.5">
                <span className="text-[10px] font-bold text-[#C9A84C]">WIN</span>
                <span className="text-[12px] text-[#C9A84C]/80 font-medium flex-1">{winTeam}</span>
                <button onClick={() => setWinTeam("")} className="text-[#C9A84C]/60 hover:text-[#C9A84C] cursor-pointer text-sm">×</button>
              </div>
            )}
            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
              {filteredWinTeams.map(t => {
                const taken = usedWinTeams.has(t);
                return (
                  <button
                    key={t}
                    onClick={() => { if (!taken) { setWinTeam(t); setTeamSearch(""); } }}
                    disabled={taken}
                    className={[
                      "h-6 px-2 rounded text-[10px] font-bold transition-colors",
                      winTeam === t
                        ? "bg-[#C9A84C] text-zinc-950 cursor-pointer"
                        : taken
                        ? "bg-zinc-800/40 text-zinc-700 cursor-not-allowed line-through"
                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 cursor-pointer",
                    ].join(" ")}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* DEF team picker (when active slot is DEF and no team selected yet) */}
        {currentPos === "DEF" && !slots[activeSlot].player_id && (
          <div className="px-4 py-3">
            <div className={`${slotLabelClass} text-zinc-500 mb-1.5`}>
              Pick DEF for Slot {activeSlot + 1}
            </div>
            <input
              type="text"
              placeholder="Search teams…"
              value={defSearch}
              onChange={e => setDefSearch(e.target.value)}
              className="w-full h-8 px-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-[12px] text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 mb-2"
              autoFocus
            />
            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
              {filteredDefTeams.map(t => (
                <button
                  key={t}
                  onClick={() => setSlotDefense(activeSlot, t)}
                  className="h-6 px-2 rounded text-[10px] font-bold bg-zinc-800 text-zinc-400 hover:bg-red-500/20 hover:text-red-400 transition-colors cursor-pointer"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Player search (non-DEF positions only) */}
        {currentPos && currentPos !== "DEF" && !slots[activeSlot].player_id && (
          <div className="px-4 py-3">
            <div className={`${slotLabelClass} text-zinc-500 mb-1.5`}>
              Pick {currentPos} for Slot {activeSlot + 1}
            </div>
            <input
              type="text"
              placeholder={`Search ${currentPos} players…`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-8 px-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-[12px] text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 mb-2"
              autoFocus
            />
            <div className="space-y-0.5 max-h-48 overflow-y-auto">
              {filteredPlayers.length === 0 ? (
                <p className="text-[11px] text-zinc-600 py-3 text-center">No players found</p>
              ) : (
                filteredPlayers.slice(0, 30).map(p => (
                  <button
                    key={p.player_id}
                    onClick={() => setSlotPlayer(activeSlot, p)}
                    className="w-full text-left flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer group"
                  >
                    <PosBadge pos={currentPos} />
                    <span className="text-[12px] text-zinc-300 group-hover:text-zinc-100 flex-1 truncate">{p.full_name}</span>
                    <span className="text-[10px] text-zinc-600 shrink-0">{p.team}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="px-4 py-3 border-t border-zinc-800 space-y-2">
        {error && (
          <p className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 rounded px-2 py-1.5">{error}</p>
        )}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          className={[
            "w-full h-10 rounded-xl text-[13px] font-semibold transition-all cursor-pointer",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            !canSubmit || submitting
              ? "bg-zinc-800 text-zinc-500"
              : "bg-[#C9A84C] text-zinc-950 hover:bg-[#D4B86A]",
          ].join(" ")}
        >
          {submitting ? "Submitting…" : "Lock In Pick"}
        </button>
      </div>
    </div>
  );
}

// ─── Roster summary ───────────────────────────────────────────────────────────

function RosterCard({ drafterIdx, name, image, picks }: { drafterIdx: number; name: string; image?: string | null; picks: DraftPick[] }) {
  const mine = picks.filter(p => p.drafter_idx === drafterIdx && p.submitted_at);
  const byPos: Partial<Record<DraftPosition, string>> = {};
  let winTeam: string | null = null;
  for (const p of mine) {
    for (const pp of p.positions) byPos[pp.slot] = pp.player_name;
    if (p.winning_team) winTeam = p.winning_team;
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 mb-0.5">
        <Avatar idx={drafterIdx} name={name} image={image} />
        <span className={`text-[12px] font-semibold ${DRAFTER_ACCENT[drafterIdx]}`}>{name}</span>
      </div>
      {ALL_POSITIONS.map(pos => (
        byPos[pos] ? (
          <div key={pos} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-800/60">
            <PosBadge pos={pos} />
            <span className="text-[11px] text-zinc-300 truncate">{byPos[pos]}</span>
          </div>
        ) : (
          <div key={pos} className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-dashed border-zinc-800 text-[10px] text-zinc-700">
            {pos} —
          </div>
        )
      ))}
      {winTeam ? (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#C9A84C]/10 border border-[#C9A84C]/20">
          <span className="text-[9px] font-bold text-[#C9A84C]">WIN</span>
          <span className="text-[11px] text-[#C9A84C]/80 font-medium">{winTeam}</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-dashed border-zinc-800 text-[10px] text-zinc-700">WIN —</div>
      )}
    </div>
  );
}

// ─── Main DraftBoard ──────────────────────────────────────────────────────────

interface DraftBoardProps {
  initialDraft: Draft | null;
  players: PickerPlayer[];
  week: number;
  season: number;
  claimedName?: string | null;
  claims?: Claim[];
}

export function DraftBoard({ initialDraft, players, week, season, claimedName, claims = [] }: DraftBoardProps) {
  const router                          = useRouter();
  const [draft, setDraft]               = useState<Draft | null>(initialDraft);
  const [now, setNow]                   = useState(new Date());
  const [selectedPick, setSelectedPick] = useState<number | null>(null);

  // Pending config state
  const [cfgStart, setCfgStart]       = useState(initialDraft ? toDatetimeLocal(initialDraft.start_time) : "");
  const [cfgDuration, setCfgDuration] = useState(initialDraft?.pick_duration_hours ?? 1);
  const [cfgBusy, setCfgBusy]         = useState<"save" | "start" | null>(null);
  const [cfgError, setCfgError]       = useState<string | null>(null);

  // Reset state
  const [resetBusy, setResetBusy] = useState(false);

  // Live clock — ticks every second
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Poll for remote pick updates every 10 s while the draft is active or pending
  const draftId     = draft?._id;
  const draftStatus = draft?.status;
  useEffect(() => {
    if (!draftId || draftStatus === "complete") return;
    const poll = async () => {
      try {
        const res = await fetch(`/api/draft/${draftId}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        setDraft(data.draft);
      } catch { /* ignore transient errors */ }
    };
    const id = setInterval(poll, 10_000);
    return () => clearInterval(id);
  }, [draftId, draftStatus]);

  const durationMs = (draft?.pick_duration_hours ?? 1) * 60 * 60 * 1000;

  const pickedIds = useMemo(
    () => new Set(draft?.picks.flatMap(p => p.positions.map(pp => pp.player_id)) ?? []),
    [draft]
  );

  const imageMap = useMemo(
    () => new Map(claims.map(c => [c.participant_name, c.user_image])),
    [claims]
  );

  const handleClose = useCallback(() => setSelectedPick(null), []);

  async function handleSaveConfig() {
    if (!draft) return;
    setCfgBusy("save"); setCfgError(null);
    try {
      const res = await fetch(`/api/draft/${draft._id}/config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start_time: toUTC(cfgStart), pick_duration_hours: cfgDuration }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setDraft(data.draft);
    } catch (e) { setCfgError(e instanceof Error ? e.message : "Failed"); }
    finally { setCfgBusy(null); }
  }

  async function handleStart() {
    if (!draft) return;
    setCfgBusy("start"); setCfgError(null);
    try {
      const res = await fetch(`/api/draft/${draft._id}/start`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setDraft(data.draft);
    } catch (e) { setCfgError(e instanceof Error ? e.message : "Failed"); }
    finally { setCfgBusy(null); }
  }

  async function handleReset() {
    if (!draft || !confirm("Reset all picks and return this draft to pending? This cannot be undone.")) return;
    setResetBusy(true);
    try {
      const res = await fetch(`/api/draft/${draft._id}/reset`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      const updated: Draft = data.draft;
      setCfgStart(toDatetimeLocal(updated.start_time));
      setCfgDuration(updated.pick_duration_hours);
      setDraft(updated);
      setSelectedPick(null);
    } catch (e) { alert(e instanceof Error ? e.message : "Reset failed"); }
    finally { setResetBusy(false); }
  }

  if (!draft) {
    return <DraftSetup week={week} season={season} />;
  }

  // ── Pending panel ─────────────────────────────────────────────────────────────
  if (draft.status === "pending") {
    const inputCls = "w-full h-9 px-3 rounded-lg bg-zinc-800 border border-zinc-700 text-[13px] text-zinc-200 focus:outline-none focus:border-zinc-500 transition-colors [color-scheme:dark]";
    const labelCls = "block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5";

    return (
      <div className="w-full max-w-lg">
        {/* Title */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold tracking-[-0.03em] text-white">
            {draft.division ? `${draft.division} — Week ${draft.week}` : `Week ${draft.week} Draft`}
          </h2>
          <p className="text-[13px] text-zinc-500 mt-1">Configure and start this draft.</p>
        </div>

        {/* Pick order */}
        <div className="mb-8">
          <p className={labelCls}>Pick order</p>
          <div className="space-y-1.5">
            {draft.participants.map((p, i) => {
              const pass2Idx = draft.participants.length * 2 - 1 - i;
              return (
                <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800">
                  <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-[9px] font-bold shrink-0 ${DRAFTER_BG[i]}`}>
                    {p.name.charAt(0).toUpperCase()}
                  </span>
                  <span className={`text-[13px] font-medium flex-1 ${DRAFTER_ACCENT[i]}`}>{p.name}</span>
                  <span className="text-[10px] text-zinc-600 font-mono">
                    picks {i + 1} + {pass2Idx + 1}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Config */}
        <div className="space-y-5 mb-8 p-5 rounded-xl bg-zinc-900 border border-zinc-800">
          <div>
            <label className={labelCls}>Start time</label>
            <input
              type="datetime-local"
              value={cfgStart}
              onChange={e => setCfgStart(e.target.value)}
              className={inputCls}
            />
            <p className="text-[11px] text-zinc-600 mt-1.5">
              Clicking "Start Draft" will begin the draft immediately regardless of this time.
            </p>
          </div>
          <div>
            <label className={labelCls}>Time per pick</label>
            <div className="flex gap-2">
              {PICK_DURATIONS.map(d => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setCfgDuration(d.value)}
                  className={[
                    "flex-1 h-9 rounded-lg text-[13px] font-medium transition-colors cursor-pointer border",
                    cfgDuration === d.value
                      ? "bg-[#C9A84C] border-[#C9A84C] text-zinc-950"
                      : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200",
                  ].join(" ")}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {cfgError && (
            <p className="text-[12px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{cfgError}</p>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleSaveConfig}
              disabled={cfgBusy !== null}
              className="h-9 px-4 rounded-lg text-[13px] font-medium bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition-colors cursor-pointer disabled:opacity-50"
            >
              {cfgBusy === "save" ? "Saving…" : "Save"}
            </button>
            <button
              onClick={handleStart}
              disabled={cfgBusy !== null}
              className="flex-1 h-9 rounded-xl text-[13.5px] font-semibold bg-[#C9A84C] hover:bg-[#D4B86A] text-zinc-950 transition-colors cursor-pointer disabled:opacity-50"
            >
              {cfgBusy === "start" ? "Starting…" : "Start Draft"}
            </button>
          </div>
        </div>

        <a href="/draft" className="text-[12px] text-zinc-600 hover:text-zinc-400 transition-colors">
          ← Back to drafts
        </a>
      </div>
    );
  }

  const pass1 = draft.picks.filter(p => p.pass === 1); // drafter 0→4
  const pass2 = draft.picks.filter(p => p.pass === 2); // drafter 4→0 stored, displayed by drafter order

  // For display, align pass2 by drafter index (same column as pass1)
  const pass2ByDrafter = draft.participants.map((_, i) =>
    draft.picks.find(p => p.pass === 2 && p.drafter_idx === i)!
  );

  const selectedPickData = selectedPick !== null
    ? draft.picks.find(p => p.pick_num === selectedPick) ?? null
    : null;

  const completedCount = draft.picks.filter(p => p.submitted_at).length;
  const tz = draft.timezone;
  const myDrafterIdx = claimedName
    ? draft.participants.findIndex(p => p.name === claimedName)
    : -1;

  // Current "on the clock" = earliest unlocked, non-submitted pick
  const onClockPick = [...draft.picks]
    .sort((a, b) => a.pick_num - b.pick_num)
    .find(p => !p.submitted_at && new Date(p.unlock_at) <= now);

  return (
    <div className="flex flex-col gap-6">

      {/* ── Status bar ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-[-0.03em] text-white">
            {draft.division ? `${draft.division} — Week ${draft.week}` : `Week ${draft.week} Draft`}
          </h2>
          <p className="text-[13px] text-zinc-500 mt-0.5">
            {formatTime(draft.start_time, tz)}
            {" · "}{draft.pick_duration_hours < 1 ? `${draft.pick_duration_hours * 60}m` : `${draft.pick_duration_hours}h`} per pick
            {onClockPick && (
              <> · <span className="text-[#C9A84C]">{draft.participants[onClockPick.drafter_idx]?.name} on the clock</span></>
            )}
            {claimedName && myDrafterIdx !== -1 && (
              <> · <span className="text-zinc-400">you: <span className="text-white font-medium">{claimedName}</span></span></>
            )}
            {claimedName && myDrafterIdx === -1 && (
              <> · <span className="text-zinc-600">({claimedName} not in this draft)</span></>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex gap-1">
            {draft.picks.map(p => {
              const s = getPickStatus(p, now, durationMs);
              return (
                <div key={p.pick_num} className={[
                  "w-2 h-2 rounded-full",
                  s === "complete"  ? "bg-emerald-400" :
                  s === "active"    ? "bg-[#C9A84C] animate-pulse" :
                  s === "overdue"   ? "bg-red-500 animate-pulse" :
                                     "bg-zinc-700",
                ].join(" ")} />
              );
            })}
          </div>
          <span className="text-[11px] text-zinc-600">{completedCount}/{draft.picks.length} complete</span>
          <button
            onClick={handleReset}
            disabled={resetBusy}
            className="text-[11px] text-zinc-600 hover:text-red-400 transition-colors cursor-pointer border border-zinc-800 rounded-lg px-2 sm:px-2.5 py-1 hover:border-red-500/50 disabled:opacity-50"
          >
            {resetBusy ? "…" : "Reset"}
          </button>
          <a
            href="/draft"
            className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors border border-zinc-800 rounded-lg px-2 sm:px-2.5 py-1 hover:border-zinc-600"
          >
            ← Drafts
          </a>
        </div>
      </div>

      {/* ── Split: board + sidebar ── */}
      <div className="flex gap-5 items-start">

        {/* ── Board ── */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Pass 1 */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Pass 1</span>
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-[10px] text-zinc-600">picks 1 → 5</span>
            <svg className="w-3.5 h-3.5 text-zinc-600" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 8h10M9 5l3 3-3 3" />
            </svg>
          </div>
          <div
            className="grid gap-2 grid-cols-2 md:[grid-template-columns:var(--pick-cols)]"
            style={{ '--pick-cols': `repeat(${draft.participants.length}, minmax(0, 1fr))` } as React.CSSProperties}
          >
            {pass1.map(pick => {
              const dName = draft.participants[pick.drafter_idx]?.name ?? "?";
              return (
                <PickCard
                  key={pick.pick_num}
                  pick={pick}
                  status={getPickStatus(pick, now, durationMs)}
                  drafterName={dName}
                  drafterImage={imageMap.get(dName)}
                  isSelected={selectedPick === pick.pick_num}
                  isYours={myDrafterIdx !== -1 && pick.drafter_idx === myDrafterIdx}
                  durationMs={durationMs}
                  now={now}
                  tz={tz}
                  onClick={() => setSelectedPick(pick.pick_num === selectedPick ? null : pick.pick_num)}
                />
              );
            })}
          </div>

          {/* Snake connector — only meaningful when grid shows all columns */}
          <div className="hidden md:flex justify-end pr-0">
            <div className="border-r border-b border-zinc-700 h-3 rounded-br-lg"
                 style={{ width: `calc(${100 / draft.participants.length}% - 4px)` }} />
          </div>

          {/* Pass 2 */}
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-zinc-600" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 8H4M7 5L4 8l3 3" />
            </svg>
            <span className="text-[10px] text-zinc-600">picks 6 ← 10</span>
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Pass 2</span>
          </div>
          <div
            className="grid gap-2 grid-cols-2 md:[grid-template-columns:var(--pick-cols)]"
            style={{ '--pick-cols': `repeat(${draft.participants.length}, minmax(0, 1fr))` } as React.CSSProperties}
          >
            {pass2ByDrafter.map(pick => {
              const dName = draft.participants[pick.drafter_idx]?.name ?? "?";
              return (
                <PickCard
                  key={pick.pick_num}
                  pick={pick}
                  status={getPickStatus(pick, now, durationMs)}
                  drafterName={dName}
                  drafterImage={imageMap.get(dName)}
                  isSelected={selectedPick === pick.pick_num}
                  isYours={myDrafterIdx !== -1 && pick.drafter_idx === myDrafterIdx}
                  durationMs={durationMs}
                  now={now}
                  tz={tz}
                  onClick={() => setSelectedPick(pick.pick_num === selectedPick ? null : pick.pick_num)}
                />
              );
            })}
          </div>

          {/* Mobile hint (desktop has sidebar) */}
          {onClockPick && (
            <p className="lg:hidden text-center text-[12px] text-zinc-500 py-1">
              Tap <span className="text-[#C9A84C]">{draft.participants[onClockPick.drafter_idx]?.name}&apos;s</span> card to make their pick
            </p>
          )}

          {/* Roster summary */}
          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Rosters</span>
              <div className="flex-1 h-px bg-zinc-800" />
            </div>
            <div
              className="grid gap-2 grid-cols-2 md:[grid-template-columns:var(--pick-cols)]"
              style={{ '--pick-cols': `repeat(${draft.participants.length}, minmax(0, 1fr))` } as React.CSSProperties}
            >
              {draft.participants.map((p, i) => (
                <RosterCard key={i} drafterIdx={i} name={p.name} image={imageMap.get(p.name)} picks={draft.picks} />
              ))}
            </div>
          </div>
        </div>

        {/* ── Pick form sidebar (desktop) ── */}
        <div className="hidden lg:block w-72 shrink-0 sticky top-[72px]" style={{ maxHeight: "calc(100vh - 100px)" }}>
          {selectedPickData ? (
            <PickForm
              draft={draft}
              pick={selectedPickData}
              players={players}
              pickedIds={pickedIds}
              imageMap={imageMap}
              onSubmitted={updated => { setDraft(updated); setSelectedPick(null); }}
              onClose={handleClose}
            />
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-3">
                <svg className="w-4 h-4 text-zinc-600" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" d="M8 3v10M3 8h10" />
                </svg>
              </div>
              <p className="text-[12px] text-zinc-500">
                {onClockPick
                  ? <>Tap <span className="text-[#C9A84C]">{draft.participants[onClockPick.drafter_idx]?.name}&apos;s</span> card to make their pick</>
                  : "No picks are currently unlocked"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Pick form bottom sheet (mobile / tablet) ── */}
      {selectedPickData && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
          <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl overflow-hidden" style={{ height: "92dvh" }}>
            <PickForm
              draft={draft}
              pick={selectedPickData}
              players={players}
              pickedIds={pickedIds}
              imageMap={imageMap}
              onSubmitted={updated => { setDraft(updated); setSelectedPick(null); }}
              onClose={handleClose}
            />
          </div>
        </div>
      )}
    </div>
  );
}
