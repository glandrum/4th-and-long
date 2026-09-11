"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ALL_DIVISIONS, DIVISION_PARTICIPANTS } from "@/lib/divisions";

const TIMEZONES = [
  { label: "Eastern (ET)",    value: "America/New_York"    },
  { label: "Central (CT)",    value: "America/Chicago"     },
  { label: "Mountain (MT)",   value: "America/Denver"      },
  { label: "Pacific (PT)",    value: "America/Los_Angeles" },
  { label: "Arizona (AZ)",    value: "America/Phoenix"     },
  { label: "Alaska (AK)",     value: "America/Anchorage"   },
  { label: "Hawaii (HI)",     value: "Pacific/Honolulu"    },
];

const DURATIONS = [
  { label: "30 min",  value: 0.5 },
  { label: "1 hour",  value: 1   },
  { label: "2 hours", value: 2   },
];

interface DraftSetupProps {
  week: number;
  season: number;
  division?: string;
}

function toUTC(localStr: string): string {
  return new Date(localStr).toISOString();
}

function getRotatedNames(division: string, week: number): string[] {
  const base = DIVISION_PARTICIPANTS[division];
  if (!base) return [];
  const n = base.length;
  const offset = (week - 1) % n;
  return [...base.slice(offset), ...base.slice(0, offset)];
}

export function DraftSetup({ week, season, division: divisionProp = "" }: DraftSetupProps) {
  const router                          = useRouter();
  const [selectedWeek, setSelectedWeek] = useState(week);
  const [division, setDivision]         = useState(divisionProp);
  const [names, setNames]               = useState(["", "", "", "", ""]);
  const [startTime, setStartTime]       = useState("");
  const [timezone, setTimezone]         = useState("America/Chicago");
  const [duration, setDuration]         = useState(1);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);

  const isDivisionDraft = division !== "";
  const divisionNames = isDivisionDraft ? getRotatedNames(division, selectedWeek) : [];

  function setName(idx: number, val: string) {
    setNames(prev => prev.map((n, i) => (i === idx ? val : n)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!startTime) {
      setError("Pick a start date and time.");
      return;
    }

    // For custom drafts, validate manual entries
    if (!isDivisionDraft) {
      const count = names.filter(n => n.trim().length > 0).length;
      if (count < 2) {
        setError("Enter at least 2 participant names.");
        return;
      }
    }

    const body: Record<string, unknown> = {
      week:                selectedWeek,
      season,
      division,
      start_time:          toUTC(startTime),
      timezone,
      pick_duration_hours: duration,
    };

    // For custom drafts, send participant names; for division drafts the server derives them
    if (!isDivisionDraft) {
      body.participants = names
        .map((name, i) => ({ name: name.trim(), order: i + 1 }))
        .filter(p => (p.name as string).length > 0);
    }

    setLoading(true);
    try {
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create draft");
      router.push(`/draft/${data.draft._id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const inputClass = [
    "w-full h-9 px-3 rounded-lg bg-zinc-800 border border-zinc-700",
    "text-[13px] text-zinc-200 placeholder-zinc-600",
    "focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500",
    "transition-colors",
  ].join(" ");

  const labelClass = "block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5";

  return (
    <div className="max-w-lg">
      <div className="mb-8">
        <h2 className="text-xl font-semibold tracking-[-0.03em] text-white">New Draft</h2>
        <p className="text-[13px] text-zinc-500 mt-1">
          Configure the week, division, and timing for this draft.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Week + Division */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Week</label>
            <select
              value={selectedWeek}
              onChange={e => setSelectedWeek(Number(e.target.value))}
              className={inputClass + " cursor-pointer"}
            >
              {Array.from({ length: 17 }, (_, i) => i + 1).map(w => (
                <option key={w} value={w}>Week {w}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Division</label>
            <select
              value={division}
              onChange={e => setDivision(e.target.value)}
              className={inputClass + " cursor-pointer"}
            >
              <option value="">Custom</option>
              {ALL_DIVISIONS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Participants */}
        {isDivisionDraft ? (
          // Division draft — show auto-computed pick order (read-only)
          <div>
            <label className={labelClass}>
              Pick order
              <span className="normal-case text-zinc-700 tracking-normal ml-1">· week {selectedWeek} rotation</span>
            </label>
            <div className="space-y-1.5">
              {divisionNames.map((name, i) => (
                <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-zinc-800/50 border border-zinc-800">
                  <span className="text-[10px] text-zinc-600 w-4 shrink-0 text-right font-mono">{i + 1}</span>
                  <span className="text-[13px] text-zinc-300">{name}</span>
                  {i === 0 && (
                    <span className="ml-auto text-[9px] font-semibold text-[#C9A84C] uppercase tracking-wider">1st pick</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          // Custom draft — manual participant entry
          <div>
            <label className={labelClass}>Participants <span className="normal-case text-zinc-600 tracking-normal">(up to 5)</span></label>
            <div className="space-y-2">
              {names.map((name, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[11px] text-zinc-600 w-4 shrink-0 text-right">{i + 1}</span>
                  <input
                    type="text"
                    placeholder={i < 2 ? `Player ${i + 1} (required)` : `Player ${i + 1} (optional)`}
                    value={name}
                    onChange={e => setName(i, e.target.value)}
                    className={inputClass}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Start time + timezone */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
          <div>
            <label className={labelClass}>Draft Start</label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              className={inputClass + " [color-scheme:dark]"}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Timezone</label>
            <select
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
              className={inputClass + " cursor-pointer sm:min-w-[130px]"}
            >
              {TIMEZONES.map(tz => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Pick duration */}
        <div>
          <label className={labelClass}>Time per pick</label>
          <div className="flex flex-wrap gap-2">
            {DURATIONS.map(d => (
              <button
                key={d.value}
                type="button"
                onClick={() => setDuration(d.value)}
                className={[
                  "h-8 px-3 rounded-lg text-[12px] font-medium transition-colors cursor-pointer",
                  "border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]",
                  duration === d.value
                    ? "bg-[#C9A84C] border-[#C9A84C] text-zinc-950"
                    : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200",
                ].join(" ")}
              >
                {d.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-zinc-600 mt-2">
            Each pick unlocks on schedule. Submitting early opens the next window immediately.
          </p>
        </div>

        {error && (
          <p className="text-[12px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className={[
            "w-full h-11 rounded-xl text-[13.5px] font-semibold transition-all cursor-pointer",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            loading
              ? "bg-zinc-800 text-zinc-500"
              : "bg-[#C9A84C] text-zinc-950 hover:bg-[#D4B86A]",
          ].join(" ")}
        >
          {loading ? "Creating draft…" : "Create Draft"}
        </button>
      </form>
    </div>
  );
}
