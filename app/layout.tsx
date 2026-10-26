import "./globals.css";
import Link from "next/link";
import type { ReactNode } from "react";
export const metadata = { title: "Find the donor", description: "Every Drop Counts. Every Life Matters. Find blood donors in Bangladesh." };
export default function Root({ children }: { children: ReactNode }) {
  return (<html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"/></head><body>
    <header className="border-b"><nav className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 p-4" aria-label="Main">
      <Link href="/" className="text-lg font-bold text-brand-700">🩸 Find the donor</Link>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium"><Link href="/scan">Scan for Donors</Link><Link href="/donors">Browse</Link><Link href="/request">Request Blood</Link><Link href="/dashboard">Dashboard</Link></div>
    </nav></header>
    <main className="mx-auto max-w-5xl p-4">{children}</main>
    <footer className="mx-auto mt-16 max-w-5xl border-t p-4 text-xs text-gray-600">Find the donor connects people; it gives no medical advice and cannot guarantee blood availability or donor eligibility. Always confirm with a hospital or blood bank.</footer>
  </body></html>);
}
