import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import { AppHeader } from "@/components/AppHeader";

const providerNames: Record<string, string> = {
  google:   "Google",
  facebook: "Facebook",
  apple:    "Apple",
};

interface DataRowProps {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}

function DataRow({ label, value, mono = false }: DataRowProps) {
  return (
    <div className="flex items-center justify-between px-6 py-[14px]">
      <span className="text-[13px] text-zinc-500 shrink-0">{label}</span>
      <span
        className={[
          "text-right max-w-[58%] truncate",
          mono
            ? "text-[11px] font-mono text-zinc-400 tracking-wide"
            : "text-[13px] text-zinc-200",
        ].join(" ")}
      >
        {value ?? "—"}
      </span>
    </div>
  );
}

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as typeof session.user & {
    provider?: string;
    id?: string;
  };

  const provider = user.provider ?? "unknown";
  const providerName = providerNames[provider] ?? provider;

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
        <div className="max-w-[440px]">
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-white mb-8">
            Profile
          </h1>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_24px_48px_rgba(0,0,0,0.4)]">

            {/* Card header */}
            <div className="px-6 pt-6 pb-5 border-b border-zinc-800">
              <div className="flex items-center gap-4">
                {user.image ? (
                  <Image
                    src={user.image}
                    alt={user.name ?? "Profile photo"}
                    width={52}
                    height={52}
                    className="rounded-full ring-1 ring-zinc-700 shrink-0"
                  />
                ) : (
                  <div className="w-[52px] h-[52px] rounded-full bg-zinc-800 ring-1 ring-zinc-700 flex items-center justify-center text-lg font-semibold text-zinc-300 shrink-0">
                    {user.name?.charAt(0).toUpperCase() ?? "?"}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="block w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span className="text-[10.5px] font-medium text-emerald-400 tracking-[0.12em] uppercase">
                      Authenticated
                    </span>
                  </div>
                  <h2 className="text-[18px] font-semibold text-white tracking-[-0.02em] leading-tight truncate">
                    {user.name ?? "League Member"}
                  </h2>
                  <p className="text-[13px] text-zinc-500 mt-0.5">
                    via {providerName}
                  </p>
                </div>
              </div>
            </div>

            {/* Data rows */}
            <div className="divide-y divide-zinc-800/70">
              <DataRow label="Email"          value={user.email} />
              <DataRow label="Member ID"      value={user.id} mono />
              <DataRow label="Auth provider"  value={providerName} />
              <DataRow label="Email verified" value={user.email ? "Verified" : "Not verified"} />
            </div>

            {/* Sign out */}
            <div className="px-6 pt-4 pb-6 border-t border-zinc-800 mt-1">
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/login" });
                }}
              >
                <button
                  type="submit"
                  className={[
                    "w-full h-11 rounded-xl",
                    "border border-zinc-700 bg-transparent",
                    "text-[13.5px] font-medium text-zinc-400",
                    "hover:bg-zinc-800 hover:text-zinc-100 hover:border-zinc-600",
                    "transition-colors duration-150 cursor-pointer",
                    "focus-visible:outline-none focus-visible:ring-2",
                    "focus-visible:ring-[#C9A84C] focus-visible:ring-offset-2",
                    "focus-visible:ring-offset-zinc-900",
                  ].join(" ")}
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
