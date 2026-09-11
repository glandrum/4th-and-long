import { handlers } from "@/auth";
import type { NextRequest } from "next/server";

type RouteHandler = (req: NextRequest) => Promise<Response>;

// NextAuth v5 beta handler types don't fully align with Next.js 16's stricter route types yet
export const GET = handlers.GET as unknown as RouteHandler;
export const POST = handlers.POST as unknown as RouteHandler;

