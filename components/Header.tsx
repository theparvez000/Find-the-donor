"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Drop from "./Drop";
import { browserClient } from "@/lib/browser";

const configured = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const LINKS: Array<readonly [string, string]> = [
  ["/scan", "Find Donors"],
  ["/requests", "Requests"],
  ["/request", "Request Blood"],
  ["/track", "My Requests"],
  ["/inbox", "Inbox"],
  ["/dashboard", "Dashboard"],
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [unread, setUnread] = useState(0);
  const pathname = usePathname();

  // Refresh the unread badge whenever the route changes. The badge is optional, so failures are ignored.
  useEffect(() => {
    if (!configured) return;
    let live = true;
    (async () => {
      try {
        const sb = browserClient();
        const { data } = await sb.auth.getSession();
        if (!live) return;
        setSignedIn(!!data.session);
        if (!data.session) { setUnread(0); return; }
        const { count } = await sb.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
        if (live) setUnread(count ?? 0);
      } catch { /* ignore */ }
    })();
    return () => { live = false; };
  }, [pathname]);

  const links: Array<readonly [string, string]> = signedIn ? [...LINKS, ["/notifications", unread > 0 ? `Alerts (${unread})` : "Alerts"]] : LINKS;

  return (
    <header className="sticky top-0 z-20 border-b border-brand-100 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center justify-between gap-3 p-3 sm:p-4" aria-label="Main">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-brand-700" onClick={() => setOpen(false)}>
          <Drop className="h-7 w-7" />
          Find the donor
        </Link>
        <div className="hidden flex-wrap items-center justify-end gap-x-4 gap-y-1 text-sm font-medium md:flex">
          {links.map(([href, text]) => (
            <Link key={href} href={href} className={`hover:text-brand-700 ${href === "/notifications" && unread > 0 ? "font-bold text-brand-700" : ""}`}>{text}</Link>
          ))}
          {!signedIn && <Link href="/login" className="btn !px-4 !py-1.5 text-sm">Sign in</Link>}
        </div>
        <button
          type="button"
          className="rounded-lg border border-brand-100 px-3 py-1.5 text-sm font-semibold md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Close" : unread > 0 ? `Menu (${unread})` : "Menu"}
        </button>
      </nav>
      {open && (
        <div id="mobile-menu" className="border-t border-brand-100 bg-white p-3 md:hidden">
          <div className="mx-auto grid max-w-5xl gap-1">
            {links.map(([href, text]) => (
              <Link key={href} href={href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 font-medium hover:bg-brand-50">{text}</Link>
            ))}
            {!signedIn && <Link href="/login" onClick={() => setOpen(false)} className="btn mt-1">Sign in</Link>}
          </div>
        </div>
      )}
    </header>
  );
}
