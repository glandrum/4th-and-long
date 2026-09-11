import { auth } from "@/auth";
import Image from "next/image";
import Link from "next/link";
import { GoalpostMark } from "@/components/GoalpostMark";
import { MobileNav } from "./MobileNav";

export async function AppHeader() {
  const session = await auth();
  const user = session?.user as ({ name?: string | null; email?: string | null; image?: string | null; provider?: string }) | undefined;

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-[#09090B]/90 backdrop-blur-md">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Wordmark */}
        <Link href="/draft" className="flex items-center gap-2 group focus-visible:outline-none">
          <GoalpostMark className="w-[15px] h-[22px] text-[#C9A84C] transition-opacity group-hover:opacity-80" />
          <span className="text-[15px] font-semibold tracking-[-0.025em] text-white">
            4th <span className="text-[#C9A84C]">&</span> Long
          </span>
        </Link>

        {/* Nav */}
        <nav className="hidden sm:flex items-center gap-1">
          <Link
            href="/players"
            className="px-3 py-1.5 text-[13px] text-zinc-400 hover:text-zinc-100 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            Players
          </Link>
          <Link
            href="/draft"
            className="px-3 py-1.5 text-[13px] text-zinc-400 hover:text-zinc-100 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            Draft
          </Link>
          <Link
            href="/scores"
            className="px-3 py-1.5 text-[13px] text-zinc-400 hover:text-zinc-100 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            Scores
          </Link>
          <Link
            href="/claim"
            className="px-3 py-1.5 text-[13px] text-zinc-400 hover:text-zinc-100 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            Claim
          </Link>
          <Link
            href="/profile"
            className="px-3 py-1.5 text-[13px] text-zinc-400 hover:text-zinc-100 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            Profile
          </Link>
        </nav>

        {/* Right side: avatar + mobile hamburger */}
        <div className="flex items-center gap-1">
          {user && (
            <Link
              href="/profile"
              className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C] rounded-lg p-1"
            >
              {user.image ? (
                <Image
                  src={user.image}
                  alt={user.name ?? ""}
                  width={28}
                  height={28}
                  className="rounded-full ring-1 ring-zinc-700 group-hover:ring-zinc-500 transition-all"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-zinc-800 ring-1 ring-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-300">
                  {user.name?.charAt(0) ?? "?"}
                </div>
              )}
              <span className="text-[13px] text-zinc-400 group-hover:text-zinc-200 transition-colors hidden sm:block">
                {user.name?.split(" ")[0]}
              </span>
            </Link>
          )}
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
