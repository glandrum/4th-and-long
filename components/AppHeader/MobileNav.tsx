"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/players", label: "Players" },
  { href: "/draft",   label: "Draft"   },
  { href: "/scores",  label: "Scores"  },
  { href: "/claim",   label: "Claim"   },
  { href: "/profile", label: "Profile" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(v => !v)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className="sm:hidden flex items-center justify-center w-9 h-9 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]"
      >
        {open ? (
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {mounted && open && createPortal(
        <div
          className="sm:hidden fixed inset-0 z-[100] flex flex-col"
          style={{ top: "56px", background: "#09090B" }}
        >
          <nav className="px-3 py-3 space-y-0.5">
            {NAV.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center px-3 py-3.5 rounded-xl text-[15px] font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>,
        document.body
      )}
    </>
  );
}
