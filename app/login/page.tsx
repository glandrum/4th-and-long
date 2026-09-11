"use client";

import { signIn } from "next-auth/react";
import { GoalpostMark } from "@/components/GoalpostMark";

interface Provider {
  id: string;
  name: string;
  className: string;
  icon: React.ReactNode;
}

const providers: Provider[] = [
  {
    id: "google",
    name: "Google",
    className:
      "bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-50 active:bg-zinc-100",
    icon: (
      <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
    ),
  },
];

export default function LoginPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{
        background:
          "radial-gradient(ellipse 900px 700px at 78% -8%, rgba(6,78,59,0.22) 0%, transparent 68%), #09090B",
      }}
    >
      <div className="w-full max-w-[360px] flex flex-col items-center">

        {/* Mark + Wordmark */}
        <GoalpostMark className="w-7 h-[42px] text-[#C9A84C] mb-5" />

        <h1 className="text-[2.625rem] font-semibold tracking-[-0.03em] text-white leading-none mb-2">
          4th <span className="text-[#C9A84C]">&</span> Long
        </h1>

        <p className="text-[11px] text-zinc-500 tracking-[0.14em] uppercase mb-10">
          Where dynasties are built
        </p>

        {/* Divider */}
        <div className="w-full flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-zinc-800" />
          <span className="text-[11px] text-zinc-600 tracking-[0.1em] uppercase shrink-0">
            Sign in to continue
          </span>
          <div className="flex-1 h-px bg-zinc-800" />
        </div>

        {/* Auth buttons */}
        <div className="w-full flex flex-col gap-2.5">
          {providers.map((provider) => (
            <button
              key={provider.id}
              type="button"
              onClick={() => signIn(provider.id, { callbackUrl: "/" })}
              className={[
                "w-full h-12 flex items-center justify-center gap-2.5 rounded-xl",
                "text-[13.5px] font-medium tracking-[-0.01em]",
                "transition-colors duration-150 cursor-pointer",
                "focus-visible:outline-none focus-visible:ring-2",
                "focus-visible:ring-[#C9A84C] focus-visible:ring-offset-2",
                "focus-visible:ring-offset-[#09090B]",
                provider.className,
              ].join(" ")}
            >
              {provider.icon}
              Continue with {provider.name}
            </button>
          ))}
        </div>

        {/* Footer */}
        <p className="text-[11px] text-zinc-600 text-center mt-9 leading-relaxed">
          By continuing, you agree to our{" "}
          <span className="text-zinc-500 underline underline-offset-2 cursor-pointer hover:text-zinc-300 transition-colors">
            Terms
          </span>{" "}
          and{" "}
          <span className="text-zinc-500 underline underline-offset-2 cursor-pointer hover:text-zinc-300 transition-colors">
            Privacy Policy
          </span>
        </p>
      </div>
    </div>
  );
}
