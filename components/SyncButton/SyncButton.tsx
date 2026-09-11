"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type SyncState = "idle" | "loading" | "success" | "error";

interface SyncResult {
  synced: number;
  deactivated: number;
  duration: number;
}

export function SyncButton() {
  const router = useRouter();
  const [state, setState] = useState<SyncState>("idle");
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSync() {
    setState("loading");
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/players/sync", { method: "POST" });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? "Sync failed");

      setResult(data);
      setState("success");
      router.refresh(); // re-run the server component to reload from DB
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setState("error");
    }
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        onClick={handleSync}
        disabled={state === "loading"}
        className={[
          "h-8 px-3.5 rounded-lg text-[12px] font-medium transition-all cursor-pointer",
          "border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          state === "loading"
            ? "border-zinc-700 bg-zinc-800 text-zinc-400"
            : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 hover:border-zinc-600",
        ].join(" ")}
      >
        {state === "loading" ? (
          <span className="flex items-center gap-1.5">
            <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
            Syncing…
          </span>
        ) : (
          <span className="flex items-center gap-1.5">
            <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M13.5 8A5.5 5.5 0 1 1 8 2.5" />
              <path d="M13.5 2.5v3h-3" />
            </svg>
            Sync from Sleeper
          </span>
        )}
      </button>

      {state === "success" && result && (
        <span className="text-[12px] text-emerald-400">
          ✓ {result.synced.toLocaleString()} players synced
          {result.deactivated > 0 && `, ${result.deactivated} deactivated`}
          {" "}· {(result.duration / 1000).toFixed(1)}s
        </span>
      )}

      {state === "error" && error && (
        <span className="text-[12px] text-red-400">✗ {error}</span>
      )}
    </div>
  );
}
