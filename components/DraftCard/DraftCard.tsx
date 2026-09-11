"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Draft } from "@/lib/types";

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

interface DraftCardProps {
  draft: Draft;
  canDelete?: boolean;
}

export function DraftCard({ draft, canDelete }: DraftCardProps) {
  const router                  = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted]   = useState(false);
  const completed = draft.picks.filter(p => p.submitted_at).length;
  const total     = draft.picks.length;

  if (deleted) return null;

  const statusDot =
    draft.status === "complete" ? "bg-emerald-400" :
    draft.status === "active"   ? "bg-[#C9A84C] animate-pulse" :
                                  "bg-zinc-600";
  const statusText =
    draft.status === "complete" ? "text-emerald-400" :
    draft.status === "active"   ? "text-[#C9A84C]" :
                                  "text-zinc-500";

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this custom draft? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/draft/${draft._id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setDeleted(true);
        router.refresh();
      } else {
        alert(`Delete failed: ${data.error ?? res.status}`);
      }
    } catch (err) {
      alert(`Delete error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <a
      href={`/draft/${draft._id}`}
      className="relative flex flex-col gap-0 rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden hover:border-zinc-700 transition-colors group"
    >
      {/* Name + status dot */}
      <div className="flex items-center justify-between gap-1 px-3 pt-3 pb-1">
        <span className="text-[12px] font-semibold text-zinc-200 group-hover:text-white truncate">
          {draft.division || "Custom"}
        </span>
        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot}`} />
      </div>

      {/* Progress bar */}
      <div className="px-3 py-1.5">
        <div className="flex gap-0.5">
          {draft.picks.map(p => (
            <div
              key={p.pick_num}
              className={`flex-1 h-1 rounded-full transition-colors ${p.submitted_at ? "bg-emerald-400" : "bg-zinc-700"}`}
            />
          ))}
        </div>
      </div>

      {/* Status label */}
      <div className={`px-3 pb-3 text-[10px] font-medium ${statusText}`}>
        {draft.status === "pending"
          ? `Starts ${formatTime(draft.start_time)}`
          : draft.status === "complete"
          ? "Complete"
          : `${completed}/${total} picks`}
      </div>

      {/* Delete button (custom drafts only) */}
      {canDelete && (
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded text-zinc-700 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer opacity-0 group-hover:opacity-100 disabled:opacity-50"
          aria-label="Delete draft"
        >
          {deleting ? (
            <span className="text-[10px]">…</span>
          ) : (
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M3 4h10M6 4V2.5h4V4M5 4l.5 9h5l.5-9" />
            </svg>
          )}
        </button>
      )}
    </a>
  );
}
