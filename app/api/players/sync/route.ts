import { auth } from "@/auth";
import { syncPlayersFromSleeper } from "@/lib/players";
import { NextResponse } from "next/server";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncPlayersFromSleeper();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[players/sync]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
