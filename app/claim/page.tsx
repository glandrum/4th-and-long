import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppHeader } from "@/components/AppHeader";
import { ClaimPage } from "@/components/ClaimPage";
import { getAllClaims, getClaimByUserId } from "@/lib/claims";

export default async function ClaimNamePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = session.user.id!;
  const [allClaims, myClaim] = await Promise.all([
    getAllClaims(),
    getClaimByUserId(userId),
  ]);

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "radial-gradient(ellipse 900px 700px at 78% -8%, rgba(6,78,59,0.18) 0%, transparent 68%), #09090B",
      }}
    >
      <AppHeader />
      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-white">Claim Your Name</h1>
          <p className="text-[13px] text-zinc-500 mt-1">
            Link your account to your league name. Once claimed, you can only submit picks for that name.
          </p>
        </div>

        <ClaimPage
          initialClaims={allClaims}
          myClaim={myClaim}
          userId={userId}
        />
      </main>
    </div>
  );
}
