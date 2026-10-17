"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/studio", label: "Studio" },
  { href: "/guide", label: "Setup guide" },
];

export default function Header() {
  const path = usePathname();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("flowpilot.theme") === "dark";
    setDark(saved);
    document.documentElement.classList.toggle("dark", saved);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("flowpilot.theme", next ? "dark" : "light");
  };

  return (
    <header className="sticky top-0 z-20 backdrop-blur bg-[#5B3CC4]/95 text-white">
      <div className="mx-auto max-w-[1400px] px-4 py-3 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-white text-[#5B3CC4] grid place-items-center font-display font-black text-xl">
            F
          </div>
          <div className="leading-tight">
            <div className="font-display font-black text-lg">FlowPilot</div>
            <div className="hidden sm:block text-[11px] opacity-80">
              CodeFest 2026 · Team Mooncraft
            </div>
          </div>
        </Link>
        <nav className="ml-4 flex items-center gap-1 text-sm font-bold">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3.5 py-2 rounded-full transition ${
                path === l.href
                  ? "bg-white text-[#5B3CC4]"
                  : "hover:bg-white/20"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto">
          <button
            onClick={toggle}
            className="rounded-full bg-white/20 hover:bg-white/30 px-4 py-2 text-sm font-bold transition"
            aria-label="Toggle dark mode"
          >
            {dark ? "☀ Light" : "☾ Dark"}
          </button>
        </div>
      </div>
      <div className="flex h-1.5">
        <div className="flex-1 bg-[#FF6B57]" />
        <div className="flex-1 bg-[#00A38F]" />
        <div className="flex-1 bg-[#FFC83D]" />
      </div>
    </header>
  );
}
