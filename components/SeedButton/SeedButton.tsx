"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SeedButton({ season }: { season: number }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSeed() {
    if (!confirm(`This will create/replace all 136 drafts (weeks 1–17, all 8 divisions) for the ${season} season. Continue?`)) return;
    setState("loading");
    try {
      const res = await fetch("/api/admin/seed-drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ season }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setMessage(data.message);
      setState("done");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unknown error");
      setState("error");
    }
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        onClick={handleSeed}
        disabled={state === "loading"}
        className={[
          "h-8 px-3 rounded-lg text-[12px] font-medium transition-all cursor-pointer",
          "border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          state === "loading"
            ? "bg-zinc-800 border-zinc-700 text-zinc-500"
            : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200",
        ].join(" ")}
      >
        {state === "loading" ? "Seeding…" : `Seed ${season} Season`}
      </button>
      {message && (
        <span className={`text-[11px] ${state === "error" ? "text-red-400" : "text-emerald-400"}`}>
          {message}
        </span>
      )}
    </div>
  );
}
