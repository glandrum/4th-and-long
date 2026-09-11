import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PlayersTable } from "@/components/PlayersTable";
import { AppHeader } from "@/components/AppHeader";
import { SyncButton } from "@/components/SyncButton";
import { getPlayersFromDB } from "@/lib/players";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const players = await getPlayersFromDB();

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
        <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.03em] text-white">
              NFL Players
            </h1>
            <p className="text-[13px] text-zinc-500 mt-1">
              {players.length > 0
                ? <>{players.length.toLocaleString()} active players across all 32 teams · from database</>
                : <>No players in database yet</>
              }
            </p>
          </div>
          <SyncButton />
        </div>

        {players.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-zinc-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 2.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
              </svg>
            </div>
            <p className="text-zinc-400 text-[14px] font-medium mb-1">Database is empty</p>
            <p className="text-zinc-600 text-[12px] mb-6">
              Pull active NFL players from the Sleeper API to populate your database.
            </p>
            <SyncButton />
          </div>
        ) : (
          <PlayersTable players={players} />
        )}
      </main>
    </div>
  );
}
