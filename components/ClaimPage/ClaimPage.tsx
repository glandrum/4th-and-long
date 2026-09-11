"use client";

import { useState } from "react";
import Image from "next/image";
import { DIVISION_PARTICIPANTS, ALL_DIVISIONS } from "@/lib/divisions";
import type { Claim } from "@/lib/types";

interface ClaimPageProps {
  initialClaims: Claim[];
  myClaim: Claim | null;
  userId: string;
}

export function ClaimPage({ initialClaims, myClaim: initialMyClaim, userId }: ClaimPageProps) {
  const [claims, setClaims]     = useState<Claim[]>(initialClaims);
  const [myClaim, setMyClaim]   = useState<Claim | null>(initialMyClaim);
  const [busy, setBusy]         = useState<string | null>(null);
  const [unclaimBusy, setUnclaimBusy] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const claimMap = new Map(claims.map(c => [c.participant_name, c]));

  async function handleUnclaim() {
    if (!myClaim || !confirm(`Remove your claim on "${myClaim.participant_name}"?`)) return;
    setUnclaimBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/claim", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to unclaim");
      setClaims(prev => prev.filter(c => c.user_id !== userId));
      setMyClaim(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to unclaim");
    } finally {
      setUnclaimBusy(false);
    }
  }

  async function handleClaim(name: string) {
    if (myClaim || busy) return;
    setBusy(name);
    setError(null);
    try {
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participant_name: name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to claim");
      setClaims(prev => [...prev, data.claim]);
      setMyClaim(data.claim);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to claim name");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-10">

      {/* ── Status banner ── */}
      {myClaim ? (
        <div className="flex items-center gap-4 px-5 py-4 rounded-xl bg-[#C9A84C]/10 border border-[#C9A84C]/25">
          <div className="relative shrink-0">
            {myClaim.user_image ? (
              <Image
                src={myClaim.user_image}
                alt={myClaim.user_name}
                width={40}
                height={40}
                className="rounded-full ring-2 ring-[#C9A84C]/40"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#C9A84C]/20 border-2 border-[#C9A84C]/30 flex items-center justify-center text-[15px] font-bold text-[#C9A84C]">
                {myClaim.user_name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#C9A84C] flex items-center justify-center">
              <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-zinc-950" fill="currentColor">
                <path fillRule="evenodd" d="M10.03 2.47a.75.75 0 0 1 .11.79l-4.8 6.3a.75.75 0 0 1-1.13.05L2.22 7.6a.75.75 0 1 1 1.06-1.06l1.63 1.63 4.25-5.57a.75.75 0 0 1 .87-.13Z" clipRule="evenodd" />
              </svg>
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-[#C9A84C]">You are playing as</p>
            <p className="text-[17px] font-bold text-white tracking-[-0.02em]">{myClaim.participant_name}</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">{myClaim.division}</p>
          </div>
          <button
            onClick={handleUnclaim}
            disabled={unclaimBusy}
            className="shrink-0 h-8 px-3 rounded-lg text-[12px] font-medium text-zinc-500 border border-zinc-700 hover:border-red-500/50 hover:text-red-400 transition-colors cursor-pointer disabled:opacity-50"
          >
            {unclaimBusy ? "…" : "Unclaim"}
          </button>
        </div>
      ) : (
        <div className="px-5 py-4 rounded-xl bg-zinc-900 border border-zinc-700">
          <p className="text-[13px] font-semibold text-zinc-300">You haven&apos;t claimed a name yet</p>
          <p className="text-[12px] text-zinc-500 mt-0.5">
            Click your name below to link it to your account. You can only claim one name.
          </p>
        </div>
      )}

      {error && (
        <p className="text-[12px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* ── Division grids ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {ALL_DIVISIONS.map(division => (
          <div key={division} className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800">
              <h3 className="text-[12px] font-semibold text-zinc-300 tracking-[-0.01em]">{division}</h3>
            </div>
            <div className="p-2 space-y-1">
              {DIVISION_PARTICIPANTS[division].map(name => {
                const claim = claimMap.get(name);
                const isMe = claim?.user_id === userId;
                const isClaimed = !!claim;
                const isBusy = busy === name;

                if (isMe) {
                  return (
                    <div
                      key={name}
                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-[#C9A84C]/10 border border-[#C9A84C]/20"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] shrink-0" />
                      <span className="text-[12px] font-semibold text-[#C9A84C] flex-1 truncate">{name}</span>
                      <span className="text-[9px] font-bold text-[#C9A84C]/60 uppercase tracking-wider shrink-0">You</span>
                    </div>
                  );
                }

                if (isClaimed) {
                  return (
                    <div
                      key={name}
                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg"
                      title={`Claimed by ${claim.user_name}`}
                    >
                      {claim.user_image ? (
                        <Image
                          src={claim.user_image}
                          alt={claim.user_name}
                          width={24}
                          height={24}
                          className="rounded-full ring-1 ring-zinc-700 shrink-0"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-400 shrink-0">
                          {claim.user_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-[12px] text-zinc-500 flex-1 truncate">{name}</span>
                      <span className="text-[9px] text-zinc-700 truncate max-w-[60px] shrink-0">
                        {claim.user_name.split(" ")[0]}
                      </span>
                    </div>
                  );
                }

                // Unclaimed
                return (
                  <button
                    key={name}
                    onClick={() => handleClaim(name)}
                    disabled={!!myClaim || !!busy}
                    className={[
                      "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors",
                      myClaim || busy
                        ? "cursor-default text-zinc-400"
                        : "cursor-pointer hover:bg-zinc-800 text-zinc-300 hover:text-white group",
                    ].join(" ")}
                  >
                    <span className={[
                      "w-1.5 h-1.5 rounded-full shrink-0 transition-colors",
                      myClaim || busy ? "bg-zinc-700" : "bg-zinc-700 group-hover:bg-[#C9A84C]",
                    ].join(" ")} />
                    <span className="text-[12px] font-medium flex-1 truncate">
                      {isBusy ? "Claiming…" : name}
                    </span>
                    {!myClaim && !busy && (
                      <span className="text-[9px] text-zinc-600 group-hover:text-[#C9A84C] font-semibold uppercase tracking-wider shrink-0">
                        Claim
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ── Legend ── */}
      <div className="flex items-center gap-6 text-[11px] text-zinc-600">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C]" />
          Your name
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded-full bg-zinc-700" />
          Claimed by someone else
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
          Available
        </div>
      </div>
    </div>
  );
}
