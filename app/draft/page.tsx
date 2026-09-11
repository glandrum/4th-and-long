import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppHeader } from "@/components/AppHeader";
import { DraftCard } from "@/components/DraftCard";
import { DraftSetup } from "@/components/DraftSetup";
import { SeedButton } from "@/components/SeedButton";
import { getAllDrafts } from "@/lib/draft";
import type { Draft } from "@/lib/types";

const CURRENT_SEASON = new Date().getFullYear();

function groupByWeek(drafts: Draft[]): Map<number, Draft[]> {
  const map = new Map<number, Draft[]>();
  for (const d of drafts) {
    if (!map.has(d.week)) map.set(d.week, []);
    map.get(d.week)!.push(d);
  }
  return map;
}

export default async function DraftPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const allDrafts = await getAllDrafts();

  const divisionDrafts = allDrafts.filter(d => d.division !== "");
  const customDrafts   = allDrafts.filter(d => d.division === "");

  const byWeek      = groupByWeek(divisionDrafts);
  const sortedWeeks = [...byWeek.keys()].sort((a, b) => a - b);

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "radial-gradient(ellipse 900px 700px at 78% -8%, rgba(6,78,59,0.18) 0%, transparent 68%), #09090B",
      }}
    >
      <AppHeader />
      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-14">

        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.03em] text-white">Drafts</h1>
            <p className="text-[13px] text-zinc-500 mt-0.5">
              {CURRENT_SEASON} season · {divisionDrafts.length} division drafts · {customDrafts.length} custom
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <SeedButton season={CURRENT_SEASON} />
          </div>
        </div>

        {/* ── Division drafts: week-by-week grid ── */}
        {divisionDrafts.length === 0 ? (
          <div className="border border-dashed border-zinc-800 rounded-xl px-6 py-12 text-center">
            <p className="text-[13px] text-zinc-500 mb-1">No division drafts yet.</p>
            <p className="text-[11px] text-zinc-700">Click "Seed 2026 Season" to pre-populate all 17 weeks.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {sortedWeeks.map(week => {
              const weekDrafts = [...byWeek.get(week)!].sort((a, b) =>
                a.division.localeCompare(b.division)
              );
              const doneCount = weekDrafts.filter(d => d.status === "complete").length;
              const activeCount = weekDrafts.filter(d => d.status === "active").length;

              return (
                <section key={week}>
                  <div className="flex items-center gap-3 mb-3">
                    <h2 className="text-[13px] font-semibold text-zinc-300 tracking-[-0.02em]">
                      Week {week}
                    </h2>
                    <div className="flex-1 h-px bg-zinc-800" />
                    <span className="text-[11px] text-zinc-600">
                      {activeCount > 0 && <span className="text-[#C9A84C] mr-2">{activeCount} active</span>}
                      {doneCount}/{weekDrafts.length} complete
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {weekDrafts.map(draft => (
                      <DraftCard key={draft._id} draft={draft} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {/* ── Custom drafts ── */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-base font-semibold text-zinc-400 tracking-[-0.02em]">Custom Drafts</h2>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>

          {customDrafts.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
              {customDrafts.map(draft => (
                <DraftCard key={draft._id} draft={draft} canDelete />
              ))}
            </div>
          )}

          {/* New custom draft form */}
          <DraftSetup week={1} season={CURRENT_SEASON} />
        </div>

      </main>
    </div>
  );
}
