"use client";
import { useState } from "react";
import Link from "next/link";
import Drop from "./Drop";

const LINKS: ReadonlyArray<readonly [string, string]> = [
  ["/scan", "Find Donors"],
  ["/requests", "Requests"],
  ["/request", "Request Blood"],
  ["/inbox", "Inbox"],
  ["/dashboard", "Dashboard"],
];

export default function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-20 border-b border-brand-100 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center justify-between gap-3 p-3 sm:p-4" aria-label="Main">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-brand-700" onClick={() => setOpen(false)}>
          <Drop className="h-7 w-7" />
          Find the donor
        </Link>
        <div className="hidden items-center gap-5 text-sm font-medium md:flex">
          {LINKS.map(([href, text]) => (
            <Link key={href} href={href} className="hover:text-brand-700">{text}</Link>
          ))}
          <Link href="/login" className="btn !px-4 !py-1.5 text-sm">Sign in</Link>
        </div>
        <button
          type="button"
          className="rounded-lg border border-brand-100 px-3 py-1.5 text-sm font-semibold md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </nav>
      {open && (
        <div id="mobile-menu" className="border-t border-brand-100 bg-white p-3 md:hidden">
          <div className="mx-auto grid max-w-5xl gap-1">
            {LINKS.map(([href, text]) => (
              <Link key={href} href={href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 font-medium hover:bg-brand-50">{text}</Link>
            ))}
            <Link href="/login" onClick={() => setOpen(false)} className="btn mt-1">Sign in</Link>
          </div>
        </div>
      )}
    </header>
  );
}
